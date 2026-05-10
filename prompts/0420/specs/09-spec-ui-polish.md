---
id: 09-spec-ui-polish
title: "Spec 09 | UI 打磨与设计语言 — 全量技术规格"
version: "2.1.0"
status: approved
authors: ["spec-engineer"]
created: 2026-04-21
depends_on:
  - "09-prd-ui-polish.md"
  - "20-theme-font-typography-spec.md"
  - "00-decisions-part3b-tauri-visual-recovery.md"
---

# Spec 09 | UI 打磨与设计语言 — 全量技术规格

## 目录

1. 设计令牌系统（Design Tokens）
2. 排版规范
3. 间距系统
4. 圆角规范
5. 阴影系统
6. 动效规范
7. 玻璃态 / Backdrop Blur 规范
8. 图标规范
9. 主题预设（4 种内置）
10. 组件级视觉规格
11. 无障碍规范
12. CSS 实现规范

---

## 1. 设计令牌系统（Design Tokens）

### 1.1 令牌架构原则

所有视觉参数通过 CSS 自定义属性（Custom Properties）传递，禁止在组件 CSS 中硬编码任何色值、间距或字体名称。令牌分三层：

```
原始令牌（Primitive Tokens）
  └── 语义令牌（Semantic Tokens）
        └── 组件令牌（Component Tokens）
```

- **原始令牌**：`--ink-900: #263238`（不直接使用于组件）
- **语义令牌**：`--color-text-primary: var(--ink-800)`（组件直接引用）
- **组件令牌**：`--button-primary-bg: var(--color-brand-primary)`（可选层，复杂组件用）

### 1.2 亮色主题 CSS 变量完整表

```css
/* ============================================================
   文件：src/styles/themes/light.css
   作用域：:root（亮色默认）
   ============================================================ */

:root[data-theme="light"],
:root {
  /* ---- 原始色板 ---- */
  --ink-900: #263238;
  --ink-800: #37474F;
  --ink-700: #455A64;
  --ink-600: #546E7A;
  --ink-500: #607D8B;
  --ink-400: #78909C;
  --ink-300: #90A4AE;
  --ink-200: #B0BEC5;
  --ink-100: #CFD8DC;
  --ink-50:  #ECEFF1;
  --ink-25:  #F5F7F8;
  --ink-0:   #FFFFFF;

  --red-900: #B71C1C;
  --red-800: #C62828;
  --red-700: #D32F2F;
  --red-600: #E53935;
  --red-500: #EF5350;
  --red-a20: rgba(211, 47, 47, 0.20);
  --red-a12: rgba(211, 47, 47, 0.12);
  --red-a08: rgba(211, 47, 47, 0.08);

  --green-700: #388E3C;
  --green-600: #43A047;
  --green-100: #C8E6C9;
  --green-50:  #E8F5E9;

  --amber-700: #F57C00;
  --amber-600: #FB8C00;
  --amber-100: #FFE0B2;
  --amber-50:  #FFF3E0;

  --blue-700: #1565C0;
  --blue-600: #1E88E5;
  --blue-100: #BBDEFB;
  --blue-50:  #E3F2FD;

  /* ---- 品牌语义 ---- */
  --color-brand-primary:      var(--red-700);
  --color-brand-hover:        var(--red-800);
  --color-brand-active:       var(--red-900);
  --color-brand-subtle:       var(--red-a08);
  --color-brand-subtle-hover: var(--red-a12);
  --color-brand-foreground:   #FFFFFF;

  /* ---- 表面色 ---- */
  --color-surface-canvas:   var(--ink-50);
  --color-surface-1:        var(--ink-0);
  --color-surface-2:        var(--ink-25);
  --color-surface-3:        var(--ink-50);
  --color-surface-4:        var(--ink-100);
  --color-surface-overlay:  rgba(38, 50, 56, 0.40);

  /* ---- 文字色 ---- */
  --color-text-primary:   var(--ink-800);
  --color-text-secondary: var(--ink-600);
  --color-text-tertiary:  var(--ink-500);
  --color-text-disabled:  var(--ink-400);
  --color-text-inverse:   var(--ink-0);
  --color-text-brand:     var(--color-brand-primary);

  /* ---- 边框色 ---- */
  --color-border:        var(--ink-100);
  --color-border-strong: var(--ink-300);
  --color-border-subtle: var(--ink-50);
  --color-border-brand:  var(--color-brand-primary);

  /* ---- 语义色（成功/警告/危险/信息）---- */
  --color-success:         var(--green-600);
  --color-success-subtle:  var(--green-50);
  --color-success-strong:  var(--green-700);

  --color-warning:         var(--amber-600);
  --color-warning-subtle:  var(--amber-50);
  --color-warning-strong:  var(--amber-700);

  --color-danger:          #F44336;
  --color-danger-subtle:   #FFEBEE;
  --color-danger-strong:   #D32F2F;

  --color-info:            var(--blue-600);
  --color-info-subtle:     var(--blue-50);
  --color-info-strong:     var(--blue-700);

  /* ---- 纸张区（EditorContent 轨）---- */
  --paper-bg:              var(--ink-0);
  --paper-text-primary:    var(--ink-900);
  --paper-text-secondary:  var(--ink-700);
  --paper-text-code:       #C62828;
  --paper-bg-code:         var(--ink-25);
  --paper-bg-blockquote:   var(--ink-50);
  --paper-border:          var(--ink-100);
  --paper-link:            var(--blue-600);
  --paper-link-hover:      var(--blue-700);
  --paper-highlight-yellow: rgba(255, 235, 59, 0.45);
  --paper-highlight-green:  rgba(76, 175, 80, 0.25);
  --paper-highlight-blue:   rgba(33, 150, 243, 0.25);
  --paper-highlight-red:    rgba(244, 67, 54, 0.25);
  --paper-hr:               var(--ink-200);
}
```

### 1.3 暗色主题 CSS 变量完整表

