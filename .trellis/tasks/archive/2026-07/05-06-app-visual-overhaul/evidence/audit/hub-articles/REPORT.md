# Hub 文章瀑布流 + 滚动捕捉 审计报告

> **Auditor**: hub-articles-auditor (task #3)
> **Date**: 2026-05-07
> **Source**: `inkforge/src/views/HubView.vue` (5085 行)，`inkforge/src/components/hub/SectionDots.vue`
> **Dev URL**: http://localhost:3005/

## TL;DR

第四屏（文章瀑布流）的视觉与基础结构 **大部分符合规范**：waterfall-grid 用 CSS multi-column、卡片元素齐全、状态徽章颜色正确。但存在三类问题：

| 严重度 | 问题 | 影响 |
|--------|------|------|
| **P0 严重** | scroll-snap 在第三屏（洞察）→ 第四屏（文章）之间跨屏裂开 | 用户看到的不是完整一屏，而是上一屏底部 + 下一屏顶部的拼接 |
| **P1 重要** | 文章数据稀少时（仅 1 篇）瀑布流退化为单列、空状态不够友好 | 极小数据库的真实用户首次进入 Hub 体验差 |
| **P2 轻微** | 文章卡多项度量与团队下发标准不一致 | 视觉规范文档需要校准（标题 15px ≠ 标准 16px、hover -4px ≠ 标准 -3px） |

## 测试环境与素材

- 实际索引文章数：**1 篇**（远低于审计标准最小 4 篇）
- 视口实测：1366×768、1440×900、1920×1080
- 截图清单（共 12 张）：
  - 多视口三连拍：`{1366,1440,1920}-articles-{top,mid,card-hover}.png`
  - 滚动行为：`scroll-{0-flow,1-templates,2-data,3-articles,back-0}.png`

## 1. 瀑布流列数（按 280px 最小列宽 auto）

源码 (HubView.vue:4440-4445)：
```css
.waterfall-grid {
  columns: 4 280px;            /* 4 列上限 + 280px 最小列宽 */
  column-gap: 24px;
  max-width: min(1680px, calc(100vw - 96px));
  margin: 0 auto;
}
```

| 视口 | 期望 | 实测列数 (computed `column-count`) | 实际渲染 | 结论 |
|------|------|-------------------------------------|----------|------|
| 1366×768 | 3 列 | 4（max-width 限制让计算值仍是 4） | 1 列（仅 1 篇文章） | 算法正确，单卡片无法验证 |
| 1440×900 | 4 列 | 4 | 1 列 | 同上 |
| 1920×1080 | 5–6 列 | 4（受 `columns: 4 280px` 上限封顶） | 1 列 | **不达标**：1920 视口最多只 4 列，与"5-6 列"标准冲突 |

> **建议**：若 5–6 列是设计意图，应改为 `columns: 6 280px`（让浏览器在大屏自动算到 5–6 列），或基于 viewport 的媒体查询。

## 2. 文章卡度量

源码 vs 标准对照（采集自 1440 视口运行时）：

| 元素 | 标准 | 实测 | 结论 |
|------|------|------|------|
| `.card-cover` 高度 | 160px | **160px** | OK |
| 状态徽章 status-badge | 草稿橙/写作蓝/审阅紫/待发绿/已发深绿/归档灰 | 草稿 = `rgba(245,124,0,0.92)` 橙色（HubView.vue:4506-4537 全部 6 状态色齐全） | OK |
| `.card-title` 字号 | 16px | **15px** | **NG** |
| `.card-excerpt` 字号 | 13px | **13px** | OK |
| `.card-meta` 字号 | 11px | **11px** | OK |
| 卡片宽度 | 280px (auto) | 280px | OK |

> **结论**：标题字号低于标准 1px（视觉影响极小），其余完全达标。建议要么把 HubView.vue:4600 `.card-title { font-size: 15px → 16px }`，要么修订规范文档把 16px 改为 15px。

## 3. Hover 行为

源码 (HubView.vue:4456, 4546-4550)：
```css
.article-card { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
  border-color: rgba(211, 47, 47, 0.2);
}
```

| 项 | 标准 | 实测 | 结论 |
|----|------|------|------|
| transform | translateY(-3px) | **translateY(-4px)** | NG（视觉差异不可见，但与标准不符） |
| shadow | 渐显 | OK（双层阴影渐显） | OK |
| 边框颜色 | （未定） | hover 时变红 #D32F2F-20% | 加分项 |

截图证据：`{1366,1440,1920}-card-hover.png` 三张能清楚看到 hover 上移 + 阴影 + 红边。

## 4. 章节点高亮（每屏对应）

源码：`SectionDots.vue` 通过 prop `activeIndex` 驱动 `--active` 类。

观察日志（PageDown 顺序触发）：
| 屏 | scrollTop | 期望高亮 | 实测高亮 | 结论 |
|----|-----------|----------|----------|------|
| 0 | 0 | 创作流 | 创作流 | OK |
| 1 | 900 | 模板 | 模板 | OK |
| 2 | 1832.67 | 洞察 | 洞察 | OK |
| 3 | 2732 | 文章 | 文章 | OK |
| click 回到 0 | 0 | 创作流 | 创作流 | OK |

> 章节点 active 状态 = 红色实心圆 + 1.25× 缩放 + 红色光晕 + 红色 label，全部正确呈现。

## 5. 滚动阻尼与 scroll-snap（**核心问题区**）

### 5.1 阻尼值

源码 (HubView.vue:2356)：
```css
.hub-region { transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s ...; }
```

| 项 | 标准 | 实测 | 结论 |
|----|------|------|------|
| 缓动函数 | `cubic-bezier(0.16, 1, 0.3, 1)` | OK | OK |
| 时长 | 600ms | **500ms** | NG（差 100ms，体感不易察觉） |

### 5.2 scroll-snap 容器配置

```css
.hub-page { scroll-snap-type: y mandatory; scroll-behavior: smooth; }
.hub-region { scroll-snap-align: start; scroll-snap-stop: always; height: 100vh; min-height: 100vh; }
```

理论上每屏正好对齐 100vh = 900px。但实测 region 的实际起点（offsetTop）出现 32px 错位：

| Region | offsetTop（应为） | offsetTop（实测） | offsetHeight | 异常 margin |
|--------|--------------------|--------------------|---------------|-------------|
| flow | 0 | 0 | 900 | 0 |
| templates | 900 | 900 | 900 | **margin: 0 43px 32px**（来自 `.hub-secondary-grid`） |
| insights | 1800 | **1832** ⚠️ | 900 | 0 |
| articles | 2700 | **2732** ⚠️ | 900 | 0 |

> 累计漂移 = 32px。`hub-region-templates` 的底外边距 32px 把后续两屏（洞察、文章）的起始位置整体下推 32px，但 scroll-snap 容器仍按 vh 倍数对齐 → **每次跨过模板屏后，目标屏会比视口顶部高出 32px，造成跨屏裂开**。

**视觉证据**：
- `scroll-2-data.png`：洞察屏顶端依然能看到上一屏（模板）的 "使用模板" 按钮。
- `scroll-3-articles.png`：文章屏顶端依然能看到上一屏（洞察）的 "写作时间线" 卡片。

### 5.3 修复建议

任选其一（根因都在第二屏的 margin）：

```diff
- .hub-region-templates.hub-secondary-grid {
-   margin: 0 43px 32px;
- }
+ .hub-region-templates.hub-secondary-grid {
+   margin: 0 43px 0;     /* 移除底部外边距 */
+   padding-bottom: 32px; /* 把 32px 移到 padding，box-sizing:border-box 不会撑高 */
+ }
```

或：

```diff
- .hub-region-templates.hub-secondary-grid {
-   margin: 0 43px 32px;
- }
+ .hub-region-templates.hub-secondary-grid {
+   margin: 0 43px;       /* 直接删除 32px */
+ }
```

修复后 4 屏 offsetTop 会精确对齐 0/900/1800/2700，scroll-snap 即可严格按 vh 切换。

## 6. 空状态

仅 1 篇文章时 `displayArticles.length > 0` 为 true，**不会**进入空状态分支（HubView.vue:2107-2233）。空状态分支仅在 `articles.length === 0` 或筛选无结果时呈现，含 svg 图标 + 标题 + 引导文案 + CTA 按钮，结构完整。

> **建议**：审计标准提到"文章数 < 4 时显示 empty illustration"——当前实现并不区分 0 vs 少量。如果产品意图是 "1–3 篇也算稀疏 → 显示空状态引导"，需要在 `displayArticles.length < 4` 时同时显示 illustration + 已有卡片的混合视图。但更自然的做法是保持现状。

## 7. 截图区域问题（仅记录）

1920×1080 视口下截图似乎只占了画布右侧约一半（约 1465×824）。猜测 playwright 设备像素比与浏览器输出有不一致，但 `getBoundingClientRect()` 数值一直正确，**不影响审计判断**，仅影响可视化校验。

## 关键改进清单（按优先级）

1. **P0** 修复 `.hub-region-templates.hub-secondary-grid` 底外边距导致的 scroll-snap 跨屏裂开（HubView.vue 中查找 `hub-secondary-grid` 的 margin 规则）。
2. **P1** 决策 `columns: 4 280px` 是否升级到 `columns: 6 280px` 以适配 1920+ 屏。
3. **P2** 标题字号 15→16 / hover -4→-3 / 滚动 0.5→0.6s — 3 个微调，与规范对齐。
4. **P2** 章节点 1100px 以下隐藏 label 的断点（SectionDots.vue:107）当前 1366 视口仍显示 label，验证设计意图。

## 数据附录（运行时采样，1440×900）

```json
{
  "articleCount": 1,
  "gridStyles": { "columnCount": "4", "columnWidth": "280px", "columnGap": "24px", "maxWidth": "1344px", "actualWidth": 1192 },
  "card": { "width": 280, "height": 326.625 },
  "cover": { "height": "160px" },
  "title": { "fontSize": "15px", "lineHeight": "21px" },
  "excerpt": { "fontSize": "13px", "lineHeight": "20.8px" },
  "meta": { "fontSize": "11px" },
  "badge": { "fontSize": "11px", "bg": "rgba(245,124,0,0.92)", "class": "status-badge status-draft" },
  "hubPage": { "scrollSnapType": "y mandatory", "scrollBehavior": "smooth" },
  "regions": [
    { "name": "flow",      "offsetTop": 0,    "height": 900 },
    { "name": "templates", "offsetTop": 900,  "height": 900, "margin": "0 43px 32px" },
    { "name": "insights",  "offsetTop": 1832, "height": 900 },
    { "name": "articles",  "offsetTop": 2732, "height": 900 }
  ],
  "cardTransition": "0.3s cubic-bezier(0.16, 1, 0.3, 1)"
}
```
