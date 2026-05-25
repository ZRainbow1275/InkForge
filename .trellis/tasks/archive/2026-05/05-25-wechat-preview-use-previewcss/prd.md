# 微信预览+导出排版视觉丰富度提升

## Goal

微信预设在编辑器预览和导出中视觉不够丰富 — 12 个预设切换后差异不明显。用户目标：让微信**导出效果**也和预览一样丰富。

根因：
1. 预览走 `convertToWechat()` 全导出管线（juice + 合规化），使用 exportCSS（精简版）
2. 8/12 预设 previewCSS ≈ exportCSS，两者本身就不够丰富
3. 4 个重预设（thesis/legal/report/commentary）previewCSS 很丰富但从未被使用
4. 12 个伪元素效果缺少 decorate 钩子，无法桥接到导出

## Research References

- [`research/wechat-pipeline.md`](research/wechat-pipeline.md) — 微信导出管线全链路分析
- [`research/wechat-css-capabilities.md`](research/wechat-css-capabilities.md) — 微信公众号 2025 CSS 实际支持能力
- [`research/xhs-zhihu-pipeline.md`](research/xhs-zhihu-pipeline.md) — xhs/zhihu mock 渲染器架构对比
- [`research/mock-renderer-architecture.md`](research/mock-renderer-architecture.md) — mock 渲染器设计蓝图
- [`research/previewcss-vs-exportcss-analysis.md`](research/previewcss-vs-exportcss-analysis.md) — 12 预设逐条 CSS 差异量化
- [`research/gitnexus-architecture.md`](research/gitnexus-architecture.md) — 代码图谱 + 影响范围分析
- [`research/platform-css-rules.md`](research/platform-css-rules.md) — 平台 CSS 合规规则

## What I already know

### 微信 CSS 真实能力
- **strips `<style>`** → juice 内联对导出是必要的
- **@font-face 不生效** → 自定义字体只在预览生效，导出回退系统字体
- **支持**: box-shadow, border-radius, linear-gradient(inline), opacity, float, 全套排版属性
- **不支持**: flex/grid, transform, filter, var(), calc(), text-shadow, position sticky/fixed, 伪元素(因 style 被 strip)

### 12 预设分层
| 层级 | 预设 | previewCSS vs exportCSS 差距 | 现状 |
|---|---|---|---|
| Tier 1 | aigc, code, notes, news, meme, life, elegant, tech (8个) | 仅多 `--ink-accent` var() | **两者都不够丰富** |
| Tier 2 | thesis | 25 条额外规则, 70% juice-safe | 3 个伪元素无 decorate |
| Tier 3 | legal, report, commentary | 25-30 条, 50-60% juice-safe | 12 个伪元素无 decorate |

### 架构现状
- xhs/zhihu 有独立 mock 渲染器（preview-fidelity/），预览注入 `<style>` 不走 juice
- 微信无 mock 渲染器，预览和导出走同一管线
- `generateThemeCSS(preset, target)` 已支持 'preview'|'export' 参数切换
- `convertToWechat` 影响范围 LOW（2 个直接调用方）

### 缺失的 decorate 钩子（12 个）
1. thesis: h3::before `§`、hr::before `· · ·`、::marker 颜色
2. legal: ::first-letter drop cap、h2 罗马计数、blockquote 大引号
3. report: h1::after 下划线、h2 编号徽章、ol 自定义计数
4. commentary: h1::after 红条、h2 左侧条、h3 下划线、hr 菱形装饰

## Requirements

### P1: 建微信 mock 渲染器（对齐三平台架构）
- 新建 `preview-fidelity/wechat-mock.ts` → `renderWechatMockHtml()`
- 输入：已渲染 HTML + previewCSS + preset 配置
- 输出：`<style>` 注入 + `<section id="wechat-article">` 容器包裹
- CSS rescoping: `#nice` → `#wechat-article`
- 浏览器原生渲染伪元素/counter/字体 — 无需 decorate
- `usePreviewRenderer.ts` wechat 分支改用 mock 渲染器