```css
/* ============================================================
   文件：src/styles/themes/dark.css
   作用域：:root[data-theme="dark"]
   ============================================================ */

:root[data-theme="dark"] {
  /* ---- 表面色（暗色） ---- */
  --color-surface-canvas:   #1A2329;
  --color-surface-1:        #1E272D;
  --color-surface-2:        #242F36;
  --color-surface-3:        #2C3940;
  --color-surface-4:        #353F47;
  --color-surface-overlay:  rgba(0, 0, 0, 0.60);

  /* ---- 文字色（暗色） ---- */
  --color-text-primary:   #CFD8DC;
  --color-text-secondary: #90A4AE;
  --color-text-tertiary:  #607D8B;
  --color-text-disabled:  #455A64;
  --color-text-inverse:   #263238;
  --color-text-brand:     #EF5350;

  /* ---- 品牌色（暗色调亮） ---- */
  --color-brand-primary:      #EF5350;
  --color-brand-hover:        #E53935;
  --color-brand-active:       #D32F2F;
  --color-brand-subtle:       rgba(239, 83, 80, 0.12);
  --color-brand-subtle-hover: rgba(239, 83, 80, 0.20);
  --color-brand-foreground:   #FFFFFF;

  /* ---- 边框色（暗色） ---- */
  --color-border:        #37474F;
  --color-border-strong: #546E7A;
  --color-border-subtle: #2C3940;
  --color-border-brand:  #EF5350;

  /* ---- 语义色（暗色） ---- */
  --color-success:         #66BB6A;
  --color-success-subtle:  rgba(102, 187, 106, 0.12);
  --color-warning:         #FFA726;
  --color-warning-subtle:  rgba(255, 167, 38, 0.12);
  --color-danger:          #EF5350;
  --color-danger-subtle:   rgba(239, 83, 80, 0.12);
  --color-info:            #42A5F5;
  --color-info-subtle:     rgba(66, 165, 245, 0.12);

  /* ---- 纸张区（暗色）---- */
  --paper-bg:              #1E272D;
  --paper-text-primary:    #CFD8DC;
  --paper-text-secondary:  #90A4AE;
  --paper-text-code:       #EF9A9A;
  --paper-bg-code:         #242F36;
  --paper-bg-blockquote:   #2C3940;
  --paper-border:          #37474F;
  --paper-link:            #42A5F5;
  --paper-link-hover:      #90CAF9;
  --paper-highlight-yellow: rgba(255, 235, 59, 0.30);
  --paper-highlight-green:  rgba(76, 175, 80, 0.20);
  --paper-highlight-blue:   rgba(33, 150, 243, 0.20);
  --paper-highlight-red:    rgba(239, 83, 80, 0.20);
}
```

### 1.4 护眼模式覆盖（叠加在主题上）

```css
/* ============================================================
   文件：src/styles/themes/eyecare.css
   激活条件：:root[data-eyecare="true"]
   说明：仅覆盖纸张区域和必要的 chrome 偏暖色
   ============================================================ */

:root[data-eyecare="true"] {
  --paper-bg:             #FAF4E8;
  --paper-text-primary:   #3D3028;
  --paper-text-secondary: #6B5748;
  --paper-border:         #D9C9B0;
  --paper-bg-code:        #EDE5D4;
  --paper-bg-blockquote:  #F3EBD8;
  --paper-link:           #8B4513;

  /* Chrome 也微暖化 */
  --color-surface-canvas: #F5EDD8;
  --color-surface-1:      #FAF4E8;
  --color-surface-2:      #F3EBD8;
}

:root[data-eyecare="true"][data-theme="dark"] {
  --paper-bg:             #1E1A14;
  --paper-text-primary:   #D4C5A9;
  --paper-text-secondary: #A89880;
  --paper-border:         #3D3028;
  --paper-bg-code:        #2A221A;
  --paper-bg-blockquote:  #251F19;

  --color-surface-canvas: #16120D;
  --color-surface-1:      #1E1A14;
  --color-surface-2:      #251F19;
}
```

---

## 2. 排版规范

### 2.1 字号阶梯

```css
/* 文件：src/styles/typography.css */

:root {
  --text-xs:   12px;  /* 标注、徽章、辅助说明 */
  --text-sm:   13px;  /* StatusBar、小按钮文字 */
  --text-base: 14px;  /* UI 控件文字默认 */
  --text-md:   16px;  /* 正文默认字号（用户可调） */
  --text-lg:   18px;  /* h4 / 卡片标题 */
  --text-xl:   20px;  /* h3 */
  --text-2xl:  24px;  /* h2 */
  --text-3xl:  28px;  /* h1 轻量 */
  --text-4xl:  32px;  /* h1 / 大标题 */
  --text-5xl:  40px;  /* 展示型标题（仅 Hub 使用） */
  --text-6xl:  48px;  /* 英雄区字号（仅欢迎屏） */
}
```

### 2.2 行高规则

```css
:root {
  /* 正文行高 = 1.7（宽松，护眼） */
  --leading-body:    1.7;
  /* 标题行高 = 1.2 */
  --leading-heading: 1.2;
  /* 代码行高 = 1.5 */
  --leading-code:    1.5;
  /* UI 控件行高 = 1.4 */
  --leading-ui:      1.4;
  /* 紧凑型（StatusBar 等微型文字） */
  --leading-tight:   1.25;
}
```

### 2.3 字重映射

```css
:root {
  --font-weight-regular:   400;
  --font-weight-medium:    500;
  --font-weight-semibold:  600;
  --font-weight-bold:      700;
}
```

用途对应：

| 场景 | 字重 |
|---|---|
| 正文 | Regular 400 |
| 按钮文字、表单 label、侧栏菜单项 | Medium 500 |
| 卡片标题、小标题、强调文字 | SemiBold 600 |
| 一级标题（h1）、对话框标题 | Bold 700 |

### 2.4 段落间距

