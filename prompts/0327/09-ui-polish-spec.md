# 09 -- UI 打磨与溢出修复规范

> 优先级: P2
> 影响文件: 全局组件
> 核心目标: 修复视觉不一致、溢出问题、暗色模式兼容

---

## 一、问题描述

1. **显示不足** -- 各组件在不同视口宽度下出现文字截断、溢出、挤压
2. **按钮冗余** -- 部分页面有重复入口，需精简
3. **卡片设计不够精致** -- 缺少统一的设计系统
4. **暗色模式不完整** -- 部分组件在 dark 模式下显示异常

## 二、全局溢出修复

### 2.1 文本溢出处理

所有可能溢出的文本元素添加统一的溢出处理:

```css
/* 单行文本截断 */
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 多行文本截断 (2 行) */
.text-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 多行文本截断 (3 行) */
.text-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### 2.2 需要检查的溢出点

| 组件 | 位置 | 溢出类型 | 修复方案 |
|---|---|---|---|
| HubHeader | 日期文本 | 长日期可能换行 | nowrap + text-truncate |
| StatsDashboard | 大数字 | 超长数字 | 缩小字号或使用 formatNumber |
| InspirationCard | 引言文本 | 长引言 | 限制最大高度 + text-clamp-3 |
| WritingFlowCard | 柱状图标签 | 文字重叠 | 缩小字号或旋转标签 |
| ArticleWaterfall | 文章标题 | 长标题截断 | text-clamp-2 |
| FloatingToolbar | 工具栏宽度 | 超出纸张边界 | 边界检测 (05 规范已处理) |
| SettingsView | 设置描述 | 长描述文本 | 自动换行 |
| TabBar | 多标签 | Tab 数量过多 | 横向滚动 + 折叠菜单 |
| EditorStatusBar | 状态文本 | 小屏挤压 | 隐藏次要信息 |

### 2.3 TabBar 溢出处理

当打开的 Tab 数量超过可见区域时:

**方案**: 横向滚动 + 两端渐变遮罩
```css
.tab-bar-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;  /* Firefox */
}
.tab-bar-scroll::-webkit-scrollbar {
  display: none;
}
/* 右侧渐变遮罩 */
.tab-bar-wrapper::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to right, transparent, var(--bg-surface));
  pointer-events: none;
}
```

## 三、按钮精简

### 3.1 Hub 页面

**删除**:
- HeroCard 中的"新建草稿"按钮 (参见 02 规范)
- card-new 整个卡片 (参见 02 规范)

**保留**:
- "浏览文章库"按钮 (HeroCard)
- "继续创作"按钮 (HeroCard, 新增)
- QuickActionFab (右下角)

### 3.2 WorkstationView

**确认保留**:
- 返回按钮 (左上)
- 保存按钮
- 复制到剪贴板
- 导出按钮
- 专注模式按钮
- 面板切换按钮

**删除/隐藏** (如有冗余):
- 检查是否有重复的"保存"入口

## 四、卡片设计系统

### 4.1 基础卡片样式

```css
.card-base {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 24px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card-base:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

/* 可点击卡片 */
.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

/* 品牌强调卡片 */
.card-accent {
  background: linear-gradient(135deg, #D32F2F, #C62828);
  color: white;
  border: none;
}

/* 空状态卡片 */
.card-empty {
  border: 2px dashed rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.01);
  text-align: center;
  color: #90A4AE;
}
```

### 4.2 卡片标题统一

```css
.card-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(0, 0, 0, 0.35);
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-top: 8px;
}
```

### 4.3 统计数字样式

```css
.stat-number {
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: #90A4AE;
  margin-top: 4px;
}
```

## 五、暗色模式兼容

### 5.1 CSS 变量体系

在 `styles/main.css` 或 `App.vue` 中定义暗色变量:

```css
:root {
  --bg-page: #FAFBFC;
  --bg-surface: #FFFFFF;
  --bg-rice-paper: #FAFBFC;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: rgba(0, 0, 0, 0.06);
  --accent: #D32F2F;
  --accent-light: rgba(211, 47, 47, 0.08);
}

