# 实现规格 R2 — 墨铸品牌设计系统（独特感 / 品牌感 / 设计感）

> 用户对 R1「重型杂志感」判：方向对，**继续加重细节 + 增加元素，务必给人深刻印象，要有区别于市场
> 其他风格的独特感、品牌感、设计感**。
> 策略：把「墨铸」品牌母题织成一套**可识别的设计语言**（铸字 × 构成主义 × 金石印章），
> 既不像 135/秀米 模板，也不像通用杂志。R1 的满幅色块/反白/巨号全部保留，本轮**只增不减**。

## 母题系统（贯穿全篇的视觉签名）
1. **篆刻方印「墨铸」**（NEW）——金石印章，全篇最强品牌信号。
2. **铸字巨号**（已有 R1 H2 巨号）+ **方格/菱形**（来自 vessel mark 的 grid/diamond）——一致的几何点缀。
3. **首字下沉 versal**（NEW）——「以笔铸字」的开篇铸印。
4. **vessel mark 鼎×笔尖×方格**（已有 `renderVesselMark`）——文末徽印。

## 改动清单（只增不减；6 项）

### A. NEW 印章原语 `renderSeal()` — 放 `svg-modules/primitives.ts`（或 endmarks.ts 旁，建议 primitives）
篆刻方印，纯微信安全子集（圆角 rect 实底 + 内描边 rect + 两行 text）。签名：
```ts
export function renderSeal(o: {
  cx: number; cy: number; size: number;     // 方印中心 + 边长
  fill: string;                              // 印底（accentDeep）
  textColor: string;                         // 反白印文（#fff）
  font: string;                              // 宋/serif 字体栈
  chars?: [string, string];                  // 默认 ['墨','铸']
}): string
```
构图：外圆角方 `rect(x=cx-size/2,y=cy-size/2,w=size,h=size, rx=size*0.16, fill)`；
内白描边 `rect` inset≈size*0.09、`fill:none stroke:textColor strokeWidth≈size*0.045`；
印文两字**竖排两行**（上「墨」下「铸」），`textLine` anchor=middle，fontSize≈size*0.36，weight 700，
fill=textColor，font=serif，letterSpacing 0；两行 y 分别 cx 上下 size*0.2。必须过 `assertWechatSafe`。
**绝不** emoji / 渐变 / defs。

### B. 封面 → 报头（nameplate）：`covers.ts`
**`renderCoverTitle`（tempera+amber）**在 R1 满幅色带刊头基础上加：
- 色带内右侧把 `SERIAL` 换成品牌报头：右上 `墨铸` 大字（fontSize≈36 weight700 fill=paper letterSpacing4，anchor=end x=1000 y≈74）+ 其下小字 `MOZHU PRESS · SERIAL`（fontSize20 paper opacity0.7 letterSpacing4 anchor=end x=1000 y≈108）。
- 标题下 accent tab 之后加 **双细线报头规则**：两条平行 `hairlineRule`（间距 8，宽 W-160，fill=hairline）——报头质感。
- 封面**右下角放方印** `renderSeal({cx:W-120, cy:H-110, size:120, fill:palette.accentDeep, textColor:palette.paper, font:COVER_FONT_SERIF})`。
- byline 仍在（subtitle 优先否则「文 / 墨铸」），位置避开右下印章。

**`renderCoverGrid`（kiln 满幅实色封面）**：
- 右下方印改 `fill=palette.paper, textColor=palette.accentDeep`（彩底上白印反差最大）。
- 报头同上但全用 paper 色（白报头字）。双线规则用 paper opacity0.3。

### C. NEW 首字下沉 `decorateFlagshipLede(palette)` — `html-blocks.ts`，**排在 chain 最前**（composeSvgDecorate 之后、H2/quote/list 之前）
把开篇正文段首字铸成 versal cast initial：
- 锁定规则（robust）：文档序中第一个 `<p>…</p>`，满足 **全部**：① 不在任何 `<blockquote>…</blockquote>` 区间内（先算出所有 blockquote 区间，命中则跳过）；② 不含 `data-ink`；③ 纯文本长度 ≥ 24；④ 不匹配 `/阅读|分钟|全文.*字/`。只处理**第一个**命中段；幂等哨兵 `data-ink-block="flagship-lede"`。
- 取该段首个字符（CJK 单字；若首字符是标签/空白则取首个文本字符），包成 cast 方印 versal：
```
<span data-ink-block="flagship-lede" style="display:inline-block;background-color:{accentDeep};
  color:#ffffff;font-size:40px;font-weight:800;width:52px;height:52px;line-height:52px;
  text-align:center;border-radius:7px;margin:2px 12px 0 0;vertical-align:-9px;
  font-family:'Songti SC','SimSun',serif;">{首字}</span>{该段余下 inner}
```
保留段落其余 HTML（strong/em/code 等不破坏）。注意：首字若被 `<strong>` 等包裹，安全做法=只在纯文本首字符处切（可对 inner 做：跳过前导标签，取第一个文本字符替换为 versal span + 该字）。

