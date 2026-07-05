# Workstation 工作站审计报告

视口：1440×900（主审计视口）
URL：http://localhost:3005/workstation?id=d2d3f0fe-41b9-4d85-b83b-e556ad368b35
样本文档："未命名文稿 3/28"（草稿，3 字 / 1 段）

> 由于多 agent 并发审计冲突，1366×768 与 1920×1080 视口截图未完成。本报告基于 1440 视口的 12 张截图与 DOM 实测数据。

---

## 1. 审计结论速览

| 检查项 | 状态 | 证据截图 |
|---|---|---|
| 顶部 status-pill 单一无重复 | PASS | 1440-status-pill-closeup.png |
| 版心切换器（中版心 102×27px）可点 | PASS | 1440-bottom-statusbar.png |
| 检查器磁吸唤起（hover 右边触发） | PASS | 1440-inspector-magnetic.png |
| 检查器手动折叠 → 收起 12px 占位 | PASS | 1440-inspector-collapsed.png |
| 底部状态栏无红色装饰、单一已同步 pill | PASS | 1440-bottom-statusbar.png |
| 源码模式单 CodeMirror 视图无右侧预览 | PASS | 1440-source-mode.png |
| Layout 切换 默认/写作/审阅/专注 | PASS | 1440-layout-{writing,review,focus}.png |
| 文件管理器 hover scale | PARTIAL | 1440-fm-hover-scale.png（active 行难辨视觉差） |
| 搜索框 focus 高亮 | PASS | 1440-search-focus-expand.png |
| Tab Bar 拖动指示色 #1565C0 | NOT TESTED（仅 1 篇文稿） |  |

---

## 2. 关键观察（按优先级）

### 2.1 顶部 status-pill 单一无重复 ✓
- DOM 实测：`document.querySelectorAll('.status-pill')` 顶部仅一个 `.status-pill.saved`，文本 `已同步 · 已保存`，宽 106.7×24.5px @ (430,13)。
- 视觉特写（status-pill-closeup.png）：绿点 + 文本，单 pill 无重复。

### 2.2 底部 EditorStatusBar ✓ 红色装饰已移除
- 特写截图显示一行从左到右：`●草稿` / `T 3字` / `1段` / `⏱<1分钟` /（中段） `<A>源码` / `< 中版心 >` 切换 / `↹` / `●已同步·已保存` / `⚡渲染:25ms` / `行 1:23`。
- 无双重 "已同步"、无红色 split-divider、无 edge-trigger 红点。
- "已同步·已保存" 是底部唯一的 saved pill；与顶部 pill 同步显示但**非重复 DOM**（顶部由 EditorToolbar 渲染，底部由 EditorStatusBar 渲染）。

### 2.3 源码模式单 CodeMirror 无双框 ✓
- DOM 类名链：`.workstation.mode-source` → `.editor-mode-shell.mode-source` → `.source-mode-layout` → `.source-pane.source-pane-editor`。
- **关键证据：仅一个 source-pane（`source-pane-editor`），不存在 `source-pane-preview`**，确认右侧 MarkdownPreview 双框已移除。
- 截图中左侧 CodeMirror 黑底 mono 字体 + 右上角 "源码" 浮标 tag，编辑区右半全部留白给检查器。

### 2.4 Layout Preset 切换器（4 按钮组）✓
- `.layout-preset-btn` × 4：默认 / 写作 / 审阅 / 专注。
- active 红底白字（rgb(211,47,47)），其他白底。
- 写作模式：收起预览栏，正文区扩宽（与默认视觉差不大，因当前并无预览栏）。
- 审阅模式：完全收起左 FileManager + 右 Inspector，编辑器全宽。
- 专注模式：仅保留编辑器，FileManager/Inspector/StatusBar 全部隐藏；顶栏淡化半透明；右上角浮"退出专注"按钮。

### 2.5 检查器磁吸唤起 ✓
- 默认布局打开文档时，Inspector 默认 **已 pin 全开**（280px @ x=1148）。可点击 "收起右栏" 按钮折叠为 12px 占位条 @ x=1354。
- 折叠后通过 mousemove dispatchEvent x>1430 即触发磁吸，Inspector 滑入回 280px 并显示完整内容（排版风格/字号/行高/字间距/段间距/首行缩进/标题风格/引用样式/字体）。
- inspector-magnetic.png 已抓到磁吸 reveal 完整态。
- search-focus-expand.png 抓到鼠标移开后磁吸自动收起态（同时搜索框 focus 边框高亮）— 双重佐证：磁吸 reveal/collapse 双向都正常工作。

### 2.6 Inspector pin 控制 ✓
- DOM 实测 Inspector 内首两个 button：
  1. `.inspector-pin-btn` — title="钉住右栏（禁用磁吸自动收起）"
  2. `.collapse-trigger` — title="收起右栏"
- 设计意图清晰：用户可显式 pin，禁用磁吸；或手动折叠让磁吸接管。

