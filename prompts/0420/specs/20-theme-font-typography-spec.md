# Spec 20 | ThemeEngine + FontSystem + Typography + WritingAmbience

> 视觉系统三件套合集。本 Spec 是 InkForge v2.1 的**视觉底座**，所有 UI 组件、所有 Editor 渲染、所有氛围切换均依赖此 Spec 提供的 CSS 变量、字体链、排版面板与主题管线。
>
> 本文件对应 `prompts/0420/00-task-roadmap.md` §3 第 20 条、`00-decisions-part3b-tauri-visual-recovery.md` 决策 R-01 ~ R-04 + R-09，以及 `_extracted/03-enhancement-answers.md` 的 L1-49 / L1-57 / L1-58 / L1-59 / L1-60。
>
> **范围**：主题引擎（ThemeEngine，双轨）+ 字体系统（FontSystem，开源 + 用户导入）+ 排版系统（Typography，完整面板）+ 写作氛围（WritingAmbience，iA Writer 哲学）。
>
> **不在本 Spec 范围**：
> - 自定义 CSS 注入（→ `54-custom-css-spec.md`）
> - 专注模式与打字机模式视觉细节（→ `21-focus-writing-assist-spec.md`）
> - Ethereal Constructivism 设计语汇字典（→ `19-design-language.md`）
> - 动画分级与自动降级（→ `09-ui-polish-spec.md` / R-06）
> - Workstation 三栏布局（→ `25-workstation-layout-spec.md`）

---

## 目录

### Part A. ThemeEngine（主题引擎）
1. 设计原则
2. 双轨主题模型
3. CSS 变量完整清单
4. 主题对象结构（JSON Schema）
5. 主题导入 / 导出
6. 内置主题（6 种）
7. 主题编辑器 UI
8. 切换动画（分层过渡）
9. 纸张区域与工具栏各自过渡
10. 强调色快捷改
11. 预览与重置
12. 主题版本兼容

### Part B. FontSystem（字体系统）
13. 字体分类
14. 内置字体清单
15. 中英文独立配置
16. 用户字体导入
17. License 检测与警告
18. 字体加载策略
19. FontFamily 持久化
20. 与 Typography 联动

### Part C. Typography（排版系统）
21. 字号 / 行距 / 段间距 / 缩进 / 字间距
22. 标题层级样式（h1 ~ h6）
23. 引用 / 代码块 / 列表样式
24. Typography 面板
25. 预设（紧凑 / 标准 / 宽松）
26. 与主题集成

### Part D. WritingAmbience（iA Writer 哲学）
27. Writing Mode Theme 定义
28. 激活路径
29. StatusBar 可关闭
30. 与 FocusMode 差异
31. 环境配色方案（日间 / 夜间 / 暖光）

### Part E. 集成
32. 三件套联动
33. 统一包 `.inkforge-theme`
34. 验收矩阵
35. 权威来源登记表

---

# Part A. ThemeEngine（主题引擎）

## 1. 设计原则

### 1.1 Ethereal Constructivism 冻结

- 品牌主红 `#D32F2F`、墨色 `#263238`、文字色 `#37474F` 在**内置主题内不可破坏**；用户主题可改，但内置主题的默认值固定。
- 纸张气质（Typora / iA Writer 风）为冻结项（R-01），任何主题都不得引入 Notion 块编辑的 `+` 悬浮按钮式视觉侵扰。
- 严禁 emoji（R-01 / T09-13 补充）；严禁孤立设计语汇；严禁硬编码色值。

### 1.2 视觉定制深度最大

- 所有视觉 token 全部 CSS 变量化（见 §3）。
- 主题可导入 / 导出（`.inkforge-theme.json`），可内嵌 Typography、FontFamily 变量。
- 主题编辑器（Settings > Appearance）暴露所有变量为可视化控件。

### 1.3 默认极简 / 全开关可打开

- 默认展示"内置 6 套主题"，高级自定义折叠在"打开主题编辑器"按钮后。
- 主题切换过渡分层（R-02 §切换过渡），纸张与 chrome 使用不同持续时间，形成视觉层次。
- 跟随系统切换为**一次性推荐**（首启弹一次），默认关闭（L1-59 未选 D）。

### 1.4 冻结项保护机制

- `ThemeEngine` 在应用主题前执行 `validate(theme)`：
  - 若主题试图修改 `--color-brand-red`、`--color-ink-black`、`--color-text-primary` 的内置主题副本 → 拒绝并提示"内置主题为视觉冻结项"。
  - 用户自定义主题可改这 3 个 token，但编辑器中显示警告"偏离品牌视觉"。

---

## 2. 双轨主题模型（L1-58 D + R-02）

### 2.1 两轨定义

```
┌─────────────────────────────────────────────────────────────┐
│                    ThemeEngine（双轨）                      │
├─────────────────────────┬───────────────────────────────────┤
│  AppChromeTheme          │  EditorContentTheme               │
│  （应用外壳主题）         │  （写作内容主题）                  │
├─────────────────────────┼───────────────────────────────────┤
│  作用域：                │  作用域：                           │
│  - TopBar                │  - `.editor-paper` 纸张容器        │
│  - Sidebar               │  - 正文色、标题色                  │
│  - StatusBar             │  - 代码块背景                      │
│  - TabBar                │  - 引用色、链接色                  │
│  - Hub                   │  - 列表 marker 色                  │
│  - Settings              │  - 分隔线色                        │
│  - Modal / Toast         │                                    │
│  - Tooltip / Popover     │                                    │
├─────────────────────────┼───────────────────────────────────┤
│  CSS 变量前缀：          │  CSS 变量前缀：                     │
│  --chrome-*              │  --paper-*                         │
└─────────────────────────┴───────────────────────────────────┘
```

### 2.2 独立切换能力

- 用户可组合出"应用深色 + 写作羊皮纸色"或"应用浅灰 + 写作暗夜模式"等非常规组合。
- Settings > Appearance 面板提供两个独立的"主题选择器"（AppChrome、EditorContent），各自下拉选择预设或打开编辑器。
- **两轨之间的切换动画独立**（§8）：AppChrome 过渡 150ms，EditorContent 过渡 300ms，形成"纸张先动 chrome 随后"的视觉层次。

### 2.3 作用域隔离硬约束（R-02）

- EditorContentTheme 的变量**仅作用于** `.editor-paper` 容器及其后代。
- EditorContentTheme 变量**绝不影响** FloatingToolbar、SlashMenu、Modal、Toast、Popover、Tooltip、ContextMenu 等 overlay 组件。
  - 实现方式：overlay 组件 CSS 明确使用 `--chrome-*` 变量，不引用 `--paper-*`。
- CI 检查（stylelint 自定义插件）：overlay 组件样式文件中禁止出现 `--paper-*` 变量引用。

### 2.4 数据模型

```ts
interface DualTrackTheme {
  id: string;              // uuid
  name: string;            // 用户可见名
  version: '2.1';
  author?: string;
  chrome: ChromeThemeVars; // AppChromeTheme 变量表
  paper: PaperThemeVars;   // EditorContentTheme 变量表
  typography?: Partial<TypographyConfig>; // 可内嵌排版
  font?: Partial<FontConfig>;             // 可内嵌字体
  mode: 'light' | 'dark' | 'sepia' | 'custom';
  createdAt: number;
  updatedAt: number;
}
```

### 2.5 当前激活态 Store

```ts
interface ThemeStoreState {
  activeChrome: string;          // theme id
  activePaper: string;
  followSystem: boolean;         // 是否跟随系统（默认 false）
  transitionEnabled: boolean;    // 切换过渡（默认 true，受动画等级影响）
  lastAppliedAt: number;
}
```

---

## 3. CSS 变量完整清单

### 3.1 AppChrome 变量（`--chrome-*`，约 48 个）

#### Colors

```css
:root {
  /* 品牌色 */
  --chrome-brand-red: #D32F2F;
  --chrome-brand-red-hover: #C62828;
  --chrome-brand-red-active: #B71C1C;
  --chrome-brand-red-a20: rgba(211, 47, 47, 0.2);

  /* 中性序列 */
  --chrome-ink-900: #263238;     /* 墨黑 */
  --chrome-ink-800: #37474F;     /* 主文字色 */
  --chrome-ink-700: #455A64;
  --chrome-ink-600: #546E7A;
  --chrome-ink-500: #607D8B;
  --chrome-ink-400: #78909C;
  --chrome-ink-300: #90A4AE;
  --chrome-ink-200: #B0BEC5;
  --chrome-ink-100: #CFD8DC;
  --chrome-ink-50:  #ECEFF1;
  --chrome-ink-0:   #FFFFFF;

  /* 语义色 */
  --chrome-bg-canvas: var(--chrome-ink-50);
  --chrome-bg-sidebar: var(--chrome-ink-0);
  --chrome-bg-topbar: var(--chrome-ink-0);
  --chrome-bg-statusbar: var(--chrome-ink-50);
  --chrome-bg-modal: var(--chrome-ink-0);
  --chrome-bg-toast: var(--chrome-ink-900);
  --chrome-bg-popover: var(--chrome-ink-0);
  --chrome-bg-hover: rgba(38, 50, 56, 0.04);
  --chrome-bg-active: rgba(38, 50, 56, 0.08);
  --chrome-bg-selected: var(--chrome-brand-red-a20);

  --chrome-text-primary: var(--chrome-ink-800);
  --chrome-text-secondary: var(--chrome-ink-600);
  --chrome-text-tertiary: var(--chrome-ink-400);
  --chrome-text-disabled: var(--chrome-ink-300);
  --chrome-text-on-brand: var(--chrome-ink-0);
  --chrome-text-on-dark: var(--chrome-ink-0);

  --chrome-border-default: var(--chrome-ink-100);
  --chrome-border-strong: var(--chrome-ink-200);
  --chrome-border-focus: var(--chrome-brand-red);
  --chrome-border-divider: var(--chrome-ink-50);

  /* 状态色 */
  --chrome-status-success: #2E7D32;
  --chrome-status-warning: #EF6C00;
  --chrome-status-error: #C62828;
  --chrome-status-info: #1565C0;
}
```

