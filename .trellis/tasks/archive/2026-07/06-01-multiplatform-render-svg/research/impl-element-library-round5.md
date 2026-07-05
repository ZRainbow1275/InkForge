# 实现规格 R5 — 墨铸排版元素库扩展（6 个新元素 + SMIL 动效层 + 3 项研究解禁）

> 用户战略方向（延续 R4）：**把排版设计落实为「规则」→ 落地 InkForge 工具 → 复用 + 持续扩元素**。
> R5 在 R1-R4 已认可的「铸字 × 构成主义 × 金石印章」语言（方格 grid × 菱形 diamond × 印章 ×
> accentDeep 满幅）之上**只增不减**，新增 6 个可复用元素 + 一层克制的 SMIL 动效 + 落实研究文档
> （`wechat-svg-effects-technique.md` §5/§9）的 3 项「其实没禁、只是没用上」的能力。
>
> **统一 marker 语法（为后期工具 UI 按钮插入做准备）**：`[元素] 段1 | 段2 || 项2段1 | 项2段2 …`
> ——`||` 分「条目」，`|` 分「条目内字段」。所有 marker 装饰器都是 `<p>[元素]…</p>` 段落消费型。
>
> 硬约束（同 R1-R4，不可违反）：微信安全子集；禁 class/id/`<style>`/var/calc/gradient/transform(style)/
> transition/animation/filter/flex/grid/position/输出`<div>`/box-shadow inset/`<defs>`/clipPath/mask/
> `<use>`/`<symbol>`/`url(#)`/`<foreignObject>`内HTML/`<image href>`/xlink:href；内联 svg 母题只
> rect/path/line/text/circle；**绝不 emoji**（图标用内联 `<path>`）；幂等哨兵；**preview+wechat 双轨**；
> **零删除**（R1-R4 全部 + 26 SVG 模块全保留）；**非旗舰预设零行为改动**；ember 每屏 ≤2 次自律。

---

## 切分为两个 trellis-implement 派单（串行，B 依赖 A）

- **派单 A = SMIL 基座 + 折叠模块 + 动效层**：`primitives.ts` / `wechat-safe.ts` / `interactive.ts` /
  `dividers.ts` 及其测试。**不碰** `html-blocks.ts` / `themes.ts`。
- **派单 B = 5 个 HTML 色块元素 + 折叠 marker 接线 + chain 接线 + 产物/测试**：`html-blocks.ts` /
  `themes.ts` /（如需）`types.ts`，及 `html-blocks.test.ts` / `emit-flagship-artifacts.test.ts`。

---

# 派单 A — SMIL 基座 + 折叠 + 动效层

## A1. `primitives.ts` — `smilAnimate` 加可选 `id`（研究 §9.1，链式动画前提）

`SmilAnimateOpts` 增 `id?: string`；`smilAnimate` 在 `attrs({...})` 第一位加 `id: o.id`。
（`attrs` 已过滤 undefined，不传 id 时输出不变 → 现有快照/测试不破。）
同理 `smilAnimateTransform` 也加可选 `id?: string`（同位置）。`smilSet` 也加可选 `id?: string`。

**为什么**：解锁 `begin="animA.end+0.5s"` 链式触发（研究 §3.6 证实 Lewis 量产在用、低风险）。

## A2. `wechat-safe.ts` — 2 条规则的 `detail` 文案软化（研究 §9.2/§9.3，**规则正则不动**）

- `no-id-referenced` detail 改为：
  `'依赖 id 引用的元素（defs/渐变/clip/mask/filter/use/symbol/pattern）在微信 sanitizer 中行为不可预测，全行业量产回避；用半透明形状叠加 / rect rx 圆角 / 多 <text> 行 / rect 描边替代'`
- `no-foreign-object` detail 改为：
  `'微信过滤 <foreignObject> 内部 HTML 子树（div/span/p）；内嵌另一个 <svg> 在 opensvg 等量产工具可工作，但本系统不依赖此模式，故全禁更简单'`