```css
:root {
  /* 段落底部间距 = 1.2em（相对字号） */
  --paragraph-spacing: 1.2em;
  /* 标题下方间距 */
  --heading-margin-bottom: 0.6em;
  /* 标题上方间距（与上一段的距离） */
  --heading-margin-top: 1.6em;
  /* 列表项行间距 */
  --list-item-spacing: 0.4em;
}
```

### 2.5 首行缩进规则（中文可选）

中文写作模式下，用户可在 Typography 面板开启首行缩进（2em）：

```css
/* 仅在 .editor-paper[data-indent="first-line"] 下生效 */
.editor-paper[data-indent="first-line"] p {
  text-indent: 2em;
}
/* 标题、代码块、引用块不缩进 */
.editor-paper[data-indent="first-line"] h1,
.editor-paper[data-indent="first-line"] h2,
.editor-paper[data-indent="first-line"] h3,
.editor-paper[data-indent="first-line"] pre,
.editor-paper[data-indent="first-line"] blockquote {
  text-indent: 0;
}
```

---

## 3. 间距系统

### 3.1 4px 基础网格

所有间距值来自 4px 基础单位的倍数：

```css
:root {
  --space-0:   0px;
  --space-px:  1px;
  --space-0-5: 2px;
  --space-1:   4px;
  --space-1-5: 6px;
  --space-2:   8px;
  --space-2-5: 10px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
  --space-20:  80px;
  --space-24:  96px;
  --space-32:  128px;
}
```

### 3.2 组件内外边距规则

| 组件类型 | 内边距 (padding) | 间距 (gap) |
|---|---|---|
| 小按钮（Button sm） | `4px 8px` | — |
| 默认按钮（Button md） | `8px 16px` | — |
| 大按钮（Button lg） | `10px 20px` | — |
| 输入框（Input） | `8px 12px` | — |
| 下拉选择（Select） | `8px 12px` | — |
| 菜单项（MenuItem） | `8px 12px` | — |
| 侧栏导航项 | `8px 16px` | — |
| 卡片（Card） | `16px` | — |
| 对话框（Modal） | `24px` | — |
| Tooltip | `6px 10px` | — |
| 徽章（Badge） | `2px 6px` | — |
| Tab 标签 | `8px 14px` | — |
| 列表区块 | `16px 0` | `8px` |
| 工具栏（Toolbar） | `0 8px` | `4px` |
| 表单组 | `16px` | `12px` |
| 页面区块 | `24px 32px` | `24px` |
| Hub 卡片网格 | — | `16px` |

---

## 4. 圆角规范

### 4.1 圆角阶梯

```css
:root {
  --radius-none:    0px;
  --radius-sm:      4px;
  --radius:         8px;
  --radius-md:      10px;
  --radius-lg:      12px;
  --radius-xl:      16px;
  --radius-2xl:     20px;
  --radius-3xl:     24px;
  --radius-full:    9999px;
}
```

### 4.2 组件圆角对应

| 组件 | 圆角值 | 理由 |
|---|---|---|
| 输入框（Input/Textarea/Select） | `--radius` (8px) | 标准控件 |
| 小按钮（Button sm） | `--radius-sm` (4px) | 紧凑 |
| 默认按钮（Button md/lg） | `--radius` (8px) | 标准 |
| 图标按钮（IconButton） | `--radius-sm` (4px) | 与图标比例 |
| 徽章（Badge） | `--radius-full` | 胶囊形 |
| Tag / Chip | `--radius-sm` (4px) | 方正标签 |
| 卡片（Card） | `--radius-lg` (12px) | 大面积圆润 |
| Modal 对话框 | `--radius-xl` (16px) | 强调分离感 |
| Tooltip | `--radius-sm` (4px) | 小巧 |
| Dropdown / ContextMenu | `--radius` (8px) | 标准 |
| Toast / 通知 | `--radius` (8px) | 标准 |
| 命令面板（CommandPalette） | `--radius-lg` (12px) | 大型覆盖层 |
| 浮动工具栏（FloatingToolbar） | `--radius` (8px) | 标准 |
| 侧栏激活项 | `--radius-sm` (4px) | 紧凑侧栏 |
| 代码块 | `--radius` (8px) | 标准 |
| 引用块 | `--radius-sm` (4px) | 文章内元素 |
| 图片（非全宽） | `--radius-md` (10px) | 轻度圆润 |

---

## 5. 阴影系统

### 5.1 阴影阶梯

```css
:root {
  --shadow-xs:  0 1px 2px rgba(38, 50, 56, 0.06);
  --shadow-sm:  0 1px 3px rgba(38, 50, 56, 0.10),
                0 1px 2px rgba(38, 50, 56, 0.06);
  --shadow-md:  0 4px 6px -1px rgba(38, 50, 56, 0.10),
                0 2px 4px -2px rgba(38, 50, 56, 0.10);
  --shadow-lg:  0 10px 15px -3px rgba(38, 50, 56, 0.10),
                0 4px 6px -4px rgba(38, 50, 56, 0.10);
  --shadow-xl:  0 20px 25px -5px rgba(38, 50, 56, 0.10),
                0 8px 10px -6px rgba(38, 50, 56, 0.10);
}

/* 暗色模式：大阴影改用边框替代 */
:root[data-theme="dark"] {
  --shadow-xs:  0 0 0 1px rgba(255, 255, 255, 0.05);
  --shadow-sm:  0 0 0 1px rgba(255, 255, 255, 0.08);
  --shadow-md:  0 0 0 1px rgba(255, 255, 255, 0.08),
                0 4px 6px -1px rgba(0, 0, 0, 0.30);
  --shadow-lg:  0 0 0 1px rgba(255, 255, 255, 0.08),
                0 10px 15px -3px rgba(0, 0, 0, 0.40);
  --shadow-xl:  0 0 0 1px rgba(255, 255, 255, 0.08),
                0 20px 25px -5px rgba(0, 0, 0, 0.50);
}
```

