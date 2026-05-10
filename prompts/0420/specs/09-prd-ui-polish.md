---
id: 09-prd-ui-polish
title: "PRD 09 | UI 打磨与视觉设计语言"
version: "2.1.0"
status: approved
authors: ["spec-engineer"]
created: 2026-04-21
depends_on:
  - "00-decisions-part3b-tauri-visual-recovery.md"
  - "20-theme-font-typography-spec.md"
  - "_extracted/02c-L2-T07-T08-T09-X-S.md (T09 组)"
  - "_extracted/01-L1-answers.md (L1-57~L1-60)"
  - "_extracted/03-enhancement-answers.md (EX 组)"
---

# PRD 09 | UI 打磨与视觉设计语言

## 1. 产品愿景

### 1.1 Ethereal Constructivism 美学哲学

InkForge v2.1 的视觉语言命名为 **Ethereal Constructivism（以太构成主义）**，是两种设计传统的融合：

- **Ethereal（以太）**：源自 Typora / iA Writer 的"纸张氛围"——安静、克制、以文字为中心，界面消隐至背景，让书写者沉浸在内容中；
- **Constructivism（构成主义）**：建立在明确的视觉结构与色彩逻辑上——构成红 `#D32F2F`、墨色 `#263238`、精密的间距网格与字号阶梯；任何界面元素的存在都必须有其构成理由。

这种融合的结果是：**默认极简，全开关可打开**。应用默认以最安静的方式呈现，而每一处自定义都是精心设计过的、可预测的扩展，而非混乱的叠加。

### 1.2 核心设计哲学

**哲学一：文字是主角**

所有 UI 元素都服从于正文。当用户在写作时，工具栏、侧栏、状态栏都可以隐藏或淡化；用户焦点应该落在纸张和文字上，而不是铬色的界面装饰。

**哲学二：一致胜于独特**

任何新引入的视觉元素都必须从 Ethereal Constructivism 设计语汇中派生，不允许引入孤立风格。一个按钮、一个图标、一个颜色都必须和整体系统保持和声关系。

**哲学三：严禁 emoji**

Emoji 破坏视觉一致性。任何 UI 文本、交互提示、空状态文案、通知消息中都严禁使用 emoji 字符。图标统一使用 `lucide-vue-next`，大小与文字保持比例关系。

**哲学四：动效服务认知，不服务炫技**

动效的目的是帮助用户建立空间感知（页面从哪里来、去哪里）、状态变化感知（加载完成了、保存成功了），而不是装饰。所有动效必须服从分级降级规则，在低性能环境下自动关闭。

**哲学五：护眼是功能，不是选项**

久坐写作者的视觉疲劳是真实的健康问题。护眼模式不是"可有可无的主题变体"，而是第一公民功能：暖色调、降低蓝光、柔和对比度、可与任意主题组合。

---

## 2. 设计语言核心系统

### 2.1 品牌色系

| Token 名称 | 亮色值 | 暗色值 | 用途 |
|---|---|---|---|
| `--color-brand-primary` | `#D32F2F` | `#EF5350` | 构成红：主品牌色、焦点环、强调元素 |
| `--color-brand-hover` | `#C62828` | `#E53935` | 品牌色悬停态 |
| `--color-brand-active` | `#B71C1C` | `#D32F2F` | 品牌色激活态 |
| `--color-brand-subtle` | `rgba(211,47,47,0.08)` | `rgba(239,83,80,0.12)` | 品牌色极浅背景 |
| `--color-ink-900` | `#263238` | `#ECEFF1` | 墨色：最深文字、主标题 |
| `--color-ink-800` | `#37474F` | `#CFD8DC` | 主正文色 |
| `--color-ink-700` | `#455A64` | `#B0BEC5` | 次级文字、副标题 |
| `--color-ink-600` | `#546E7A` | `#90A4AE` | 辅助说明文字 |
| `--color-ink-500` | `#607D8B` | `#78909C` | 禁用文字、占位符 |
| `--color-ink-400` | `#78909C` | `#607D8B` | 边框、分隔线 |
| `--color-ink-300` | `#90A4AE` | `#546E7A` | 细边框 |
| `--color-ink-200` | `#B0BEC5` | `#455A64` | 悬停背景 |
| `--color-ink-100` | `#CFD8DC` | `#37474F` | 表面背景 |
| `--color-ink-50` | `#ECEFF1` | `#263238` | 画布背景 |
| `--color-ink-0` | `#FFFFFF` | `#1A2329` | 纸张白 |

### 2.2 语义颜色令牌