#### Spacing

```css
:root {
  --chrome-spacing-xs: 4px;
  --chrome-spacing-sm: 8px;
  --chrome-spacing-md: 12px;
  --chrome-spacing-lg: 16px;
  --chrome-spacing-xl: 24px;
  --chrome-spacing-2xl: 32px;
  --chrome-spacing-3xl: 48px;
}
```

#### Radius

```css
:root {
  --chrome-radius-sm: 4px;
  --chrome-radius-md: 6px;
  --chrome-radius-lg: 8px;
  --chrome-radius-xl: 12px;
  --chrome-radius-full: 9999px;
}
```

#### Shadow

```css
:root {
  --chrome-shadow-sm: 0 1px 2px rgba(38, 50, 56, 0.06);
  --chrome-shadow-md: 0 2px 8px rgba(38, 50, 56, 0.08);
  --chrome-shadow-lg: 0 8px 24px rgba(38, 50, 56, 0.12);
  --chrome-shadow-xl: 0 16px 48px rgba(38, 50, 56, 0.16);
  --chrome-shadow-focus: 0 0 0 3px var(--chrome-brand-red-a20);
}
```

#### Blur

```css
:root {
  --chrome-blur-backdrop-sm: 4px;
  --chrome-blur-backdrop-md: 12px;
  --chrome-blur-backdrop-lg: 24px;
}
```

### 3.2 Paper 变量（`--paper-*`，约 36 个）

```css
:root {
  /* 纸张基础 */
  --paper-bg: #FAFAF7;                /* 默认纸张色（偏暖白） */
  --paper-bg-raised: #FFFFFF;         /* 嵌入块背景（代码块等） */
  --paper-surface-1: #F5F5F0;
  --paper-surface-2: #EEEEE8;

  /* 正文色 */
  --paper-text-primary: #263238;
  --paper-text-secondary: #455A64;
  --paper-text-tertiary: #78909C;
  --paper-text-syntax: #B0BEC5;       /* Markdown 语法标记色（灰淡） */
  --paper-text-emphasis: var(--paper-text-primary);

  /* 标题色 */
  --paper-heading-h1: #1A237E;
  --paper-heading-h2: #283593;
  --paper-heading-h3: #3949AB;
  --paper-heading-h4: #455A64;
  --paper-heading-h5: #546E7A;
  --paper-heading-h6: #607D8B;

  /* 代码块 */
  --paper-code-bg: #F5F5F0;
  --paper-code-text: #37474F;
  --paper-code-border: #E0E0D8;
  --paper-code-keyword: #C62828;
  --paper-code-string: #2E7D32;
  --paper-code-comment: #9E9E9E;

  /* 引用 */
  --paper-blockquote-bg: #F5F5F0;
  --paper-blockquote-border: var(--chrome-brand-red);
  --paper-blockquote-text: #455A64;

  /* 链接 */
  --paper-link: #1565C0;
  --paper-link-hover: #0D47A1;
  --paper-link-visited: #6A1B9A;

  /* 列表 marker */
  --paper-list-marker: #78909C;

  /* 分隔线 */
  --paper-hr: #CFD8DC;

  /* 选区 */
  --paper-selection-bg: rgba(211, 47, 47, 0.2);
  --paper-selection-text: inherit;

  /* 表格 */
  --paper-table-head-bg: #ECEFF1;
  --paper-table-border: #CFD8DC;
  --paper-table-stripe: #F5F5F0;

  /* 高亮（Highlight） */
  --paper-highlight-yellow: #FFF59D;
  --paper-highlight-green: #C5E1A5;
  --paper-highlight-blue: #90CAF9;
  --paper-highlight-pink: #F8BBD0;
}
```

### 3.3 变量继承规则

- `--paper-*` 变量**不得**引用 `--chrome-*` 变量（保持独立）。
- `--chrome-*` 变量**不得**引用 `--paper-*` 变量。
- 两套变量在 `:root` 并列声明；通过 `data-theme-chrome` / `data-theme-paper` 属性切换整组。

---

## 4. 主题对象结构（JSON Schema）

### 4.1 Schema（`.inkforge-theme.json`）

```json
{
  "$schema": "https://inkforge.app/schemas/theme-2.1.json",
  "id": "a2f7c8e1-...",
  "name": "纸张",
  "version": "2.1",
  "author": "InkForge",
  "mode": "light",
  "scope": "both",
  "chrome": {
    "colors": {
      "--chrome-brand-red": "#D32F2F",
      "--chrome-bg-canvas": "#ECEFF1"
    },
    "spacing": {},
    "radius": {},
    "shadow": {},
    "blur": {}
  },
  "paper": {
    "colors": {
      "--paper-bg": "#FAFAF7",
      "--paper-text-primary": "#263238"
    }
  },
  "typography": {
    "fontSize": { "body": 16, "h1": 32, "h2": 26 },
    "lineHeight": { "body": 1.7, "heading": 1.3 },
    "indent": { "zh": "2em", "en": "0" }
  },
  "font": {
    "body": { "zh": "LXGW WenKai", "en": "Source Serif Pro" },
    "heading": { "zh": "Source Han Sans Heavy", "en": "Inter Tight" },
    "code": { "zh": "JetBrains Mono", "en": "JetBrains Mono" },
    "ui": { "zh": "Source Han Sans", "en": "Inter" }
  },
  "createdAt": 1712345678000,
  "updatedAt": 1712345678000
}
```

### 4.2 `scope` 字段语义

- `chrome`：仅应用到 AppChromeTheme 轨（即使 JSON 中含 paper 字段也被忽略）。
- `paper`：仅应用到 EditorContentTheme 轨。
- `both`：两轨都应用（分别生效到对应作用域）。

### 4.3 必填 / 可选

| 字段 | 必填 | 说明 |
|------|------|------|
| id | 是 | UUID v4，应用内全局唯一 |
| name | 是 | 显示名 ≤ 40 字符 |
| version | 是 | 必须为 `"2.1"`（含小数点） |
| mode | 是 | `light` / `dark` / `sepia` / `custom` |
| scope | 是 | `chrome` / `paper` / `both` |
| chrome | 条件 | scope=chrome 或 both 时必填 |
| paper | 条件 | scope=paper 或 both 时必填 |
| typography | 否 | 省略则沿用当前 Typography |
| font | 否 | 省略则沿用当前 FontFamily |

---

## 5. 主题导入 / 导出

### 5.1 导出

- 入口 1：Settings > Appearance > "导出当前主题"按钮（导出当前激活的 chrome + paper 合并为一份 `.inkforge-theme.json`）。
- 入口 2：主题编辑器右上角"导出"按钮（导出正在编辑的单轨主题）。
- 文件扩展名：`.inkforge-theme.json`（MIME: `application/vnd.inkforge.theme+json`）。
- 导出内容：当前激活主题的**完整变量解析结果**（不使用 CSS 变量引用，全部展开为字面值），以便在其他设备 / 版本上无歧义还原。

### 5.2 导入

- 入口：Settings > Appearance > "导入主题"按钮 → 系统文件选择器（仅 `.inkforge-theme.json`）。
- 解析流程：
  1. 读取文件 → JSON 解析
  2. `validate(schema)` → 若失败抛"主题文件格式错误"Toast
  3. `validate(scope)` → 若与当前激活不兼容给出提示（如 scope=paper 但用户想同时导入 chrome）
  4. `validateConstraints()` → 冻结项检查（§1.4）
  5. 写入 `ThemeStore` → 激活
- 导入后自动激活对应轨（chrome / paper / both）。

### 5.3 主题包 `.inkforge-theme`（压缩版）

当主题**包含自定义字体文件**时，使用打包格式：

```
my-theme.inkforge-theme          (zip 容器)
├── theme.json                    (主题元数据，同 §4.1)
├── fonts/                        (用户字体文件目录)
│   ├── custom-serif.woff2
│   └── custom-serif-License.txt
├── preview.png                   (512x512 预览图，可选)
└── README.md                     (作者说明，可选)
```