### 5.2 组件阴影对应

| 组件 | 亮色阴影 | 暗色处理 |
|---|---|---|
| 按钮（hover 态） | `--shadow-xs` | 边框加强 |
| 输入框（focus 态） | 无阴影（focus ring 代替） | 同 |
| 卡片（Card 默认） | `--shadow-sm` | `--shadow-sm`（含边框）|
| 卡片（Card hover） | `--shadow-md` | `--shadow-md` |
| Dropdown 菜单 | `--shadow-md` | `--shadow-md` |
| Modal 对话框 | `--shadow-xl` | `--shadow-xl` |
| Tooltip | `--shadow-sm` | `--shadow-sm` |
| FloatingToolbar | `--shadow-md` | `--shadow-md` |
| Toast | `--shadow-md` | `--shadow-md` |
| 命令面板 | `--shadow-xl` | `--shadow-xl` |

---

## 6. 动效规范

### 6.1 持续时间阶梯

```css
:root {
  --duration-instant:  0ms;
  --duration-micro:    80ms;   /* 微动：hover 色变、icon 切换 */
  --duration-fast:     150ms;  /* 标准：Toast 出现、下拉菜单 */
  --duration-normal:   250ms;  /* 复杂：命令面板、主题切换 chrome */
  --duration-slow:     350ms;  /* 页面切换、Modal 进入 */
  --duration-veryslow: 500ms;  /* 纸张主题切换（EditorContent 轨）*/
}
```

### 6.2 缓动函数

```css
:root {
  /* 减速进入（元素从外部进入视口）*/
  --ease-out:     cubic-bezier(0.4, 0, 0.2, 1);
  /* 先加速后减速（标准交互）*/
  --ease-in-out:  cubic-bezier(0.4, 0, 0.6, 1);
  /* 弹性（轻量交互反馈，避免过弹）*/
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  /* 加速退出（元素离开视口）*/
  --ease-in:      cubic-bezier(0.4, 0, 1, 1);
  /* 线性（进度条等需线性的场景）*/
  --ease-linear:  linear;
}
```

### 6.3 动效分级与自动降级

```typescript
// 文件：src/composables/useAnimationLevel.ts

export type AnimationLevel = 'full' | 'reduced' | 'none';

export function useAnimationLevel() {
  const level = ref<AnimationLevel>('full');

  // 检测 prefers-reduced-motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mediaQuery.matches) {
    level.value = 'none';
  }

  // 性能监控降级
  const fps = useFrameRate(); // 内部实现：requestAnimationFrame 采样
  watch(fps, (value) => {
    if (value < 45 && level.value === 'full') {
      level.value = 'reduced';
    }
    if (value < 20) {
      level.value = 'none';
    }
  });

  // 将等级写入 document 根节点
  watch(level, (val) => {
    document.documentElement.setAttribute('data-animation-level', val);
  }, { immediate: true });

  return { level };
}
```

```css
/* CSS 降级规则 */

/* 标准动效 */
.fade-enter-active {
  transition: opacity var(--duration-fast) var(--ease-out);
}

/* 降级：仅 reduced motion */
[data-animation-level="reduced"] .fade-enter-active {
  transition-duration: var(--duration-micro);
}

/* 关闭全部动效 */
[data-animation-level="none"] *,
@media (prefers-reduced-motion: reduce) {
  transition-duration: 0ms !important;
  animation-duration: 0ms !important;
}
```

### 6.4 具体动效 CSS 实现

#### fadeIn（通用淡入）

```css
.fade-enter-from { opacity: 0; }
.fade-enter-to   { opacity: 1; }
.fade-enter-active {
  transition: opacity var(--duration-fast) var(--ease-out);
}
.fade-leave-from { opacity: 1; }
.fade-leave-to   { opacity: 0; }
.fade-leave-active {
  transition: opacity var(--duration-micro) var(--ease-in);
}
```

#### slideUp（底部向上滑入，用于 Toast / Modal）

```css
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.slide-up-enter-active {
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
.slide-up-leave-active {
  transition: opacity var(--duration-micro) var(--ease-in),
              transform var(--duration-micro) var(--ease-in);
}
```

#### scaleIn（弹出缩放，用于 Tooltip / Dropdown）

```css
.scale-in-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
.scale-in-enter-active {
  transition: opacity var(--duration-micro) var(--ease-out),
              transform var(--duration-micro) var(--ease-spring);
}
.scale-in-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.scale-in-leave-active {
  transition: opacity var(--duration-micro) var(--ease-in),
              transform var(--duration-micro) var(--ease-in);
}
```

#### slideLeft / slideRight（页面切换）

```css
/* Hub -> Workstation: slide-left */
.slide-left-enter-from {
  transform: translateX(24px);
  opacity: 0;
}
.slide-left-enter-active {
  transition: transform var(--duration-slow) var(--ease-out),
              opacity var(--duration-slow) var(--ease-out);
}
.slide-left-leave-to {
  transform: translateX(-24px);
  opacity: 0;
}
.slide-left-leave-active {
  transition: transform var(--duration-slow) var(--ease-in),
              opacity var(--duration-fast) var(--ease-in);
}

/* Workstation -> Hub: slide-right（反向）*/
.slide-right-enter-from {
  transform: translateX(-24px);
  opacity: 0;
}
.slide-right-enter-active {
  transition: transform var(--duration-slow) var(--ease-out),
              opacity var(--duration-slow) var(--ease-out);
}
```

#### staggerList（列表项错开出现）

```css
/* 父容器使用 Vue TransitionGroup */
/* 每个子项单独延迟 */
.stagger-list-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.stagger-list-enter-active {
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}
/* 通过 JS 注入 style="transition-delay: Xms" */
```

```typescript
// 使用示例：src/components/common/StaggerList.vue
onMounted(() => {
  const children = el.value?.children;
  if (!children) return;
  Array.from(children).forEach((child, i) => {
    (child as HTMLElement).style.transitionDelay = `${i * 30}ms`;
  });
});
```

