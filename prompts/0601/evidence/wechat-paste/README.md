# 微信公众号「真机粘贴」验证产物 — SVG 旗舰预设

本目录下的三份 `.html` 是 **InkForge 真实微信导出管线** 的产物（无 mock），供你在浏览器里复制后粘进 **公众号后台编辑器**，并通过手机微信扫码预览验证 inline-SVG 高级排版。

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

**当前状态（2026-06-09）**：`flagship-kiln` 与 `flagship-tempera` 已在真实 `mp.weixin.qq.com` PC 图文编辑器中通过 paste 事件验证。微信 paste sanitizer 保留 inline SVG 与 `data-ink-svg`，PC 编辑器可视化渲染成立；PC 验证还暴露并修复了封面长标题溢出。`flagship-amber` 已由真实导出管线、Tauri/WebView2 e2e 和本地 artifact probe 覆盖。2026-06-08 在已认证 `.ProseMirror` 编辑器里的普通 `text/html` 剪贴板重试失败：剪贴板 artifact 含 `data-ink-svg=3` / `svg=35` / `data-ink-block=23`，真实 `Control+V` 后微信编辑器读回仍为纯文本（`data-ink-svg=0` / `svg=0` / `style=0`）。2026-06-09 随后使用 CloakBrowser 在真实微信 PC 编辑器中以程序化 `ClipboardEvent('paste')` + `DataTransfer` 注入同一 `flagship-amber.html`，微信自身 paste handler 接管并阻止默认行为，读回保留 `data-ink-svg=3`、`svg=35`、`styleAttr=195`、`classAttr=30` 和完整正文结构；证据见 `amber-pc-clipboardevent-readback-20260609.txt`。因此 amber 现在只有**特定 ClipboardEvent channel 的 PC DOM readback**，普通 Ctrl+V 仍阻断，三旗舰最终仍需手机微信扫码预览来确认移动端渲染、SMIL 交互、暗黑模式和封面缩略图。

1. 用 **Chrome 或 Edge** 打开 `<presetId>.html`（双击即可）。
2. 在页面正文区按 **Ctrl + A**（全选），再按 **Ctrl + C**（复制）。
3. 浏览器登录 **https://mp.weixin.qq.com** 公众号后台。
4. 左侧「内容与互动 → 草稿箱 → 新的创作 → **图文消息**」（或「新建图文消息」）。
5. 鼠标点进 **正文编辑区**，按 **Ctrl + V** 粘贴。
6. 按微信后台要求插入/选择封面缩略图，点编辑器右上的 **「预览」**，用 **微信扫码在手机上打开**。
7. 在手机微信里逐项核对下方清单。

> 注意：本次实测的 PC 图文编辑器会保留并渲染 inline SVG，但 PC 后台仍不能代表最终手机微信渲染，也不能证明 SMIL 交互和暗黑模式。最终验收以手机微信扫码预览为准。

---

## 验证清单（每份产物逐项打勾）

- [ ] **封面 banner** 在正文顶部可见（标题底纹 / 网格 / 大字标题）。
- [ ] **章节标题头**（ribbon / bracket / 竖线 accent）在每个二级、三级标题处渲染，颜色为该预设品牌色。
- [ ] **分隔线**（Forge 线 / 菱形 / 网格）在 `---` 处替换为 SVG 装饰。
- [ ] **引用卡**（大引号 / 角标 / 左竖条）在两处引用块处渲染。
- [ ] **文末结束标**（vessel / 全文完 / 细线署名）出现在文章末尾。
- [ ] **正文每行约 20–22 个汉字**（手机竖屏下数一行字数）。
- [ ] SVG 随屏宽 **自适应缩放**（`width:100%` + viewBox 生效），无横向溢出。
- [ ] **SMIL / 点击交互**（若该产物包含互动模块）在手机微信预览中可触发；PC 后台或本地预览不能替代。
- [ ] **暗黑模式** 下 SVG/HTML block 不反色、不丢不透明背景，正文和 SVG 文本保持可读。
- [ ] **封面缩略图 / 预览入口** 已按微信后台要求设置并能打开手机预览。
- [ ] 无乱码、无被吞标签、无明显错位。

---

## 结果记录（粘贴后填写）

### flagship-kiln（赤陶旗舰）
- PC 后台粘贴：已验证，inline SVG 和 `data-ink-svg` 保留；封面长标题溢出已修复后重验。
- 手机预览日期 / 微信版本：
- 封面：
- 标题头：
- 分隔线：
- 引用卡：
- 结束标：
- 每行字数：
- SMIL / 点击交互：
- 暗黑模式：
- 封面缩略图 / 预览入口：
- 问题 / 截图链接：

### flagship-tempera（铜绿旗舰）
- PC 后台粘贴：已验证，`cover-title` 与 `quote-corner` 可视化渲染；封面长标题溢出已修复后重验。
- 手机预览日期 / 微信版本：
- 封面：
- 标题头：
- 分隔线：
- 引用卡：
- 结束标：
- 每行字数：
- SMIL / 点击交互：
- 暗黑模式：
- 封面缩略图 / 预览入口：
- 问题 / 截图链接：

### flagship-amber（黄铜旗舰）
- PC 后台粘贴：普通剪贴板路径阻断。2026-06-08 已认证微信图文编辑器重试中，artifact 在剪贴板里是富 HTML/SVG，但 `Control+V` 后编辑器 DOM 读回为纯文本，`data-ink-svg=0`、`svg=0`、`style=0`。2026-06-09 CloakBrowser 以程序化 `ClipboardEvent('paste')` + `DataTransfer` 触发真实微信 PC 编辑器 paste handler，同一 `flagship-amber.html` 读回 `data-ink-svg=3`、`svg=35`、`styleAttr=195`、`classAttr=30`，并在重启后只读确认首页近期草稿未出现新增可见草稿；详见 `amber-pc-clipboardevent-readback-20260609.txt`。该证据只覆盖特定 PC ClipboardEvent channel，不等于普通 Ctrl+V、手机预览、同步或发布通过。
- 手机预览日期 / 微信版本：
- 封面：
- 标题头：
- 分隔线：
- 引用卡：
- 结束标：
- 每行字数：
- SMIL / 点击交互：
- 暗黑模式：
- 封面缩略图 / 预览入口：
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