| Token | 亮色值 | 暗色值 | 语义 |
|---|---|---|---|
| `--color-surface-1` | `#FFFFFF` | `#1E272D` | 最高层表面（Modal、弹窗） |
| `--color-surface-2` | `#F5F7F8` | `#242F36` | 二级表面（卡片、侧栏） |
| `--color-surface-3` | `#ECEFF1` | `#2C3940` | 三级表面（输入框背景） |
| `--color-surface-4` | `#E3E8EB` | `#353F47` | 四级表面（悬停状态） |
| `--color-text-primary` | `#37474F` | `#CFD8DC` | 主正文文字 |
| `--color-text-secondary` | `#546E7A` | `#90A4AE` | 次级文字 |
| `--color-text-tertiary` | `#78909C` | `#607D8B` | 辅助文字 |
| `--color-text-disabled` | `#90A4AE` | `#455A64` | 禁用状态文字 |
| `--color-text-inverse` | `#FFFFFF` | `#263238` | 反色文字（品牌色背景上） |
| `--color-border` | `#CFD8DC` | `#37474F` | 常规边框 |
| `--color-border-strong` | `#90A4AE` | `#546E7A` | 强调边框 |
| `--color-border-subtle` | `#E3E8EB` | `#2C3940` | 极细分隔线 |
| `--color-danger` | `#F44336` | `#EF5350` | 危险/错误 |
| `--color-danger-subtle` | `#FFEBEE` | `rgba(244,67,54,0.12)` | 危险背景色 |
| `--color-success` | `#43A047` | `#66BB6A` | 成功状态 |
| `--color-success-subtle` | `#E8F5E9` | `rgba(67,160,71,0.12)` | 成功背景色 |
| `--color-warning` | `#FB8C00` | `#FFA726` | 警告状态 |
| `--color-warning-subtle` | `#FFF3E0` | `rgba(251,140,0,0.12)` | 警告背景色 |
| `--color-info` | `#1E88E5` | `#42A5F5` | 信息提示 |
| `--color-info-subtle` | `#E3F2FD` | `rgba(30,136,229,0.12)` | 信息背景色 |

### 2.3 护眼模式色值

护眼模式（Eye-Care Mode）独立于主题之外，可与任意 AppChrome + EditorContent 主题组合叠加。护眼模式的核心原则：偏暖、降蓝光、柔化对比度。

| Token | 护眼亮色 | 护眼暗色 |
|---|---|---|
| `--paper-bg-eyecare` | `#F9F3E8` | `#1E1A14` |
| `--paper-text-primary-eyecare` | `#3D3028` | `#D4C5A9` |
| `--paper-text-secondary-eyecare` | `#6B5748` | `#A89880` |
| `--paper-border-eyecare` | `#D9C9B0` | `#3D3028` |
| `--paper-code-bg-eyecare` | `#EDE5D4` | `#2A221A` |
| `--chrome-brand-eyecare` | `#C0392B` | `#E57373` |
| `--chrome-bg-canvas-eyecare` | `#F5EDD8` | `#16120D` |

### 2.4 字体系统

#### 正文字体

| 场景 | 字体 | 许可 |
|---|---|---|
| 中文正文 | LXGW WenKai（霞鹜文楷） | SIL Open Font License |
| 中文备选 | Noto Serif CJK SC | Apache 2.0 |
| 英文正文 | Instrument Serif | SIL OFL |
| 英文备选 | Lora | SIL OFL |

#### 代码字体

| 场景 | 字体 | 许可 |
|---|---|---|
| 主代码字体 | Cascadia Code | SIL OFL |
| 备选代码字体 | JetBrains Mono | Apache 2.0 |
| 末端回退 | Consolas, Menlo, monospace | 系统内置 |

#### UI 字体

| 场景 | 字体 | 许可 |
|---|---|---|
| UI 控件文字 | Inter | SIL OFL |
| 数字/统计 | Inter（tabular-nums） | SIL OFL |

#### 字体回退链规则

```css
/* 中文正文 */
font-family: "LXGW WenKai", "Noto Serif CJK SC",
             "Source Han Serif SC", serif;

/* 英文正文 */
font-family: "Instrument Serif", "Lora", Georgia, serif;

/* 代码 */
font-family: "Cascadia Code", "JetBrains Mono",
             Consolas, Menlo, monospace;

/* UI */
font-family: "Inter", system-ui, -apple-system, sans-serif;
```

---

## 3. 用户场景分析

### 3.1 视觉审美用户

**场景描述**：用户对排版和视觉细节有较高要求，选择 InkForge 就是因为它比竞品更"好看"。

**核心需求**：
- 四种内置主题（亮色 / 暗色 / 护眼绿 / 暗夜红）各有明显美感差异；
- 自定义主题编辑器覆盖所有 CSS 变量，可导出分享；
- 字体选择覆盖中文正文 + 英文正文 + 代码字体三轨，各自独立配置；
- 动效流畅（≤ 200ms），页面切换有方向感；
- 滚动条细腻（6px，hover 8px），图标全部 Lucide，无 emoji；

**验收标准**：
- 用户截图后上传到设计社区，无人吐槽"UI 丑"；
- 主题切换过渡无卡顿（动效 ≤ 200ms，60fps）；

### 3.2 久坐写作者（护眼优先）

**场景描述**：每天写作 4 小时以上，对眼睛的保护有明确意识和需求。

**核心需求**：
- 护眼模式（暖色调、低蓝光）一键开启，可与任意主题叠加；
- 行距 1.7 的宽松默认；
- 字号可在 14～20px 之间调整，行距随字号自适应；
- 专注模式（写作时隐藏所有 chrome），StatusBar 可完全关闭；
- 暗色模式 100% 覆盖，无任何组件"夜晚白底"漏出；

**验收标准**：
- 护眼模式开启后，所有文本色温视觉上感到偏暖；
- WCAG AA 对比度（4.5:1）在护眼模式下仍满足；

