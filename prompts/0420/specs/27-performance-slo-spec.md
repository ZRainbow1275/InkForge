# 27 — 性能 SLO 与能力分级 Spec

> **Spec 编号**: 27
> **层级**: 基础层（Phase 1 — Foundational Guardrails）
> **状态**: Draft v1（0420）
> **依赖**: 无（本 Spec 是所有功能模块的性能闸门）
> **下游直接依赖方**: 所有模块（作为 SLO 验收闸门）；重点引用者：01-editor-ui、04-rendering-core、08-data-insights、09-ui-polish、10-markdown-authority、15-export-publish、17-crash-recovery、23-sync-provider、29-search-engine、31-version-bundle、40-dev-panel
> **相关铁律**: R-15（性能 SLO 硬指标）、R-16（文章不能丢底线）、R-20（验收证据机器优先）

---

## 0. 文档定位

本 Spec 定义 InkForge v2.1 的**硬性能 SLO**、**能力分级模型**、**自动降级策略**、**性能预算（Bundle / Asset / Render）**、**CI Lighthouse 门槛**、**性能监控与上报**、**性能测试矩阵**。

- 本 Spec 的结论来自 L1-35 / L1-36 / X-05 / T09-09 / T08-11 + 补充"用户感知优于基准数字"。
- 本 Spec 不定义具体模块的实现（交给各功能 Spec），只定义**必须达标的门槛与降级约束**。
- 任何模块进入验收前必须引用本 Spec 的验收矩阵。

---

## 目录

1. 设计原则（用户感知 > 基准数字）
2. SLO 定义表（硬指标）
3. 能力分级模型（critical / durable / deferrable）
4. 输入延迟 SLO（= 0 硬指标）
5. 自动保存 SLO（≤ 1s）
6. 冲突检测 SLO（≤ 10s）
7. 导出 SLO（≤ 3min）
8. Lighthouse Performance > 80 硬闸门
9. 动画分级与自动降级（含 `prefers-reduced-motion`）
10. 图表大数据降级（maxSampleSize + Worker 预计算）
11. Bundle Budget
12. 资产预算（图片/字体/Mermaid/KaTeX）
13. 性能监控与上报
14. CI 性能门槛
15. 验收矩阵
16. 权威来源登记表

---

## 1. 设计原则（用户感知 > 基准数字）

### 1.1 P-01 | 用户感知优先

用户写字时任何肉眼可察的卡顿 = 验收不通过，**即使** CPU 占用、内存、FPS 数字看起来好看。"输入延迟 = 0"不是 JSON 时间戳游戏，而是**打字 → 屏幕变化**之间不允许存在肉眼可察的帧迟滞。

### 1.2 P-02 | 主线程纯净

主线程上只做：用户输入处理、UI 交互响应、短时间渲染提交。下列工作**必须走 Worker**：

- Markdown 解析 / 序列化
- HTML → Markdown 反向解析
- 版本 diff 计算
- 全文搜索索引构建
- 数据洞察预计算
- 图表大数据聚合
- Mermaid / KaTeX 渲染（渲染函数可在主线程但**Mermaid SVG 预生成**走 Worker）

### 1.3 P-03 | 可观测性 = 验收前提

任何性能决策必须**可被测量**。未埋点的能力不得通过验收。

### 1.4 P-04 | 降级可见 + 可恢复

- 任何自动降级都必须对用户可见（Toast 级提醒，不打断写作）
- 降级状态可在 Settings > Advanced > Performance 查询
- 用户可手动强制恢复（知道风险）

### 1.5 P-05 | 永不以丢数据换性能

- 降级策略绝不能触及正文（见 R-16）
- 任何"先丢后补"的性能优化方案直接否决

---

## 2. SLO 定义表

> 本表为硬指标。任何 Task 验收不达标即 block merge。

### 2.1 P0 硬指标（用户可感知路径）

| 指标 | 阈值 | 触发 | 测量 | 超阈降级 |
|---|---|---|---|---|
| 输入延迟（Typora / Source） | **0ms（用户不可感知）** | 每次 keystroke | PointerEvent → next paint 的 `performance.now()` 间隔；采样 p99 < 16ms（单帧） | 自动降 `animation-level=minimal`；暂停预览实时刷新；见 §4 |
| 自动保存耗时 | ≤ 1s | 每次 autosave trigger | autosave start → DB commit 的 `performance.now()` 间隔 | 超 1s 且失败 → 重试 1 次 + 用户可见错误（见 R-07） |
| 冲突检测耗时 | ≤ 10s | Sync provider 触发 | Detect start → resolved conflict set 的时间 | 超 10s → 简化检测（文档级）+ 提示重试 |
| 导出耗时（90 万字 + 2000 附件） | ≤ 3min | 导出执行 | Exporter start → artifact 的时间 | 超时 → 进度条 + 允许中断 + Partial 结果 |
| 崩溃恢复启动耗时 | ≤ 2s | 下一次冷启动 | App ready → 恢复向导显示 | 若超时 → 跳过非关键检查 + 标记"轻量恢复" |

