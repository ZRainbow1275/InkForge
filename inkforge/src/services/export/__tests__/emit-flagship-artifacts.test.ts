/**
 * @vitest-environment happy-dom
 *
 * 一次性「真品产物」发射器（也是回归再生器）。
 *
 * 默认（普通 `pnpm test`）只在内存里跑真实管线并断言每个旗舰预设产物含
 * 'data-ink-svg' 与至少一个 '<svg'——这是真正的回归守护，永远执行，绝不写盘。
 * 只有显式设置 `EMIT_ARTIFACTS` 时才额外把三份独立 HTML 落盘（再生器路径）。
 * 重新生成产物：
 *   EMIT_ARTIFACTS=1 pnpm exec vitest run src/services/export/__tests__/emit-flagship-artifacts.test.ts
 *
 * 类型说明：本仓库 tsconfig 用 `types: ["vite/client"]`（无 @types/node 全局注入）。
 * 为避免 `/// <reference types="node" />` 把 Node 的 setTimeout/setInterval 重载灌进
 * 整个编译单元（会让别处 `window.setTimeout(): number` 退化为 NodeJS.Timeout，引发
 * 项目级 TS2322），此处仅在文件内**局部**声明本测试用到的极小 Node 表面，
 * 既能通过 vue-tsc 类型检查，又不污染全局 lib 重载。运行时由 vitest（node）真实提供。
 *
 * 为三个 SVG 旗舰预设（flagship-kiln / flagship-tempera / flagship-amber）跑
 * 真实微信导出管线，把结果包成可在 Chrome/Edge 直接打开、Ctrl+A → Ctrl+C 后
 * 粘进公众号后台的 STANDALONE HTML 文件，落盘到
 *   prompts/0601/evidence/wechat-paste/<presetId>.html
 *
 * 真实性：无 mock。优先走 markdownToWechat（marked → DOMPurify → highlight.js →
 * juice → 旗舰 SVG decorate → postProcess → enforcePlatformCSS → compliance）。
 * 若 lazy-import 的 mermaid/katex 让 happy-dom 超时，回退到 convertToWechatWithStats
 * + 本文件自带的忠实预渲染 HTML（同一条 wechat 管线，只是跳过 marked 这一步）。
 *
 * 断言守护：写盘前 assert 每份产物含 'data-ink-svg' 且至少一个 '<svg'，
 * 这样旗舰 SVG 注入一旦回归（被剥/未触发）此发射器即变红。
 */
// 局部 Node 表面经 ./node-builtins.shim.d.ts 声明（不引入 @types/node 全局，
// 避免污染 setTimeout/setInterval 重载）。`process` 仅声明本测试用到的 env 访问。
declare const process: { env: Record<string, string | undefined> }

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { ExportPreset } from '@/types'
import { getPresetById } from '../themes'
import { convertToWechatWithStats, markdownToWechat } from '../wechat'

// ─── 输出目录（仓库根 prompts/0601/evidence/wechat-paste） ────────────────
// this dir = inkforge/src/services/export/__tests__
const THIS_DIR = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(
  THIS_DIR,
  '../../../../../prompts/0601/evidence/wechat-paste',
)

const FLAGSHIP_IDS = ['flagship-kiln', 'flagship-tempera', 'flagship-amber'] as const