**仅改字符串文案**，正则与断言行为 100% 不变（现有 wechat-safe.test.ts 若断言 detail 文本需同步更新）。

## A3. `interactive.ts` — 新增 `i-stretch`（点击展开折叠，SVG SMIL）

> 真相（研究 §2.2 + feasibility §2）：`<details>` 在微信粘贴路径必死；**真正的高度塌缩折叠在
> 粘贴-HTML 路径下不可靠**（SMIL 改不了 section 的 CSS 布局高度）。故本元素采用 **点击揭示式**
> （与已验证存活的 `i-clickswitch` 同一机制：双层 `<g>` + 自身 click 触发 opacity，`fill=freeze`
> `restart=never`）——内容区高度**预留**，点击后揭示。这是诚实可行的形态（**非模拟**：移动端真机
> 点击真的揭示），在 catalog 里如实标注「点击揭示、非高度塌缩」。

新增 `renderStretch(p: SvgModuleParams): string`：
- 画布 `W=1080`；`headerH=132`；正文按行数定高：`bodyLines = splitLines(content, 18, 6)`，
  `contentH = 64 + bodyLines.length*46 + 28`；`H = headerH + contentH`。
- 标题取 `frameTitle(p,0,'点击展开')`；正文取 `p.items?.[0]?.body ?? p.subtitle ?? ''`。
- **Header（顶部，始终可见）**：
  - `rect(x=0,y=0,width=W,height=headerH, rx=14, ry=14, fill=palette.accentDeep)`（accentDeep 满条）
  - 标题 `textLine(x=56,y=78,text=标题行, fill=#ffffff, fontSize=46, fontWeight=700, anchor=start)`
    （标题 `splitLines(title,16,1)[0]`）
  - 右侧雪佛龙「展开」指示：用 `path` 画下三角 `M{W-96},{56} L{W-56},{56} L{W-76},{84} Z`
    `fill=#ffffff opacity=0.9`（**非 emoji**，纯 path）。
  - 「点击展开」小字 `textLine(x=W-110,y=104,text='点击展开',fill=rgba(255,255,255,0.85),fontSize=22,anchor=end)`
    （仅 motion 时显示；静态不显示）。
- **Content（header 下方）**：
  - `rect(x=0,y=headerH+8,width=W,height=contentH-8, rx=12, ry=12, fill=palette.paperWarm, stroke=palette.hairline, strokeWidth=1)`
  - 正文行 `bodyLines.map((line,i)=> textLine(x=56, y=headerH+64+i*46, text=line, fill=palette.ink, fontSize=30, anchor=start, letterSpacing=1))`
  - 收尾菱形 `diamond(W-70, H-46, 10, palette.accent)`
- **Cover（折叠盖层，仅 motion）**：一个 `<g opacity="1">`，含：
  - 覆盖 content 区的不透明 `rect(x=0,y=headerH+8,width=W,height=contentH-8, rx=12, ry=12, fill=palette.paperWarm)`
  - 居中省略号 `textLine(x=W/2, y=headerH+(contentH)/2, text='— 点击展开全文 —', fill=palette.inkSoft, fontSize=28, anchor=middle, letterSpacing=2)`
  - `smilAnimate({attributeName:'opacity', values:'1;0', dur:'0.4s', begin:'click', fill:'freeze', restart:'never'})`
  - 全幅透明热区（最上层、本 g 内）：`rect({x:0,y:0,width:W,height:H,fill:'transparent'})` 末尾加
    ` pointer-events="visible"`（同 i-clickswitch 的 `.replace('/>',' pointer-events="visible" />')`）。
- **组装**：
  - `motion=false`（静态兜底）：`body = <g opacity="1">{header+content}</g>`（**完全展开、无 SMIL、无 cover**）。
  - `motion=true`：`body = <g opacity="1">{header+content}</g>` + `<g opacity="1">{cover+anim+hot}</g>`。