### 3.3 深度定制用户

**场景描述**：技术背景，希望把 InkForge 调成"自己的风格"，甚至注入自定义 CSS。

**核心需求**：
- 主题编辑器覆盖所有 CSS 变量，可实时预览；
- Typography 面板：字号、行距、段间距、缩进、字间距全部可调；
- 自定义 CSS 注入（Settings > Advanced > Developer Mode 开启后可用）；
- 多主题预设存储，支持导入/导出 `.inkforge-theme.json`；
- 字体可导入本地文件（需开源许可或用户知情同意）；

**验收标准**：
- 用户可将 InkForge 调整为完全个性化外观，同时不破坏功能正确性；
- 自定义 CSS 注入错误超过 3 次自动停用并提示；

---

## 4. 功能范围（MoSCoW）

### 4.1 MUST（必须交付）

| 功能 | 决策来源 | 验收指标 |
|---|---|---|
| 暗色 / 亮色主题切换，100% 组件覆盖 | T09-01 A | 所有 14+ 组件暗色下无白底漏出 |
| 字体渲染优化（中文正文 LXGW + 英文 Instrument Serif） | L1-57 D, R-03 | 中英文字体回退链正确，无字形缺失 |
| 动效规范（页面切换 / 悬停 / 显隐） | T09-02 A, T09-09 D | 所有动效 ≤ 200ms，prefers-reduced-motion 正确降级 |
| 4px 基础间距系统 | 域 R-05 | 所有组件间距来自 token，无魔法数字 |
| 颜色令牌系统（CSS 变量，60+ token） | R-01, T09-01 | 无组件使用 hex 裸值 |
| 护眼模式（暖色调，独立于主题） | T09-01 A | 视觉色温偏暖，WCAG AA 满足 |
| 品牌红 Focus Ring（2px solid，offset 2px） | T09-07 B | 所有可聚焦元素 focus-visible 可见 |
| 自定义细滚动条（6px / hover 8px） | T09-06 B | Webkit 滚动条样式正确，Firefox 降级 |
| Z-index 固定数值标准 | T09-05 B | 无层叠冲突 |
| 全局动效开关（按性能自动降级） | T09-09 D | 低性能设备自动关闭动效 |

### 4.2 SHOULD（应当交付）

| 功能 | 决策来源 | 说明 |
|---|---|---|
| 自定义主题强调色 | L1-58 D | 完整主题编辑器的子集，先出快捷改强调色 |
| 字体大小 / 行距用户调节 | L1-60 D | Typography 面板基础版 |
| 自定义 CSS 注入 | EX-07, T07-04 | Settings > Advanced，开发者模式守卫 |
| 4 种内置主题预设 | R-02 | 默认亮色 / 暗色 / 护眼绿 / 暗夜红 |
| Typography 完整面板 | L1-60 D | 字号/行距/段距/缩进/字间距/标题样式 |

### 4.3 COULD（可选交付）

| 功能 | 说明 |
|---|---|
| 主题导入/导出 `.inkforge-theme.json` | 完整主题编辑器功能之一 |
| 字体用户导入（本地文件） | L1-57 D 的高级子功能 |
| 写作氛围独立配色方案 | L1-49 B+C，与 FocusMode 联动 |
| 多主题预设（超过 4 套内置） | 社区主题分享前置工作 |

### 4.4 WON'T（本版不做）

| 功能 | 原因 |
|---|---|
| 拖拽式可视化设计器 | 远超产品定位，与纸张气质冲突 |
| 主题商店 / 社区主题上传下载平台 | v2.2+ 候选 |
| 触控优化 / 手势支持 | T09-12 A，桌面鼠标优先 |
| @media print 打印样式 | Q-11，v2.1 不做打印 |
| PDF 导出专属样式 | P-05 A，v2.1 不做 PDF |
| 跟随系统自动切换主题 | L1-59 未选 D，仅一次性推荐 |

---

## 5. 非目标

以下内容虽然相关，但**不在本 PRD 范围**：

1. **Workstation 布局结构**（左栏 / 右栏 / 分屏）：见 `25-workstation-layout-spec.md`；
2. **专注模式完整规格**：见 `21-focus-writing-assist-spec.md`；
3. **自定义 CSS 安全沙箱**：见 `54-custom-css-spec.md`；
4. **设计语汇字典**（Ethereal Constructivism 详细规范）：见 `19-design-language.md`（待生成）；
5. **Tauri 桌面端视觉差异**（窗口边框 / 标题栏等）：见 `18-tauri-desktop-spec.md`；
6. **数据洞察图表视觉**：见 `08-data-insights-spec.md`；

---

## 6. 验收标准

### 6.1 颜色与对比度

- AC-01：所有正文文字（`--color-text-primary`）在亮色模式下对比度 ≥ 4.5:1（WCAG AA）；
- AC-02：所有正文文字在暗色模式下对比度 ≥ 4.5:1；
- AC-03：所有大文字（≥ 18px 或 ≥ 14px 粗体）对比度 ≥ 3:1；
- AC-04：护眼模式下正文对比度 ≥ 4.5:1；
- AC-05：所有 UI 组件无硬编码 hex 色值，100% 使用 CSS 变量；
- AC-06：暗色模式下无任何组件出现白色背景（`#FFFFFF`）；
- AC-07：品牌红 `#D32F2F` 只在亮色模式下使用，暗色模式用 `#EF5350`；
- AC-08：危险操作按钮颜色 `--color-danger` 在所有状态下对比度达标；
- AC-09：链接颜色在正文中可识别（与正文文字对比度 ≥ 3:1）；