导入该包时：
1. 校验 `theme.json` 符合 §4.1
2. 校验 `fonts/` 下每个字体文件存在对应的 `-License.txt`
3. 字体文件复制到 `app data/fonts/user/{theme-id}/`
4. 注册 `@font-face`
5. 激活主题

---

## 6. 内置主题（6 种，全部开源配色）

| # | 主题名 | mode | scope | chrome 气质 | paper 气质 |
|---|--------|------|-------|-----------|-----------|
| 1 | **纸张**（默认） | light | both | 冷白 `#FFFFFF` + 品牌红 | 暖米白 `#FAFAF7` + 墨色正文 |
| 2 | **夜墨** | dark | both | 深墨 `#1C1F22` + 品牌红 | 深纸 `#22262A` + 暖灰正文 |
| 3 | **青瓷** | light | both | 冷白 + 青灰 `#607D8B` 点缀 | 青白 `#F4F7F6` + 竹绿标题 |
| 4 | **竹林** | light | paper | （不改 chrome） | 竹青 `#EEF4EE` + 墨绿标题 |
| 5 | **砚台** | dark | paper | （不改 chrome） | 砚青 `#2A2E33` + 月白正文 |
| 6 | **羊皮纸** | sepia | both | 羊皮白 `#F3ECDE` + 墨栗 | 羊皮白 `#F3ECDE` + 栗棕正文 |

### 6.1 主题"纸张"（默认）

```json
{
  "id": "builtin-paper",
  "name": "纸张",
  "mode": "light",
  "scope": "both",
  "chrome": {
    "colors": {
      "--chrome-brand-red": "#D32F2F",
      "--chrome-bg-canvas": "#ECEFF1",
      "--chrome-bg-sidebar": "#FFFFFF",
      "--chrome-text-primary": "#263238"
    }
  },
  "paper": {
    "colors": {
      "--paper-bg": "#FAFAF7",
      "--paper-text-primary": "#263238",
      "--paper-heading-h1": "#1A237E"
    }
  }
}
```

### 6.2 主题"夜墨"

```json
{
  "id": "builtin-night-ink",
  "name": "夜墨",
  "mode": "dark",
  "scope": "both",
  "chrome": {
    "colors": {
      "--chrome-brand-red": "#E53935",
      "--chrome-bg-canvas": "#15181B",
      "--chrome-bg-sidebar": "#1C1F22",
      "--chrome-text-primary": "#CFD8DC"
    }
  },
  "paper": {
    "colors": {
      "--paper-bg": "#22262A",
      "--paper-text-primary": "#CFD8DC",
      "--paper-heading-h1": "#9FA8DA",
      "--paper-code-bg": "#1A1D20"
    }
  }
}
```

### 6.3 主题"青瓷" / "竹林" / "砚台" / "羊皮纸"

（实现略；结构同上，配色见 §6 表格。六套主题 JSON 存于 `src/styles/themes/builtin/`。）

### 6.4 内置主题不可编辑

- 用户点击"编辑"时提示"请先复制为新主题，再编辑"。
- 内置主题始终保留为恢复点（用户重置时回到"纸张"）。

---

## 7. 主题编辑器 UI（Settings > Appearance）

### 7.1 顶部概览区

- 左侧：**当前激活主题卡片**（显示主题名、mode、scope、预览色块）。
- 右侧：3 个按钮
  - `icon: Upload` 导入主题
  - `icon: Download` 导出当前主题
  - `icon: RotateCcw` 重置为内置"纸张"

### 7.2 双轨切换器

两个独立的 Tab 组：

```
┌────────────────────────────────────────┐
│  应用外壳（AppChrome）                   │
│  ┌──────────────────────────────────┐  │
│  │ [纸张] [夜墨] [青瓷] [自定义…]    │  │
│  └──────────────────────────────────┘  │
├────────────────────────────────────────┤
│  写作内容（EditorContent）              │
│  ┌──────────────────────────────────┐  │
│  │ [纸张] [夜墨] [竹林] [砚台] [羊皮]│  │
│  │ [自定义…]                          │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 7.3 变量编辑面板（点击"自定义..."时展开）

以 Accordion 分组展示所有变量，每组提供：

- **Colors 分组**：每个 `--chrome-*-color` 或 `--paper-*-color` 变量一行，含
  - 变量名（只读）
  - 颜色选择器（支持 hex / rgba / hsla）
  - 重置按钮（恢复该变量到内置默认）
- **Spacing 分组**：滑块 + 数值输入（单位 px）
- **Radius 分组**：滑块 + 数值输入
- **Shadow 分组**：可视化阴影编辑器（x / y / blur / spread / color）
- **Blur 分组**：滑块

### 7.4 实时预览

- 面板右侧固定一个 **Live Preview** 区块（约 400px 宽 600px 高）：
  - 上半部分展示 AppChrome 预览（缩略的 TopBar + Sidebar + TabBar + Modal）
  - 下半部分展示 EditorContent 预览（纸张 + h1~h3 + 引用 + 代码块 + 链接）
- 每次编辑变量时立即反映到预览（不写入全局 `:root`，使用 scoped CSS）。

### 7.5 保存行为

- **保存为新主题**：弹对话框要求输入名字 → 生成 UUID → 写入 `ThemeStore.customThemes` → 立即激活。
- **覆盖当前**：仅对用户自定义主题可用；内置主题禁止覆盖。

### 7.6 图标用 lucide-vue-next

- 导入：`Upload`
- 导出：`Download`
- 重置：`RotateCcw`
- 预览：`Eye`
- 编辑：`Settings2`
- 复制：`Copy`
- 删除：`Trash2`
- 主题组切换：`Palette`

---

## 8. 切换动画（L1-59 C 分层过渡）

### 8.1 设计目标

- 视觉层次："先动纸张，chrome 随后"或反之，形成"页面重新装订"的视觉叙事。
- 不可感知的色阶跳变（200ms 内完成主过渡）。
- 不阻塞 Editor 输入（过渡期间的所有键入立即生效，不等待）。

### 8.2 持续时间

| 区域 | 持续时间 | 缓动函数 |
|------|----------|----------|
| AppChrome（chrome）| 150ms | `ease-out` |
| EditorContent（paper）| 300ms | `cubic-bezier(0.22, 0.61, 0.36, 1)` |
| Overlay（Modal / Toast）| 不过渡 | — |
| 语法标记（R-06 T01-03 A）| 不过渡 | — |

### 8.3 CSS 实现

```css
[data-theme-transition='enabled'] .app-chrome,
[data-theme-transition='enabled'] .app-chrome * {
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out,
    border-color 150ms ease-out,
    box-shadow 150ms ease-out;
}