- `return safe(svgSection({ moduleId:'i-stretch', viewBoxW:W, viewBoxH:H, body }))`。

注册进 `interactiveModules`（追加一项 `{id:'i-stretch', family:'interactive', description:'点击展开折叠：双层 <g> + cover opacity SMIL（begin=click,freeze,never）；静态完全展开', render:renderStretch, interactive:true}`），
并 `export { renderStretch }` + 加入 `__interactiveRenderers`。

## A4. `interactive.ts` — `i-sequence` 升级为链式 begin（研究 §9.5，用 A1 的 id）

把 `renderSequence` 的三帧 begin 从硬编码 `'0s'/'1.2s'/'2.4s'` 升级为链式：
- 帧 0 的 show animate 传 `id:'seqA'`，begin `'0s'`；
- 帧 1 的 show begin `'seqA.end+1.2s'` 且自身 `id:'seqB'`；
- 帧 2 的 show begin `'seqB.end+1.2s'`。
hide 同步跟随（帧 i 的 hide begin = 帧 i+1 的 show begin 表达式）。
**保持静态兜底（motion=false 只画帧 1）不变**；保持 `fill=freeze restart=never`、discrete 阶跃不变。
（链式比时钟同步更稳健；若实现复杂度高可保留原 begin 但仍给帧 0 加 `id` 占位——核心是证明 id 通路可用。）

## A5. `dividers.ts` — 一层克制的 SMIL 动效（动效层示范，gated）

> 「SMIL 动效层」用户已选「推荐」。落地为**最克制的一处**：分隔线中央菱形/锻造点的**呼吸**，
> 仅 motion 时出现，静态（xhs/zhihu 栅格化）完全不变 → 零回归。

在 `dividers.ts` 的 render 里（每个 divider 变体的中央母题——菱形/ember 点处）：
- 读 `p.theme.allowMotion`。`allowMotion=true` 时，给中央**菱形或 ember 点**包一层
  `<g>` 并加 `smilAnimate({attributeName:'opacity', values:'0.55;1;0.55', dur:'3.2s', begin:'0s', repeatCount:'indefinite'})`
  （注意 `smilAnimate` 默认 `fill=freeze restart=never`；循环呼吸要显式传 `repeatCount:'indefinite'`，
  begin `'0s'` 自动播放；PC 编辑器会冻结在首帧、真机轻柔呼吸——研究 §1.6 已知且可接受）。
- `allowMotion=false`：**输出与当前完全一致**（不包 `<g>`、不加 animate）。
- 仅对**一处**中央母题加（divider-forge 的 ember 点优先；divider-diamond 的中心菱形次之），
  其余形状不动；ember 呼吸不增加 ember 出现「次数」（同一颗点，只是 opacity 动）。
- 经 `safe()`（animate begin=0s/repeatCount 均在安全子集）。

## A6. 派单 A 测试

- `interactive.test.ts`（或现有等价）：
  - `i-stretch`：motion=true 含 2 个 `<g>` + cover 的 `<animate ... begin="click" ... fill="freeze" restart="never">` +
    透明热区 `pointer-events="visible"`；motion=false **无** `<animate>`、**无** cover、内容完全可见；
    两态均 `checkWechatSafe()===[]`；width="100%"；含 `data-ink-svg="i-stretch"`。
  - `i-sequence`：motion=true 含 `id="seqA"` 且某帧 begin 含 `seqA.end`；motion=false 仍只首帧无 SMIL。
  - `dividers`：motion=true 某 divider 含 `repeatCount="indefinite"` 的 opacity animate；
    **motion=false 输出与改动前逐字节一致**（用快照或显式断言「无 `<animate`」守护零回归）。
