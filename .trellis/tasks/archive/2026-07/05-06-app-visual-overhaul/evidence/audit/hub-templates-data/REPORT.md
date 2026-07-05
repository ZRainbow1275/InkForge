# Hub 第二/三屏审计报告（精选模板 + 数据洞察）

**审计员**：hub-templates-data-auditor
**任务 ID**：05-06-app-visual-overhaul / Task #2
**审计 URL**：http://localhost:3005/
**视口**：1366×768 / 1440×900 / 1920×1080
**截图目录**：`.trellis/tasks/05-06-app-visual-overhaul/evidence/audit/hub-templates-data/`

---

## 0. 总体结论

| 维度 | 结论 | 严重度 |
|------|------|--------|
| 第二屏（精选模板） | UI 基本符合 spec，chip 切换逻辑正确，常用入口存在 | 中 |
| 第三屏（数据洞察） | 1920 视口下表现良好；**1366 / 1440 视口存在 section 高度溢出 + 模板与洞察叠加渲染** | **严重** |
| Section 章节点 | 章节 dot 高亮可工作，标签为「创作流 / 模板 / 洞察 / 文章」 | 低 |
| Hover 反馈 | insight-card 在三视口下 hover 状态**未触发** transform / box-shadow 变化 | 高 |

---

## 1. Section 架构（与 spec 偏离）

实际 DOM 把 hub 拆成 4 个等高 `.hub-region`，单个 region 高度 = `clientHeight`（viewport 高度）：

```
.hub-page (overflow: auto, scrollHeight=4×viewport)
├── .hub-region.hub-region-flow      (height = clientHeight)
├── .hub-region.hub-region-templates (height = clientHeight) ← 第二屏
├── .hub-region.hub-region-insights  (height = clientHeight) ← 第三屏
└── .hub-region.hub-region-articles  (height = clientHeight) ← 第四屏
```

而内部 section 实际高度（1366×768 视口）：
- `.template-market-section`: 1036.76 px（**> region 高度 768，溢出 268 px**）
- `.data-insights-section`: 1486.35 px（**> region 高度 768，溢出 718 px**）

→ 在 1366/1440 视口下，下一个 section 必然会叠加上一个未 clip 的内容；`.hub-region--visible` 没有 `overflow: hidden`，导致**视觉灾难**。

---

## 2. 第二屏：精选模板（Templates）

### 2.1 默认状态（chip = 全部）— 通过