[data-theme-transition='enabled'] .editor-paper,
[data-theme-transition='enabled'] .editor-paper * {
  transition:
    background-color 300ms cubic-bezier(0.22, 0.61, 0.36, 1),
    color 300ms cubic-bezier(0.22, 0.61, 0.36, 1),
    border-color 300ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* 浮动工具栏、模态框、Toast 绝不过渡 */
.floating-toolbar,
.modal-backdrop,
.toast-stack,
.overlay {
  transition: none !important;
}
```

### 8.4 过渡编排（TransitionOrchestrator）

```ts
async function applyTheme(next: DualTrackTheme) {
  // 1. 禁用过渡期间的动画（R-06 硬约束：切换期间禁止触发其他动画）
  document.documentElement.dataset.animationPaused = 'true';

  // 2. 开启过渡
  document.documentElement.dataset.themeTransition = 'enabled';

  // 3. 写入新变量
  applyChromeVars(next.chrome);
  applyPaperVars(next.paper);

  // 4. 等待两轨各自完成
  await Promise.all([
    waitTransitionEnd('.app-chrome', 150),
    waitTransitionEnd('.editor-paper', 300),
  ]);

  // 5. 关闭过渡 & 恢复动画
  document.documentElement.dataset.themeTransition = 'disabled';
  document.documentElement.dataset.animationPaused = 'false';
}
```

### 8.5 降级

受 R-06 动画分级控制：

- `animation-level=none`：切换为瞬间生效（`transition: none`）
- `animation-level=reduced`：两轨统一为 120ms `ease-out`
- `animation-level=standard` / `full`：使用 §8.2 表格

---

## 9. 纸张区域与工具栏各自过渡

### 9.1 节流策略

- 主题切换按钮点击 → 立即进入切换态 → 屏蔽按钮 300ms 防连击。
- 连续点击（<300ms）仅执行最后一次。

### 9.2 过渡中 Editor 保持响应

- TransitionOrchestrator 过渡期间：
  - 编辑器按键输入立即生效（只是色彩渐变中）
  - 滚动、点击、光标都正常响应
  - 主题切换不生成 ProseMirror 事务，不入 Undo 栈

### 9.3 快捷键切换

- `Cmd/Ctrl + Shift + L`：切换 Light ↔ Dark 模式（对两轨当前主题应用对应 mode 版本）
- `Cmd/Ctrl + Shift + T`：打开主题选择器弹窗

---

## 10. 强调色快捷改（L1-58 B 子集）

### 10.1 入口

Settings > Appearance > "快速自定义"区域（默认展开）：

- 一个色板（预设 8 色 + 自定义色块）
- 一个"应用到当前主题"按钮

### 10.2 预设 8 色

| 色板 | hex | 说明 |
|------|-----|------|
| 品牌红 | `#D32F2F` | 默认 |
| 朱砂 | `#C62828` | 暗红 |
| 赤金 | `#E65100` | 温暖橙 |
| 松绿 | `#2E7D32` | 森林绿 |
| 墨青 | `#1565C0` | 深海蓝 |
| 紫檀 | `#6A1B9A` | 沉郁紫 |
| 玄墨 | `#263238` | 纯墨 |
| 自定义 | — | 打开颜色选择器 |

### 10.3 应用范围

- 改变 `--chrome-brand-red` 及其派生（`--chrome-brand-red-hover`、`--chrome-brand-red-active`、`--chrome-brand-red-a20`）。
- **不改 `--paper-*`**，保持纸张中立感。
- 改完后提示"已应用到当前主题。[保存为新主题] [恢复]"。

---

## 11. 预览与重置

### 11.1 实时预览

- 主题编辑器右侧 Live Preview（见 §7.4）
- 首选主题（未保存）停留 10s 后询问"保留预览 / 取消"

### 11.2 重置

- Settings > Appearance > "恢复默认主题" → 回到"纸张" × 两轨
- 确认对话框："这会覆盖当前主题设置。你的自定义主题仍保留在'我的主题'列表中。"
- 点击确认后：
  - `ThemeStore.activeChrome = 'builtin-paper'`
  - `ThemeStore.activePaper = 'builtin-paper'`
  - Typography 恢复"标准"预设（§25）
  - FontFamily 恢复内置默认（§15）

### 11.3 危险操作保护（T07-09 C 联动）

- 删除"我的主题"不可逆，需二次确认（打开开发者模式才显示删除按钮）

---

## 12. 主题版本兼容

### 12.1 version 字段语义

- `"2.1"`（当前）：支持 chrome + paper 双轨 + typography + font。
- 未来 `"2.2"` 若新增变量，需保证向前兼容：v2.1 能读取 v2.2 文件，忽略未知变量。

### 12.2 升级策略

- 读取主题时先看 version：
  - version <= 当前 → 直接应用
  - version > 当前 → 弹提示"此主题来自 InkForge v{版本}，部分变量可能被忽略" + 继续应用
- 写入主题始终用当前 version。

### 12.3 内置主题热升级

- 每次应用启动时 `ThemeStore.syncBuiltins()`：
  - 比对内置主题 id 是否存在
  - 若内置变量更新，自动刷新（用户当前激活内置则保持激活，变量跟新）

---

# Part B. FontSystem（字体系统）

## 13. 字体分类

### 13.1 6 大分类

| 分类 | 用途 | CSS 变量 |
|------|------|----------|
| **serif**（衬线） | 正文、引用 | `--font-serif-zh`、`--font-serif-en` |
| **sans**（无衬线） | UI、标题、导航 | `--font-sans-zh`、`--font-sans-en` |
| **kai**（楷体） | 诗文、典雅风格 | `--font-kai-zh` |
| **hei**（黑体） | 强调标题、重要信息 | `--font-hei-zh` |
| **mono**（等宽） | 代码块、行内 code | `--font-mono` |
| **hand**（手写） | 批注、非正式文本 | `--font-hand-zh`、`--font-hand-en` |

### 13.2 应用语义

- **正文**（body）：默认 `serif`
- **标题**（heading）：默认 `hei`
- **代码**（code）：默认 `mono`
- **UI**（ui）：默认 `sans`

### 13.3 每类支持的层级

- 每类至少 1 款内置字体 + 1 款备选回退（系统字体）
- 用户导入的字体加入"用户自定义"分类下，不自动归入 6 大分类（由用户标记）

---

## 14. 内置字体清单（全部开源）

### 14.1 清单表

| 分类 | 语种 | 字体名 | 许可证 | 子集打包 | 完整下载 |
|------|------|--------|--------|---------|---------|
| serif | zh | 思源宋体（Source Han Serif） | OFL 1.1 | 默认打包（CJK 基础子集 2MB） | 按需 |
| serif | zh | 霞鹜文楷（LXGW WenKai） | OFL 1.1 | 按需 | 按需 |
| serif | en | Source Serif Pro | OFL 1.1 | 默认打包（拉丁基础） | — |
| serif | en | iA Writer Duospace（已开源） | OFL 1.1 | 按需 | 按需 |
| sans | zh | 思源黑体（Source Han Sans） | OFL 1.1 | 默认打包 | 按需 |
| sans | en | Inter | OFL 1.1 | 默认打包 | — |
| kai | zh | 霞鹜文楷 GB（LXGW WenKai GB） | OFL 1.1 | 按需 | 按需 |
| kai | zh | 方正楷体（已开源） | — | 按需 | 按需 |
| hei | zh | 思源黑体 Heavy | OFL 1.1 | 按需 | 按需 |
| hei | zh | 霞鹜新晰黑（LXGW Bright） | OFL 1.1 | 按需 | 按需 |
| hei | en | Inter Tight | OFL 1.1 | 按需 | — |
| mono | en | JetBrains Mono | OFL 1.1 | 默认打包 | — |
| mono | en | Fira Code | OFL 1.1 | 按需 | — |
| mono | en | Source Code Pro | OFL 1.1 | 按需 | — |
| hand | en | Caveat | OFL 1.1 | 按需 | — |

### 14.2 默认打包列表

- 思源宋体 CJK 基础子集（约 2MB）
- 思源黑体 CJK 基础子集（约 2MB）
- Source Serif Pro 拉丁字符（约 150KB）
- Inter 拉丁字符（约 200KB）
- JetBrains Mono 等宽（约 150KB）

**总打包大小约 4.5MB**，满足最小可用。

### 14.3 按需下载

- 用户首次选择非默认打包字体时：
  - 触发下载流程 → 显示 Toast "正在下载 {字体名} ({size})..."
  - 优先从本地 mirror（Tauri app data `fonts/builtin/`）加载
  - mirror 缺失时走 CDN（Tauri 独占有网络权限）
  - 下载完成后缓存到 `fonts/builtin/`，下次直接用
- 下载失败时：回退到分类默认（例如 hei 回退到思源黑体）

### 14.4 License 文件

- 每款内置字体在应用内附带 `LICENSE.txt`：`src/assets/fonts/licenses/{font-id}.txt`
- Settings > About 页面提供"字体许可"链接，展示所有内置字体的许可证

---

## 15. 中英文独立配置（L1-57 D）

### 15.1 数据模型

```ts
interface FontConfig {
  body: { zh: string; en: string };      // 正文
  heading: { zh: string; en: string };   // 标题
  code: { zh: string; en: string };      // 代码（code 在中文环境也可指定中文等宽体）
  ui: { zh: string; en: string };        // UI
  hand?: { zh?: string; en?: string };   // 手写（可选）
}
```

字段值为"字体 ID"（引用内置清单或用户导入表的 ID）。

### 15.2 Fallback Chain 生成

`FontSystem.compileCssVars(config)` 输出 CSS 变量：

```css
:root {
  --font-body-family:
    "{zh font}",
    "{en font}",
    "PingFang SC",           /* macOS 系统兜底 */
    "Microsoft YaHei",       /* Windows 系统兜底 */
    "Noto Sans CJK SC",      /* Linux 系统兜底 */
    sans-serif;

  --font-heading-family:
    "{zh-heading font}",
    "{en-heading font}",
    "PingFang SC Heavy",
    "Microsoft YaHei",
    sans-serif;

  --font-code-family:
    "{mono font}",
    "Menlo",
    "Consolas",
    monospace;

  --font-ui-family:
    "{ui zh font}",
    "{ui en font}",
    "PingFang SC",
    "Segoe UI",
    sans-serif;
}
```

### 15.3 中英混排行为

- 浏览器自动从 fallback chain 选择字体：
  - 遇到中文字符 → 命中第一个包含该字符的字体
  - 遇到拉丁字符 → 命中第一个包含拉丁的字体
- 通常 zh font 不含拉丁 glyph，en font 不含中文 glyph，正好各取所需。

### 15.4 用户可独立切换

Settings > Appearance > Fonts 面板：

```
┌─────────────────────────────────┐
│  正文（Body）                     │
│  中文 [思源宋体 ▼]                │
│  英文 [Source Serif Pro ▼]       │
│                                  │
│  标题（Heading）                  │
│  中文 [思源黑体 Heavy ▼]          │
│  英文 [Inter Tight ▼]            │
│                                  │
│  代码（Code）                     │
│  中英 [JetBrains Mono ▼]          │
│                                  │
│  UI（界面）                       │
│  中文 [思源黑体 ▼]                │
│  英文 [Inter ▼]                   │
└─────────────────────────────────┘
```

---

## 16. 用户字体导入（Tauri 独占）

### 16.1 入口

Settings > Appearance > Fonts > "导入字体"按钮。

### 16.2 流程

1. Tauri 文件选择器弹出，过滤 `.ttf` / `.otf` / `.woff` / `.woff2`
2. 用户选择文件（可多选）
3. 对每个文件执行：
   - `opentype.js` 读取 name table，提取：fontFamily、subfamily、version、license、licenseURL
   - 执行 §17 License 检测
   - 复制文件到 `app data/fonts/user/{uuid}.woff2`（非 woff2 的先用 wawoff2 转码）
   - 写入 `FontStore.userFonts`：`{ id, family, filename, license, importedAt }`
   - 注入 `@font-face`
4. 弹 Toast "已导入 {n} 款字体"

### 16.3 字体目录结构

```
{app data}/fonts/
├── builtin/               (按需下载的内置字体)
│   ├── lxgw-wenkai.woff2
│   └── ...
└── user/                  (用户导入)
    ├── {uuid-1}.woff2
    ├── {uuid-1}.meta.json
    └── ...
```

`meta.json` 格式：

```json
{
  "id": "{uuid}",
  "family": "My Custom Serif",
  "subfamily": "Regular",
  "version": "1.001",
  "license": "OFL 1.1",
  "licenseUrl": "https://...",
  "importedAt": 1712345678000,
  "licenseWarning": false
}
```

### 16.4 删除字体

- Fonts 面板"用户自定义"列表每个字体右侧有删除按钮（垃圾桶图标 `Trash2`）
- 二次确认：显示"删除后所有使用该字体的主题将回退到分类默认"
- 删除操作：
  - `document.fonts.delete(...)` 卸载
  - 删除文件 + meta.json
  - 扫描所有自定义主题，若 `font.*` 引用此字体 ID，重置为分类默认
  - 若当前激活 FontConfig 引用此字体，立即切换到分类默认

---

## 17. License 检测与警告

### 17.1 检测规则

- **明确开源**（自动通过）：
  - license name 包含 "OFL"、"Apache"、"MIT"、"GPL"、"LGPL"、"CC"
  - licenseURL 匹配已知开源协议域名
- **明确非商用**（强警告）：
  - license name 包含 "Commercial"、"Non-commercial"、"Trial"、"Evaluation"
  - 许可证文本长度 < 50 字符且不匹配开源 pattern
- **未知 / 模糊**（警告 + 允许导入）：
  - name table 无 license 字段
  - license 字段空白

### 17.2 警告 UI

- **明确非商用**：导入对话框中显示红色 Banner
  ```
  ⚠ 此字体的许可证标注为非商用。
  InkForge 允许导入，但你需自行承担任何法律责任。
  字体将仅在当前设备可用，导出主题包时字体文件不会打包。
  [仍然导入] [取消]
  ```
- **未知**：橙色 Banner
  ```
  ⚠ 无法确认此字体的许可证。
  请确保你有权使用该字体。
  [仍然导入] [查看字体信息] [取消]
  ```

### 17.3 硬约束

- **非商用字体 / 未知字体**在导出 `.inkforge-theme` 包时：
  - 字体文件**不打包**（仅在 theme.json 的 `font.*` 字段记录名字）
  - 导入方看到"使用了你未安装的字体 {name}" + 回退提示
- **任何字体都不作为内置默认值**（内置默认永远是 §14 清单中的开源字体）

### 17.4 许可证详情面板

- Fonts 面板每个字体右侧有 `Info` 图标，点击弹出
  - 字体全名 / 版本
  - 许可证名 + 许可证全文
  - 许可证链接（点击打开浏览器）
  - 导入时间
  - 使用该字体的主题数

---

## 18. 字体加载策略

### 18.1 font-display: swap

所有字体 `@font-face` 声明使用：

```css
@font-face {
  font-family: 'Source Han Serif';
  src: url('{path}/source-han-serif.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+4E00-9FFF, U+3000-303F, U+FF00-FFEF;  /* CJK */
}
```

### 18.2 子集化

- 中文字体按需子集：
  - **基础子集**：《GB 2312 6763 字》+ 标点 + 常用拉丁（默认打包）
  - **扩展子集**：GB 18030 全集（按需下载）
- 通过 `unicode-range` 分段，浏览器自动按需加载对应子集。

### 18.3 预加载

- 首屏加载期间预加载当前激活的 body 字体：
  ```html
  <link rel="preload" href="{body font}.woff2" as="font" type="font/woff2" crossorigin>
  ```
- 其他字体（heading、code、UI）在浏览器触发对应字符渲染时懒加载。

### 18.4 FOIT / FOUT 策略

- `font-display: swap` → 有 FOUT（系统字体先显示，字体加载完后切换）
- 为了减少可视跳变：系统兜底字体选择与目标字体**相似度高**的（如思源宋体 ↔ PingFang SC Heavy）

### 18.5 加载状态暴露

- `FontStore.loadingFonts: Set<string>`：正在加载的字体 ID
- Fonts 面板下拉选中时，若该字体尚未加载，显示 "加载中..." 状态
- 加载失败时弹 Toast "字体 {name} 加载失败，回退到 {fallback}"

---

## 19. FontFamily 持久化

### 19.1 存储位置

- `user-preferences.json` 中的 `fontConfig` 字段（见 `15-settings-migration-spec.md`）
- 主题包 `.inkforge-theme.json` 可内嵌 `font` 字段（见 §4.1）

### 19.2 读取优先级

1. 当前激活主题的 `font` 字段（若存在）
2. 用户全局偏好 `user-preferences.fontConfig`
3. 系统默认（见 §15.1 默认）

### 19.3 同步机制

- 同步 Provider（`23-sync-provider`）：仅同步字体**引用**（ID），不同步字体文件。
- 若另一设备无该字体：
  - 若是内置字体：触发按需下载
  - 若是用户字体：回退到分类默认 + 弹提示"设备缺少字体 {name}，已回退"

---

## 20. 与 Typography 联动

### 20.1 字体变量继承

- Typography 使用的变量引用 FontSystem 变量：
  ```css
  .editor-paper {
    font-family: var(--font-body-family);
  }
  .editor-paper h1, .editor-paper h2, .editor-paper h3 {
    font-family: var(--font-heading-family);
  }
  .editor-paper code, .editor-paper pre {
    font-family: var(--font-code-family);
  }
  ```
- Typography 面板不重复定义字体，仅引用。

### 20.2 字号推荐联动

- 切换字体时，Typography 面板弹出小提示："字体 {new} 推荐字号 {size}px，是否应用？[应用] [保持当前]"
- 推荐字号来源于字体的 x-height 感知（内置字体预设，用户字体用默认值 16）

### 20.3 行距推荐

- 楷体、手写体推荐更大行距（1.8 ~ 2.0）
- 等宽体推荐紧凑行距（1.5）
- 推荐值写入字体元数据，Typography 切换预设时自动应用

---

# Part C. Typography（排版系统）

## 21. 字号 / 行距 / 段间距 / 缩进 / 字间距

### 21.1 完整字段清单

```ts
interface TypographyConfig {
  fontSize: {
    body: number;       // 正文字号（px），13 ~ 24，默认 16
    h1: number;         // 默认 32
    h2: number;         // 默认 26
    h3: number;         // 默认 22
    h4: number;         // 默认 18
    h5: number;         // 默认 16
    h6: number;         // 默认 14
    code: number;       // 代码块字号，默认 14
    caption: number;    // 说明文字，默认 13
  };
  lineHeight: {
    body: number;       // 正文行距倍数，1.4 ~ 2.0，默认 1.7
    heading: number;    // 标题行距倍数，默认 1.3
    code: number;       // 代码块行距倍数，默认 1.5
    caption: number;    // 说明文字行距倍数，默认 1.5
  };
  paragraphSpacing: {
    body: string;       // 正文段间距，默认 '0.75em'
    heading: string;    // 标题后间距，默认 '0.5em'
  };
  indent: {
    zh: string;         // 中文首行缩进，默认 '2em'
    en: string;         // 英文首行缩进，默认 '0'
    enabled: boolean;   // 是否启用首行缩进，默认 true
  };
  letterSpacing: {
    body: string;       // 正文字间距，默认 '0'
    heading: string;    // 标题字间距，默认 '-0.01em'
  };
  wordSpacing: {
    cjkLatin: string;   // 中英混排间距，默认 '0.125em'（pangu）
  };
  blockquote: {
    background: string;         // 背景色变量引用 '--paper-blockquote-bg'
    borderLeftWidth: string;    // 默认 '4px'
    borderLeftColor: string;    // 默认 'var(--paper-blockquote-border)'
    textColor: string;          // 默认 'var(--paper-blockquote-text)'
    padding: string;            // 默认 '0.5em 1em'
  };
  codeBlock: {
    background: string;         // 默认 'var(--paper-code-bg)'
    padding: string;            // 默认 '1em'
    borderRadius: string;       // 默认 'var(--chrome-radius-md)'
    lineHeight: number;         // 默认 1.5（覆盖 lineHeight.code）
  };
  inlineCode: {
    background: string;         // 默认 'rgba(0,0,0,0.05)'
    padding: string;            // 默认 '0.1em 0.3em'
    borderRadius: string;       // 默认 '3px'
  };
  list: {
    paddingLeft: string;        // 默认 '1.5em'
    itemSpacing: string;        // 默认 '0.25em'
  };
}
```

### 21.2 硬约束（R-04）

- `fontSize.body >= 13 && fontSize.body <= 24`
- `lineHeight.body >= 1.4`
- 调整超出范围时 Typography 面板红色提示，应用按钮禁用

---

## 22. 标题层级样式（h1 ~ h6）

### 22.1 基础层级

| 层级 | 默认字号 | 默认字重 | 默认颜色（paper light） |
|------|----------|----------|----------------------|
| h1 | 32px | 700 | `#1A237E` |
| h2 | 26px | 700 | `#283593` |
| h3 | 22px | 600 | `#3949AB` |
| h4 | 18px | 600 | `#455A64` |
| h5 | 16px | 600 | `#546E7A` |
| h6 | 14px | 600 | `#607D8B` |

### 22.2 上下间距

```css
.editor-paper h1 {
  margin-top: 1.5em;
  margin-bottom: 0.75em;
  font-size: calc(var(--typography-h1-size) * 1px);
  line-height: var(--typography-heading-lineheight);
  font-family: var(--font-heading-family);
  color: var(--paper-heading-h1);
}
```

### 22.3 分隔线（可选）

- h1 / h2 下方可选显示分隔线（默认关）
- Typography 面板提供"标题分隔线"开关（global 或 per-level）

### 22.4 编号（可选）

- Typography 面板提供"自动编号"开关
- 启用时 `.editor-paper h1::before { content: counter(h1-counter) ". "; }` 等
- 与 [toc] 节点联动（见 `18-toc-system-spec.md`）

---

## 23. 引用 / 代码块 / 列表样式

### 23.1 引用样式

```css
.editor-paper blockquote {
  background: var(--paper-blockquote-bg);
  border-left: 4px solid var(--paper-blockquote-border);
  padding: 0.5em 1em;
  color: var(--paper-blockquote-text);
  margin: 1em 0;
  border-radius: 0 var(--chrome-radius-sm) var(--chrome-radius-sm) 0;
}
```

- Typography 面板可调：背景 / 左边框粗细 / 左边框颜色 / padding

### 23.2 代码块样式

```css
.editor-paper pre code {
  background: var(--paper-code-bg);
  color: var(--paper-code-text);
  font-family: var(--font-code-family);
  font-size: calc(var(--typography-code-size) * 1px);
  line-height: var(--typography-code-lineheight);
  padding: 1em;
  border-radius: var(--chrome-radius-md);
  overflow-x: auto;
  border: 1px solid var(--paper-code-border);
}
```

- Shiki 代码高亮使用 `github-light` / `github-dark` 主题（R-09 关联）

### 23.3 行内代码

```css
.editor-paper code:not(pre code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-family: var(--font-code-family);
  font-size: 0.9em;
  color: var(--paper-code-text);
}
```

### 23.4 列表样式

```css
.editor-paper ul,
.editor-paper ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}
.editor-paper li {
  margin-bottom: 0.25em;
}
.editor-paper ul > li::marker {
  color: var(--paper-list-marker);
}
.editor-paper ol > li::marker {
  color: var(--paper-list-marker);
  font-family: var(--font-code-family);
}
```

- 嵌套列表自动缩减 marker 大小（二级小圆点、三级破折号）

### 23.5 表格样式

```css
.editor-paper table {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}
.editor-paper thead th {
  background: var(--paper-table-head-bg);
  border-bottom: 2px solid var(--paper-table-border);
  padding: 0.5em 1em;
  font-weight: 600;
  text-align: left;
}
.editor-paper tbody tr:nth-child(even) {
  background: var(--paper-table-stripe);
}
.editor-paper tbody td {
  border-bottom: 1px solid var(--paper-table-border);
  padding: 0.5em 1em;
}
```

---

## 24. Typography 面板（Settings > Appearance）

### 24.1 面板结构

```
Settings > Appearance > Typography
├── 预设选择器（紧凑 / 标准 / 宽松 / 自定义）
├── Font Size 分组
│   ├── 正文字号滑块 [13 ———●——— 24] 16px
│   ├── 标题层级字号（h1~h6 各自滑块）
│   ├── 代码字号滑块
│   └── [Reset 组]
├── Line Height 分组
│   ├── 正文行距滑块 [1.4 ———●——— 2.0] 1.7
│   ├── 标题行距滑块
│   └── 代码行距滑块
├── Paragraph Spacing 分组
│   ├── 段间距输入 [0.75em]
│   └── 标题后间距输入 [0.5em]
├── Indent 分组
│   ├── 启用首行缩进 [✓]
│   ├── 中文缩进 [2em]
│   └── 英文缩进 [0]
├── Letter / Word Spacing 分组
│   ├── 正文字间距 [0]
│   ├── 标题字间距 [-0.01em]
│   └── 中英混排间距 [0.125em]
├── Blockquote 样式
├── Code Block 样式
├── Inline Code 样式
└── List 样式
```

### 24.2 实时预览

- 面板右侧固定 Live Preview 示例（多段中英混排 + 标题 h1~h3 + 引用 + 代码块 + 有序 / 无序列表）
- 每次滑块调整立即反映到预览

### 24.3 保存行为

- **即时生效**：Typography 变更实时写入 `user-preferences.fontConfig`
- **保存为预设**：弹对话框要求输入预设名 → 存入 `TypographyStore.userPresets`

### 24.4 图标

- 预设切换：`Layers`
- 重置：`RotateCcw`
- 保存为预设：`Bookmark`
- 删除预设：`Trash2`

---

## 25. 预设（紧凑 / 标准 / 宽松）

### 25.1 紧凑（compact）

- `fontSize.body: 14`
- `lineHeight.body: 1.5`
- `paragraphSpacing.body: 0.5em`
- `indent.zh: 1.5em`
- 适用场景：Settings 类密集信息、长文档快速浏览

### 25.2 标准（standard，默认）

- `fontSize.body: 16`
- `lineHeight.body: 1.7`
- `paragraphSpacing.body: 0.75em`
- `indent.zh: 2em`
- 适用场景：日常写作

### 25.3 宽松（comfortable）

- `fontSize.body: 18`
- `lineHeight.body: 1.85`
- `paragraphSpacing.body: 1em`
- `indent.zh: 2em`
- 适用场景：长篇阅读、深度思考、专注模式

### 25.4 切换行为

- 切换预设立即重写所有字段到预设值
- 切换过渡：Typography 变更走 200ms fade（不参与 ThemeEngine 分层过渡）

---

## 26. 与主题集成

### 26.1 Typography 作为 Theme 一部分导出

- `.inkforge-theme.json` 可内嵌完整 `typography` 对象（§4.1 示例）
- 导入主题时：
  - 若 theme.typography 存在 → 激活该 typography
  - 若 theme.typography 缺失 → 保留当前用户 typography

### 26.2 主题切换时 Typography 行为

- 切换预设主题：保留当前 typography（不随主题变）
- 切换包含 typography 的用户主题：弹确认"此主题包含自定义排版，是否一并应用？[是] [仅应用配色]"
- 用户选择"仅应用配色"时，theme.typography 被忽略

### 26.3 Typography 独立导出

- Typography 面板"导出当前排版"按钮 → `.inkforge-typography.json`
- 可单独分享排版预设，无需完整主题

---

# Part D. WritingAmbience（iA Writer 哲学，L1-49 B+C）

## 27. Writing Mode Theme 定义（独立于系统主题）

### 27.1 设计哲学

> "iA Writer 的专注哲学：让界面安静到不存在，只剩文字。"

WritingAmbience 是独立于 ThemeEngine 的**氛围层**，提供：

- **安静界面**（L1-49 B）：隐藏一切非必要 UI
- **写作配色**（L1-49 C）：独立于系统主题的写作专用配色

### 27.2 WritingModeTheme 数据模型

```ts
interface WritingModeTheme {
  id: string;
  name: string;
  ambience: 'day' | 'night' | 'warm';  // 日间 / 夜间 / 暖光
  paperVars: Partial<PaperThemeVars>;   // 覆盖 EditorContentTheme
  quietUI: {
    hideToolbar: boolean;               // 默认 true
    hideSidebar: boolean;               // 默认 true
    hideStatusBar: boolean;             // 默认 true
    hideTabBar: boolean;                // 默认 false（保留导航）
    dimmedSyntax: boolean;              // Markdown 语法标记降低对比度
  };
}
```

### 27.3 3 个内置 WritingMode 主题

| # | 名称 | ambience | paper-bg | paper-text-primary |
|---|------|----------|----------|-------------------|
| 1 | **日间写作** | day | `#FAFAF7` | `#263238` |
| 2 | **夜间写作** | night | `#1E2124` | `#CFD8DC` |
| 3 | **暖光写作** | warm | `#F4EDD8` | `#3E2723` |

---

## 28. 激活路径

### 28.1 入口

- StatusBar 最右侧 `icon: Feather` 图标 → 点击切换 WritingMode（循环 3 个预设）
- 快捷键 `Cmd/Ctrl + Shift + W`
- Command Palette 命令 "Toggle Writing Mode"
- Settings > Appearance > "写作氛围"区域

### 28.2 激活效果

- 当前窗口进入 WritingMode：
  1. ToolBar 淡出（200ms）
  2. Sidebar 自动折叠
  3. StatusBar 隐藏
  4. TabBar 保留（缩减高度 50%，颜色降低对比度）
  5. 应用 WritingModeTheme 的 paperVars（叠加覆盖当前 EditorContentTheme）
  6. Editor 居中，纸张宽度保持用户当前选择
  7. 显示一个角落的"退出 WritingMode"浮动按钮（hover 可见，3s 不动后淡出）

### 28.3 退出

- 按 `Esc` 或再次 `Cmd/Ctrl + Shift + W` 退出
- 退出时所有 UI 恢复，无过渡 flash

### 28.4 与 StatusBar 可关闭设置的关系

- WritingMode 激活期间强制隐藏 StatusBar（不依赖 Settings）
- 退出后 StatusBar 恢复到 Settings 中用户设定的状态（见 §29）

---

## 29. StatusBar 可关闭（N-01 C 补充）

### 29.1 独立开关

- Settings > Editor > "显示 StatusBar" 开关（默认开）
- 关闭后 StatusBar DOM 不渲染，节省纵向空间

### 29.2 快捷键临时显示

- `Cmd/Ctrl + /`：在隐藏状态下临时显示 5s（平滑淡入 + 5s 后淡出）
- 临时显示时支持正常交互（字数点击、目标点击等）

### 29.3 WritingMode 与 StatusBar

- WritingMode 激活 → 强制隐藏 StatusBar（无论 Settings）
- WritingMode 退出 → 恢复 Settings 设定

### 29.4 StatusBar 状态提示

- 关闭 StatusBar 后，字数达目标时**短暂透明提示**（iA Writer 式）：
  - 屏幕右下角 1s 浮出"已达今日目标 1000 字"
  - 不阻塞键入

---

## 30. 与 FocusMode 差异

### 30.1 两者对比

| 维度 | WritingMode（L1-49） | FocusMode（L1-46） |
|------|---------------------|-------------------|
| 定位 | 氛围层（视觉 + 布局） | 专注层（段落高亮） |
| 激活快捷键 | `Cmd/Ctrl + Shift + W` | `Cmd/Ctrl + Shift + Z` |
| 隐藏 UI | 全隐（Toolbar / Sidebar / StatusBar） | 仅淡化 |
| 段落高亮 | 否 | 是（当前段落正常，其他 0.4 透明度） |
| 打字机模式 | 可选（另一个开关） | 联动（FocusMode 默认开启打字机） |
| 退出 Summary | 否 | 是（FocusSessionSummary） |
| 配色覆盖 | 是（WritingModeTheme） | 否（保持当前 EditorContentTheme） |

### 30.2 可叠加

- 两者**独立状态机**，可同时激活
- 叠加效果：WritingMode 的 UI 极简 + FocusMode 的段落高亮
- 组合快捷键：分别按两次快捷键（或 Command Palette "Start Deep Writing"）

### 30.3 退出顺序

- 按 `Esc` → 先退出 FocusMode，再退出 WritingMode（每次 Esc 退一层）
- `Cmd/Ctrl + Shift + Esc` 一次性退出所有专注 / 氛围模式

---

## 31. 环境配色方案（日间 / 夜间 / 暖光）

### 31.1 日间（day）

- `--paper-bg: #FAFAF7`（暖米白）
- `--paper-text-primary: #263238`（墨色）
- `--paper-text-syntax: #B0BEC5`（降低对比度）
- 适用：白天自然光 / 冷色显示器

### 31.2 夜间（night）

- `--paper-bg: #1E2124`（深墨）
- `--paper-text-primary: #CFD8DC`（暖灰白）
- `--paper-text-syntax: #455A64`（深灰降对比）
- 适用：夜晚 / 低光环境

### 31.3 暖光（warm）

- `--paper-bg: #F4EDD8`（羊皮纸）
- `--paper-text-primary: #3E2723`（栗棕）
- `--paper-text-syntax: #8D6E63`（温暖灰）
- 适用：黄昏 / 护眼 / 长时间写作

### 31.4 自动切换（可选）

- Settings > Appearance > "根据时间自动切换" 开关
- 启用后：
  - 6:00-17:59 → day
  - 18:00-21:59 → warm
  - 22:00-5:59 → night
- 默认关闭（尊重用户主动选择）

---

# Part E. 集成

## 32. 三件套联动

### 32.1 数据流

```
┌─────────────────────────────────────────────────┐
│                   ThemeEngine                   │
│      ┌──────────┐         ┌──────────┐          │
│      │ chrome   │         │ paper    │          │
│      │ vars     │         │ vars     │          │
│      └────┬─────┘         └─────┬────┘          │
│           │                     │               │
│           ▼                     ▼               │
│     AppChrome CSS          Paper CSS           │
└─────────────────────────────────────────────────┘
           │                     │
           │                     ▼
           │           ┌─────────────────────┐
           │           │     FontSystem      │
           │           │  --font-body-family │
           │           │  --font-heading-…   │
           │           │  --font-code-…      │
           │           └──────┬──────────────┘
           │                  │
           │                  ▼
           │           ┌─────────────────────┐
           │           │    Typography       │
           │           │  fontSize / line…   │
           │           │  paragraphSpacing   │
           │           │  indent / quote / … │
           │           └──────┬──────────────┘
           │                  │
           ▼                  ▼
    Chrome UI renders    Editor Paper renders

   ┌──────────────────────────────────────┐
   │          WritingAmbience             │
   │   叠加在 Paper + Chrome 之上         │
   │   - 隐藏 Chrome UI                    │
   │   - 覆盖部分 paper vars              │
   └──────────────────────────────────────┘
```

### 32.2 应用顺序（CSS cascade）

1. `:root` 声明所有 chrome + paper 变量（默认值）
2. `[data-theme-chrome='{id}']` 覆盖 chrome 变量
3. `[data-theme-paper='{id}']` 覆盖 paper 变量
4. `:root` 声明 font / typography 变量
5. `[data-writing-mode='active']` 叠加覆盖 paper 变量 + 隐藏 chrome UI

### 32.3 Store 间依赖

```ts
// ThemeStore
interface ThemeStore {
  activeChrome: string;
  activePaper: string;
  apply(): void; // 写入 DOM data-* + CSS 变量
}

// FontStore
interface FontStore {
  config: FontConfig;
  apply(): void; // 写入 --font-*-family
  loadFont(id: string): Promise<void>;
}

// TypographyStore
interface TypographyStore {
  config: TypographyConfig;
  preset: 'compact' | 'standard' | 'comfortable' | 'custom';
  apply(): void; // 写入 --typography-*
}

// WritingModeStore
interface WritingModeStore {
  active: boolean;
  theme: WritingModeTheme;
  enter(theme?: WritingModeTheme): void;
  exit(): void;
}
```

### 32.4 事件总线

- `theme:change` → ThemeStore 触发，订阅者：Editor、Preview、Settings Preview、DevPanel
- `font:load` → FontStore 触发，订阅者：Editor（重新布局 preview）
- `typography:change` → TypographyStore 触发，订阅者：Editor、ExportPipeline（导出时使用当前 typography）
- `writing-mode:enter` / `writing-mode:exit` → WritingModeStore 触发，订阅者：Layout、StatusBar、TOCPanel

---

## 33. 导入导出全部为一个 .inkforge-theme 包

### 33.1 统一导出包结构

```
my-ambience.inkforge-theme    (zip)
├── theme.json                (chrome + paper + typography + font refs)
├── fonts/                    (用户自定义字体，可选)
├── writing-mode.json         (WritingMode 定义，可选)
├── preview.png               (512x512 截图，可选)
└── README.md                 (作者说明)
```

### 33.2 一键"导出我的视觉配置"

Settings > Appearance 顶部按钮"导出全部视觉配置"：

- 打包当前 chrome + paper + typography + font config
- 若字体为用户自定义且许可允许打包 → 文件打入 fonts/
- 生成预览图（Live Preview 截图）
- 输出 `.inkforge-theme` 包

### 33.3 一键导入

拖拽 `.inkforge-theme` 包到应用窗口 → 弹确认对话框：

```
导入视觉配置包：{name}
作者：{author}
包含：[ThemeEngine] [FontSystem] [Typography] [WritingMode]

[全部导入] [选择性导入] [取消]
```

选择性导入时弹出 checkbox 列表，用户勾选要导入的部分。

---

## 34. 验收矩阵

### 34.1 ThemeEngine 验收

| # | 验收项 | 验收方法 |
|---|--------|----------|
| T-01 | 6 套内置主题全部可用 | 手动切换每套，截图对比 |
| T-02 | AppChrome / EditorContent 独立切换 | 切换 chrome 后 paper 不变，反之亦然 |
| T-03 | 冻结项保护生效 | 尝试修改内置主题变量被拒绝 |
| T-04 | 主题导入 / 导出无损 | 导出后再导入，视觉完全一致 |
| T-05 | 分层过渡 150ms / 300ms | Performance DevTools 录制 |
| T-06 | 切换过渡不阻塞输入 | 切换同时键入，字符无延迟 |
| T-07 | 自定义变量编辑器实时预览 | 拖动颜色滑块预览立即更新 |
| T-08 | overlay 不受 paper 变量影响 | stylelint CI 检查通过 |
| T-09 | 跟随系统为一次性推荐 | 首启弹一次，拒绝后不再弹 |
| T-10 | 快捷色板 8 色可用 | 8 色 + 自定义色轮均可应用 |

### 34.2 FontSystem 验收

| # | 验收项 | 验收方法 |
|---|--------|----------|
| F-01 | 内置默认打包（思源宋体 / Inter / JetBrains Mono）开箱即用 | 离线启动应用，字体正常渲染 |
| F-02 | 按需下载字体成功 | 选择霞鹜文楷，能下载到 fonts/builtin/ |
| F-03 | 中英文独立配置生效 | 混排段落，中英字体各自使用 |
| F-04 | 用户字体导入成功 | 导入 .ttf 后可在下拉选择 |
| F-05 | License 检测警告正确 | 导入非商用字体弹红色警告 |
| F-06 | 字体加载失败回退 | 断网 + 尝试加载未缓存字体，回退到分类默认 |
| F-07 | font-display: swap 生效 | 字体未加载时系统字体先渲染，加载后 swap |
| F-08 | 删除字体后主题回退 | 删除被使用字体，主题自动切到分类默认 |

### 34.3 Typography 验收

| # | 验收项 | 验收方法 |
|---|--------|----------|
| Y-01 | 字号范围 13-24 硬约束 | 面板超出范围红色提示 |
| Y-02 | 行距 >= 1.4 硬约束 | 设置 1.3 时应用按钮禁用 |
| Y-03 | 3 个预设切换正确 | compact / standard / comfortable 视觉差异明显 |
| Y-04 | 自定义预设保存 | 保存后下次启动仍在列表 |
| Y-05 | 引用 / 代码 / 列表样式可调 | 修改后实时预览更新 |
| Y-06 | Typography 导出导入无损 | `.inkforge-typography.json` 单独分享可用 |
| Y-07 | 中英文首行缩进独立 | 启用后中文 2em 英文 0em |

### 34.4 WritingAmbience 验收

| # | 验收项 | 验收方法 |
|---|--------|----------|
| A-01 | 3 个氛围主题切换正确 | day / night / warm 各自视觉 |
| A-02 | WritingMode 激活后 UI 全隐 | 除退出按钮外无其他 chrome |
| A-03 | 与 FocusMode 可叠加 | 同时激活两者效果正确 |
| A-04 | 退出顺序正确 | Esc 逐层退出 |
| A-05 | StatusBar 自动隐藏 | 激活期间强制隐藏 |
| A-06 | 退出后 UI 恢复 | 所有 chrome 恢复到激活前状态 |
| A-07 | 自动时间切换可用 | 模拟不同时间切换氛围 |

### 34.5 集成验收

| # | 验收项 | 验收方法 |
|---|--------|----------|
| I-01 | 统一包 `.inkforge-theme` 导入导出 | 含字体的完整包可用 |
| I-02 | 三件套同时切换无冲突 | 同时改主题 + 字体 + 排版，无 FOUC |
| I-03 | 所有组件适配 6 套主题 × light/dark | CI 视觉回归测试 |
| I-04 | 严禁 emoji 检查通过 | CI 扫描通过 |
| I-05 | 性能：主题切换 <300ms | Performance DevTools |
| I-06 | 暗色模式 100% 覆盖 | 所有组件在 dark 下不使用硬编码色 |

---

## 35. 权威来源登记表

| 字段 | 来源 | 决策 ID |
|------|------|---------|
| ThemeEngine 双轨模型 | `00-decisions-part3b-tauri-visual-recovery.md` | R-02 |
| L1-58 D 编辑器内容区主题与应用 UI 主题独立 | `_extracted/03-enhancement-answers.md` | L1-58 |
| L1-59 C 分层过渡 | `_extracted/03-enhancement-answers.md` | L1-59 |
| FontSystem 开源优先 | `00-decisions-part3b-tauri-visual-recovery.md` | R-03 |
| L1-57 D 中英文独立配置 + 用户导入 | `_extracted/03-enhancement-answers.md` | L1-57 |
| Typography 完整面板 | `00-decisions-part3b-tauri-visual-recovery.md` | R-04 |
| L1-60 D 排版微调完整 | `_extracted/03-enhancement-answers.md` | L1-60 |
| WritingAmbience（iA Writer 哲学） | `00-decisions-part3b-tauri-visual-recovery.md` | R-01 关联 |
| L1-49 B+C 安静界面 + 写作配色 | `_extracted/03-enhancement-answers.md` | L1-49 |
| Ethereal Constructivism 冻结项 | `00-decisions-part3b-tauri-visual-recovery.md` | R-01 |
| 暗色模式 100% 覆盖 | `00-decisions-part3b-tauri-visual-recovery.md` | R-09 |
| 严禁 emoji | `00-decisions-part3b-tauri-visual-recovery.md` | R-01 + T09-13 |
| StatusBar 可关闭 | `00-decisions-part3b-tauri-visual-recovery.md` | S-01 补充 |
| FocusMode 与 WritingMode 关系 | `00-decisions-part3b-tauri-visual-recovery.md` | S-05 |
| 主题版本兼容 | 本 Spec §12 推理 | — |
| 主题包结构 | 本 Spec §5.3 推理 | — |
| 6 套内置主题清单 | 本 Spec §6 扩展（基于 R-02 "至少 5 套"） | R-02 扩展 |

### 补丁引用（冲突裁决）

- **L1-48 B vs N-01 C（StatusBar 字段）** → 本 Spec 未涉及 StatusBar 字段集，仅触及"可关闭"维度；参见 `23-statusbar-spec.md`
- **W-01 A vs W-06 D（右栏职责）** → 本 Spec 未涉及；参见 `25-workstation-layout-spec.md`
- **G-07 D vs N-06 D（Toast）** → 本 Spec 未涉及

### 未决追问

- ThemeMarketplace / 主题分享：v2.2+（本轮延后，见路线图 §1.3 表 #10）
- 深度链接 `inkforge://theme/import/{id}`：v2.2+

---

# 完


## 36. 2026-04-30 Compatible Baseline Implementation Note

Baseline status: implemented as a compatible P1 slice; full Spec 20 remains partially pending.

Completed baseline coverage:
- Added `src/services/visual-system` as the real ThemeEngine / FontSystem / Typography token bridge for the existing app.
- `App.vue` now derives root CSS custom properties from validated Settings state through `buildVisualSystemTokens()` and writes them to `document.documentElement`.
- Existing `data-theme`, `theme-light` / `theme-dark`, reduced-motion, and system-theme behavior remain preserved.
- Existing `FONT_STACKS` is reused as the single source of truth for font stacks; the visual service exposes CJK, Latin, and Mono split diagnostics.
- Settings > Appearance now includes real typography presets (`compact`, `standard`, `relaxed`) that write current settings and immediately update CSS variables.
- Settings > Appearance now includes visual-system diagnostics for resolved theme, active font, token count, built-in brand freeze status, and token preview.
- `design-system.css` now exposes compatible `.inkforge-theme`, `--chrome-*`, `--paper-*`, and `--typography-*` hooks for future full ThemeEngine integration.
- No mock theme import/export, fake font import, or simulated license scan was added.

Verification evidence:
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm build` passed with only existing Vite chunk-size warnings.
- Chromium smoke test on `http://127.0.0.1:5178/settings?tab=appearance` confirmed the visual-system panel, typography preset panel, root token updates, font token updates, and zero console errors after log clearing.

Pending for full Spec 20 pass:
- Full `.inkforge-theme` JSON/package import and export with schema validation.
- User font file import, persistence, `@font-face` loading, fallback management, and license detection.
- Full theme editor exposing every chrome and paper token.
- Built-in multi-theme library beyond the existing light/dark/system baseline.
- WritingAmbience mode activation and complete StatusBar / FocusMode integration.
- Full accessibility, visual-regression, and performance matrix from section 34.