### 6.2 字体与排版

- AC-10：中文正文字体为 LXGW WenKai，回退到 Noto Serif CJK SC；
- AC-11：英文正文字体为 Instrument Serif，回退到 Lora；
- AC-12：代码字体为 Cascadia Code，回退到 JetBrains Mono；
- AC-13：UI 字体为 Inter；
- AC-14：所有字体以 `@font-face` 本地加载，不依赖 CDN；
- AC-15：字体加载失败时回退到系统 serif/monospace，无布局崩溃；
- AC-16：行距默认 1.7（正文），标题 1.2，代码 1.5；
- AC-17：用户调整字号后，行距自适应（不固定 px）；

### 6.3 动效与性能

- AC-18：微动效（hover 态变化）≤ 80ms；
- AC-19：标准动效（弹窗出现、Toast）≤ 150ms；
- AC-20：复杂动效（命令面板展开、主题切换）≤ 250ms；
- AC-21：页面切换动效 ≤ 350ms；
- AC-22：`prefers-reduced-motion: reduce` 时，所有动效 duration 设为 0ms；
- AC-23：低性能设备（FPS < 45 持续 2s）自动关闭动效（`data-animation-level="none"`）；
- AC-24：动效不阻塞 JS 主线程（使用 CSS transition/animation）；
- AC-25：主题切换过渡期间不触发额外动效（防止叠加卡顿）；

### 6.4 间距与布局

- AC-26：所有组件间距来自 4px 基础网格，无魔法数字；
- AC-27：Hub 密度为 comfortable，Workstation 为 standard，Settings 为 compact；
- AC-28：任何页面的信息密度都不得出现"后台表格系统"感；
- AC-29：纸张区域最大宽度 800px（默认），用户可在 4 档宽度间切换；

### 6.5 焦点与无障碍

- AC-30：所有可聚焦元素在 `:focus-visible` 时显示品牌红 2px outline，offset 2px；
- AC-31：焦点环在暗色模式下仍可见（颜色调整为 `#EF5350`）；
- AC-32：键盘 Tab 顺序在所有视图下符合逻辑顺序；
- AC-33：所有交互元素有 ARIA label 或可计算的 accessible name；

### 6.6 滚动条

- AC-34：Webkit 浏览器中滚动条宽度为 6px，hover 8px；
- AC-35：滚动条颜色跟随主题（亮色 `#CFD8DC`，暗色 `#37474F`）；
- AC-36：Firefox 使用 `scrollbar-width: thin` 降级；
- AC-37：纸张区域（`.editor-paper`）无横向滚动条（除非内容超宽）；

### 6.7 Z-index 层叠

- AC-38：StatusBar Z-index = 100；
- AC-39：FloatingToolbar Z-index = 200；
- AC-40：ContextMenu / Dropdown Z-index = 250；
- AC-41：Modal Z-index = 300；
- AC-42：Toast Z-index = 400；
- AC-43：Overlay / Backdrop Z-index = 500；
- AC-44：无组件使用未在 z-index 规范中定义的数值；

### 6.8 Lighthouse 与性能

- AC-45：Lighthouse Performance Score ≥ 80（Tauri WebView 本地环境）；
- AC-46：首屏 LCP ≤ 2.5s（Tauri 冷启动后）；
- AC-47：输入延迟（INP）≤ 50ms；
- AC-48：字体加载不产生 FOIT（闪烁不可见文字），最长 FOUT 3s 后强制显示 fallback；

### 6.9 视觉一致性

- AC-49：图标系统 100% 使用 `lucide-vue-next`，禁止 emoji、禁止其他图标库混用；
- AC-50：任何新组件上线前必须通过"设计语汇映射检查"（见 `19-design-language.md`）；

---

## 7. 度量指标

### 7.1 用户行为指标（可在 DataInsights 中采集）

| 指标 | 定义 | 目标 |
|---|---|---|
| 主题使用分布 | 各主题在所有账户中的使用比例 | 暗色主题使用率 > 30% |
| 护眼模式激活率 | 启用护眼模式的账户比例 | 不设上限，关注趋势 |
| 字体切换频率 | 用户切换字体的次数/月 | 有效反映 FontSystem 吸引力 |
| 自定义 CSS 使用率 | 使用自定义 CSS 注入的账户比例 | 预期 < 5%，技术用户群 |
| Typography 面板使用率 | 打开过排版面板的账户比例 | 反映定制需求强度 |
| 动效降级触发率 | 因性能自动关闭动效的会话比例 | 目标 < 10% |

### 7.2 技术质量指标

| 指标 | 定义 | 目标 |
|---|---|---|
| CSS 变量覆盖率 | 使用 `var(--color-*)` 的色值比例 | 100% |
| 组件暗色覆盖率 | 暗色模式下无白底漏出的组件比例 | 100% |
| WCAG AA 通过率 | 对比度达标的文字/背景组合比例 | 100% |
| 动效帧率 | 动效期间 FPS 中位数 | ≥ 60fps |