- `primitives` / `wechat-safe` 测试：`smilAnimate({id:'x',...})` 输出含 `id="x"`；不传 id 输出无 `id=`；
  wechat-safe 两条 detail 文案断言（若存在）同步更新；规则数仍 18 条、行为不变。
- `pnpm exec vitest run src/services/export/svg-modules` 全绿。

---

# 派单 B — 5 个 HTML 色块元素 + 折叠 marker 接线 + chain 接线

> 全部在 `html-blocks.ts`，工厂式 `(palette, opts?) => (html, target) => html`，幂等
> `data-ink-block` 哨兵，preview+wechat 双轨。沿用文件内已有助手（`firstText`/`escapeHtmlText`/
> `escapeHtmlAttr`/`HTML_FONT`/`gridSquareMark`/`gridNumberSmall`/`diamondTerminalSvg`/`diamondSep`/
> `gridSquareSmall`）。新元素的小内联 svg 图标**可用固定 px width**（html-blocks 内联图标惯例，
> 不经 assertWechatSafe，与现有 gridNumberSvg 等一致）。

## 统一 marker 解析助手（加在 html-blocks.ts 顶部区）

```ts
/** 解析 marker 段落：剥掉 `[元素]` 前缀后，按 `||` 切条目、条目内按 `|` 切字段。 */
function parseMarkerItems(text: string, tag: string): string[][] | null {
  const re = new RegExp(`^\\s*\\[\\s*${tag}\\s*\\]\\s*([\\s\\S]+)$`)
  const m = re.exec(text)
  if (!m) return null
  return m[1].split('||').map(seg => seg.split('|').map(s => s.trim()).filter(Boolean)).filter(a => a.length > 0)
}
```
（注意：marker 探测用**段落纯文本** `firstText(inner)`，但渲染各字段时为安全统一用
`escapeHtmlText`——marker 内容按纯文本处理，不保留内部 HTML，避免 `|`/`||` 与 HTML 混淆。）

每个 marker 装饰器都遍历 `<p(\s[^>]*)?>([\s\S]*?)<\/p>`，对命中段 `firstText` 调 `parseMarkerItems`；
命中→替换为色块，未命中→原样返回该 `<p>`。幂等：先 `if (html.includes('data-ink-block="flagship-<x>"')) return html`。

## B1. 强调横幅 `decorateFlagshipBanner(palette)` — marker `[横幅] 文字`

`parseMarkerItems(text,'横幅')` → 取 `items[0][0]` 为正文（单字段）。满幅 accentDeep 居中强调（**区别于
H2**：H2 是左对齐编号章节头；横幅是**居中金句式强调**）：
```
<section data-ink-block="flagship-banner" style="margin:30px 0;background-color:{accentDeep};
  border-radius:8px;padding:26px 24px;text-align:center;">
  {白菱形 svg 居中 display:block：viewBox 0 0 16 16 width=14 fill=#ffffff，margin:0 auto 10px}
  <p style="margin:0;font-size:21px;font-weight:800;line-height:1.65;letter-spacing:1.5px;
    color:#ffffff;font-family:{HTML_FONT};">{escapeHtmlText(文字)}</p>
  <p style="margin:14px 0 0;text-align:center;">
    <section style="display:inline-block;width:54px;height:1px;background-color:rgba(255,255,255,0.6);"></section>
  </p>
</section>
```

## B2. 对比双栏 `decorateFlagshipCompare(palette)` — marker `[对比] 左标题 | 左内容 || 右标题 | 右内容`