[data-theme="dark"] {
  --bg-page: #0f172a;
  --bg-surface: #1e293b;
  --bg-rice-paper: #0f172a;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border-color: rgba(255, 255, 255, 0.08);
  --accent: #EF5350;
  --accent-light: rgba(239, 83, 80, 0.12);
}
```

### 5.2 需要暗色模式适配的组件

| 组件 | 适配要点 |
|---|---|
| HubView | 背景渐变、卡片背景、文字颜色 |
| WorkstationView | 编辑器纸张颜色、面板背景 |
| EditorPanel | 纸张背景、代码块颜色 (已有 #263238 深色) |
| FloatingToolbar | 已是深色设计，无需修改 |
| SettingsView | 表单背景、分割线颜色 |
| StatsDashboard | 数字颜色、背景 |
| InspirationCard | 引言背景渐变 |

### 5.3 暗色模式切换

确保 App.vue 中的主题切换逻辑:
```typescript
watch(() => settingsStore.settings.appearance.theme, (theme) => {
  if (theme === 'system') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}, { immediate: true })
```

## 六、动画与过渡

### 6.1 页面切换动画

使用 Vue `<Transition>` 组件，支持多种过渡效果，并根据路由 `meta.transition` 动态选择:

```vue
<!-- App.vue 或 router-view 包装 -->
<router-view v-slot="{ Component, route }">
  <Transition :name="route.meta.transition || 'page-fade'" mode="out-in">
    <component :is="Component" :key="route.path" />
  </Transition>
</router-view>
```

**淡入淡出** (默认):
```css
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
```

**向左滑出** (适用于"返回"导航，如从 Settings 返回 Hub):
```css
.page-slide-left-enter-active,
.page-slide-left-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.page-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
```

**向右滑入** (适用于"进入"导航，如从 Hub 进入 Workstation):
```css
.page-slide-right-enter-active,
.page-slide-right-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.page-slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
```

**路由 meta 配置示例**:
```typescript
// router/index.ts
const routes = [
  { path: '/', component: HubView },
  { path: '/workstation', component: WorkstationView, meta: { transition: 'page-slide-left' } },
  { path: '/settings', component: SettingsView, meta: { transition: 'page-slide-left' } },
  { path: '/publish', component: PublishView, meta: { transition: 'page-slide-left' } },
  { path: '/themes', component: ThemesView, meta: { transition: 'page-fade' } },
]
```

**路由 meta 类型声明**:
```typescript
// src/router/types.ts 或 src/vite-env.d.ts
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    transition?: 'page-fade' | 'page-slide-left' | 'page-slide-right'
  }
}
```

### 6.2 面板展开/折叠

```css
.panel-transition {
  transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 200ms ease;
}
```

### 6.3 reducedMotion 属性传播

当 `reducedMotion` 设置为 true 时，需要通过 `data-reduced-motion` 属性传播到根元素，确保所有动画和过渡都被抑制。

**App.vue 中的 watch** (已在 `syncCSSVariables` 中处理 class，补充 attribute 传播):

```typescript
// App.vue 中添加:
watch(() => settingsStore.settings.appearance.reducedMotion, (reduced) => {
  document.documentElement.setAttribute('data-reduced-motion', String(reduced))
}, { immediate: true })
```

**全局 CSS** (在 `styles/main.css` 中添加):

```css
[data-reduced-motion="true"] *,
[data-reduced-motion="true"] *::before,
[data-reduced-motion="true"] *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

**与现有 `reduce-motion` class 的关系**:

App.vue 当前已通过 `root.classList.add('reduce-motion')` 设置 class，新增的 `data-reduced-motion` attribute 提供了更精确的选择器。两者可以共存:

- `reduce-motion` class: 用于组件内部的条件判断（如 JS 逻辑 `el.classList.contains('reduce-motion')`）
- `data-reduced-motion` attribute: 用于 CSS 选择器，确保覆盖所有伪元素

**注意**: `::before` 和 `::after` 伪元素无法通过 `*` 选择器匹配，必须显式添加 `*::before` 和 `*::after` 选择器。这是上面 CSS 规则包含三个选择器的原因。

## 七、暗色模式完整性检查清单

确保所有组件在 `[data-theme="dark"]` 下正确显示。以下是需要逐一验证的组件清单。

### 7.1 检查矩阵