---

## 7. 玻璃态 / Backdrop Blur 规范

### 7.1 模糊阶梯

```css
:root {
  --blur-sm:  blur(4px);
  --blur:     blur(8px);
  --blur-md:  blur(12px);
  --blur-lg:  blur(16px);
  --blur-xl:  blur(24px);
}
```

### 7.2 适用场景

| 组件 | 模糊值 | 背景 | 适用主题 |
|---|---|---|---|
| Modal overlay | `--blur-sm` (4px) | `rgba(38,50,56,0.40)` | 全部 |
| FloatingToolbar（选中文字时出现） | `--blur-md` (12px) | `rgba(255,255,255,0.85)` | 亮色 |
| FloatingToolbar（暗色） | `--blur-md` (12px) | `rgba(30,39,45,0.85)` | 暗色 |
| Tooltip | `--blur-sm` (4px) | `var(--color-surface-1)` | 全部 |
| 命令面板 backdrop | `--blur-md` (12px) | `rgba(38,50,56,0.50)` | 全部 |
| 顶栏（滚动后出现毛玻璃效果） | `--blur-sm` (4px) | `rgba(var(--surface-canvas-rgb),0.90)` | 全部 |

### 7.3 性能降级

```css
/* 高性能设备正常使用 backdrop-filter */
.floating-toolbar {
  backdrop-filter: var(--blur-md);
  background: rgba(255, 255, 255, 0.85);
}

/* prefers-reduced-transparency：完全不透明，无模糊 */
@media (prefers-reduced-transparency: reduce) {
  .floating-toolbar {
    backdrop-filter: none;
    background: var(--color-surface-1);
  }
}
```

```typescript
// 低端设备检测（GPU 性能）
// 文件：src/composables/useBackdropSupport.ts

export function useBackdropSupport(): boolean {
  // 检测 CSS.supports
  if (!CSS.supports('backdrop-filter', 'blur(4px)')) return false;
  // 检测 prefers-reduced-transparency
  if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches) return false;
  return true;
}
```

---

## 8. 图标规范

### 8.1 唯一图标库

所有图标必须来自 `lucide-vue-next`，禁止混用其他图标库，禁止使用 emoji 代替图标。

```typescript
// 文件：src/components/ui/Icon.vue
import { LucideIcon } from 'lucide-vue-next';

interface Props {
  icon: LucideIcon;
  size?: 12 | 14 | 16 | 18 | 20 | 24;
  strokeWidth?: number;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 16,
  strokeWidth: 1.5,
});
```

### 8.2 图标尺寸规范

| 尺寸 | 使用场景 |
|---|---|
| 12px | 徽章内图标、极小辅助说明 |
| 14px | StatusBar 图标、小标签 |
| 16px | 菜单项图标（默认）、按钮图标 |
| 18px | 工具栏按钮、表单 label 前 |
| 20px | 侧栏导航图标 |
| 24px | 空状态插图、大操作按钮 |

图标大小与同行文字保持匹配：

| 文字大小 | 对应图标 |
|---|---|
| 12px | 12px |
| 13px | 14px |
| 14px | 14px |
| 16px | 16px |
| 18px | 18px |
| 20px | 20px |

### 8.3 颜色规则

图标颜色始终通过 `currentColor` 继承父级文字色，禁止在图标组件上单独设置颜色。

```html
<!-- 正确 -->
<span class="text-text-secondary flex items-center gap-1">
  <Icon :icon="FileText" :size="16" />
  打开文件
</span>

<!-- 错误：不要单独给图标设色 -->
<Icon :icon="FileText" :size="16" class="text-red-500" />
```

### 8.4 全局 emoji 禁令

- 代码中禁止出现 emoji Unicode 字面量；
- 提交 hook 检查 `.vue` / `.ts` / `.css` 文件中的 emoji；
- 如需表达情感/状态，使用 Lucide 图标 + 颜色语义。

```bash
# .husky/pre-commit 检查脚本
node scripts/check-emoji.js
```

---

## 9. 主题预设（4 种内置）

### 9.1 Default Light（默认亮色）

AppChrome：蓝灰色阶（`#ECEFF1` canvas），纸张纯白（`#FFFFFF`）。

```json
{
  "id": "default-light",
  "name": "Default Light",
  "mode": "light",
  "chrome": {
    "--color-surface-canvas": "#ECEFF1",
    "--color-surface-1": "#FFFFFF",
    "--color-brand-primary": "#D32F2F"
  },
  "paper": {
    "--paper-bg": "#FFFFFF",
    "--paper-text-primary": "#263238"
  }
}
```

### 9.2 Default Dark（默认暗色）

AppChrome：深蓝灰（`#1A2329` canvas），纸张深灰（`#1E272D`）。

```json
{
  "id": "default-dark",
  "name": "Default Dark",
  "mode": "dark",
  "chrome": {
    "--color-surface-canvas": "#1A2329",
    "--color-surface-1": "#1E272D",
    "--color-brand-primary": "#EF5350"
  },
  "paper": {
    "--paper-bg": "#1E272D",
    "--paper-text-primary": "#CFD8DC"
  }
}
```

### 9.3 Eye-Care（护眼绿/暖光）

AppChrome：暖米色系（`#F5EDD8`），纸张羊皮纸（`#FAF4E8`），蓝光压低。

```json
{
  "id": "eyecare",
  "name": "Eye Care",
  "mode": "light",
  "chrome": {
    "--color-surface-canvas": "#F5EDD8",
    "--color-surface-1": "#FAF4E8",
    "--color-brand-primary": "#C0392B"
  },
  "paper": {
    "--paper-bg": "#FAF4E8",
    "--paper-text-primary": "#3D3028"
  }
}
```

### 9.4 Ethereal Night（暗夜红）

AppChrome：接近全黑（`#0F1519` canvas），纸张极深（`#141A1F`），品牌红更鲜艳。