`parseMarkerItems(text,'对比')` 需 ≥2 条目，各 ≥2 字段；否则原样返回。两列 `inline-block`（**不用 flex**），
左 47% / 右 47%、`vertical-align:top`；左列 accentTint 实底（主张/正），右列 accentBorder 描边 + paper 底（对照/反）：
```
<section data-ink-block="flagship-compare" style="margin:24px 0;font-size:0;">  // font-size:0 消除 inline-block 间隙
  <section style="display:inline-block;width:47%;vertical-align:top;background-color:{accentTint};
    border-radius:8px;padding:14px 14px;">
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:{accent};font-family:{HTML_FONT};">
      {gridSquareMark(accent)} <span style="margin-left:6px;vertical-align:middle;">{左标题}</span></p>
    <p style="margin:0;font-size:14px;line-height:1.75;color:{ink};font-family:{HTML_FONT};">{左内容}</p>
  </section>
  <section style="display:inline-block;width:47%;margin-left:6%;vertical-align:top;background-color:{paper};
    border:1px solid {accentBorder};border-radius:8px;padding:13px 13px;">
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:{inkSoft};font-family:{HTML_FONT};">
      {gridSquareMark(inkSoft 近似——传 palette.inkSoft 的实色?  用 accentBorder? }} {右标题}</p>
    <p style="margin:0;font-size:14px;line-height:1.75;color:{ink};font-family:{HTML_FONT};">{右内容}</p>
  </section>
</section>
```
（右列标记色用 `palette.accent` 同样可，但为区分左右，右列标题色用 `palette.inkSoft`、标记 `gridSquareMark(palette.accent)`
保持母题一致即可——实现以「左实底/右描边」区分为主。所有字段 `escapeHtmlText`。）
**移动端 393px 校验**：47%+47%+6% margin = 100%，两列并排约 168px 各，可读；若超窄仍并排（inline-block 不换行需靠宽度，
47% 会自动两列；若极窄换行也可接受——文档说明）。

## B3. 时间线/步骤条 `decorateFlagshipTimeline(palette)` — marker `[时间线] 标题1 | 说明1 || 标题2 | 说明2 || …`

`parseMarkerItems(text,'时间线')`，每条目首字段=标题、次字段=说明（说明可空）。竖向步骤条：每步一行，
左侧**方格铸号 chip**（与 OL 同语言：accent 底 radius:3 白号 + 右上套准小白点），右侧 `inline-block` 文本列带
`border-left` 当时间线轨：
```
<section data-ink-block="flagship-timeline" style="margin:24px 0;">
  {每步 i (01..0N)：}
  <section style="margin:0 0 14px;">
    <span style="display:inline-block;min-width:24px;height:24px;line-height:24px;text-align:center;
      background-color:{accent};color:{onAccent};font-size:13px;font-weight:700;border-radius:3px;
      vertical-align:top;margin-right:12px;font-family:{HTML_FONT};">{0i}</span>
    <section style="display:inline-block;width:80%;vertical-align:top;border-left:2px solid {accentBorder};
      padding:0 0 6px 14px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:{ink};line-height:1.5;font-family:{HTML_FONT};">{标题}</p>
      {说明非空: <p style="margin:4px 0 0;font-size:14px;line-height:1.7;color:{inkSoft};font-family:{HTML_FONT};">{说明}</p>}
    </section>
  </section>
}
</section>
```

## B4. 横滑相册 `decorateFlagshipGallery(palette)` — marker `[相册] 卡标题1 | 卡内容1 || 卡标题2 | 卡内容2 || …`

`parseMarkerItems(text,'相册')`，≥2 条目。**纯 CSS scroll-snap 轨**（沿用已验证存活的 i-scrollcards 形态：
`overflow-x:auto + -webkit-overflow-scrolling:touch + white-space:nowrap + scroll-snap-type:x mandatory`，
**不用 flex**），卡片 live HTML 文字（品牌色块），卡宽 80% 留露头：
```
<section data-ink-block="flagship-gallery" style="margin:24px 0;overflow-x:auto;
  -webkit-overflow-scrolling:touch;white-space:nowrap;scroll-snap-type:x mandatory;-webkit-user-select:none;">
  {每卡 i (01..0N)：}
  <section style="display:inline-block;white-space:normal;width:80%;margin-right:3%;scroll-snap-align:center;
    vertical-align:top;background-color:{paperWarm};border:1px solid {hairline};border-radius:12px;padding:16px 16px;">
    <p style="margin:0;font-size:13px;font-weight:700;color:{accent};letter-spacing:1px;font-family:{HTML_FONT};">
      {gridNumberSmall(accent,0i)} <span style="margin-left:8px;vertical-align:middle;">{卡标题}</span></p>
    <p style="margin:10px 0 0;font-size:15px;line-height:1.8;color:{ink};font-family:{HTML_FONT};">{卡内容}</p>
    <p style="margin:10px 0 0;text-align:right;">{diamondTerminalSvg(accent)}</p>
  </section>
}
</section>
```