| 组件 | 需检查的元素 | 涉及 CSS 变量 | 预期暗色表现 |
|------|------------|--------------|-------------|
| HubView | 背景渐变、所有卡片背景、文字颜色、统计数字 | `--bg-page`, `--bg-surface`, `--text-primary` | 渐变从 `#0f172a` 出发，卡片背景为 `#1e293b`，文字为 `#f1f5f9` |
| WorkstationView | 面板背景、分隔条、Tab 文字、编辑器容器 | `--bg-surface`, `--border-color`, `--text-primary` | 面板背景为深色表面色，分隔条使用 `rgba(255,255,255,0.08)` |
| EditorPanel | 纸张背景（应变为深色纸张）、代码块（已有深色背景 `#263238`）| `--bg-surface`, `--text-primary` | 纸张背景变为深灰（`#1e293b` 或 `#263238`），代码块保持不变 |
| FloatingToolbar | 已是深色设计，无需修改 | - | 保持现有样式 |
| SettingsView | 表单控件背景、分隔线、卡片背景、侧栏背景 | `--bg-surface`, `--border-color`, `--text-primary` | 表单背景为深色，分隔线使用低对比度白色 |
| StatsDashboard | 数字颜色、图标背景、卡片边框 | `--text-primary`, `--bg-surface` | 数字使用浅色文字，图标背景保持品牌色低透明度 |
| InspirationCard | 引言文字颜色、左边框、背景渐变 | `--text-primary`, `--accent` | 引言文字为浅色，左边框保持品牌红 |
| ArticleCard | 卡片背景、标题文字、摘要文字、标签颜色 | `--bg-surface`, `--text-primary`, `--text-secondary` | 卡片为深色表面，文字为浅色 |
| ContributionHeatmap | 空格颜色、活跃格颜色、日期标签 | 需要暗色变体 | 空格为 `rgba(255,255,255,0.06)`，活跃格保持品牌红系列 |
| EditorContextMenu | 菜单背景、分隔线、文字颜色 | `--bg-surface`, `--border-color`, `--text-primary` | 菜单背景为深色，hover 状态使用更浅的深色 |
| FindReplace | 面板背景、输入框背景、toggle 按钮状态 | `--bg-surface`, `--border-color` | 面板背景为深色，输入框使用更暗的背景色 |
| ExportModal | 弹窗背景、表单控件、预览区域 | `--bg-surface`, `--border-color` | 遵循对话框暗色模式基线 |
| OutlinePanel | 背景、大纲项目 hover 状态、层级缩进线 | `--bg-surface`, `--text-secondary` | 大纲项目 hover 使用低透明度白色 |
| CategoryPanel | 分类列表背景、选中高亮、计数标签 | `--bg-surface`, `--accent-light` | 选中项使用品牌红低透明度暗色变体 |

### 7.2 暗色模式 CSS 变量扩展

现有暗色变量集需要补充以下细分变量:

```css
[data-theme="dark"] {
  /* 已有 */
  --bg-page: #0f172a;
  --bg-surface: #1e293b;
  --bg-rice-paper: #0f172a;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border-color: rgba(255, 255, 255, 0.08);
  --accent: #EF5350;
  --accent-light: rgba(239, 83, 80, 0.12);

  /* 新增细分变量 */
  --bg-surface-elevated: #334155;        /* 弹窗、菜单等浮层背景 */
  --bg-input: #0f172a;                   /* 表单输入框背景 */
  --bg-hover: rgba(255, 255, 255, 0.04); /* 列表项 hover */
  --bg-active: rgba(255, 255, 255, 0.08);/* 列表项 active / 选中 */
  --shadow-color: rgba(0, 0, 0, 0.4);   /* 阴影颜色（深色模式下更深） */
  --scrollbar-thumb: rgba(255, 255, 255, 0.12); /* 滚动条拇指 */
  --scrollbar-track: transparent;        /* 滚动条轨道 */

  /* 代码块 */
  --code-bg: #0f172a;                    /* 行内代码背景 */
  --code-text: #e2e8f0;                  /* 行内代码文字 */

  /* 品牌色暗色变体 */
  --accent-surface: rgba(239, 83, 80, 0.08);  /* 品牌色卡片背景 */
  --accent-border: rgba(239, 83, 80, 0.2);    /* 品牌色边框 */

  /* 状态色 */
  --success-bg: rgba(46, 125, 50, 0.15);
  --success-text: #66bb6a;
  --error-bg: rgba(198, 40, 40, 0.15);
  --error-text: #ef5350;
  --warning-bg: rgba(245, 127, 23, 0.15);
  --warning-text: #ffa726;
  --info-bg: rgba(21, 101, 192, 0.15);
  --info-text: #42a5f5;
}
```

### 7.3 ContributionHeatmap 暗色变体

热力图需要专门的暗色方格颜色:

