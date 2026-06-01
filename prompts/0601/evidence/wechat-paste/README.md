# 微信公众号「真机粘贴」验证产物 — SVG 旗舰预设

本目录下的三份 `.html` 是 **InkForge 真实微信导出管线** 的产物（无 mock），供你在浏览器里复制后粘进 **公众号后台编辑器**，在手机上肉眼验证 inline-SVG 高级排版。

- `flagship-kiln.html` — 赤陶旗舰（Kiln `#D95B3F`，creative）
- `flagship-tempera.html` — 铜绿旗舰（Tempera `#3B7A6B`，academic）
- `flagship-amber.html` — 黄铜旗舰（Amber `#C19A56`，business）

> 再生方式：`cd inkforge && pnpm exec vitest run src/services/export/__tests__/emit-flagship-artifacts.test.ts`
> （该 emitter 用真实 `markdownToWechat` 全链路重新产出本目录文件，并断言每份含 `data-ink-svg` + `<svg`。）

---

## 每份产物注入的 SVG 模块（data-ink-svg）

| 预设 | 封面 cover | 标题头 header | 分隔 hr | 引用 quote | 结束标 endmark |
|------|-----------|--------------|---------|-----------|----------------|
| flagship-kiln | `cover-grid` | `header-ribbon`(H2×2) / `header-vrule`(H3) | `divider-forge` | `quote-mark`×2 | `endmark-vessel` |
| flagship-tempera | `cover-title` | `header-bracket`(H2×2) / `header-vrule`(H3) | `divider-diamond` | `quote-corner`×2 | `endmark-fin` |
| flagship-amber | `cover-title` | `header-vrule`(H2×2) | `divider-grid` | `quote-vbar`×2 | `endmark-rule` |

---

## 人工粘贴步骤（每份产物各做一次）

1. 用 **Chrome 或 Edge** 打开 `<presetId>.html`（双击即可）。
2. 在页面正文区按 **Ctrl + A**（全选），再按 **Ctrl + C**（复制）。
3. 浏览器登录 **https://mp.weixin.qq.com** 公众号后台。
4. 左侧「内容与互动 → 草稿箱 → 新的创作 → **图文消息**」（或「新建图文消息」）。
5. 鼠标点进 **正文编辑区**，按 **Ctrl + V** 粘贴。
6. 点编辑器右上的 **「预览」**，用 **微信扫码在手机上打开**（PC 预览不触发 SMIL，且不代表真机渲染，务必上手机）。
7. 在手机微信里逐项核对下方清单。

> 注意：PC 后台预览经常**不渲染 inline SVG / 不触发点击交互**；**以手机微信内的真机渲染为准**。若某模块在手机上不显示，记录在「结果」栏，作为微信 sanitizer 行为的真实反馈。

---

## 验证清单（每份产物逐项打勾）

- [ ] **封面 banner** 在正文顶部可见（标题底纹 / 网格 / 大字标题）。
- [ ] **章节标题头**（ribbon / bracket / 竖线 accent）在每个二级、三级标题处渲染，颜色为该预设品牌色。
- [ ] **分隔线**（Forge 线 / 菱形 / 网格）在 `---` 处替换为 SVG 装饰。
- [ ] **引用卡**（大引号 / 角标 / 左竖条）在两处引用块处渲染。
- [ ] **文末结束标**（vessel / 全文完 / 细线署名）出现在文章末尾。
- [ ] **正文每行约 20–22 个汉字**（手机竖屏下数一行字数）。
- [ ] SVG 随屏宽 **自适应缩放**（`width:100%` + viewBox 生效），无横向溢出。
- [ ] 无乱码、无被吞标签、无明显错位。

---

## 结果记录（粘贴后填写）

### flagship-kiln（赤陶旗舰）
- 真机渲染日期 / 微信版本：
- 封面：
- 标题头：
- 分隔线：
- 引用卡：
- 结束标：
- 每行字数：
- 问题 / 截图链接：

### flagship-tempera（铜绿旗舰）
- 真机渲染日期 / 微信版本：
- 封面：
- 标题头：
- 分隔线：
- 引用卡：
- 结束标：
- 每行字数：
- 问题 / 截图链接：

### flagship-amber（黄铜旗舰）
- 真机渲染日期 / 微信版本：
- 封面：
- 标题头：
- 分隔线：
- 引用卡：
- 结束标：
- 每行字数：
- 问题 / 截图链接：

---

## 样例文章摘要

三份产物用同一篇富 CJK 样例文章渲染（覆盖全部注入锚点）：

- 标题《静谧刊印：当排版成为一种克制的力量》（H1）
- 两个 H2 章节（每行 20–22 字论证 + 装饰服务结构）、一个 H3（字号与行宽换算）
- 多段 CJK 正文（含**粗体** / *斜体* / 行内 `code`）
- 一个 `---` 分隔线、两处 `>` 引用块
- 一个无序列表 + 一个有序列表
- 一段 JavaScript 围栏代码块（`lineWidth(...)`）