### 2.2 P1 指标（体验路径）

| 指标 | 阈值 | 测量 |
|---|---|---|
| 首屏加载（冷启动到 Hub 可交互） | ≤ 3s | Lighthouse TTI |
| Hub 渲染（打开到卡片完整） | ≤ 1s | Hub Vue mount → 所有卡片 stores ready |
| 页面切换 | ≤ 300ms | Route change → 新页 layout stable |
| Lighthouse Performance | > 80 | CI `lhci` |
| 搜索响应（5 万 token 库） | ≤ 200ms | keystroke → 第一条结果渲染 |
| 模式切换（Typora ↔ Source ↔ Preview） | ≤ 300ms | 切换触发 → 新模式 ready |
| 面板折叠动画 | 250ms | 见 T09-03 A |
| 预览刷新（短文档 < 10 万字） | ≤ 50ms | keystroke → 预览 DOM update |
| 预览刷新（长文档 10-90 万字） | 节流 200ms | 同上（超阈后自动降级到手动刷新） |

### 2.3 P2 指标（仅监控不阻断）

| 指标 | 目标 | 备注 |
|---|---|---|
| 内存峰值（日常写作） | < 500MB | 超出时触发降级 |
| 内存峰值（大文档 90 万字） | < 1GB | 同上 |
| 首次空闲（FirstIdle） | < 5s | 冷启动完成后 |
| IndexedDB 单次写入 | < 50ms | 触发降级延迟写 |

---

## 3. 能力分级模型（critical / durable / deferrable）

### 3.1 三级分类定义

| 级别 | 定义 | 示例 | 降级策略 |
|---|---|---|---|
| **critical（必须保真）** | 用户写作核心路径；丢失 = 丢数据 | 输入处理、autosave、正文渲染、Markdown 解析、版本存储、崩溃恢复 | **永不降级** |
| **durable（可后台处理）** | 辅助性能力；可延后或异步 | 全文搜索索引、AI 预生成引言、版本 diff 预计算、数据洞察预计算、Mermaid SVG 缓存 | Worker 线程 + `requestIdleCallback` |
| **deferrable（可关闭）** | 增值体验；可完全关闭 | 同步滚动、实时预览、页面切换动画、图表动效、骨架屏、毛玻璃、Focus Ring 动画 | 超阈值自动关闭 + 用户可见；Settings 可手动关闭 |

### 3.2 分类原则

- **数据影响**：影响正文或元数据的必然 critical
- **用户感知频率**：每秒发生的必然 critical
- **可替代性**：有更轻的替代方案则 deferrable

### 3.3 分级注册

每个功能模块实现时必须在 `src/services/performance/capability-registry.ts` 注册其级别：

```ts
export const CAPABILITIES = {
  'editor.input': { level: 'critical', owner: '01-editor-ui' },
  'editor.autosave': { level: 'critical', owner: '01-editor-ui' },
  'editor.render.typora': { level: 'critical', owner: '01-editor-ui' },
  'editor.preview.live': { level: 'deferrable', owner: '04-rendering-core' },
  'search.index.build': { level: 'durable', owner: '29-search-engine' },
  'insights.worker': { level: 'durable', owner: '08-data-insights' },
  'ui.animation.pageTransition': { level: 'deferrable', owner: '09-ui-polish' },
  'ui.animation.panelSlide': { level: 'deferrable', owner: '09-ui-polish' },
  'ui.scrollSnap.hub': { level: 'deferrable', owner: '02-hub-layout' },
  'chart.bigdata.render': { level: 'durable', owner: '08-data-insights' },
  // …
} as const;
```

### 3.4 降级路径统一走 DegradeManager

- 模块只暴露 `degrade(level)` / `restore()` 钩子
- 实际降级决策由 `src/services/performance/degradeManager.ts` 统一

---

## 4. 输入延迟 SLO（= 0 硬指标）

### 4.1 定义