---

## 8. 技术依赖与风险

### 8.1 依赖

| 依赖项 | 用途 | 版本 |
|---|---|---|
| Tailwind CSS 4.x | CSS-first 工具类 + @theme 变量集成 | ^4.0 |
| lucide-vue-next | 图标系统 | ^0.378 |
| PostCSS | CSS 变量处理、自定义 CSS 沙箱清洗 | ^8 |
| @fontsource/lxgw-wenkai | 霞鹜文楷本地加载 | latest |
| @fontsource/instrument-serif | Instrument Serif 本地加载 | latest |
| @fontsource/inter | Inter 本地加载 | latest |

### 8.2 风险

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| 字体加载体积过大影响首屏 | 中 | 高 | 按需加载字重，woff2 格式，font-display: swap |
| 自定义主题编辑器复杂度失控 | 中 | 中 | 先出基础版（改强调色），再逐步开放全量 |
| Tailwind 4.x 与现有 class 冲突 | 低 | 高 | 在独立分支验证迁移，保留逃生舱 |
| 动效性能在复杂页面下降 | 中 | 中 | T09-09 D 自动降级机制兜底 |
| 护眼模式色彩难以满足所有用户 | 中 | 低 | 提供用户自定义护眼色温参数 |

---

## 9. 里程碑与交付

| 里程碑 | 内容 | 验收门槛 |
|---|---|---|
| M1: 令牌系统 | CSS 变量完整定义，亮色/暗色双套 | 无裸 hex，所有 token 可用 |
| M2: 暗色覆盖 | 所有组件暗色适配完成 | AC-06 通过，组件暗色覆盖率 100% |
| M3: 字体系统 | 四轨字体加载，回退链正确 | AC-10~15 通过，无 FOIT |
| M4: 动效规范 | 所有动效按级分类，降级机制上线 | AC-18~25 通过 |
| M5: Typography | 排版面板上线，字号/行距可调 | 用户可调整并持久化 |
| M6: 护眼模式 | 独立于主题的护眼模式上线 | WCAG AA 满足，视觉色温偏暖 |
| M7: 主题编辑器 | 基础主题编辑器（强调色 + 导入导出） | 用户可保存自定义主题 |
| M8: 验收 | Lighthouse ≥ 80，全 AC 通过 | AC-45~50 全部通过 |

---

## 10. 页面密度策略详解

InkForge 的三个主视图（Hub / Workstation / Settings）采用差异化的信息密度，每个视图都有明确的密度根节点标记。

### 10.1 Hub — Comfortable（舒适密度）

Hub 是用户进入应用后的"起点"，承载文章卡片、数据洞察、目标进度等内容。密度策略：

- 卡片间距：`--space-4`（16px）
- 卡片内边距：`--space-4`（16px），大型卡片 `--space-6`（24px）
- 标题与内容间距：`--space-3`（12px）
- 章节间距：`--space-8`（32px）
- 字号：正文 `--text-md`（16px），辅助 `--text-base`（14px）
- 行高：`--leading-body`（1.7）

Hub 根节点标记：`data-density="comfortable"`

严禁：任何区域出现行高 < 1.4 的多行文字段落、表格无 padding 的"后台感"展示。

### 10.2 Workstation — Standard（标准密度）

Workstation 是写作主战场，侧栏、工具栏、编辑器并排存在。密度策略：

- 侧栏导航项内边距：`8px 16px`
- 工具栏按钮间距：`--space-1`（4px）
- TabBar 标签内边距：`0 14px`，高度 40px
- StatusBar 高度：24px，字号 11px
- 左栏宽度：240px（默认），最小 180px，最大 320px
- 纸张区域最大宽度：800px，留边距 `--space-10`（40px）两侧

Workstation 根节点标记：`data-density="standard"`

### 10.3 Settings — Compact（紧凑密度，相对而言）

Settings 包含大量表单和控件，但仍需保持品质感，不得出现无间距的表格感。密度策略：

- 表单行间距：`--space-3`（12px）
- 章节间距：`--space-6`（24px）
- Tab 切换高度：44px
- 控件高度：36px（默认）/ 28px（sm）
- 标签字号：`--text-sm`（13px）
- 说明文字颜色：`--color-text-secondary`

Settings 根节点标记：`data-density="compact"`

---

## 11. 主题系统架构概述

本节面向 PRD 受众（非 Spec 受众），概括主题系统的用户感知层面。

### 11.1 主题切换的用户路径

```
Settings > 外观
  ├── AppChrome 主题选择器（4 套预设 + 自定义）
  ├── EditorContent 主题选择器（4 套预设 + 自定义）
  ├── 护眼模式开关（独立于主题，叠加生效）
  └── 主题编辑器（折叠区，打开后全量编辑）
```

用户可在 30 秒内完成主题切换，无需重启应用，切换过渡流畅（分层 150ms/300ms）。

### 11.2 主题预设的命名与视觉定位