```json
{
  "id": "ethereal-night",
  "name": "Ethereal Night",
  "mode": "dark",
  "chrome": {
    "--color-surface-canvas": "#0F1519",
    "--color-surface-1": "#141A1F",
    "--color-brand-primary": "#F44336"
  },
  "paper": {
    "--paper-bg": "#141A1F",
    "--paper-text-primary": "#E8EBED"
  }
}
```

---

## 10. 组件级视觉规格

### 10.1 Button（按钮）

4 种变体 × 4 种状态。

```css
/* ---- Primary Button ---- */
.btn-primary {
  height: 36px;
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  background: var(--color-brand-primary);
  color: var(--color-brand-foreground);
  border: none;
  cursor: pointer;
  transition: background-color var(--duration-micro) var(--ease-out),
              box-shadow var(--duration-micro) var(--ease-out);
}
.btn-primary:hover {
  background: var(--color-brand-hover);
  box-shadow: var(--shadow-xs);
}
.btn-primary:active {
  background: var(--color-brand-active);
  box-shadow: none;
  transform: translateY(1px);
}
.btn-primary:disabled,
.btn-primary[aria-disabled="true"] {
  background: var(--color-surface-4);
  color: var(--color-text-disabled);
  cursor: not-allowed;
  box-shadow: none;
}

/* ---- Secondary Button ---- */
.btn-secondary {
  height: 36px;
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  background: var(--color-surface-1);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.btn-secondary:hover {
  background: var(--color-surface-3);
  border-color: var(--color-border-strong);
}
.btn-secondary:active {
  background: var(--color-surface-4);
}
.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ---- Ghost Button ---- */
.btn-ghost {
  height: 36px;
  padding: 8px 12px;
  border-radius: var(--radius);
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
}
.btn-ghost:hover {
  background: var(--color-surface-3);
  color: var(--color-text-primary);
}
.btn-ghost:active {
  background: var(--color-surface-4);
}

/* ---- Danger Button ---- */
.btn-danger {
  height: 36px;
  padding: 8px 16px;
  border-radius: var(--radius);
  background: var(--color-danger);
  color: #FFFFFF;
  border: none;
}
.btn-danger:hover { background: #D32F2F; }
.btn-danger:active { background: #C62828; transform: translateY(1px); }
.btn-danger:disabled { background: var(--color-surface-4); color: var(--color-text-disabled); }

/* ---- 尺寸变体 ---- */
.btn-sm { height: 28px; padding: 4px 10px; font-size: var(--text-sm); border-radius: var(--radius-sm); }
.btn-lg { height: 44px; padding: 10px 20px; font-size: var(--text-md); }

/* ---- Focus Ring ---- */
.btn-primary:focus-visible,
.btn-secondary:focus-visible,
.btn-ghost:focus-visible,
.btn-danger:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 2px;
}
```

### 10.2 Input / Textarea / Select

```css
.input-base {
  height: 36px;
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: var(--text-base);
  font-family: inherit;
  background: var(--color-surface-3);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  width: 100%;
  transition: border-color var(--duration-micro) var(--ease-out),
              box-shadow var(--duration-micro) var(--ease-out);
}
.input-base:hover {
  border-color: var(--color-border-strong);
}
.input-base:focus {
  outline: none;
  border-color: var(--color-brand-primary);
  box-shadow: 0 0 0 3px var(--color-brand-subtle);
}
.input-base.error {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px var(--color-danger-subtle);
}
.input-base:disabled {
  background: var(--color-surface-4);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}
.textarea-base {
  /* 继承 input-base */
  height: auto;
  min-height: 80px;
  resize: vertical;
  line-height: var(--leading-body);
}
```

### 10.3 Modal

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: var(--color-surface-overlay);
  backdrop-filter: var(--blur-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 尺寸 */
.modal-sm  { width: 400px; }
.modal-md  { width: 560px; }
.modal-lg  { width: 720px; }
.modal-xl  { width: 900px; }

.modal-content {
  background: var(--color-surface-1);
  border-radius: var(--radius-xl);
  padding: 24px;
  box-shadow: var(--shadow-xl);
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.modal-header {
  font-size: var(--text-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}
```

Modal 进入动效（Vue Transition）：

```
enter: opacity 0→1 (250ms ease-out) + scale 0.96→1 (250ms ease-spring)
leave: opacity 1→0 (150ms ease-in)
```

### 10.4 Tooltip

```css
.tooltip {
  background: var(--color-surface-1);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-size: var(--text-sm);
  line-height: var(--leading-tight);
  max-width: 240px;
  box-shadow: var(--shadow-sm);
  z-index: 250;
  pointer-events: none;
  /* 箭头通过伪元素实现 */
}

/* 箭头尺寸 6×6px（4 方向均支持） */
.tooltip[data-side="top"]::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: var(--color-surface-1);
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  transform: translateX(-50%) rotate(45deg);
}
```

### 10.5 Badge / Tag / Chip

```css
/* Badge：圆角胶囊，用于状态标记 */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  line-height: var(--leading-tight);
}
.badge-default  { background: var(--color-surface-3); color: var(--color-text-secondary); }
.badge-brand    { background: var(--color-brand-subtle); color: var(--color-brand-primary); }
.badge-success  { background: var(--color-success-subtle); color: var(--color-success-strong); }
.badge-warning  { background: var(--color-warning-subtle); color: var(--color-warning-strong); }
.badge-danger   { background: var(--color-danger-subtle); color: var(--color-danger-strong); }

/* Tag：方正，用于标签系统 */
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  cursor: default;
}
.tag:hover { background: var(--color-surface-3); }