用户按下键盘 → 屏幕上出现对应字符（或 cursor 位移），**两次渲染间隔不允许跨超过一个显示帧**（60Hz 屏幕即 < 16.67ms）。

### 4.2 实现约束

- TipTap transaction 的 dispatch 必须在主线程单帧内完成
- 任何 plugin 的 `appendTransaction` 不得触发同步 Markdown 序列化
- 装饰器（Decoration）重算走增量 patch，不得全量重建
- IME 合成期间不插入序列化 / 自动保存（见 T01-16 C + T03-08 B）

### 4.3 测量方法

- Playwright 录制 10s 连续键盘输入（中英文混合）
- 用 `performance.now()` 包围 `beforeinput → next rAF`
- p99 < 16ms；p50 < 4ms
- 在 90 万字文档上同样通过（虚拟滚动）

### 4.4 超阈自动降级

- 单次 transaction 耗时 > 50ms（超过 3 帧）连续 3 次 → 触发：
  - `data-animation-level=minimal`
  - 预览刷新降级为 200ms 节流 → 手动刷新
  - 装饰器懒渲染（仅视口内）

### 4.5 禁止行为

- 主线程 Markdown 解析（必须 Worker）
- 主线程 innerHTML 大段写入（必须走 ProseMirror 增量）
- 同步读取 IndexedDB（必须 async + 批量）

---

## 5. 自动保存 SLO（≤ 1s）

### 5.1 时机

- 编辑 500ms 空闲 → autosave trigger
- 重要节点（模式切换、关闭 tab、高危命令前）→ 同步 autosave 兜底

### 5.2 流程耗时预算

```
total ≤ 1000ms
├─ Markdown 序列化（Worker）≤ 300ms
├─ sha256 计算（Worker）≤ 50ms
├─ IndexedDB 写入 ≤ 300ms
├─ htmlCache 重渲染（Worker，可并发）≤ 200ms
└─ UI 状态更新 + 日志 ≤ 50ms
```

### 5.3 失败路径（R-07）

- 超 1s 或写入失败 → 重试 1 次
- 再失败 → Toast 错误 + StatusBar 标记红点 + Error Center 可查日志 + "导出应急副本"按钮
- 失败事件写 activity_logs（`autosave.failure`）
- 用户可见 hash / 错误码 / 文档 ID

### 5.4 大文档优化

- 90 万字符文档 autosave：
  - 只序列化 delta（用 ProseMirror step）
  - 全量序列化延后到空闲
  - 保存期间显示"保存中…"StatusBar 图标

### 5.5 禁止行为

- 静默 swallow 错误
- 把失败当成功写 UI
- 等待用户操作再写（用户期待数据已持久化）

---

## 6. 冲突检测 SLO（≤ 10s）

### 6.1 上下文

- 发生在 Sync Provider 拉取远端变更时（见 23-sync-provider）
- 粒度：本轮文档级，数据结构预留行内级（F-02）

### 6.2 流程耗时预算

```
total ≤ 10,000ms
├─ 拉取远端 diff（网络）≤ 5000ms（取决于网络）
├─ 本地 vs 远端 diff 计算（Worker）≤ 3000ms
├─ 三方合并尝试（Worker）≤ 1500ms
└─ UI dialog 渲染 ≤ 500ms
```

### 6.3 超阈降级

- 超 10s → 切换到"简化检测"（不做三方合并，直接标记冲突，由用户手动解决）
- 同时显示 `Toast: 冲突检测超时，已切换到手动模式` + "重试三方合并"按钮
- 写 audit `conflict.detect.timeout`

### 6.4 用户编辑不得被阻塞

- 冲突检测跑在 Worker，不影响主线程
- 检测期间允许用户继续编辑，但**禁止保存推送**（StatusBar 提示"检测中 暂停推送"）

---

## 7. 导出 SLO（≤ 3min）

### 7.1 基线规模（L1-35）

- 单文档 90 万字符 + 2000 附件 + 引用多个版本点
- 全量导出到单平台（wechat / zhihu / redbook / html / markdown 任一）

### 7.2 流程耗时预算

```
total ≤ 180,000ms
├─ Markdown 解析（Worker）≤ 2000ms
├─ AST Normalize ≤ 1000ms
├─ Mermaid / KaTeX 预渲染（批量 Worker）≤ 30,000ms
├─ 代码高亮（highlight.js 按需）≤ 10,000ms
├─ 资产准备（Tauri FS 读取 + base64 / 转码）≤ 60,000ms
├─ 平台模板套用（preset.render）≤ 20,000ms
├─ 清洗 + sanitize ≤ 10,000ms
├─ 打包（ZIP / HTML 单文件）≤ 30,000ms
└─ 进度 UI + 日志 ≤ 2000ms
```