### D. 分隔线加重 + 品牌化：`dividers.ts`
把旗舰用到的三个 render 加重为「明确设计过的品牌分隔」（保留 moduleId/注册，仅改几何）：
- `divider-diamond`（tempera）：中央 **实心 accent 菱形**（边长 R≈14，比现状大）+ 左右各一枚 accentSoft 小菱形（R≈8）+ 两侧 hairline 长线到版心；三菱形居中。
- `divider-grid`（amber）：中央 **2×2 方格**（来自 vessel 母题，accent 描边 + 中心 accent 实心小方）+ 两侧 hairline。
- `divider-forge`（kiln）：中央 accentSoft 光晕圆 + **ember 实心点**（每模块≤1，保留）+ 两侧 hairline，点半径加大到 R≈6，光晕 R≈22。
原则：一眼看出是「品牌分隔符」而非 markdown 的三点。仍过 `assertWechatSafe`。

### E. 文末 → 版权页（colophon）：`html-blocks.ts` `decorateFlagshipFooterCard`
在现有落款卡（vessel mark + brand + tagline + 全文完）上升级为设计过的 colophon：
- vessel mark 保留（顶部居中）。
- 单短 accent 线 → **双细线**（两条 `<section style="display:inline-block;width:64px;height:1px;...">` 上下叠，间距 4，父 text-align:center 居中）。
- 「全文完」下方加 **方印** `renderSeal`（小，size≈64，fill=accentDeep，textColor=paper）居中作品牌钢印。
- 维持 paperWarm 卡 + hairline 边 + 圆角。整体读作「奥科洛丰 / 版权页」。
- 仍 append-once、`data-ink-block="flagship-footer"` 幂等。

### F. 关键句高亮加深：`themes.ts` 三旗舰 `#nice strong` CSS（约 1160/1166 行附近）
`background: rgba(<accent>,0.12)` → `rgba(<accent>,0.18)`，并加 `border-bottom: 2px solid rgba(<accent>,0.5);`
（juice 内联后 border-bottom + background 微信均保留）。padding 维持。三预设各自 accent rgba 同步。

## 硬约束（同 R1，违反返工）
- 微信安全子集；禁 class/id/style/var/calc/gradient/transform/transition/animation/filter/flex/grid/position/`<div>`；图标/印章只内联 `<path>/<rect>/<text>`，**绝不 emoji**。封面/印章/分隔 SVG 必过 `assertWechatSafe`。
- **零删除**：26 SVG 模块、所有装饰器、cover-quote、R1 全部成果保留。非旗舰预设（12 微信/5 小红书/3 知乎）零行为改动。
- 标题不截断（cover 标题 ≥9 字/行，17 字 2 行无 '…'）。
- ember 每屏 ≤2：印章默认用 accentDeep（非 ember）；divider-forge 的 ember 点保留是唯一 ember。

## 测试（全绿 + 重生成产物）
- `primitives.test.ts`（若有）或新增：`renderSeal` 输出含两字、过 checkWechatSafe、无 forbidden。
- `covers.test.ts`：cover 含 seal（两印字）+ 双线规则 + 报头「墨铸」字样。
- `html-blocks.test.ts`：新增 lede versal 断言（首字 versal、仅一次、跳过 blockquote 内 `<p>`、跳过阅读 meta、幂等）；footer 含 seal + 双线。
- `dividers.test.ts`：三 divider 加重后仍过 checkWechatSafe + 含品牌几何。
- `themes` / flagship 相关：strong 高亮 rgba 0.18 + border-bottom 断言（如有覆盖）。
- 跑 `pnpm exec vitest run src/services/export` 全绿；`vue-tsc --noEmit` + `eslint` 干净；
  `EMIT_ARTIFACTS=1` 重生成 `prompts/0601/evidence/wechat-paste/flagship-{kiln,tempera,amber}.html`。

## 验证（主会话）
本地 393px Playwright 渲染三产物 + 自读图（封面报头+印章、lede versal、品牌分隔、colophon 全部到位且不溢出）。
