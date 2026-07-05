# 实现规格 — 旗舰「重型杂志感」(Bold Magazine) 升级

> 触发：用户两次判旗舰排版「太素 / 和公众号排版工具一样」。0602 选定方向 = **重型杂志感**
> (GQ实验室/三联级)：满幅深色实色块章节头、白字反白、巨号章节数字、超大标题、满幅色带封面。
> 这是把现有「克制色块」层的**参数全面加重**，不是另起炉灶。

## 根因（为什么现在素）
- `decorateFlagshipH2` kiln 变体只有 `font-size:19px / padding:11px` 的小实色条；tempera/amber 是
  数字 chip / 左细条 + ink 标题 → 全是轻量元素，手机上塌成「模板工具」长相。
- 封面 `renderCoverTitle` = `paperWarm` 浅底 + 极低透明度细线纹理 + 单菱形签名 → 太轻。
- 缺一个「能稳吃白字」的深色 accent → amber(#C19A56) 白字 CR≈2.0 连 AA 大字都不到，无法做反白满幅块。

## 改动清单（4 源文件 + 4 测试）

### 1. `svg-modules/types.ts` — `SvgPalette` 加字段
- 新增必填 `accentDeep: string`（accent 的加深版，保证白字 CR ≥ 4.5，用于满幅反白块/色带封面）。
- 放在 `accent` 附近，写注释「满幅反白块/色带专用的深色 accent，白字 CR≥4.5」。

### 2. `svg-modules/theme.ts` — `deriveSvgPalette` 派生 `accentDeep`
- 新增纯函数 `darkenForWhiteText(hex, minWhiteCr = 4.5)`：
  把 accent 朝黑(#000)按 t=0..0.8、step 0.04 混合，取**最小** t 使
  `contrastRatio(relativeLuminance('#ffffff'), relativeLuminance(blended)) >= minWhiteCr`；
  扫完仍不达标则 t=0.8。`blend(c,t)=Math.round(c*(1-t))`。返回 6 位 hex（带 #）。
  必须确定性（同输入同输出，快照稳定）；复用已有 `hexToRgb`/`relativeLuminance`/`contrastRatio`
  （`contrastRatio` 目前是文件内私有 function，可直接调用，无需导出）。
- `deriveSvgPalette` 返回对象加 `accentDeep: darkenForWhiteText(accent)`。
- 预期：kiln #D95B3F(白CR3.81)→ 加深到白CR≥4.5（约 t=0.12，≈#BF503７ 量级）；
  tempera #3B7A6B(5.02)→ 已达标，t=0 不变；amber #C19A56(2.0)→ 深棕铜（约 t≈0.36，≈#7C6237 量级）。
  **不要硬编码这些 hex**，让算法算；测试只断言「白字 CR≥4.5」+「amber 的 accentDeep≠accent」。

### 3. `svg-modules/covers.ts` — 封面改「重型杂志」
**通用：** 保留 viewBox 1080×620、`fitCharsPerLine`/`splitLines`、`svgSection`、`assertWechatSafe` 子集。
去掉「太轻」元素（极低透明度纹理线、右下单菱形）。标题字重 700→**800**。

**`renderCoverTitle`（tempera + amber 用）= 顶部满幅色带刊头：**
- bg = `darkSafeBg(W,H, palette.paperWarm)`。
- **顶部满幅色带**：`rect(0,0,1080,140, palette.accentDeep)`。带内：
  - 左：persona kicker（`personaKicker`，深读/洞察/专栏）`textLine` x=80 y≈92 fontSize=48 weight=700
    letterSpacing=6 fill=`palette.paper`(#fff)。
  - 右：`textLine` anchor='end' x=1000 y≈92 text='SERIAL' fontSize=26 weight=600 letterSpacing=8
    fill=`palette.paper` opacity=0.7。
- **超大标题**（纸面）：fontSize=**100** weight=800 fill=`palette.ink` letterSpacing=2 x=80，
  `splitLines(title, fitCharsPerLine(W-160,100,2), 2)`（≈9 字/行，2 行容 18 字，勿增大到截断标题），
  titleStartY≈320 lineH=120。
- **重 accent tab**（标题下）：`rect(80, tabY, 96, 12, palette.accent)`（粗短色块，杂志味）。tabY=标题末行下 ~28。
- **byline**：tab 下 `textLine` x=80 fontSize=28 fill=palette.inkSoft text= subtitle 优先，否则 '文 / 墨铸'。
- 删除原 texture/topRule/diamondMark/bottomRule。

**`renderCoverGrid`（kiln 用）= 满幅实色封面（最猛）：**
- bg = `darkSafeBg(W,H, palette.accentDeep)`（整封面深 accent 实色）。
- 轻构成主义网格保留**白色低透明**残迹：2~3 条 `rect(... fill=palette.paper, opacity=0.1)` 竖/横线作肌理，
  勿满铺（保留 cover-grid 的几何身份但不抢戏）。
- kicker：**paper(#fff) 实底 chip + accentDeep 文字**（在彩底上反差最大）。沿用 `kickerChip` 但传
  accent=`palette.paper`、onAccent=`palette.accentDeep`，x=80 y=80。
- 超大标题 fontSize=100 weight=800 fill=`palette.paper`(#fff) x=80 y≈330 2 行。
- 重 tab：`rect(80, tabY, 96, 12, palette.paper)`（白 tab）。
- 单 accent 交点圆点删除或改为白点低调；不要原细网格满框。

**`renderCoverQuote`**：本轮可不动（仅 cover-title/grid 在旗舰 plan 用）。

### 4. `svg-modules/html-blocks.ts` — H2 满幅反白块 + H3/引用加重
**`decorateFlagshipH2`：三变体改为满幅 accentDeep 实色块 + 巨号 + 反白**（白字始终安全，因 accentDeep 保证 CR≥4.5；
直接用 `#ffffff` / `rgba(255,255,255,a)`，不必走 onAccent）。共享结构：
```
<section data-ink-block="flagship-h2" style="margin:38px 0 20px;">
  <section style="background-color:{accentDeep};border-radius:6px;padding:18px 22px;">
    <p style="margin:0;font-size:34px;font-weight:800;line-height:1;letter-spacing:2px;
       color:rgba(255,255,255,0.9);font-family:{HTML_FONT};">{idx}</p>
    <p style="margin:9px 0 0;font-size:21px;font-weight:700;line-height:1.45;letter-spacing:0.5px;
       color:#ffffff;font-family:{HTML_FONT};">{inner}</p>
  </section>
</section>
```
保留计数器在返回闭包内、`data-ink-block="flagship-h2"` 幂等哨兵、`<h2>` 正则替换。
**差异化（都满幅，仅编号处理不同，留品牌识别）：**
- kiln：如上（纯反白巨号，最强）。
- tempera：编号包白描边框 `<span style="display:inline-block;border:2px solid rgba(255,255,255,0.55);
  border-radius:5px;padding:0 12px;font-size:30px;font-weight:800;color:#fff;...">{idx}</span>`（学术编号框），标题行同。
- amber：编号上方加小 kicker `<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:3px;
  color:rgba(255,255,255,0.7);...">PART</p>` + 巨号 + 标题（商务）。

**`decorateFlagshipH3`：左 5px accent 竖条 + ink 18px/700 + 轻底**（明显弱于 H2 满幅块、强于现在）：
```
<section data-ink-block="flagship-h3" style="margin:28px 0 14px;border-left:5px solid {accent};
  background-color:{accentTint};border-radius:0 5px 5px 0;padding:9px 16px;">
  <p style="margin:0;color:{ink};font-size:18px;font-weight:700;line-height:1.5;letter-spacing:0.5px;
     font-family:{HTML_FONT};">{inner}</p>
</section>
```

**`decorateFlagshipBlockquote`：引用卡加重**——左竖条 4px→**6px**、底 `accentTint`→**`accentTintStrong`**、
引用 glyph 44→**56**、正文 16→**17px**。callout 框左条 4px→**5px**、底用 `accentTintStrong`（warning 仍用 ember 低透明度底）。
其余（保留内部 HTML、署名分离、图标 path）不变。

**lists / footer 本轮不动**（已是色块，避免一次改太多；后续迭代再加重）。

## 微信安全 & 不可破坏（硬约束）
- 只用：`background-color/border/border-left/border-radius/padding/margin/box-shadow非inset/color/
  font-*/text-align/line-height/letter-spacing/display:inline-block/vertical-align/word-break`。
- 禁：class/id/`<style>`/var()/calc()/gradient/transform/transition/animation/filter/flex/grid/
  position/`<div>`。图标只内联 `<path>`，**绝不 emoji**。
- 封面 SVG 必过 `assertWechatSafe`。嵌套 `<section>`（块中块）可用（footer 已验证存活）。
- 零删除：26 个 SVG 模块、所有装饰器、cover-quote 全留；只改参数与 H2/封面形态。

## 测试更新（必须全绿）
- `__tests__/theme.test.ts`：加 accentDeep 断言——三预设 `accentDeep` 白字 CR≥4.5（用导出的
  `relativeLuminance` 自算或断言已知量级）、amber `accentDeep`≠`accent`、确定性（同输入 toEqual）。保留 onAccent 测试。
- `__tests__/html-blocks.test.ts`：H2 断言改为含 `background-color`(accentDeep) + `#ffffff` 反白 + 编号；
  保留幂等、哨兵、无 forbidden 构造(gradient/var/calc/transform/flex/class)、footer append-once、callout 分流。
- `__tests__/emit-flagship-artifacts.test.ts` + `flagship-pipeline-smoke.test.ts`：跑通、产物经
  `assertWechatSafe`/checkWechatSafe（17 规则）；若断言旧字符串需同步。重生成
  `prompts/0601/evidence/wechat-paste/flagship-{kiln,tempera,amber}.html`。
- 全量：`pnpm exec vue-tsc --noEmit` + `pnpm exec eslint` 干净；export 测试套件全绿。

## 验证（主会话做，不在 implement 内）
本地 Playwright 393px 渲染三产物 + 自读图（见 reference_wechat_render_selfcheck）；用户真机扫码人工终判。