// ─── 富 CJK 样例文章 ──────────────────────────────────────────────────────
// 覆盖所有旗舰注入锚点：H1 标题 + 多个 H2 + 至少一个 H3 + 多段 CJK 正文（足以
// 在 375px 真机框下呈现 ~20-22 字/行）+ `---` 分隔线 + `>` 引用 + 有序 + 无序
// 列表 + 一段围栏代码 + 粗体/斜体。
const SAMPLE_MARKDOWN = `# 静谧刊印：当排版成为一种克制的力量

> 真正高级的版面，不是把所有华丽都堆上去，而是懂得在恰当处留白。

> 金句：删繁就简三秋树，领异标新二月花——克制，是版面的最高修辞。

在内容爆炸的时代，读者的注意力比任何时候都更稀缺。一篇文章能否被读完，往往不取决于它写得多好，而取决于它**读起来是否舒服**。排版，正是那道决定读者去留的隐形门槛。

[横幅] 工具的终点，是让创作回到表达本身。

## 一、为什么每行二十到二十二字最舒服

中文正文的可读性，与每行字数密切相关。研究表明，*移动端竖屏阅读*时，每行二十到二十二个汉字是公认的舒适区间。行太长，眼睛回扫时容易串行；行太短，则频繁换行打断节奏。

[数据] 20-22 | 汉字/行 | 移动端竖屏舒适区间

[对比] 模板工具 | 千篇一律的通用组件，换个颜色还是同一张脸 || 墨铸旗舰 | 方格×菱形×印章长出专属母题，形成识别度

[时间线] 立意 | 先想清楚要对谁说什么 || 结构 | 用章节头与目录搭骨架 || 润色 | 金句、数据、图框点睛 || 成稿 | 一键导出公众号

[相册] 封面 | 满幅色带刊头 + 篆刻方印 || 章节头 | 构成主义满幅反白 + 方格铸号 || 版权页 | vessel mark + 双线 + 全文完

[出处] 克制不是寡淡，而是节制点缀的次数。 | 墨铸设计手记

[折叠] 为什么不用渐变？ | 微信 sanitizer 对 url(#id) 行为不可预测，全行业量产工具一致回避；墨铸用半透明叠加与实色块替代，保证粘贴后零破图。

![示意图：版心宽度示例](https://placehold.co/720x420)

### 字号与行宽的换算

一个全角汉字的宽度约等于一个字号单位。因此当正文 \`max-width\` 设为二十二字、字号取十七像素时，恰好落在三百七十四像素左右——与主流手机视口宽度高度吻合。

- 字号过小：结构复杂的汉字难以辨认
- 行距过密：上下行互相干扰，呼吸感不足
- 行距过疏：超过字号本身则徒增翻页成本

## 二、装饰应当服务于结构

好的装饰，只出现在**结构性的节点**上：章节标题、段落分隔、引用卡片、文末签名。它们像乐谱里的休止符，标记节奏，而不喧宾夺主。

1. 标题头：用编号或竖线锚定层级，而非堆叠色块
2. 分隔线：一道细线、几枚菱形，足以宣告段落更替
3. 结束标：一个克制的签名，为全文画上句点

\`\`\`javascript
function lineWidth(maxEm, fontSize, letterSpacing) {
  // 每行字数 ≈ 可用宽度 / 单字推进
  const advance = fontSize + letterSpacing
  return Math.floor((maxEm * fontSize) / advance)
}
\`\`\`

---

> “删繁就简三秋树，领异标新二月花。” —— 郑板桥

当我们把多余的修饰逐一剥离，留下的才是真正经得起细看的版面。这，便是静谧刊印的全部要义。
`

// ─── 预渲染 HTML 兜底（与 SAMPLE_MARKDOWN 结构对应，忠实还原 marked 产物形状） ──
// 仅在 markdownToWechat 超时/抛错时使用，喂给同一条 convertToWechatWithStats 管线。
const PRERENDERED_HTML = `<h1>静谧刊印：当排版成为一种克制的力量</h1>
<blockquote><p>真正高级的版面，不是把所有华丽都堆上去，而是懂得在恰当处留白。</p></blockquote>
<blockquote><p>金句：删繁就简三秋树，领异标新二月花——克制，是版面的最高修辞。</p></blockquote>
<p>在内容爆炸的时代，读者的注意力比任何时候都更稀缺。一篇文章能否被读完，往往不取决于它写得多好，而取决于它<strong>读起来是否舒服</strong>。排版，正是那道决定读者去留的隐形门槛。</p>
<p>[横幅] 工具的终点，是让创作回到表达本身。</p>
<h2>一、为什么每行二十到二十二字最舒服</h2>
<p>中文正文的可读性，与每行字数密切相关。研究表明，<em>移动端竖屏阅读</em>时，每行二十到二十二个汉字是公认的舒适区间。行太长，眼睛回扫时容易串行；行太短，则频繁换行打断节奏。</p>
<p>[数据] 20-22 | 汉字/行 | 移动端竖屏舒适区间</p>
<p>[对比] 模板工具 | 千篇一律的通用组件，换个颜色还是同一张脸 || 墨铸旗舰 | 方格×菱形×印章长出专属母题，形成识别度</p>
<p>[时间线] 立意 | 先想清楚要对谁说什么 || 结构 | 用章节头与目录搭骨架 || 润色 | 金句、数据、图框点睛 || 成稿 | 一键导出公众号</p>
<p>[相册] 封面 | 满幅色带刊头 + 篆刻方印 || 章节头 | 构成主义满幅反白 + 方格铸号 || 版权页 | vessel mark + 双线 + 全文完</p>
<p>[出处] 克制不是寡淡，而是节制点缀的次数。 | 墨铸设计手记</p>
<p>[折叠] 为什么不用渐变？ | 微信 sanitizer 对 url(#id) 行为不可预测，全行业量产工具一致回避；墨铸用半透明叠加与实色块替代，保证粘贴后零破图。</p>
<p><img src="https://placehold.co/720x420" alt="示意图：版心宽度示例"></p>
<h3>字号与行宽的换算</h3>
<p>一个全角汉字的宽度约等于一个字号单位。因此当正文 <code>max-width</code> 设为二十二字、字号取十七像素时，恰好落在三百七十四像素左右——与主流手机视口宽度高度吻合。</p>
<ul>
<li>字号过小：结构复杂的汉字难以辨认</li>
<li>行距过密：上下行互相干扰，呼吸感不足</li>
<li>行距过疏：超过字号本身则徒增翻页成本</li>
</ul>
<h2>二、装饰应当服务于结构</h2>
<p>好的装饰，只出现在<strong>结构性的节点</strong>上：章节标题、段落分隔、引用卡片、文末签名。它们像乐谱里的休止符，标记节奏，而不喧宾夺主。</p>
<ol>
<li>标题头：用编号或竖线锚定层级，而非堆叠色块</li>
<li>分隔线：一道细线、几枚菱形，足以宣告段落更替</li>
<li>结束标：一个克制的签名，为全文画上句点</li>
</ol>
<pre><code class="language-javascript">function lineWidth(maxEm, fontSize, letterSpacing) {
  // 每行字数 ≈ 可用宽度 / 单字推进
  const advance = fontSize + letterSpacing
  return Math.floor((maxEm * fontSize) / advance)
}
</code></pre>
<hr>
<blockquote><p>“删繁就简三秋树，领异标新二月花。” —— 郑板桥</p></blockquote>
<p>当我们把多余的修饰逐一剥离，留下的才是真正经得起细看的版面。这，便是静谧刊印的全部要义。</p>`