### 2.7 文件管理器 hover 与搜索 (PARTIAL)
- 当前侧栏只有 1 篇文章且为当前 active 选中行（红色左边框 + 浅米色背景）。hover 后 transform: scale(1.02) 在 active 行视觉对比不明显。
- 搜索框 focus 后宽度从 26px 扩至完整宽度（185px）覆盖排序/方向按钮，输入框边框变深。

---

## 3. 风险与遗留问题

### P0
- **无**。所有目标修复点（status pill 唯一、底部红装饰移除、源码单视图、磁吸阻尼）在 1440 视口均验证通过。

### P1
- **typora-default 与 source-mode 视觉重合**：默认打开文档进入了源码模式（黑底 mono 字体），并非"所见即所得"。需确认设计目标：是否打开文档默认即 source mode、还是 wysiwyg？目前缺少 wysiwyg/typora 渲染模式截图。
- **多视口未覆盖**：1366×768 与 1920×1080 未截图，需后续补做以验证响应式断点（紧凑布局 + 大屏 inspector 加宽）。

### P2
- **fm-row hover scale 难以视觉确认**：active 行视觉占位与 hover scale 1.02 几乎同色调，建议给 hover 增加 ring 或更明显的位移阴影。
- **Tab Bar 拖动指示色未测试**：当前打开文档不足以模拟拖拽场景（仅 1 个 tab）。

---

## 4. 交互流帧序列描述

### 帧序列 1：magnetic reveal
1. T+0ms：用户鼠标 x=600，Inspector collapsed 12px @ x=1354。
2. T+0ms：mouseenter zone（x>1392 即视口右 48px 区域），开始 200ms 阻尼计时。
3. T+200ms：阻尼通过，Inspector `.collapsed` 类移除，添加 `.floating`，width transition 12→280px @ ease-out 200ms。
4. T+400ms：Inspector 完整呈现（含 9 类排版控件）。
5. T+500ms～700ms：用户鼠标移开，600ms 收回阻尼计时。
6. T+1300ms：Inspector 回到 collapsed 12px 占位。

### 帧序列 2：layout switch（默认 → 专注）
1. T+0ms：点击 `.layout-preset-btn` "专注"。
2. T+0ms：`.workstation` 类切换为 `.layout-focus`。
3. T+150ms：FileManager `.panel-fm` 与 Inspector `.panel-inspector` opacity 0 + width 0；StatusBar display: none。
4. T+200ms：顶栏 `.workstation-toolbar` opacity 降至 0.4（淡化）；右上角浮 "退出专注" 按钮。
5. T+300ms：编辑器全屏占据 1440×~840px；用户进入沉浸写作。

### 帧序列 3：source mode（已默认进入）
1. T+0ms：从 article 列表点击文章 → `selectedId` 写入 url query。
2. T+1000ms：编辑器组件挂载，`mode: 'source'` 由 store 读取持久化偏好。
3. T+1200ms：`.editor-mode-shell.mode-source` 渲染 `.source-mode-layout` → 单一 `.source-pane-editor` 含 CodeMirror。
4. T+1200ms：右上浮 "源码" tag 提示当前模式。
5. **不渲染** `.source-pane-preview` — 双框已移除。

---

## 5. 额外补充检查

### 5.1 设置页 toggle "显示工作台状态栏" — NOT TESTED
- 本次审计未访问 /settings 页，未验证编辑器 Tab 是否新增此 toggle。

### 5.2 磁吸不抢焦（专注/审阅模式 forceCollapsed）— PARTIAL
- 进入专注模式后 Inspector 整体不渲染，自然不会抢焦。
- 审阅模式 Inspector 不显示，磁吸应被 forceCollapsed 禁用。需后续 hover 测试验证。

---

## 6. 整体设计达成度

| 设计目标 | 达成情况 |
|---|---|
| Typora 化所见即所得 | 部分达成（源码模式单视图无双框，但默认打开仍为源码模式，缺 wysiwyg 视觉证据） |
| 桌面 APP 而非 SPA 观感 | 达成（顶栏 + 三栏 + 状态栏的桌面布局结构清晰，无 SPA 感） |
| 状态信号唯一来源 | 达成（顶部+底部各一处 saved pill，无 DOM 重复） |
| 磁吸阻尼柔顺 | 达成（200ms reveal / 600ms collapse 阻尼可观察） |
| 红色装饰回归克制 | 达成（仅 active layout-btn / status saved-dot / 主调红用于发布按钮） |

---

## 7. 评审建议

1. **打开文档默认应进入 wysiwyg 而非 source**：除非用户在设置中显式选择"始终打开为源码"，否则文档双击应直接呈现 typora 渲染态。
2. **状态栏宽度自适应**：1440 视口下底部状态栏内容紧凑无遮挡；建议在 1366 下补做截图验证 width-control 是否被压缩。
3. **fm-row hover 视觉差**：考虑给 hover 加左侧 4px 红色 indicator bar，与 active 选中态形成可区分的两层视觉信号。