```css
:root {
  --heatmap-empty: rgba(0, 0, 0, 0.04);
  --heatmap-level-1: rgba(211, 47, 47, 0.15);
  --heatmap-level-2: rgba(211, 47, 47, 0.35);
  --heatmap-level-3: rgba(211, 47, 47, 0.55);
  --heatmap-level-4: rgba(211, 47, 47, 0.8);
}

[data-theme="dark"] {
  --heatmap-empty: rgba(255, 255, 255, 0.06);
  --heatmap-level-1: rgba(239, 83, 80, 0.2);
  --heatmap-level-2: rgba(239, 83, 80, 0.4);
  --heatmap-level-3: rgba(239, 83, 80, 0.6);
  --heatmap-level-4: rgba(239, 83, 80, 0.85);
}
```

### 7.4 验证流程

对每个组件执行以下检查步骤:

1. 在浏览器 DevTools 中切换 `data-theme` 属性为 `dark`
2. 检查背景色是否从亮色变为暗色
3. 检查文字是否保持足够的对比度（WCAG AA 标准: 4.5:1 对比度）
4. 检查边框是否使用低对比度白色而非黑色
5. 检查交互状态（hover/active/focus）是否有视觉反馈
6. 检查品牌红色是否使用了暗色变体（`#EF5350` 而非 `#D32F2F`）
7. 检查阴影是否使用了更深的颜色
8. 检查图片/图标在暗色背景上是否清晰可见

**重要约束**:
- 不使用 Emoji
- 不使用 Mock 数据
- 所有图标使用 lucide-vue-next
- 暗色模式不得引入新的 z-index 层级冲突

---

## 八、文件清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | styles/main.css | 暗色模式变量扩展、全局工具类、reducedMotion 规则、热力图变量 |
| 修改 | App.vue | 主题切换增强 + `data-reduced-motion` attribute 传播 + 页面过渡组件 |
| 修改 | src/router/index.ts | 路由 meta.transition 配置 |
| 修改 | src/vite-env.d.ts | RouteMeta 类型声明扩展 |
| 修改 | views/HubView.vue | 溢出修复 + 暗色适配 |
| 修改 | views/WorkstationView.vue | 面板动画 + 暗色适配 |
| 修改 | views/SettingsView.vue | 暗色适配（表单控件、分隔线） |
| 修改 | components/editor/TabBar.vue | 溢出处理 |
| 修改 | components/editor/EditorStatusBar.vue | 小屏适配 |
| 修改 | components/editor/EditorContextMenu.vue | 暗色适配 |
| 修改 | components/editor/FindReplace.vue | 暗色适配 |
| 修改 | components/hub/ContributionHeatmap.vue | 暗色变体方格颜色 |
| 修改 | components/hub/*.vue | 统一卡片样式 + 暗色适配 |

## 九、验收标准

### 溢出与响应式
- [ ] 所有组件在 1440px / 1280px / 1024px / 768px / 375px 宽度下无溢出
- [ ] 文本溢出使用截断处理 (text-truncate / text-clamp)
- [ ] TabBar 在标签数量超出时启用横向滚动 + 渐变遮罩
- [ ] EditorStatusBar 在小屏下隐藏次要信息

### 按钮与卡片
- [ ] 按钮入口精简，无冗余
- [ ] 卡片样式统一 (card-base / card-interactive / card-accent / card-empty)

### 页面切换动画
- [ ] 默认页面切换使用 `page-fade` 淡入淡出过渡
- [ ] 从 Hub 进入 Workstation / Settings 使用 `page-slide-left` 滑动过渡
- [ ] 路由 `meta.transition` 配置正确传递到 Transition 组件
- [ ] `router-view` 使用 `:key="route.path"` 确保组件正确销毁重建

### reducedMotion 传播
- [ ] `data-reduced-motion` attribute 在 `<html>` 元素上正确设置
- [ ] 当 reducedMotion 为 true 时，所有 CSS animation 和 transition 被抑制
- [ ] `::before` 和 `::after` 伪元素的动画也被正确抑制
- [ ] `scroll-behavior` 在 reducedMotion 下回退为 `auto`

### 暗色模式
- [ ] 所有页面在 `[data-theme="dark"]` 下正确显示
- [ ] 检查矩阵中的 14 个组件全部通过暗色模式验证
- [ ] ContributionHeatmap 使用暗色变体方格颜色
- [ ] 文字对比度满足 WCAG AA 标准 (4.5:1)
- [ ] 品牌红在暗色模式下使用 `#EF5350` 变体
- [ ] system 主题跟随系统偏好
- [ ] 暗色模式下阴影使用更深的颜色
- [ ] 表单输入框背景使用 `--bg-input` 变量

### 通用
- [ ] 面板折叠有平滑动画
- [ ] 无 Emoji
- [ ] 所有图标使用 lucide-vue-next
- [ ] 无 TypeScript 编译错误