## B5. 出处/注释卡 `decorateFlagshipCitation(palette)` — marker `[出处] 引文 | 来源`

`parseMarkerItems(text,'出处')`，首字段=引文、次字段=来源（来源可空）。**区别于 blockquote 引用卡**（那是
`>` 行内引用的不对称构成块）：出处卡是**正式引文/脚注**——小字号、细左边线、右对齐来源署名：
```
<section data-ink-block="flagship-citation" style="margin:22px 0;padding:14px 18px;
  background-color:{paperWarm};border-radius:8px;border-left:3px solid {accentBorder};">
  <p style="margin:0;font-size:14px;line-height:1.85;color:{ink};font-family:{HTML_FONT};">{引文}</p>
  {来源非空: <p style="margin:10px 0 0;font-size:12px;color:{inkSoft};letter-spacing:0.5px;text-align:right;font-family:{HTML_FONT};">
    <span style="vertical-align:middle;">— {来源}</span>{diamondSep(accent)}</p>}
</section>
```

## B6. 折叠 marker 接线 `decorateFlagshipStretch(palette, opts)` — marker `[折叠] 标题 | 内容`

opts = `{ primaryColor: string; persona: PresetPersona }`（用于建 theme 取 allowMotion）。
遍历 `<p>`，命中 `parseMarkerItems(text,'折叠')`（首字段=标题、次字段=内容）→ 调 A3 的 i-stretch：
```ts
import { buildThemeContext } from './theme'
import { getSvgModule } from './index'    // 或直接 import { renderStretch } from './interactive'
// ...
const theme = buildThemeContext({ primaryColor: opts.primaryColor, persona: opts.persona, target })
const spec = getSvgModule('i-stretch')      // 若 index 未注册 interactive，则直接用 renderStretch
const svg = spec ? spec.render({ theme, text: 标题, items: [{ title: 标题, body: 内容 }] })
                 : renderStretch({ theme, text: 标题, items: [{ title: 标题, body: 内容 }] })
return svg   // 已是 <section data-ink-svg="i-stretch">…，自带哨兵
```
幂等：先 `if (html.includes('data-ink-svg="i-stretch"')) return html`（用 i-stretch 自身哨兵）。
**注意**：`getSvgModule('i-stretch')` 依赖 index.ts 是否注册 interactive 族——若未注册，**改为直接
`import { renderStretch } from './interactive'`**（不改 index.ts，与 interactive.ts 注释「不修改 index.ts」一致）。
建 theme 需要 `import { buildThemeContext } from './theme'`。

## B7. `themes.ts` — 接入 3 条 flagship chain（顺序关键）