| 主题名 | 定位 | 情感关键词 |
|---|---|---|
| Default Light | 日间标准 | 清晰、专业、中性 |
| Default Dark | 夜间标准 | 沉稳、护眼、专注 |
| Eye Care | 护眼暖光 | 温暖、舒适、低疲劳 |
| Ethereal Night | 极深暗色 | 神秘、极致、暗夜 |

### 11.3 主题扩展点（v2.2 预留）

- 主题导入/导出为 `.inkforge-theme.json`（v2.1 SHOULD）
- 社区主题分享（v2.2）
- 主题与 Typography 打包为单一主题包（v2.1）

---

## 12. 视觉一致性审查规范

T09-13 D 决策要求：**所有新组件必须映射到 Ethereal Constructivism 设计语汇**。本节定义审查流程。

### 12.1 审查维度

| 维度 | 检查项 | 违规例子 |
|---|---|---|
| 颜色 | 是否使用 CSS 变量，无裸 hex | `color: #ff0000` |
| 图标 | 是否来自 lucide-vue-next | 混用 heroicons |
| Emoji | 是否存在 emoji 字符 | `完成` |
| 圆角 | 是否来自圆角阶梯变量 | `border-radius: 3px` |
| 间距 | 是否来自 4px 网格 | `padding: 7px 15px` |
| 字体 | 是否使用定义的字体栈 | 自定义字体名 |
| 动效 | 是否使用时长变量 | `transition: 0.3s` |
| 密度 | 是否匹配当前视图密度 | Hub 中出现 compact 感表格 |
| 风格 | 是否偏 Notion/块编辑感 | 大号 `+` 悬浮按钮 |

### 12.2 代码评审 Checklist

每个涉及 UI 组件的 PR 合并前必须检查：

- [ ] 无 emoji 字符（grep 检查）
- [ ] 无裸 hex 色值（stylelint 自动检查）
- [ ] 所有图标来自 lucide-vue-next
- [ ] 暗色模式下无白底漏出
- [ ] focus-visible 状态可见
- [ ] 组件 ARIA 属性完整
- [ ] 动效时长使用 CSS 变量

### 12.3 自动化检查工具

```bash
# CI 检查脚本（.github/workflows/ui-check.yml）

# 1. Stylelint 检查裸 hex 和 !important
pnpm stylelint 'src/**/*.{css,vue}'

# 2. ESLint 检查 emoji 字面量
pnpm eslint --rule 'no-irregular-whitespace: error'

# 3. 检查图标来源
pnpm tsx scripts/check-icon-imports.ts

# 4. axe-core 自动化 a11y 检查（Playwright）
pnpm test:a11y
```

---

## 13. 交互微规范补充

### 13.1 Hover 态规范

所有可交互元素的 hover 态必须在 80ms 内响应，且颜色过渡使用 `var(--duration-micro)`：

```css
/* 正确 */
.interactive {
  transition: background-color var(--duration-micro) var(--ease-out),
              color var(--duration-micro) var(--ease-out);
}
/* 错误：没有过渡 */
.interactive:hover { background: ...; }
```

### 13.2 Active 态规范

点击瞬间（active）使用比 hover 更深的颜色，并可选加入轻微 `transform: translateY(1px)` 反馈（仅 Primary Button）：

```css
.btn-primary:active {
  background: var(--color-brand-active);
  transform: translateY(1px);
}
/* 其他控件：仅颜色变化，不做 transform */
```

### 13.3 Loading 态规范

异步操作中的按钮/控件进入 loading 态：

- 显示 Lucide `Loader2` 图标（CSS `animation: spin 1s linear infinite`）；
- 按钮文字保持可见（不替换为 spinner），图标显示在文字左侧；
- 禁用点击（`pointer-events: none`，但不加 `disabled` 属性以保持 ARIA 可访问）；
- loading 态最长 10s，超时后自动回到正常态并显示错误 Toast；

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.icon-loading {
  animation: spin 1s linear infinite;
}
```

### 13.4 空状态（Empty State）规范

T09-04 A 决定：每个组件自定义空状态，但必须遵守以下原则：

- 不使用 emoji；
- 文案使用 `--color-text-tertiary`（最淡的辅助文字色）；
- 图标使用 Lucide，尺寸 24px，颜色 `--color-text-tertiary`；
- 图标与文字的间距 `--space-2`（8px）；
- 主文案简洁（≤ 12 字），可有一行补充说明；
- 若有可操作的空状态（如"新建第一篇文章"），提供一个 Ghost 按钮；

```html
<!-- 示例：Hub 文章列表空状态 -->
<div class="empty-state">
  <Icon :icon="FileText" :size="24" class="text-text-tertiary" />
  <p class="empty-primary">暂无文章</p>
  <p class="empty-secondary">按 Ctrl+N 创建第一篇文章</p>
  <button class="btn-ghost">新建文章</button>
</div>
```

### 13.5 骨架屏使用限制（T09-11 A）

几乎不用骨架屏，加载时直接展示文字说明：

```html
<!-- 正确：加载时直接显示文字 -->
<div v-if="!isLoaded" class="loading-text">正在加载...</div>
<div v-else>{{ content }}</div>