### 7.3 超阈策略

- 超 3min → 继续导出（不中断，保数据完整性）+ 显示"耗时超标，可中断"按钮
- 中断 → 保留部分产物 + 标记为"部分导出"
- 写 audit `export.timeout`（含目标平台、规模、实际耗时）

### 7.4 用户体验

- 导出开始 → ProgressModal 显示：当前阶段、百分比、ETA、日志输出
- 取消按钮随时可用（见 T04-08 C + P-02 设计）
- 后台导出（用户可关窗继续写作）

### 7.5 禁止行为

- 主线程完整 Mermaid 渲染（必须 Worker + 批量）
- 同步读取附件（必须 Promise.all 并发，上限 8 个）
- 为 "实时进度" 每 N ms 重渲染整 UI（用 Vuex/Pinia 响应式 + computed）

---

## 8. Lighthouse Performance > 80 硬闸门

### 8.1 测量环境

- `lighthouse-ci` (lhci) 在 GitHub Actions 或等效 CI 上运行
- 目标 URL：
  - Hub（空数据）
  - Hub（2000 文档）
  - Workstation（打开 90 万字文档）
  - Settings

### 8.2 必须达标的指标

| Lighthouse 指标 | 阈值 |
|---|---|
| Performance | > 80 |
| First Contentful Paint | < 1.8s |
| Largest Contentful Paint | < 2.5s |
| Total Blocking Time | < 300ms |
| Speed Index | < 3.4s |
| Cumulative Layout Shift | < 0.1 |
| Time to Interactive | < 3.8s |