| 项 | 实测 | 期望 | 结论 |
|----|------|------|------|
| section header | 「精选模板」标题 + 红色 kicker「模板」+ 右上 8/8 计数 badge | 同 spec | ✅ |
| chip 列表 | 全部8 / 内容创作2 / 技术写作2 / 生活记录2 / 工作文档2（5 个 pill） | 同 spec | ✅ |
| active chip | bg `rgb(211,47,47)` (#D32F2F)，色 `rgb(255,255,255)`，圆角 999px，padding 7×14px | 红底白字 | ✅ |
| inactive chip | bg `#FFFFFF`，色 `rgb(69,90,100)`，描边 `0.66px solid #ECEFF1` | 白底灰字 | ✅ |
| 卡片网格 | `display:grid; grid-template-columns: 278.78 278.79 278.78; gap: 16px`（3 列等宽） | 3 列对齐 | ✅ |
| 首张卡片 | CTA「+ 新建模板 / 从空白起稿，保存为常用模板」，bg `#FAFBFC`，dashed border `#CFD8DC` | + 新建模板 | ✅ |
| 普通卡片 | 分类 kicker（如「技术写作」）+ 标题（如「教程类」）+ 描述 + 红色「使用模板」按钮，padding 14px，圆角 14px | 同 spec | ✅ |
| 卡片总数 | 9 个（含 CTA） | 8 个模板 + 1 CTA = 9 | ✅ |

**截图**：
- `1366-templates-default.png`（OK）
- `1440-templates-default.png`（OK）
- `1920-templates-default.png`（OK，3×3 网格完整展示 9 张）

### 2.2 chip 切换 = 「技术写作」— 通过

| 项 | 实测 | 结论 |
|----|------|------|
| active 切换 | 「技术写作」红底白字，「全部」恢复 inactive | ✅ |
| 计数 badge | 8/8 → 2/8 | ✅ |
| 过滤结果 | 仅显示「教程类」「技术博客」+ CTA = 3 张卡 | ✅ |

**截图**：`1366-templates-chip-tech.png` / `1440-templates-chip-tech.png` / `1920-templates-chip-tech.png`

### 2.3 常用入口（右侧栏 quick-actions-card）— 部分通过

实测右栏存在 `quick-link-btn` 4 项（顺序与 spec 一致）：
1. 空白开始
2. 模板创建
3. 导入文档
4. 打开草稿箱

但**未审计 hover 效果**（spec 要求红色边框）— 因截图未触发 hover 状态，需在专项交互回归中补测。

右栏底部还包含 spec 未覆盖的额外区块：
- `workflow-progress-link`「文章整理进度 0% / 设置目标」
- `productivity-draft-item`「未命名文稿 3/28 · 6 小时前 · 3 字 / 继续最近草稿 / 查看全部草稿」
- 写作目标 / 草稿箱 / 分类系统 / 素材沉淀 4 个统计小卡

→ **spec 缺失项**：「常用入口」实测包含至少 3 个未在 spec 列出的二级模块，建议团队 lead 决定是裁剪还是 spec 补漏。

---

## 3. 第三屏：数据洞察（Insights）

### 3.1 sr-only 标题 — 通过

实测 `.data-insights-section h2.sr-only` 存在「创作数据洞察」，`offsetParent === null`（屏幕外），符合 spec「数据洞察 / 创作数据已隐藏」。

可视的 H3 列表正确：
- 写作热力 / 生产力洞察 / 字数趋势 / 字数分布 / 分类分布

### 3.2 Section 高度溢出（**严重 bug**）

| 视口 | section 高度 | region 高度 | 溢出 | 视觉灾难 |
|------|-------------|-------------|------|----------|
| 1366×768 | 1486.35 px | 768 px | **+718 px** | 模板第三排 + 数据洞察 + 文章瀑布流前两行**全部叠在一屏** |
| 1440×900 | 类似 | 900 px | **约 +600 px** | 同上 |
| 1920×1080 | 内容能压缩到 1080 内 | 1080 px | 无溢出 | **干净，spec 达标** |

**证据**：
- `1366-data-default.png`：左上角能看到模板「读书笔记」+「使用模板」按钮残留，下方紧贴写作热力
- `1440-data-default.png`：模板第三排「读书笔记」/「对比分析」/「空白文档」+ chip 痕迹与数据洞察整片重叠
- `1920-data-default.png`：完美 1×2 + 3 列布局，无溢出

**根因**：`.hub-region` 用 viewport-height 切片，但 section 内部使用 `display: block` + 自然高度，**未做 max-height clip 或缩放适配**。

### 3.3 写作热力（Heatmap）

| 项 | 实测 | spec | 结论 |
|----|------|------|------|
| 占位文字 | 「暂无写作热力 / 创建或编辑文章后，这里会按真实日期生成热力格。」居中 | 居中 | ✅ |
| 35 天 badge | 文字色 `#D32F2F`，bg `rgba(211,47,47,0.08)`，padding 5×9px，位于 head 右上 | 右上角红色 | ✅ |
| 占位状态 | calendar svg + 居中文案 | 同 spec | ✅ |

### 3.4 生产力洞察（Productivity）

实测 6 个小卡（spec 写 4 个）：
1. 最高产时段 — `17:00` / 1 次编辑
2. 最高产星期 — `周三` / 1 次活动
3. 平均长度 — `3 字` / 1 篇文章
4. 最长文章 — `3 字` / 未命名文稿 3/28
5. 写作速度趋势 — `0 字/日` / 按最近更新时间聚合
6. 最活跃分类 — `未分类` / 按文章数量计算

→ **spec 偏差**：实际是 6 个，不是 4 个。建议确认是否需要裁剪到 4 个或更新 spec。
→ 单核心数字 + 副标签的视觉模式 ✅ 符合。

### 3.5 字数趋势 / 字数分布 / 分类分布（3 列）

| 项 | 实测 | 结论 |
|----|------|------|
| 3 列等宽 | OK（1920 视口下） | ✅ |
| 字数趋势空状态 | 「暂无字数趋势 / 有文章内容后，会按真实更新时间聚合每日字数」+ 趋势 svg | ✅ |
| 字数分布 active bar | 0-500 区间显示红色 bar，1 篇；其他 0 篇灰色 | ✅ 「红色 active bar 无 0/0/0 灾难」 |
| 分类分布 | 未分类 1，单 bar | ✅ |

### 3.6 写作时间线

| 项 | 实测 | 结论 |
|----|------|------|
| 时间点圆 + 标题 + 副标 | 「未命名文稿 3/28 · 编辑 · 5/6 17:02」「未命名文稿 3/28 · 创建 · 3/28 23:08」 | ✅ |
| 「最近 2 条」badge | 右上角 | ✅ |

### 3.7 标签云（**部分通过 / 数据问题**）

实测 5 个 chip：草稿 / 已发布 / 灵感 / 笔记 / 待整理

| 项 | 实测 | spec | 结论 |
|----|------|------|------|
| 中文标签 | ✅ 5 个全中文 | ✅ |
| 颜色按 id-hash | 草稿 `#D32F2F`、已发布 `#1565C0`、灵感 `#F57C00`、笔记 `#6A1B9A`、待整理 `#2E7D32` | 多色按 hash | ✅ |
| 尺寸按 log scale | **全部 fontSize: 20px**，无大小差异 | 按权重区分 | ❌ |
| 占位文案 | 「为文档添加标签后，这里会展示真实的标签云。」与 chip **同时显示**（看似既有又空） | 二选一 | ⚠️ |

→ **bug**：标签云没有按权重排序大小（log scale 未生效），且占位文案不该和 5 个 chip 同框出现 — 这 5 个其实是「示例 chip」而不是真实标签，需要 UX 决定是当作占位还是真数据。

### 3.8 hover 反馈（**严重 bug**）

实测 `.insight-card.contribution-card`：
- `transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s` ✅ 已配置
- hover 后 `transform: none`、`box-shadow: rgba(38, 50, 56, 0.08) 0px 14px 40px 0px`（与默认相同）

→ **CSS 中没有 :hover 伪类规则被触发**。三视口的 hover 截图与 default 截图视觉上**完全相同**。

---

## 4. 章节点（Section Dots）

`fixed; right: 18px`，4 个 dot：
- 创作流 / 模板 / 洞察 / 文章

scrollTop = clientHeight 时，「模板」高亮 ✅
scrollTop = clientHeight × 2 时，「洞察」高亮 ✅
（与 spec 一致）

---

## 5. 不符合 spec / 需修复清单（按优先级）

| # | 严重度 | 问题 | 视口 | 修复建议 |
|---|--------|------|------|----------|
| 1 | **CRITICAL** | 1366 / 1440 视口下 `.hub-region` 内容溢出，第二/三屏视觉重叠 | 1366 / 1440 | `.hub-region { overflow: hidden }` 或将 region 高度改为 `min-height` + 让 page scroll 自然分屏 |
| 2 | HIGH | insight-card hover 无视觉反馈（transform/box-shadow 不变） | 全部 | 补 `:hover` 规则：`transform: translateY(-2px); box-shadow: 0 18px 50px rgba(...);` |
| 3 | MEDIUM | 标签云 5 个 chip 全部 20px，未按 log scale | 全部 | 实装 `font-size: clamp(12px, 12px + log(weight)*4px, 32px)` |
| 4 | MEDIUM | 标签云 5 个示例 chip 与「暂无标签」占位文案同框出现 | 全部 | 二选一：有标签时不显示占位；或示例 chip 单独标识为「示例」 |
| 5 | MEDIUM | 生产力洞察实际渲染 6 个小卡，spec 只写 4 个 | 全部 | 与 spec owner 确认裁剪或更新 spec |
| 6 | LOW | 常用入口右栏含 spec 未列出的 3 个区块（整理进度 / 草稿快览 / 4 统计卡） | 全部 | spec owner 决定保留或裁剪 |
| 7 | LOW | 常用入口 hover 红色边框未独立验证 | 全部 | 后续交互回归补测 |

---

## 6. 截图清单

15 张截图全部生成于 `.trellis/tasks/05-06-app-visual-overhaul/evidence/audit/hub-templates-data/`：

```
1366-templates-default.png      1440-templates-default.png      1920-templates-default.png
1366-templates-chip-tech.png    1440-templates-chip-tech.png    1920-templates-chip-tech.png
1366-data-default.png           1440-data-default.png           1920-data-default.png
1366-data-hover.png             1440-data-hover.png             1920-data-hover.png
```

---

## 7. 协调说明

- 等待 hub-flow-auditor 释放浏览器：实际等待近 5 分钟（task #1 标记 completed 后才开始）。
- 期间发生 1 次浏览器被其他 agent 导航至 workstation，已重新 navigate 回首页恢复。
- 全部截图与样式探针完成后释放浏览器。