<!-- 错误：不需要的骨架屏 -->
<SkeletonLoader v-if="!isLoaded" />
```

骨架屏仅在以下极个别场景使用：
- 初次加载 Hub 主卡片区（防止布局抖动）；
- 文章首次在 Workstation 打开的前 300ms；

---

## 14. 关联 Spec 索引

| Spec | 关联内容 |
|---|---|
| `09-spec-ui-polish.md` | 本 PRD 的全量技术规格（CSS/组件/令牌）|
| `20-theme-font-typography-spec.md` | ThemeEngine / FontSystem / Typography 详细规格 |
| `19-design-language.md`（待生成） | Ethereal Constructivism 设计语汇字典 |
| `21-focus-writing-assist-spec.md` | 专注模式视觉细节 |
| `54-custom-css-spec.md` | 自定义 CSS 注入安全规范 |
| `25-workstation-layout-spec.md` | 三栏布局视觉规格 |
| `17-crash-recovery-spec.md` | 崩溃恢复 UI 层视觉（Modal / Toast）|
| `27-performance-slo-spec.md` | Lighthouse ≥ 80 的具体测量方法 |

---

## 15. 组件状态矩阵

组件视觉需在全状态交叉维度下保持一致，以下矩阵作为设计审查清单：

### 15.1 交互状态维度

| 状态 | 触发条件 | 视觉表现 | 持续时长 |
|---|---|---|---|
| Default | 初始状态 | 基线颜色/边框 | — |
| Hover | 鼠标进入 | 背景浅化 8%（light）/ 亮化 8%（dark） | 80ms 过渡 |
| Focus | 键盘聚焦 | 2px solid `--color-brand` ring | 立即 |
| Active | 鼠标按下 | translateY(1px) + 背景加深 | 按住期间 |
| Disabled | disabled 属性 | opacity 0.4，cursor not-allowed | — |
| Loading | 异步等待 | Loader2 图标 spin + 文字淡出 | 直到完成 |
| Error | 校验失败 | 边框变 `--color-danger`，icon + 提示文字 | 直到修正 |
| Success | 操作成功 | 短暂绿色反馈（500ms）后恢复 | 500ms |

### 15.2 主题交叉矩阵

下列组件须在全部主题下通过视觉回归测试：

| 组件 | Light | Dark | Eye Care | Ethereal Night |
|---|---|---|---|---|
| PrimaryButton | AC-01 | AC-01 | AC-01 | AC-01 |
| Input (Error) | AC-09 | AC-09 | AC-09 | AC-09 |
| Modal | AC-15 | AC-15 | AC-15 | AC-15 |
| FloatingToolbar | AC-23 | AC-23 | AC-23 | AC-23 |
| Sidebar | AC-30 | AC-30 | AC-30 | AC-30 |
| Badge | AC-36 | AC-36 | AC-36 | AC-36 |
| ContextMenu | AC-41 | AC-41 | AC-41 | AC-41 |

全部 50 条验收标准须在四主题下均满足，CI 回归测试覆盖所有交叉场景。

---

## 16. 可访问性核查清单

本节是提交合并前的可访问性自查清单，所有条目须全部通过方可合并。

### 16.1 色彩对比度

| 文字类型 | 最低要求 | 推荐值 | 工具验证 |
|---|---|---|---|
| 正文（14px+） | 4.5:1（WCAG AA） | ≥ 5.5:1 | contrast-ratio.com |
| 大文字（18px+ 常规 / 14px+ 粗体） | 3:1 | ≥ 4.5:1 | axe DevTools |
| UI 组件边框 | 3:1 | ≥ 3.5:1 | Colour Contrast Analyser |
| 占位符文字 | 4.5:1 | — | 手工验证 |
| 禁用文字 | 免除 | — | — |

### 16.2 键盘导航

- 所有可交互元素须可通过 Tab 键聚焦，聚焦顺序符合视觉逻辑。
- 模态框打开后焦点须移入，关闭后须还原到触发元素。
- ContextMenu / Dropdown 须支持 ArrowUp / ArrowDown / Enter / Escape 键盘操作。
- FloatingToolbar 须支持按 Escape 关闭，焦点返回编辑器光标位置。
- 侧栏折叠 / 展开须可用键盘触发（例如 Ctrl+\ 快捷键）。

### 16.3 屏幕阅读器支持

- 所有图标按钮须携带 `aria-label`；
- Toast 区域须设置 `aria-live="polite"`；
- Modal 须通过 `aria-labelledby` 绑定标题，`aria-describedby` 绑定正文；
- 进度 / 加载状态须通过 `role="status"` 或 `aria-live` 对外播报；
- 禁用状态使用 `aria-disabled="true"` 而非仅依赖 HTML `disabled`。

### 16.4 动效减弱

用户系统开启 `prefers-reduced-motion: reduce` 时：

- 所有 CSS transition duration 降为 0ms；
- JS 动画立即完成，不播放中间帧；
- 旋转 / 跳动等循环动画须停止（Loader2 spin 改为静态 icon）；
- 页面切换路由动画取消，直接显示目标页；
- 此行为无需用户手动配置，自动响应系统设置。

---

## 17. 版本控制与变更追踪

### 17.1 CSS Token 变更规范

CSS 自定义属性（`--color-*` / `--font-*` / `--spacing-*`）属于公开 API，变更须遵守：

1. **新增 token**：在 `light.css` / `dark.css` 同步添加，并更新 Tailwind `@theme` 映射；
2. **重命名 token**：保留旧名称作别名至少两个 release 版本，使用 CSS `var(--new-name)` 转发；
3. **删除 token**：须确认无任何组件直接引用，CI `grep` 检查通过后方可删除；
4. **值变更（非破坏性）**：光暗双主题同步更新，截图对比回归测试通过；
5. **所有变更须在 CHANGELOG 中记录**，格式：`[Token] --color-brand: #D32F2F → #C62828`。