/* Chip：可点击/可关闭，用于过滤器 */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-1);
  color: var(--color-text-primary);
  cursor: pointer;
}
.chip.active {
  background: var(--color-brand-subtle);
  border-color: var(--color-brand-primary);
  color: var(--color-brand-primary);
}
.chip:hover { background: var(--color-surface-3); }
```

### 10.6 Card

```css
.card {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-micro) var(--ease-out),
              border-color var(--duration-micro) var(--ease-out);
}
.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border);
}
.card-header {
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.card-body {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  line-height: var(--leading-body);
}
```

### 10.7 Dropdown / ContextMenu

```css
.dropdown-menu,
.context-menu {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 4px;
  box-shadow: var(--shadow-md);
  z-index: 250;
  min-width: 160px;
  max-width: 280px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  color: var(--color-text-primary);
  cursor: pointer;
  user-select: none;
  transition: background var(--duration-micro) var(--ease-out);
}
.menu-item:hover { background: var(--color-surface-3); }
.menu-item:active { background: var(--color-surface-4); }
.menu-item.danger { color: var(--color-danger); }
.menu-item.danger:hover { background: var(--color-danger-subtle); }
.menu-item:disabled,
.menu-item[aria-disabled="true"] {
  color: var(--color-text-disabled);
  cursor: not-allowed;
  pointer-events: none;
}

.menu-separator {
  height: 1px;
  margin: 4px 8px;
  background: var(--color-border-subtle);
}

/* 图标对齐：所有图标固定 16px，文字与图标间距 8px */
.menu-item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}
```

### 10.8 Sidebar

```css
.sidebar {
  background: var(--color-surface-2);
  border-right: 1px solid var(--color-border-subtle);
  height: 100%;
  overflow-y: auto;
  padding: var(--space-2) 0;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  cursor: pointer;
  margin: 0 var(--space-1-5);
  transition: background var(--duration-micro) var(--ease-out),
              color var(--duration-micro) var(--ease-out);
}
.sidebar-nav-item:hover {
  background: var(--color-surface-4);
  color: var(--color-text-primary);
}
.sidebar-nav-item.active {
  background: var(--color-brand-subtle);
  color: var(--color-brand-primary);
  font-weight: var(--font-weight-medium);
}
/* 侧栏折叠过渡 */
.sidebar {
  transition: width 250ms ease;
}
```

### 10.9 TabBar

```css
.tabbar {
  height: 40px;
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border-subtle);
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabbar::-webkit-scrollbar { display: none; }

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  min-width: 120px;
  max-width: 200px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  border-right: 1px solid var(--color-border-subtle);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  transition: background var(--duration-micro) var(--ease-out),
              color var(--duration-micro) var(--ease-out);
}
.tab-item:hover {
  background: var(--color-surface-3);
  color: var(--color-text-primary);
}
.tab-item.active {
  background: var(--color-surface-1);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}
/* 激活下划线 2px */
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-brand-primary);
}
/* 未保存圆点 */
.tab-unsaved-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-brand-primary);
  flex-shrink: 0;
}
```

### 10.10 StatusBar

```css
.statusbar {
  height: 24px;
  background: var(--color-surface-2);
  border-top: 1px solid var(--color-border-subtle);
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  gap: var(--space-3);
  font-size: 11px;
  color: var(--color-text-tertiary);
  user-select: none;
  z-index: 100;
}

.statusbar-item {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  transition: background var(--duration-micro) var(--ease-out),
              color var(--duration-micro) var(--ease-out);
}
.statusbar-item:hover {
  background: var(--color-surface-4);
  color: var(--color-text-primary);
}

.statusbar-divider {
  width: 1px;
  height: 12px;
  background: var(--color-border-subtle);
}

.statusbar-spacer {
  flex: 1;
}
```

---

## 11. 无障碍规范

### 11.1 颜色对比度要求

所有文字颜色组合必须满足 WCAG 2.1 AA 标准：

| 组合 | 最低对比度 | 对应场景 |
|---|---|---|
| 正文文字（≥ 14px 非粗体） | 4.5:1 | `--color-text-primary` |
| 大文字（≥ 18px 或 ≥ 14px 粗体） | 3:1 | 标题 |
| UI 控件边框 | 3:1 | Input 边框 vs 背景 |
| 图标（独立含义时） | 3:1 | 状态图标 |

对比度验证工具：`@contrast/` 或 `axe-core` 自动化检查。

### 11.2 焦点环规范

```css
/* 文件：src/styles/global/focus.css */

/* 所有可聚焦元素 */
:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 2px;
}

/* 在深色背景上 */
:root[data-theme="dark"] :focus-visible {
  outline-color: var(--color-brand-primary); /* #EF5350 */
}

/* 禁用 focus（鼠标点击时隐藏焦点环，键盘导航时显示）*/
:focus:not(:focus-visible) {
  outline: none;
}

/* 卡片等大面积容器不需要外框，改用 box-shadow */
.card:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-surface-canvas),
              0 0 0 4px var(--color-brand-primary);
}
```

### 11.3 ARIA 标签规范

```typescript
// 必须提供的 ARIA 属性
interface AccessibleProps {
  'aria-label'?: string;          // 无文字内容的图标按钮必须
  'aria-labelledby'?: string;     // Modal/Dialog 标题引用
  'aria-describedby'?: string;    // 表单错误信息引用
  'aria-live'?: 'polite' | 'assertive';  // Toast/动态内容
  'aria-disabled'?: boolean;      // 禁用状态（不用 disabled 时）
  'aria-expanded'?: boolean;      // 下拉/折叠状态
  'aria-selected'?: boolean;      // Tab/列表选中态
  'role'?: string;                // 语义角色
}
```

常见组件 ARIA 要求：

| 组件 | 必须属性 |
|---|---|
| IconButton | `aria-label` |
| Modal | `role="dialog"`, `aria-labelledby`, `aria-modal="true"` |
| Dropdown | `aria-haspopup="true"`, `aria-expanded` |
| Toast | `role="status"` 或 `role="alert"`, `aria-live` |
| Sidebar 导航项 | `aria-current="page"`（激活项） |
| Tab | `role="tab"`, `aria-selected` |
| TabPanel | `role="tabpanel"` |
| 表单错误 | `aria-describedby` 指向错误 id |
| 加载状态 | `aria-busy="true"` |

---

## 12. CSS 实现规范

### 12.1 Tailwind 4.x 集成策略

采用 Tailwind 4.x CSS-first 模式，通过 `@theme` 将设计令牌注入 Tailwind 工具类：

```css
/* 文件：src/styles/tailwind.css */