/** 跑真实微信管线：优先 markdown 全链路，超时/出错回退预渲染 HTML（同一条管线）。 */
async function runRealWechatPipeline(
  preset: ExportPreset,
): Promise<{ html: string; entry: string }> {
  try {
    const html = await markdownToWechat(SAMPLE_MARKDOWN, preset)
    return { html, entry: 'markdownToWechat' }
  } catch {
    const { html } = convertToWechatWithStats(PRERENDERED_HTML, preset)
    return { html, entry: 'convertToWechatWithStats(prerendered)' }
  }
}

/** 把导出片段包成可独立打开/粘贴的标准 HTML 文档。 */
function wrapStandalone(presetId: string, presetName: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>InkForge 旗舰 SVG 排版 · ${presetName}（${presetId}）</title>
</head>
<body style="max-width:677px;margin:24px auto;padding:0 12px;background:#ffffff;">
${bodyHtml}
</body>
</html>
`
}

// 仅当显式开启 EMIT_ARTIFACTS 时才写盘——普通测试运行绝不改动仓库。
const SHOULD_EMIT = Boolean(process.env.EMIT_ARTIFACTS)

describe('emit flagship WeChat paste artifacts', () => {
  it('renders the 3 flagship presets through the real pipeline and (optionally) writes paste-ready HTML', async () => {
    if (SHOULD_EMIT) {
      mkdirSync(OUT_DIR, { recursive: true })
    }

    for (const id of FLAGSHIP_IDS) {
      const preset = getPresetById(id)
      expect(preset, `preset ${id} must exist in themePresets`).toBeTruthy()
      if (!preset) continue

      const { html, entry } = await runRealWechatPipeline(preset)

      // 回归守护：旗舰 SVG 图形（封面/分隔）必须真实落在产物里。永远执行。
      expect(html, `${id}: 产物必须含 data-ink-svg 哨兵（pipeline=${entry}）`).toContain(
        'data-ink-svg',
      )
      expect(html, `${id}: 产物必须含至少一个 <svg（pipeline=${entry}）`).toMatch(/<svg\b/i)

      // 高级 HTML 色块结构守护（用户「太素」修复后的新形态）：每份旗舰产物必须含
      // 填充/淡彩 H2 色块 + 引用卡 + 文末落款卡，确保色块层未回归。
      expect(html, `${id}: 必须含 flagship H2 色块（pipeline=${entry}）`).toContain(
        'data-ink-block="flagship-h2"',
      )
      expect(html, `${id}: 必须含 flagship 引用卡（pipeline=${entry}）`).toMatch(
        /data-ink-block="flagship-(quote|callout)"/,
      )
      // 列表标记色块（无序方块 / 有序圆形编号 chip）——「太素」修复的列表层守护。
      expect(html, `${id}: 必须含 flagship 列表标记色块（pipeline=${entry}）`).toMatch(
        /data-ink-block="flagship-(ul|ol)"/,
      )
      expect(html, `${id}: 必须含 flagship 文末落款卡（pipeline=${entry}）`).toContain(
        'data-ink-block="flagship-footer"',
      )

      if (!SHOULD_EMIT) continue

      const doc = wrapStandalone(id, preset.name, html)
      const outPath = resolve(OUT_DIR, `${id}.html`)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, doc, 'utf-8')

      // eslint-disable-next-line no-console
      console.log(`[emit] ${id} via ${entry} → ${outPath}`)
    }
  })
})