在每条 `chainDecorators(...)` 里，于 `decorateFlagshipStat(...)` 之后、`decorateFlagshipFigure(...)` 之前，
插入 5 个新 `<p>`-marker 装饰器 + 折叠（**必须先于 Lede/H2/Lists**，否则 marker 段会被 versal/标题误吃）：
```
composeSvgDecorate(...),
decorateFlagshipReadingBar(P, { variant }),
decorateFlagshipStat(P),
decorateFlagshipBanner(P),            // 新
decorateFlagshipCompare(P),           // 新
decorateFlagshipTimeline(P),          // 新
decorateFlagshipGallery(P),           // 新
decorateFlagshipCitation(P),          // 新
decorateFlagshipStretch(P, { primaryColor: FLAGSHIP_X, persona: '…' }),  // 新（折叠）
decorateFlagshipFigure(P),
decorateFlagshipLede(P),
decorateFlagshipTOC(P),
decorateFlagshipH2(P, { variant }),
decorateFlagshipH3(P),
decorateFlagshipBlockquote(P),
decorateFlagshipLists(P),
decorateFlagshipFooterCard(P, FLAGSHIP_BRAND),
```
persona：kiln=`'creative'` / tempera=`'academic'` / amber=`'business'`（与各自 palette 派生一致）。
更新 themes.ts 顶部 import 增 6 个新装饰器名；更新 chain 注释。

## B8. `emit-flagship-artifacts.test.ts` — 加 R5 marker 演示

在 `PRERENDERED_HTML`（及/或 `SAMPLE_MARKDOWN`）正文里插入演示段（不破坏既有断言、既有结构）：
```
<p>[横幅] 工具的终点，是让创作回到表达本身。</p>
<p>[对比] 模板工具 | 千篇一律的通用组件，换个颜色还是同一张脸 || 墨铸旗舰 | 方格×菱形×印章长出专属母题，形成识别度</p>
<p>[时间线] 立意 | 先想清楚要对谁说什么 || 结构 | 用章节头与目录搭骨架 || 润色 | 金句、数据、图框点睛 || 成稿 | 一键导出公众号</p>
<p>[相册] 封面 | 满幅色带刊头 + 篆刻方印 || 章节头 | 构成主义满幅反白 + 方格铸号 || 版权页 | vessel mark + 双线 + 全文完</p>
<p>[出处] 克制不是寡淡，而是节制点缀的次数。 | 墨铸设计手记</p>
<p>[折叠] 为什么不用渐变？ | 微信 sanitizer 对 url(#id) 行为不可预测，全行业量产工具一致回避；墨铸用半透明叠加与实色块替代，保证粘贴后零破图。</p>
```
重生成 `prompts/0601/evidence/wechat-paste/flagship-{kiln,tempera,amber}.html`（`EMIT_ARTIFACTS=1`，报字节/时间戳）。

## B9. `html-blocks.test.ts` — R5 元素单测

每个元素：marker 触发命中、非命中原样、幂等（二跑===一跑）、输出无 forbidden 构造（无 class/var/calc/
gradient/transform style/flex/`<div>`）、含正确 `data-ink-block` 哨兵、字段正确转义。
- Banner：accentDeep 满幅 + 居中白字 + 白菱形。
- Compare：两 inline-block 列（含 `width:47%`、左 accentTint / 右 border）、字段拆分正确、<2 条目原样。
- Timeline：N 步、方格号 chip、border-left 轨、说明可空。
- Gallery：scroll-snap 轨（`overflow-x:auto` + `scroll-snap-type` + **无 flex**）、N 卡、卡宽 80%。
- Citation：左细线 + 右对齐来源、来源可空。
- Stretch：命中产出 `data-ink-svg="i-stretch"`（接 i-stretch）；preview target 含 cover+animate，xhs target 静态无 animate；幂等。

---

## 验证（主会话，派单后）

393px Playwright 渲染重生成的三产物自读图：6 新元素到位、不溢出、品牌母题一致（方格/菱形/印章/accentDeep
满幅语言连续）、折叠折叠态/展开态都合理。随后真公众号 paste 复核新元素存活（按
[[reference_wechat_render_selfcheck]]：Playwright 驱 live mp.weixin.qq.com 合成 paste，序列化回 DOM 数 svg/色块）。

## 测试总闸

`pnpm exec vitest run src/services/export` 全绿（报通过数）；`vue-tsc --noEmit` + `eslint` 干净；零删除；
非旗舰预设零行为改动（其 decorate 不含任何新装饰器）。