### 8.3 配置示例（`.lighthouserc.json`）

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": [
        "http://localhost:5173/",
        "http://localhost:5173/hub",
        "http://localhost:5173/workstation/sample",
        "http://localhost:5173/settings"
      ],
      "settings": {
        "preset": "desktop",
        "throttling": { "cpuSlowdownMultiplier": 2 }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interactive": ["error", { "maxNumericValue": 3800 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

### 8.4 不达标处理

- CI 阻断 merge
- PR 作者修复后重跑
- 连续三次不达标 → 触发性能 spike review（全员）

### 8.5 Web vs Tauri

- 本 Spec 主要覆盖 Web 渲染（Tauri 包装 Webview 同样适用）
- Tauri 特有路径（FS / IPC）走独立 benchmark（见 18-tauri-desktop）

---

## 9. 动画分级与自动降级

### 9.1 分级体系（`data-animation-level`）

| 级别 | 含义 | 触发条件 | 允许动画 |
|---|---|---|---|
| `full` | 默认，所有动画开启 | 正常状态 | 全部（页面切换 / 面板折叠 / Focus Ring / 卡片悬停 / 图表过渡） |
| `reduced` | 用户偏好 | `prefers-reduced-motion: reduce` | 仅保留功能性动画（焦点环 / 模式切换 toast） |
| `minimal` | 性能降级 | 主线程阻塞 > 50ms 连续 3 次 / 内存 > 70% | 禁用页面切换 / 面板折叠 / 图表过渡 / 悬停动画 |
| `off` | 用户手动关闭 | Settings 显式勾选 | 完全无动画 |

### 9.2 降级触发与恢复

**触发**（自动）：
- `longtask` PerformanceObserver 监听到 > 50ms 的任务连续 3 次 → `full/reduced → minimal`
- `performance.memory.usedJSHeapSize / totalJSHeapSize > 0.7` → `→ minimal`
- 电池模式（`navigator.getBattery` 可用时，level < 0.2 + discharging）→ `→ reduced`

**恢复**：
- 60s 内未再次触发 → 恢复到上一级别
- 用户手动点击"恢复动画"按钮（Settings > Advanced > Performance）→ 立即恢复

### 9.3 实现 Hook

```ts
// src/composables/useAnimationLevel.ts
export function useAnimationLevel() {
  const level = ref<'full' | 'reduced' | 'minimal' | 'off'>('full');
  // subscribe to PerformanceObserver + prefers-reduced-motion + user setting
  // writes data-animation-level on <html>
  return { level, degrade, restore };
}
```

CSS 侧：

```css
:root[data-animation-level="minimal"] *,
:root[data-animation-level="off"] * {
  animation-duration: 0ms !important;
  transition-duration: 0ms !important;
}
:root[data-animation-level="reduced"] .page-transition { transition: none; }
```

### 9.4 与 `prefers-reduced-motion` 的优先级

- 用户系统偏好 > 用户应用内设置 > 自动降级
- 若用户系统 `reduce` → 始终 `reduced` 起步（但可被用户在 Settings 内强制 full，会加警告）

### 9.5 降级审计

- 自动降级事件写 audit：`perf.degrade`（含 trigger / newLevel / task stats）
- 恢复事件：`perf.restore`

---

## 10. 图表大数据降级（maxSampleSize + Worker 预计算）

### 10.1 每图表降级表（见 L-03）

| 图表 | 默认数据范围 | maxSampleSize | 超限动作 |
|---|---|---|---|
| WritingTimeline | 365 天 | 365 点 | 超 90 天按周聚合 |
| ProductivityInsights | 90 天 | 90 点 | 超 30 天按天聚合 |
| WordDistribution | 所有文档 | 1000 文档 | 按分类聚合 |
| RecentActivity | 50 条 | 50 条 | 滑动窗口 |
| ExportFrequency | 180 天 | 180 点 | 超 90 天按周聚合 |
| TagCloud（第六图） | 所有标签 | 200 标签 | 取 Top 200 + "显示更多" |

### 10.2 Worker 预计算

- `src/workers/insights.worker.ts` 接收事件订阅（`doc.updated`、`version.created`、`export.completed`）
- 空闲时刷新 `metrics_cache` IndexedDB 表
- 图表渲染只读 `metrics_cache`，不做实时聚合

### 10.3 渲染性能约束

- 图表不得阻塞主线程（Canvas / SVG 预生成数据走 Worker）
- 首帧渲染 < 200ms（用骨架屏填空）
- hover tooltip < 50ms

### 10.4 大数据 UI

- 超采样显示：`数据已聚合展示（按周）` + "查看全量"按钮
- 点击"查看全量" → 打开专用详情页，接受加载时间 > 1s

### 10.5 归档过滤（L1-44 D）

- 归档文档不参与 insight 计算
- Worker 预计算时过滤 `frontmatter.archivedAt !== null`

---

## 11. Bundle Budget

### 11.1 整体预算

| 类别 | 阈值（gzipped） |
|---|---|
| `main` bundle（初始加载） | ≤ 250 KB |
| `hub` 路由 chunk | ≤ 80 KB |
| `workstation` 路由 chunk | ≤ 120 KB |
| `settings` 路由 chunk | ≤ 60 KB |
| 所有路由 chunks 总和 | ≤ 400 KB |
| CSS 总量 | ≤ 100 KB |

### 11.2 按需加载清单（必须 dynamic import）

| 包 | 触发时机 | 理由 |
|---|---|---|
| KaTeX | 首次出现 Math 节点 | ~300KB |
| Mermaid | 首次渲染 Mermaid | ~400KB |
| highlight.js + 180 语言 | 首次渲染代码块；按语言 import | ~400KB（全量），每语言 ~5-30KB |
| vue-codemirror + lang-markdown | 首次切 Source 模式 | ~100KB |
| mammoth.js | 首次 import .docx | ~80KB |
| flexsearch / minisearch | 首次触发搜索 | ~50KB |
| unovis / frappe-charts | 首次显示图表 | ~150KB |

### 11.3 检测工具

- `rollup-plugin-visualizer` → build-time 报告
- `size-limit` CI 门槛：超预算 block merge
- `webpack-bundle-analyzer` 等效工具（vite-bundle-analyzer）

### 11.4 `.size-limit.js` 示例

```js
module.exports = [
  { path: 'dist/assets/main-*.js', limit: '250 KB' },
  { path: 'dist/assets/hub-*.js', limit: '80 KB' },
  { path: 'dist/assets/workstation-*.js', limit: '120 KB' },
  { path: 'dist/assets/settings-*.js', limit: '60 KB' },
  { path: 'dist/assets/*.css', limit: '100 KB' },
];
```

### 11.5 依赖审计

- 新增 >30KB 依赖必须 PR review 特别 tag（`perf-review` label）
- 每 Sprint 末尾跑一次依赖体积巡检

---

## 12. 资产预算（图片/字体/Mermaid/KaTeX）

### 12.1 图片（见 28-asset-pipeline）

| 类型 | 限制 |
|---|---|
| 单图原图 | 原图保留，但大图（> 2MB）自动生成缩略图用于 Hub / 预览 |
| 自动压缩触发 | > 500KB 自动走 Canvas 压缩 |
| 最大支持 | 50 MB（超限拒绝） |
| GIF | 不做自动转码（保留原文件） |

### 12.2 字体

| 类型 | 限制 |
|---|---|
| 内置开源字体 | 首屏仅加载 WOFF2 子集（Latin + 常用 3500 中文） |
| 全字符集 | 懒加载（用户选择字体时触发） |
| 用户导入字体 | 无压缩限制，但 > 30MB 提示确认 |
| 商业字体 | 不打包；仅支持用户自带（L1-57 D） |

### 12.3 Mermaid / KaTeX

- Mermaid SVG 缓存到 IndexedDB `mermaid_cache`（Key = `sha256(source)`）
- KaTeX 不缓存（渲染足够快）
- Mermaid 节点数量 > 50 → 分页 / 折叠

### 12.4 其他

- Audio / Video：v2.1 不支持内嵌（占位链接即可）
- PDF：v2.1 不支持导入（P-05 A）

---

## 13. 性能监控与上报

### 13.1 采样指标

| 指标 | 采样时机 | 存储 | 展示位置 |
|---|---|---|---|
| 首屏 FCP / LCP / TTI | 冷启动 | Session 级 localStorage + 日级写 `perf_log` | Dev Panel（40） |
| 输入延迟 p99 | 每 30s 滚动采样 | IndexedDB `perf_log` | Settings > Advanced > Performance |
| Autosave 耗时 | 每次 autosave | IndexedDB `perf_log` | 同上 |
| 导出耗时 | 每次导出 | `export_logs`（见 33-diagnostic-logging） | Settings + Dev Panel |
| 渲染长任务（longtask） | PerformanceObserver | Session 级 | Dev Panel |
| 内存占用 | 30s 采样（performance.memory） | Session 级 | Dev Panel |
| 降级事件 | 触发时 | IndexedDB `activity_logs`（R-17） | Settings + Audit |

### 13.2 `perf_log` Schema

```ts
interface PerfLogRow {
  id: string;
  kind: 'fcp' | 'lcp' | 'tti' | 'input.p99' | 'autosave' | 'export' | 'longtask' | 'memory';
  value: number;
  timestamp: number;
  context?: {
    route?: string;
    documentId?: string;
    documentSize?: number;
    platform?: string;
  };
}
```

### 13.3 数据生命周期

- 保留 30 天（非审计，纯监控）
- 用户可在 Dev Panel 导出 / 清空
- 不上报云端（本地优先原则）

### 13.4 用户可见面板

- Settings > Advanced > Performance：
  - 当前动画等级 + 手动恢复
  - 当前降级能力列表
  - 最近 7 天关键指标折线图（基于 `perf_log`）
  - "运行性能自检"按钮（跑一次 benchmark + 导出报告）

### 13.5 上报到 Dev Panel

- Dev Panel（40-dev-panel）可实时查看指标流
- 切换"录制"模式后可以导出 timeline 供 PR 附件

---

## 14. CI 性能门槛

### 14.1 流水线三阶段

```
PR 提交
  → 阶段1：bundle size 检查（size-limit）→ fail block
  → 阶段2：Vitest 单测 + 性能基准测试（vitest bench）→ fail block
  → 阶段3：Playwright E2E + Lighthouse CI → fail block
合并
  → 夜间全量回归：大文档（90 万字）导出 + 2000 文档 Hub 加载 + 1000 版本恢复
```

### 14.2 vitest bench 示例

```ts
// tests/bench/markdown-parse.bench.ts
import { bench, describe } from 'vitest';
import { parseMarkdown } from '@/services/markdown-authority/parser';
import { LONG_DOC_900K } from './fixtures/long-doc';

describe('markdown parse', () => {
  bench('90 万字', () => {
    parseMarkdown(LONG_DOC_900K);
  }, { time: 3000 });
});
```

CI 用 `vitest bench --run` + 基线对比（`--outputFile`）。

### 14.3 Playwright 性能场景

- `tests/perf/hub-cold-start.spec.ts`：冷启动到 Hub 可交互 < 3s
- `tests/perf/input-latency.spec.ts`：10s 连续中英文输入，p99 < 16ms
- `tests/perf/export-full.spec.ts`：90 万字 + 2000 附件导出 < 3min

### 14.4 性能回归基线

- `prompts/0420/spec/perf-budget.md` 记录基线
- 每次 main 分支合并后自动更新基线
- PR 数值劣化 > 10% 即阻断（无论是否达到绝对阈值）

### 14.5 本地 dev 模式监控

- `pnpm dev:perf`（新增 npm script）→ 启动 dev 服务器 + 内建性能面板（console warning）
- 超阈值 warning：红色 console + toast "感知到可能的性能退化"

---

## 15. 验收矩阵

### 15.1 每 Task 验收前必须通过的性能清单

| 序号 | 验证项 | 工具 | 阈值 |
|---|---|---|---|
| P-A1 | 输入延迟 p99 < 16ms（10s 中文连续输入） | Playwright + PerformanceObserver | P0 |
| P-A2 | 输入延迟 p99 < 16ms（90 万字文档内输入） | Playwright | P0 |
| P-A3 | Autosave 90 万字 < 1s | Vitest + fake timer | P0 |
| P-A4 | 冲突检测（10 分钟远端累积 diff）< 10s | Playwright + 模拟 sync | P0 |
| P-A5 | 导出 90 万字 + 2000 附件到 wechat < 3min | Playwright + artifact | P0 |
| P-A6 | Hub 冷启动（2000 文档）< 3s | Lighthouse | P1 |
| P-A7 | Lighthouse Performance > 80 | lhci | P1 |
| P-A8 | Bundle main ≤ 250 KB gzipped | size-limit | P1 |
| P-A9 | 所有动画在 `prefers-reduced-motion` 下禁用 | Playwright CSS check | P1 |
| P-A10 | 所有图表超 maxSampleSize 时显示聚合提示 | Playwright | P2 |
| P-A11 | 降级事件写 audit | 单测 + IndexedDB 校验 | P2 |

### 15.2 Task 证据矩阵

每个 Task PR 必须提供：
1. 关键 SLO 截图（带时间戳 + 规模）
2. `vitest bench --run` 输出附在 PR comment
3. Lighthouse 报告 HTML 附件
4. Playwright 性能 spec 通过日志

### 15.3 回归处理

- 性能回归（超过阈值或相较基线劣化 > 10%）必须在 PR 描述中明确标注
- reviewer 可要求补加降级策略或拆单 PR

### 15.4 能力降级演示

- 每 Task 若涉及 `deferrable` 能力，必须演示其降级路径可用
- Settings > Advanced > Performance 展示该能力的当前状态

---

## 16. 权威来源登记表

| 本 Spec 章节 | 引用问卷题号 / 决策编号 | 说明 |
|---|---|---|
| §1 设计原则 | X-05 C 补充, L1-36 C 补充 | 用户感知优先 |
| §2 SLO 定义表 | L1-35 C + 补充, L1-36 C + 补充, X-05 C, 决策 L-01 | 规模 + 硬 SLO |
| §3 能力分级 | L1-36 C（D 升级决策）, T08-11 D, T09-09 D, 决策 L-02 | critical/durable/deferrable |
| §4 输入延迟 | L1-36 C "输入无延迟", T01-15 A, 决策 L-01 | 0ms 硬指标 |
| §5 自动保存 | L1-19 D + 补充（可见+重试+日志）, L1-36 C "≤1s" | ≤ 1s + R-07 |
| §6 冲突检测 | L1-36 C "≤10s", L1-22 D, F-04 | Worker + 降级 |
| §7 导出 | L1-36 C "≤3min", T04-08 C, P-02 | 进度 + 中断 |
| §8 Lighthouse | X-05 C "Lighthouse > 80" + 补充 | CI 门槛 |
| §9 动画分级 | T09-09 D + 补充, 决策 L-02 | 自动降级 |
| §10 图表大数据 | T08-08 D, T08-11 D + 补充, L1-44 D, 决策 L-03 | maxSampleSize + Worker |
| §11 Bundle | G-04 C（按需加载）, 决策 L-01 | 按路由 + 按需 |
| §12 资产预算 | T04-14 C, T05-11 D, L1-57 D | 图片/字体/Mermaid/KaTeX |
| §13 性能监控 | G-13 D, T07-04 B+C, R-20 | perf_log + Dev Panel |
| §14 CI 门槛 | X-05 C, G-14 D, 决策 L-01 | 阻断不达标 |
| §15 验收矩阵 | X-12 D, G-14 D, R-20 | 每 Task 强制 |

---

## 附录 A：长任务（Long Task）定义

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      // long task 超阈值
      degradeManager.report({ kind: 'longtask', duration: entry.duration });
    }
  }
});
observer.observe({ entryTypes: ['longtask'] });
```

## 附录 B：电池与 CPU 感知（Tauri 专属）

- 通过 Tauri 命令查询 CPU 温度 / 电池状态
- `battery.level < 0.2 && battery.discharging` → `animation-level=reduced`
- CPU 温度告警（超 85°C） → 暂停后台预计算（durable 能力）

## 附录 C：性能反模式清单

| 反模式 | 改正 |
|---|---|
| 主线程 Markdown 解析 | Worker |
| 大文档 innerHTML 覆写 | ProseMirror step 增量 |
| 同步 IndexedDB 读 | async + batch |
| 每 keystroke 全量预览重渲 | 节流 + diff patch |
| 启动时预加载所有路由 | dynamic import |
| Mermaid 重复渲染 | IndexedDB 缓存 + sha256 key |
| 图表每帧重算数据 | Worker 预计算 + computed 只读 |
| 监控埋点放在主线程 | `requestIdleCallback` |
| 用 localStorage 存大对象 | IndexedDB |
| 静默 swallow 错误 | 写 activity_logs + 用户可见 |

## 附录 D：性能 Spec 更新触发

本 Spec 必须在以下情况更新：
- 新增 SLO（如 AI 延迟目标）
- 硬件基线变更（如改支持移动设备）
- 渲染管道变更（RENDERER_VERSION bump，见 10-markdown-authority）
- Bundle 预算因合理业务增长需要调整

---

## 文档状态

- 草案版本：v1（Phase 1 Batch A 产出）
- 冻结里程碑：Phase 2 启动前冻结；Phase 3/4 期间只新增验收，不降级阈值
- SLO 数字来自产品决策，不允许随性能回归向上调整（必须修代码，不是修阈值）

---

## 2026-05-02 Implementation Ledger: Local Performance SLO Baseline

Baseline status: compatible local baseline implemented. This is not a full lab-gate pass for Lighthouse, 900k-word input, export stress, or packaged Tauri benchmarks.

Implemented baseline coverage:

- `src/services/performance/types.ts` defines strict metric, threshold, support-state, capability-tier, degradation, sample, event, and summary contracts with Zod validation.
- `src/utils/db.ts` schema v11 adds `performanceSamples` and `performanceDegradationEvents` tables with profile, metric, status, timestamp, and sample/event indexes.
- `src/services/performance/collector.ts` uses real browser APIs only when feature-detected: `PerformanceObserver.supportedEntryTypes`, `performance.getEntriesByType('navigation')`, `requestAnimationFrame`, Dexie read probes, localStorage write probes, memory APIs, and `matchMedia('(prefers-reduced-motion: reduce)')`.
- Unsupported or limited browser capabilities are recorded as `unsupported` or `limited`; the implementation does not fabricate metric values or success states.
- `src/services/performance/repository.ts` persists bounded samples/events and writes `system.performance_degradation` audit evidence for warn/breach samples when audit context exists.
- `src/stores/performance.ts` exposes collection lifecycle, recent samples/events, summary status, support matrix, reduced-motion state, and action/error messages to Settings.
- `src/views/SettingsView.vue` extends the existing Settings About performance area behind the existing `performance-metrics` feature flag and shows thresholds, recent samples, degradation events, unsupported runtime capabilities, and explicit pending lab gates.
- Product code does not add mock telemetry rows, fake Lighthouse scores, seeded performance data, remote telemetry upload, document-content persistence, or Emoji glyph icons.

Validation evidence:

- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec vitest run src/services/performance/performance.test.ts` passed with 1 test file and 5 tests.
- `pnpm exec vitest run` passed with 8 test files and 51 tests.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed; existing Vite dynamic/static import and large chunk warnings remain non-blocking.
- Production preview smoke on `http://127.0.0.1:5182/settings?tab=about` verified the Performance SLO ledger after enabling `performance-metrics`, real IndexedDB v11 stores, 10 real local samples, 4 real degradation events, zero console errors, and clean preview-port shutdown.

Pending for full Spec 27 pass:

- Real Lighthouse CI score gate with a recorded Performance score above 80.
- Full 900k-word input p99 matrix for Typora and Source modes.
- Full export stress benchmark for 900k words plus large attachment sets.
- Autosave, conflict detection, search, bundle, and long-session memory SLO gates wired to their owning modules.
- Packaged Tauri performance probes for CPU, battery, process memory, native file operations, and desktop runtime degradation controls.