### P2: 导出管线切换到 previewCSS
- `wechat.ts:1221` 从 `generateThemeCSS(preset, 'export')` 改为 `generateThemeCSS(preset, 'preview')`
- juice 内联 90%+ 属性（font-family、background、border、color、spacing 等）
- enforcePlatformCSS 兜底不支持的属性
- 对 Tier 1（8 预设）：previewCSS 多出的 `--ink-accent` 被 var() 替换逻辑处理或被 enforcePlatformCSS 剥离，无副作用
- 对 Tier 2-3（4 预设）：大量 juice-safe 属性直接生效

### P3: 补齐 12 个缺失的 decorate 钩子
为 thesis/legal/report/commentary 补写 decorate 函数，将伪元素效果转为真实 HTML：
- `§` 前缀 → `<span>§ </span>`
- `· · ·` hr 装饰 → `<span>` 居中文本
- drop cap → `<span style="float:left;font-size:3em;...">` 首字母
- 罗马计数 → `<span>§ I. </span>`
- 大引号 → `<span>"</span>`
- h1/h2/h3 装饰 → `<span>` 注入
- ol 自定义编号 → `<span>01</span>` 前缀
- hr 菱形 → `<span>◆</span>`

### P4: 解决 applyHeadingDecorations 与 recipe 冲突
- thesis 金星 vs 第N章 — 二选一或合并
- elegant 书名号 vs 第N章 — 同上
- tech gradient vs block-ribbon — 同上

## Acceptance Criteria

- [ ] 编辑器预览：12 预设切换有明显视觉差异（字体、颜色、装饰元素）
- [ ] 微信导出：复制到微信后保留 90%+ 预览视觉效果
- [ ] thesis 导出含 § 前缀、居中 · · · 分隔线
- [ ] legal 导出含首字下沉、罗马编号
- [ ] report 导出含编号徽章、蓝色左边框标题
- [ ] 8 个 Tier1 预设导出无 regression
- [ ] xhs/zhihu 预览和导出无 regression

## Definition of Done

- 三平台预览架构统一（均有 mock 渲染器）
- 预览 ≈ 导出视觉一致性
- 现有测试通过
- typecheck 通过

## Technical Approach

### 改动文件
1. **新建** `src/services/export/preview-fidelity/wechat-mock.ts`
2. **修改** `src/composables/usePreviewRenderer.ts` — wechat 分支改用 mock
3. **修改** `src/services/export/wechat.ts:1221` — `'export'` → `'preview'`
4. **修改** `src/services/export/themes.ts` 或 `preset-decorations.ts` — 补 decorate 钩子
5. **修改** `src/services/export/themes.ts` — 解决 decoration 冲突

### 风险评估
- convertToWechat 影响范围 LOW（GitNexus: 2 直接调用方）
- generateThemeCSS 参数变更无破坏性（已有 preview 支持）
- mock 渲染器是新增代码，不影响现有路径
- decorate 钩子是新增逻辑，不影响已有钩子

### P5: 重新设计 Tier 1（8 预设）previewCSS 视觉语言
现有 8 个预设 previewCSS ≈ exportCSS，视觉区分度极低。需要为每个预设设计独特视觉语言：

| 预设 | Persona | 设计方向 |
|---|---|---|
| aigc (AIGC) | business | 科技商务：渐变标题背景、数据蓝、mono代码风 |
| code (编程创造) | creative | 终端风：暗底亮字代码块、绿色光标装饰、等宽字体 |
| notes (学习笔记) | lifestyle | 手写风：暖色便签背景、手写字体、标注高亮 |
| news (新闻) | creative | 报刊风：多栏感、粗黑标题、红色强调、紧凑行距 |
| meme (整活) | creative | 潮流：大号斜体标题、霓虹色、emoji装饰、活泼间距 |
| life (人生感悟) | lifestyle | 文艺：大行距、淡雅背景、细衬线、引用装饰 |
| elegant (优雅) | lifestyle | 古典：大号首字、书法体、装饰性分隔线、典雅配色 |
| tech (科技) | creative | 极客：几何装饰、code-block风格引用、sharp角 |

每个预设需要：
- 独特的 previewCSS（完整 CSS3，含伪元素/字体/装饰）
- 对应的 exportCSS（juice-safe 子集）
- 必要的 decorate 钩子（伪元素→HTML 转换）

## Out of Scope

- 新增预设（数量不变，仍 12 个）
- xhs/zhihu 渲染改动
- 微信 dark mode
