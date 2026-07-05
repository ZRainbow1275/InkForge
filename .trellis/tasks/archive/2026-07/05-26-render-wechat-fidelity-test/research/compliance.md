# WeChat 公众号合规性审计 — `正文1.0-wechat.html`

**Verdict: ⚠️ CONCERNS** — 输出通过了所有"会被微信拒绝"的硬性合规门槛（无脚本/iframe/form、无 var()/flex/grid/animation/transition/filter、有 SVG 兜底、有 677 clamp、class 已剥离），但存在 14 处 `<table>/<thead>/<th>/<td>` 出现**重复 `style=` 属性**的结构性缺陷，以及全文 252 处 `linear-gradient` 高亮在微信暗黑模式下会消失（因 `enableDarkMode:false` 未注入 `data-darkmode-*`）。属可粘贴可发布、但仍有可观察到的退化风险。

---

## 10 项合规清单

| # | 项 | 结果 | 计数 / 证据 |
|---|---|---|---|
| 1 | CSS 属性泄漏 | ✅ PASS | section#nice 内 `var(`/`display:flex`(非 inline)/`display:grid`/`animation:`/`transition:`/`backdrop-filter:`/`filter:`/`clip-path:`/`text-shadow:`/`-webkit-background-clip:text`/`position:fixed|sticky`/`gap:`/`box-shadow ... inset`/`@media`/`@keyframes`/`transform:` 全部 **=0**。注：初次扫描误把 29 个 `text-transform:uppercase` 算作 transform，确认后实际 transform 属性为 0。 |
| 2 | section#nice 包装 | ✅ PASS | 开标签包含 `font-size:16px; line-height:1.75; color:#1A3A5C; word-break:break-word; padding:0 4px`。注意：postProcess 步骤 10 的默认 `padding:16px` 没生效——preset 自己写了 `padding:0 4px`，先到先得；这是预期行为不是 bug。 |
| 3 | 677px clamp 包装 | ✅ PASS | `<div data-wechat-clamp="1" style="max-width:677px;margin:0 auto;">` 紧贴 section#nice 内部首位，闭合 `</div></section>` 成对。结构顺序：sentinel-p → section#nice → clamp-div → 内容 → /div → /section → sentinel-p。 |
| 4 | SVG 复制兼容兜底 `<p>` | ✅ PASS | 零高 sentinel `<p style="font-size:0;line-height:0;margin:0;padding:0">&nbsp;</p>` 共 **2** 处，分别位于 section#nice 前 (@byte 1744) 和后 (@byte 114004)，与 doocs/md 习惯一致。 |
| 5 | class 残留 | ✅ PASS | section#nice 内 `class=` 出现 **0** 次（postProcess 步骤 7.5 在 juice 内联完毕后剥离）。 |
| 6 | 禁用标签/属性 | ✅ PASS | section#nice 内 `<script` `<iframe` `<form` `<input` `<button` `<object` `<embed` `onerror=` `onload=` `javascript:` `onclick=` `onmouseover=` 均为 **0**。 |
| 7 | 暗黑模式元数据 | ✅ PASS | `enableDarkMode:false` 传入，section#nice 内 `data-darkmode-*` 计数 **0**，唯一 data-* 属性是 `data-wechat-clamp`（=1）。 |
| 8 | 表格 th/td 内联边框 | ⚠️ CONCERN | 全部 3 `<th>` 与 9 `<td>` 均含 `border:1px solid …; padding:10px 12px;`，但 **14 个表格相关元素带有两个 `style=` 属性**（1 table + 1 thead + 3 th + 9 td）。HTML5 spec 要求重复属性只保留第一个；当下首个 `style=` 已含正确 border/padding，故视觉无回归；但若 WeChat 编辑器粘贴时对属性做 normalize，第二个 `style=` 中的 `align="left" style="…"` 会被丢弃，造成内部不可预测。需在 wechat 后处理收口。 |
| 9 | 阅读时长头注入 | ✅ PASS | section#nice 顶部存在 `<span>阅读约 100 分钟</span> · <span>全文 29919 字</span> · <span>1 张表</span>`，间隔点用 `display:inline-block;width:3px;height:3px;border-radius:50%` 的 span 实现，与 `stats.json` 完全对齐（readingTime=100, wordCount=29919, tableCount=1）。 |
| 10 | 脚注/cite-status | ✅ PASS | 文章链接数 0 → section#nice 内 `<footnotes>` / "footnote" / "参考" 均为 **0**，仅 1 处 "引用"（正文用词）。`enableCiteStatus:true` 在零链接场景下正确空操作。 |

---

## Risk Register（粘贴到微信编辑器的 Top 3 风险）

1. **暗黑模式下 252 处荧光笔高亮消失** — `<strong>` 上 `background:linear-gradient(180deg, transparent 60%, rgba(0,64,128,0.15) 60%)` 在白底正常显示；微信暗黑模式渲染器若无 `data-darkmode-bgcolor` 标注，会按"未声明暗黑色"丢弃 background，导致夜读用户看到的强调词彻底失去视觉权重。
   - **Mitigation**: 在 `wechatComplianceTransform` 中将 `enableDarkMode` 默认设为 `true` 并为 `<strong>` 补充 `data-darkmode-bgcolor`；或在 preset 层把荧光笔改为 `color` 强化（粗体+主色）兜底。

2. **14 处表格元素重复 `style=` 属性** — HTML5 spec 下浏览器只保留第一个 `style=`，故视觉当前 OK；但 WeChat 服务端粘贴流水线会做 DOM normalize，部分历史版本会把后写覆盖先写，届时 `border:1px solid #D8E2EC` 会被 9.1 步注入的 `border:1px solid #ddd` 替换，破坏行业研报的 navy/灰白色彩体系。
   - **Mitigation**: `postProcessForWechat` 步骤 9.1 应先检查是否已存在 `style=`，若有则 merge 进首个 style 而不是追加第二个 `style=`。当前 regex `match.replace(/style="([^"]*)"/, …)` 只替换了第一个匹配，外加 `${attrs}` 又拼接了完整原始属性串，造成重复。

3. **section#nice 不含 postProcess 默认 padding/font-size** — 由于 preset 层先写入了完整 inline style，步骤 10 的"补缺省"匹配 `(?![^>]*style=)` 直接跳过；这意味着任何未指定 padding 的 preset（未来新增主题）会失去微信侧 16px padding 兜底。本次 report preset 自带 `padding:0 4px`，不影响。
   - **Mitigation**: postProcess 步骤 10 改为 merge-if-missing（解析现有 style → 补齐缺失键），而不是"有 style 就放弃"。或在 `applyPresetWechat` 入口强制 preset 必须声明 font-size/line-height/color/padding/word-break 五要素并由 schema 校验。