### 17.2 组件视觉变更规范

组件 CSS 的任何视觉变更（颜色、尺寸、间距、圆角、阴影）须：

- 更新对应 Spec 的验收标准；
- 更新 Storybook Story 或截图基准；
- 在 PR Description 中附上 Before / After 截图对比；
- 标注受影响的验收标准编号（AC-xx）；
- 经设计 Review 或 PM 确认后合并。

### 17.3 PRD 版本历史

| 版本 | 日期 | 变更摘要 |
|---|---|---|
| v1.0 | 2026-04-20 | 初版，覆盖 T09 全量决策 + EX-02/EX-08 |
| v1.1 | 2026-04-21 | 新增第 10-17 节（密度策略/主题架构/可访问性/版本控制）|

---

## 18. 术语表

| 术语 | 定义 |
|---|---|
| Ethereal Constructivism | InkForge 设计哲学，兼具「纸感」与「构成主义配色逻辑」|
| AppChromeTheme | 应用框架层主题（Hub / Sidebar / TabBar / StatusBar），Token 前缀 `--chrome-` |
| EditorContentTheme | 编辑器内容层主题（Paper / 字体 / 行高），Token 前缀 `--paper-` |
| Eye Care Mode | 护眼模式，在当前主题上叠加暖色调 CSS overlay，不切换主题 |
| Primitive Token | 原始色彩 Token，如 `--ink-500: #607D8B`，不直接用于组件 |
| Semantic Token | 语义 Token，如 `--color-text-primary`，引用 Primitive，用于组件 |
| Component Token | 组件专属 Token，如 `--button-primary-bg`，引用 Semantic，可选粒度 |
| Tab Stop | Snippet 系统中的光标跳转锚点，语法 `$1 $2 $0`（VSCode 兼容）|
| WikiLink | 双向链接语法 `[[title]]`，解析为 TipTap Inline Atom Node |
| Backlink | 反向链接，记录哪些文章指向当前文章，存储于 IndexedDB |
| WCAG AA | Web 内容无障碍指南 2.1 AA 级，文字对比度 ≥ 4.5:1 |
| Blast Radius | GitNexus 影响分析中，修改某符号后受波及的全部上下游 |
| Animation Level | 动画降级策略枚举：full / reduced / none，由系统设置 + FPS 监控驱动 |
| Floating UI | 浮层定位库（@floating-ui/vue），用于 Tooltip / ContextMenu / 自动补全浮窗 |
| Stagger List | 列表项依次延迟出现的动画，步长 30ms，最大 8 项后不再累加 |
| Glass Effect | `backdrop-filter: blur()` 毛玻璃效果，须提供 `prefers-reduced-transparency` 降级 |

---

## 19. 参考决策来源

本 PRD 所有决策均有问卷溯源，以下为决策编号与问卷题目的对照：

| 决策编号 | 问卷题目 | 答案 | 影响范围 |
|---|---|---|---|
| T09-01 | 暗色模式覆盖率 | A（100% 覆盖） | 全量组件须支持 dark 变体 |
| T09-02 | 页面切换过渡动画 | A（保留，subtle） | 路由动画 slideLeft/slideRight |
| T09-03 | 面板宽度过渡 | A（保留） | Sidebar resize 80ms ease-out |
| T09-05 | Z-index 管理 | B（固定数值） | 见 Z-index 层级表 |
| T09-06 | 滚动条样式 | B（细滚动条 6px/hover 8px） | 全局滚动条 CSS |
| T09-07 | Focus ring | B（品牌红） | `--color-brand` 2px ring |
| T09-09 | 动画降级 | D（自动降级 + FPS 监控） | useAnimationLevel composable |
| T09-10 | 页面密度 | B（Hub 宽松 / Workstation 标准 / Settings 紧凑）| data-density 属性 |
| T09-11 | Skeleton 屏 | A（不用）| 极个别场景例外 |
| T09-12 | 触摸支持 | A（仅鼠标）| 无 touch 事件处理 |
| T09-13 | 视觉一致性 | D（最严格 + 禁 emoji）| pre-commit hook + CI lint |
| L1-57 | 字体可扩展性 | D（开源字体 + 中英分离）| FontSystem 架构 |
| L1-58 | 主题编辑器 | D（完整编辑器 + 双轨分离）| ThemeEngine 双轨 |
| L1-59 | 主题切换过渡 | C（分层过渡）| CSS transition on `[data-theme]` |
| EX-02 | WikiLink | v2.1 实现 | 见 `36-wiki-link-spec.md` |
| EX-08 | Snippet 系统 | v2.1 实现 | 见 `37-snippet-system-spec.md` |