@import "tailwindcss";

@theme {
  /* 颜色令牌注入 Tailwind */
  --color-brand-primary: var(--color-brand-primary);
  --color-text-primary:  var(--color-text-primary);
  --color-surface-1:     var(--color-surface-1);
  /* ... 所有语义 token ... */

  /* 间距注入 */
  --spacing-1: var(--space-1);
  --spacing-2: var(--space-2);
  /* ... */

  /* 圆角注入 */
  --radius-sm: var(--radius-sm);
  /* ... */

  /* 字体注入 */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-serif: "Instrument Serif", "LXGW WenKai", serif;
  --font-mono: "Cascadia Code", "JetBrains Mono", monospace;
}
```

### 12.2 PostCSS 插件链

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),  // Tailwind 4.x
    require('autoprefixer'),           // 自动前缀
    require('postcss-custom-properties')({ preserve: true }), // 变量解析
  ]
};
```

### 12.3 全局样式文件结构

```
src/styles/
├── main.css              # 入口：import 顺序严格
├── global/
│   ├── reset.css         # CSS Reset（基于 @layer base）
│   ├── focus.css         # 全局 :focus-visible 规则
│   ├── scrollbar.css     # 自定义滚动条
│   ├── typography.css    # 全局排版基础
│   └── z-index.css       # Z-index 常量注释表
├── themes/
│   ├── light.css         # 亮色主题变量
│   ├── dark.css          # 暗色主题变量
│   ├── eyecare.css       # 护眼模式覆盖
│   └── ethereal-night.css # 暗夜红主题
├── tokens/
│   ├── colors.css        # 原始色板（--ink-* / --red-* 等）
│   ├── spacing.css       # 间距 token
│   ├── radius.css        # 圆角 token
│   ├── shadow.css        # 阴影 token
│   ├── duration.css      # 动效时长 token
│   └── easing.css        # 缓动函数 token
└── tailwind.css          # @theme 注入文件
```

### 12.4 禁止清单（ESLint + Stylelint 规则）

```javascript
// stylelint.config.js 相关规则
rules: {
  // 禁止组件样式中出现裸 hex 色值
  'color-no-hex-not-in-tokens': 'error',
  // 禁止 !important（除 data-animation-level 降级规则）
  'declaration-no-important': true,
  // 禁止硬编码 px 间距（除 1px border）
  'number-magic-numbers': ['error', { acceptedNumbers: [0, 1, 2] }],
  // overlay 组件禁止引用 --paper-* 变量
  'custom-property-scope-violation': ['error', {
    files: ['**/overlay/**', '**/modal/**', '**/toast/**'],
    forbidden: ['--paper-']
  }],
}
```

### 12.5 自定义滚动条实现

```css
/* 文件：src/styles/global/scrollbar.css */

/* Webkit 滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
  transition: background var(--duration-micro) var(--ease-out);
}
::-webkit-scrollbar:hover {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
```

### 12.6 Z-index 规范文件

```css
/* 文件：src/styles/global/z-index.css
   使用方式：直接在组件 CSS 中用注释对应的数值
   禁止使用其他未列出的 Z-index 值
*/

/*
  Z-index 层级表（固定数值，不使用 CSS 变量）：
  ┌────────────────────────────────────┬────────┐
  │ 层级                               │  值    │
  ├────────────────────────────────────┼────────┤
  │ 基础内容层（纸张、侧栏）           │   0    │
  │ Sticky 元素（表头、工具栏占位）    │  10    │
  │ Floating（FloatingToolbar、TOC）   │  50    │
  │ StatusBar                          │  100   │
  │ TopBar / TabBar                    │  110   │
  │ Dropdown / Popover                 │  200   │
  │ FloatingToolbar（编辑器悬浮）      │  200   │
  │ ContextMenu                        │  250   │
  │ Tooltip                            │  250   │
  │ Modal                              │  300   │
  │ Modal Overlay                      │  299   │
  │ Toast                              │  400   │
  │ 命令面板（CommandPalette）         │  450   │
  │ 最顶层 Overlay（MigrationProgress）│  500   │
  └────────────────────────────────────┴────────┘
*/
```


## 2026-04-29 Completion Ledger
- 状态: P2-09 UI polish baseline 已落地，作为 0420 UI polish 扩展规格的第一条真实实现切片。
- 已完成范围: 全局设计系统 baseline token、溢出工具类、共享卡片类、Hub/Settings/EditorStatusBar 溢出修复、暗色模式变量扩展、页面切换动画、reducedMotion、WCAG AA 对比度抽样。
- 真实数据与真实交互: 本轮未引入 mock、模拟数据或占位操作；所有 UI 状态继续从现有 Pinia store、路由与真实组件状态派生。
- 图标约束: 本轮未引入 Emoji 图标；既有图标体系继续使用已安装图标库与 CSS/SVG 表达。
- 验证证据: `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `pnpm build` 通过；Hub 320/768/1024/1440/1920px 与 Settings 320px 浏览器水平溢出验证通过；dark/reduced-motion 浏览器抽样与 WCAG AA 抽样通过。
- 资源边界: GitNexus、Serena、ABCoder、Exa 在本轮收口时返回 `Transport closed` 或额度限制，未将其结果伪装为已通过；用本地真实命令、浏览器验证和文档账本替代。
- 未夸大范围: 本 ledger 不声明完成 0420 super-spec 中尚未真实执行的完整主题编辑器、Stylelint CI、自定义 CSS 注入、axe-core 全自动门禁、全部组件逐像素视觉审计或完整主题 preset 管理。
