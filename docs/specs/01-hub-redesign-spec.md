现在我已经掌握了所有必要信息。下面输出完整的 Spec 文档。

---

# Hub 首页重设计规格说明书 (Hub Redesign Specification)

> 2026-03-28 执行说明：Hub 的当前可执行实现以 `prompts/0327/02-hub-layout-spec.md`、`prompts/0327/08-data-insights-spec.md` 与 `.trellis/tasks/03-27-03-27-editor-hub-settings-full-upgrade/prd.md` 为准。本文中的早期差距分析仅表示旧基线，不再直接代表当前完成度。

**文档版本**: v1.0  
**目标版本**: HubView v7.0  
**日期**: 2026-03-21  
**适用项目**: InkForge (`inkforge/src/`)  
**技术栈**: Vue 3 + TipTap + Pinia + Tailwind CSS + Dexie(IndexedDB) + Lucide Icons + TypeScript  

---

## 1. 概述

### 1.1 改造目标

将当前 HubView v6 的 Bento Grid + 自由滚动瀑布流架构，升级为**四区段全屏滚动（Section Snap Scroll）+ 数据可视化 + 模板市场 + 文章瀑布流**的全新首页体验。核心增量：

1. Section Snap Scroll 分区全屏滚动，带右侧导航指示器
2. 创作流 Hero 首屏重排（`WritingFlowCard` 作为 Hero）
3. 九张数据洞察卡（纯 SVG / CSS）
4. 模板市场卡片（复用 `themePresets` 数据，匹配原型 `prototype/inkforge_themes.html`）
5. 创作流柱状图对齐修复 + 浮窗卡片
6. 文章瀑布流改用 CSS `columns` 真瀑布流
7. 快速操作 FAB 按钮
8. 全部 Emoji 替换为 Lucide 图标
9. Dexie/Pinia 驱动的实时活动与导出洞察

### 1.2 设计哲学

保持现有 **Ethereal Constructivism** 设计语言：

- **构成主义红** `#D32F2F` 作为主色调
- **宣纸色** `#FAFBFC` 作为背景底色
- **墨色** `#263238` 作为主文字色
- **毛玻璃材质** `backdrop-filter: blur(20px)` + `rgba(255,255,255,0.85)` 卡片
- **边框** `#ECEFF1` 1px solid
- **动效曲线** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-panel), `cubic-bezier(0.34, 1.56, 0.64, 1)` (ease-bounce)
- **字体** 标题使用 `Noto Serif SC`, 正文使用系统字体栈

### 1.3 约束条件

| 约束 | 说明 |
|------|------|
| 禁止 Emoji | 所有图标必须使用 `lucide-vue-next` 组件，包括分类图标、模板图标、状态图标 |
| 禁止 Mock 数据 | 所有数据必须来自真实的 Pinia Store（`articleStore`, `categoryStore`, `assetStore`, `aiStore`） |
| 不改变编辑器风格 | Workstation/EditorPanel 不受影响 |
| 保持路由结构 | Hub 路由路径 `/` 不变 |
| 图标库 | `lucide-vue-next`，禁止内联 SVG path（现有代码中的内联 SVG 全部迁移到 Lucide 组件） |
| 无外部图表库 | 热力图、趋势图、环形图均使用纯 SVG 实现，不引入 Chart.js / ECharts 等 |

---

## 2. 现状分析

### 2.1 当前 Hub 页面架构

**文件位置**: `D:\Desktop\Inkforge\inkforge\src\views\HubView.vue`  
**总行数**: 2169 行（单文件组件，`<script setup>` + `<template>` + `<style scoped>`）

#### 组件树

```
HubView.vue
├── PageLoading（加载蒙层）
├── HubHeader（品牌 + 日期 + 操作按钮）
├── BentoContainer（4col x 3row Grid）
│   ├── CardHero（创作流柱状图，2col x 2row）
│   │   ├── 柱状图 7 根 bar
│   │   └── DayArticles 展开（transition name="expand"）
│   ├── CardStats（统计面板，1col x 2row）
│   │   ├── 文章总数
│   │   ├── 总字数
│   │   └── 完成率
│   ├── CardNew（新建项目，1col x 1row）
│   ├── CardCategories（分类卡片，2col x 1row）
│   ├── CardRecent（最近文件，1col x 1row）
│   └── CardInspiration（灵感名言，1col x 1row）
├── ScrollIndicator（下滑指示器）
├── FilterBar（筛选栏：全部/本周/分类 + 搜索 + 排序）
├── WaterfallGrid（文章瀑布流）
│   └── ArticleCard * N
├── EmptyState（空状态）
└── AddCategoryModal（分类创建弹窗）
```

#### 数据流

```
articleStore.articles ──┬── stats (computed)
                        ├── weeklyChartData (computed)
                        ├── weeklyTotal (computed)
                        ├── latestArticle (computed)
                        ├── selectedDayArticles (computed)
                        ├── displayArticles (computed, filtered + sorted)
                        └── calculateStreak()

categoryStore.categories ── displayCategories (computed, 前3个)

assetStore.assets ── stats.assetCount

aiStore ── isAvailable, generateAIInspiration()

quotes.ts ── getDailyQuote()
```

#### Computed 属性完整列表

| 属性名 | 行号 | 数据源 | 用途 |
|--------|------|--------|------|
| `stats` | 49-70 | `articles`, `assetStore.assets` | 统计面板数据 |
| `dailyQuote` | 98 | `quotes.ts` | 每日名言 |
| `displayQuote` | 133 | `aiInspiration`, `dailyQuote` | 展示的灵感（AI优先） |
| `weeklyChartData` | 173-194 | `articles` | 本周每日文章数数组[7] |
| `weeklyTotal` | 197-199 | `weeklyChartData` | 本周总产出 |
| `todayIndex` | 202-205 | `Date.now()` | 今天是周几(Mon=0) |
| `maxDayCount` | 208-210 | `weeklyChartData` | 柱状图最大值(至少1) |
| `selectedDayArticles` | 220-231 | `articles`, `selectedDayIndex` | 选中日的文章列表 |
| `displayArticles` | 234-255 | `articles`, `filterMode`, `searchQuery`, `sortMode` | 瀑布流展示列表 |
| `latestArticle` | 260-265 | `articles` | 最近编辑的文章 |
| `displayCategories` | 268-281 | `categoryStore.categories` | 前3个分类+颜色方案 |

### 2.2 现有问题清单

| # | 问题 | 代码位置 | 详细说明 |
|---|------|----------|----------|
| P1 | **柱状图与星期标签不对齐** | L1036-1101 | `.chart-container` 使用 `display: flex; justify-content: space-between; gap: 10px`，而 `.chart-labels` 也使用 `display: flex; justify-content: space-between`。两者的子元素数量虽然都是7个，但 bar 的 `flex: 1` 和 labels 的无 flex 导致宽度分配不一致。gap 会额外占用空间使 bar 缩窄，labels 则均匀分布文字，造成视觉上的错位 |
| P2 | **大量内联 SVG** | L400-403, L461-464, L472-475, L483-486, L496-499, L511-513, L528-537, L545-548, L557-559, L570-573, L586-588, L600-602, L610-613, L634-636, L662-664, L702-705, L711-714 | 超过 17 处内联 SVG path，应全部替换为 `lucide-vue-next` 组件 |
| P3 | **分类图标仍使用 Emoji** | `AddCategoryModal.vue` L18 | `iconOptions = ['📁', '🤖', '📜', ...]` 使用 Emoji，违反禁止 Emoji 规则 |
| P4 | **CategoryPanel 使用 Emoji** | `CategoryPanel.vue` L53, L66 | `📚` 和 `{{ category.icon || '📁' }}` 均为 Emoji |
| P5 | **模板数据使用 Emoji** | `templates.ts` L29, L79, L133, L169, L224, L256, L305, L365 | 8个模板的 `icon` 字段全部是 Emoji |
| P6 | **主题预设使用 Emoji** | `themes.ts` L266, L285, L304, L324, L343, L359, L383, L400, L419, L440, L462, L479 | 12个主题预设的 `icon` 字段全部是 Emoji |
| P7 | **单文件过大** | HubView.vue 2169行 | 所有逻辑和样式集中在单文件中，应拆分为独立组件 |
| P8 | **无数据可视化** | 全局 | 缺少创作热力图、字数趋势图、分类分布图等数据洞察能力 |
| P9 | **无模板市场** | 全局 | 主题预设 (`themePresets`) 数据已存在但 Hub 页面未展示 |
| P10 | **CardHero 选中日展开定位问题** | L439-454 | `card-hero` 设置了 `overflow: visible`(L971)，但展开区域 `.day-articles` 使用 `margin-top` 而非绝对定位浮窗，会撑开卡片高度导致 Bento Grid 布局抖动 |
| P11 | **日期格式不统一** | L78-80 | `calculateStreak()` 中日期 key 使用 `getMonth()` (0-based) 而非 padded 格式，可能在日期比较逻辑中产生歧义 |
| P12 | **Avatar 使用外部 URL** | L406 | `https://api.dicebear.com/7.x/avataaars/svg?seed=InkForge` 依赖外部服务，离线场景会失败 |
| P13 | **无快速操作入口** | 全局 | 缺少 FAB 快速新建文章/导入等常用操作 |

---

## 3. 整体布局架构

### 3.1 分区滚动设计 (Section Snap Scroll)

#### CSS 实现方案

```css
.hub-page {
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}

.hub-section {
  min-height: 100vh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 32px;
  position: relative;
}
```

#### 4 个 Section 划分

| Section | 名称 | 内容 | 高度 |
|---------|------|------|------|
| 1 | Hero 区 | Header + `WritingFlowCard` Hero + 灵感卡片 + 最近文章（顶部含新建入口） | `100vh` |
| 2 | 创作工具区 | 模板/文章库/创作辅助等首页中段内容 | `100vh` |
| 3 | 数据洞察区 | 9 张洞察卡：热力图、生产力洞察、字数趋势、字数分布、分类分布、写作时间线、标签词云、最近活动、导出频率 | `100vh` |
| 4 | 文章库区 | 筛选栏 + 文章瀑布流（此区段不强制 snap，允许自由滚动） | `auto`，`min-height: 100vh` |

#### 2026-03-28 实现回写

当前 `HubView.vue` 已按 `prompts/0327/02-hub-layout-spec.md` 与 `prompts/0327/08-data-insights-spec.md` 的真实实现回写如下：

1. Hero 区不再使用独立文案 HeroCard，`WritingFlowCard` 直接承担首页 Hero 角色。
2. `card-new` 已并入最近文章区域，最近文章顶部保留新建入口，同时 Hero 区提供“继续创作”动作。
3. 数据洞察区不再是 3 卡简版，而是 9 张真实数据卡片。
4. 第 9 张洞察卡为 `ExportFrequency`，对应 `prompts/0327/08-data-insights-spec.md` “图表总览”中的第 9 项。
5. `RecentActivity` 与 `ExportFrequency` 直接读取 Dexie `activity_logs` 相关数据，并响应 `inkforge:activity-log-updated` 事件刷新。
6. 所有洞察卡均提供空状态，不使用 mock 数据或占位图表。

#### Section 4 特殊处理

Section 4 包含瀑布流，内容可能超过一屏，因此使用 `scroll-snap-align: start` 但不使用 `scroll-snap-stop: always`，允许用户在进入该区段后自由滚动浏览文章。

```css
.hub-section--articles {
  min-height: 100vh;
  height: auto; /* 不固定高度 */
  scroll-snap-align: start;
  /* 不设置 scroll-snap-stop: always，允许自由滚动 */
}
```

### 3.2 导航指示器 (Section Nav Dots)

右侧固定的小圆点导航，指示当前所在 Section 并支持点击跳转。

**组件名**: `SectionNav.vue`  
**文件路径**: `inkforge/src/components/hub/SectionNav.vue`

**Props**:
```typescript
interface SectionNavProps {
  /** 总 Section 数量 */
  sectionCount: number
  /** 当前激活的 Section 索引 (0-based) */
  activeIndex: number
}
```

**Emits**:
```typescript
interface SectionNavEmits {
  (e: 'navigate', index: number): void
}
```

**定位 CSS**:
```css
.section-nav {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-nav__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #B0BEC5;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 0;
}

.section-nav__dot:hover {
  background: #607D8B;
  transform: scale(1.3);
}

.section-nav__dot--active {
  background: #D32F2F;
  transform: scale(1.4);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.2);
}
```

**Section 激活检测**: 使用 `IntersectionObserver`，当 Section 进入视口 50% 以上时标记为激活。

```typescript
// HubView.vue 中
const activeSectionIndex = ref(0)
const sectionRefs = ref<HTMLElement[]>([])

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const idx = sectionRefs.value.indexOf(entry.target as HTMLElement)
          if (idx >= 0) activeSectionIndex.value = idx
        }
      }
    },
    { threshold: 0.5 }
  )
  sectionRefs.value.forEach(el => { if (el) observer.observe(el) })
  onUnmounted(() => observer.disconnect())
})

function navigateToSection(index: number): void {
  sectionRefs.value[index]?.scrollIntoView({ behavior: 'smooth' })
}
```

### 3.3 移动端适配方案

Tauri 桌面端窗口最小尺寸约 800x600，但仍需考虑窗口缩放场景。

| 断点 | 宽度 | 布局策略 |
|------|------|----------|
| XL | >= 1440px | Bento 4col, 瀑布流 4col, 热力图完整52周 |
| LG | 1024-1439px | Bento 4col (压缩), 瀑布流 3col, 热力图完整52周 |
| MD | 768-1023px | Bento 2col, 瀑布流 2col, 热力图26周(半年), Section取消snap |
| SM | < 768px | Bento 1col, 瀑布流 1col, 热力图13周(季度), Section取消snap |

**768px 以下取消 snap 的原因**: 小屏幕上全屏 snap 滚动体验差，内容密集难以在单屏展示。

```css
@media (max-width: 768px) {
  .hub-page {
    scroll-snap-type: none;
  }
  .hub-section {
    min-height: auto;
    scroll-snap-align: none;
  }
}
```

### 3.4 Bento Grid 改进（Section 1）

Section 1 保留现有 Bento Grid 结构，但改进 Grid 模板定义：

```css
.bento-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  grid-template-areas:
    "hero   hero   stats  new"
    "hero   hero   stats  recent"
    "cats   cats   insp   insp";
  gap: 20px;
  height: calc(100vh - 140px);
  max-width: 1400px;
  margin: 0 auto;
}

.card-hero        { grid-area: hero; }
.card-stats       { grid-area: stats; }
.card-new         { grid-area: new; }
.card-recent      { grid-area: recent; }
.card-categories  { grid-area: cats; }
.card-inspiration { grid-area: insp; }
```

**响应式断点变化**:

```css
/* 1024-1439px */
@media (max-width: 1439px) {
  .bento-container {
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, auto);
    gap: 16px;
  }
}

/* 768-1023px */
@media (max-width: 1023px) {
  .bento-container {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto;
    grid-template-areas:
      "hero   hero"
      "stats  new"
      "recent insp"
      "cats   cats";
    height: auto;
  }
}

/* < 768px */
@media (max-width: 767px) {
  .bento-container {
    grid-template-columns: 1fr;
    grid-template-areas:
      "hero"
      "stats"
      "new"
      "recent"
      "cats"
      "insp";
    height: auto;
  }
}
```

---

## 4. 创作流卡片 (Writing Flow Card)

### 4.1 柱状图对齐修复

**当前问题根因分析**:

当前 `.chart-container` (L1036-1044):
```css
.chart-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;         /* bar 之间有 10px gap */
  flex: 1;
  min-height: 80px;
  padding-top: 8px;
}
```

当前 `.chart-labels` (L1093-1101):
```css
.chart-labels {
  display: flex;
  justify-content: space-between;   /* label 之间无 gap，均匀填充 */
  margin-top: 10px;
  font-size: 10px;
  ...
}
```

问题: `flex + gap` 对 bars 产生了间距压缩效果，而 labels 使用 `justify-content: space-between` 无 gap，导致两组元素的中心点无法对齐。

**修复方案**: 将 bars 和 labels 统一使用 CSS Grid，7 列等宽。

```css
.chart-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: 1fr auto;
  gap: 0 10px;
  flex: 1;
  min-height: 80px;
  padding-top: 8px;
  align-items: end;
}

.chart-bar-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 100%;
}

.chart-bar {
  width: 100%;
  max-width: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px 6px 0 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
  position: relative;
}

.chart-label {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
  padding-top: 10px;
  color: inherit;
}
```

**Template 结构变化**:

```html
<div class="chart-grid">
  <!-- Row 1: Bars -->
  <div v-for="(count, i) in weeklyChartData" :key="'bar-'+i"
    class="chart-bar-wrapper">
    <div
      class="chart-bar"
      :class="{ active: i === todayIndex, selected: i === selectedDayIndex }"
      :style="{ height: getBarHeight(count) }"
      @click="toggleDaySelection(i)">
      <span class="chart-tooltip">{{ count }} 篇</span>
    </div>
  </div>
  <!-- Row 2: Labels -->
  <div v-for="label in weekDayLabels" :key="'label-'+label" class="chart-label">
    {{ label }}
  </div>
</div>
```

### 4.2 浮窗卡片 (Day Detail Popover)

**组件名**: `DayDetailPopover.vue`  
**文件路径**: `inkforge/src/components/hub/DayDetailPopover.vue`

**Props**:
```typescript
interface DayDetailPopoverProps {
  /** 是否可见 */
  visible: boolean
  /** 日期标题（如 "周三 · 3月19日"） */
  dateTitle: string
  /** 当天文章列表 */
  articles: Article[]
  /** 锚点元素位置（用于定位） */
  anchorRect: DOMRect | null
}
```

**Emits**:
```typescript
interface DayDetailPopoverEmits {
  (e: 'close'): void
  (e: 'open-article', articleId: string): void
}
```

**定位逻辑**:

浮窗定位于被点击 bar 的正上方居中，若超出视口则向下偏移到 bar 下方。

```typescript
const popoverStyle = computed(() => {
  if (!props.anchorRect) return { display: 'none' }
  const { left, top, width, height } = props.anchorRect
  const centerX = left + width / 2
  // 默认定位在 bar 上方
  let posY = top - 8 // 8px gap
  let transformOrigin = 'bottom center'
  // 若超出视口顶部，改为 bar 下方
  if (posY - 200 < 0) {
    posY = top + height + 8
    transformOrigin = 'top center'
  }
  return {
    position: 'fixed' as const,
    left: `${centerX}px`,
    top: `${posY}px`,
    transform: 'translateX(-50%)',
    transformOrigin,
    zIndex: 100,
  }
})
```

**浮窗 CSS**:

```css
.day-popover {
  width: 280px;
  max-height: 240px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #ECEFF1;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow-y: auto;
}

.day-popover__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.day-popover__title {
  font-size: 13px;
  font-weight: 700;
  color: #263238;
}

.day-popover__count {
  font-size: 11px;
  font-weight: 600;
  color: #D32F2F;
  background: #FFEBEE;
  padding: 2px 8px;
  border-radius: 10px;
}

.day-popover__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.day-popover__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.day-popover__item:hover {
  background: #F5F5F5;
}

.day-popover__item-title {
  font-size: 12px;
  font-weight: 500;
  color: #263238;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-popover__empty {
  text-align: center;
  font-size: 12px;
  color: #90A4AE;
  padding: 16px 0;
}
```

**动画**:

```css
.popover-enter-active {
  transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.popover-leave-active {
  transition: all 0.1s ease-in;
}

.popover-enter-from {
  opacity: 0;
  transform: translateX(-50%) scale(0.95);
}

.popover-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.95);
}
```

**关闭方式**:
1. 点击浮窗外部区域 (通过 `@click.self` 在 overlay 上)
2. 按 `Escape` 键 (通过 `@keydown.escape` 监听)
3. 点击另一个 bar (自动切换)

**HubView 中的调用方式**:

```typescript
// 获取被点击 bar 的 DOMRect
function handleBarClick(index: number, event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement
  popoverAnchorRect.value = target.getBoundingClientRect()
  if (selectedDayIndex.value === index) {
    selectedDayIndex.value = null
  } else {
    selectedDayIndex.value = index
  }
}
```

---

## 5. 模板市场卡片 (Template Market Card)

### 5.1 设计规格

此卡片位于 **Section 2** 右半部分，与创作流卡片并列。匹配 `prototype/inkforge_themes.html` 原型中的卡片样式。

**数据来源**: `inkforge/src/services/export/themes.ts` 中的 `themePresets` 数组（当前12个预设）。

**组件名**: `TemplateMarketCard.vue`  
**文件路径**: `inkforge/src/components/hub/TemplateMarketCard.vue`

**Props**:
```typescript
interface TemplateMarketCardProps {
  /** 主题预设列表 */
  presets: ExportPreset[]
  /** 当前选中的预设 ID */
  activePresetId: string | null
}
```

**Emits**:
```typescript
interface TemplateMarketCardEmits {
  (e: 'select', presetId: string): void
  (e: 'apply', presetId: string): void
}
```

**布局 CSS**:

```css
.template-market {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.template-market__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.template-market__title {
  font-size: 16px;
  font-weight: 700;
  color: #263238;
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-market__count {
  font-size: 12px;
  font-weight: 500;
  color: #90A4AE;
}

.template-market__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

/* 自定义滚动条 */
.template-market__grid::-webkit-scrollbar {
  width: 4px;
}

.template-market__grid::-webkit-scrollbar-track {
  background: transparent;
}

.template-market__grid::-webkit-scrollbar-thumb {
  background: #ECEFF1;
  border-radius: 2px;
}

.template-market__grid::-webkit-scrollbar-thumb:hover {
  background: #B0BEC5;
}
```

**单个主题卡片 CSS**:

```css
.theme-card {
  background: #FFFFFF;
  border: 2px solid #ECEFF1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.theme-card--active {
  border-color: #D32F2F;
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.15);
}

.theme-card__preview {
  height: 80px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* 背景色由主题 primaryColor 决定 */
}

.theme-card__preview-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.4;
}

.theme-card__preview-text {
  font-size: 11px;
  line-height: 1.6;
  opacity: 0.7;
}

.theme-card__info {
  padding: 10px 14px;
  border-top: 1px solid #F5F5F5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.theme-card__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-card__name {
  font-size: 13px;
  font-weight: 700;
  color: #263238;
  display: flex;
  align-items: center;
  gap: 6px;
}

.theme-card__desc {
  font-size: 11px;
  color: #90A4AE;
}

.theme-card__color {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* Hover 时显示应用按钮 */
.theme-card__apply {
  opacity: 0;
  transition: opacity 0.15s ease;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: #D32F2F;
  color: white;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.theme-card:hover .theme-card__apply,
.theme-card--active .theme-card__apply {
  opacity: 1;
}

.theme-card__apply:hover {
  background: #B71C1C;
}
```

### 5.2 图标映射 (Emoji -> Lucide)

`themePresets` 中每个预设的 `icon` 字段当前为 Emoji，需替换为 Lucide 图标名称字符串。在渲染时使用动态组件 `<component :is="iconMap[preset.icon]" />` 或直接在组件内部维护映射。

| 预设 ID | 预设名称 | 当前 Emoji | Lucide 图标 | Lucide 组件名 |
|---------|---------|-----------|-------------|--------------|
| `thesis` | 论文翻译 | `📜` | ScrollText | `ScrollText` |
| `legal` | 法学研讨 | `⚖️` | Scale | `Scale` |
| `report` | 行业研报 | `📊` | BarChart3 | `BarChart3` |
| `commentary` | 时事点评 | `💬` | Newspaper | `Newspaper` |
| `aigc` | AIGC | `🤖` | Sparkles | `Sparkles` |
| `code` | 编程创造 | `💻` | Terminal | `Terminal` |
| `notes` | 学习笔记 | `📚` | BookOpen | `BookOpen` |
| `news` | 新闻 | `📰` | FileText | `FileText` |
| `meme` | 整活 | `🎭` | Palette | `Palette` |
| `life` | 人生感悟 | `💭` | Feather | `Feather` |
| `elegant` | 优雅 | `🪶` | PenLine | `PenLine` |
| `tech` | 科技 | `🚀` | Rocket | `Rocket` |

**实现方式**: 在 `TemplateMarketCard.vue` 内部定义映射常量：

```typescript
import {
  ScrollText, Scale, BarChart3, Newspaper, Sparkles,
  Terminal, BookOpen, FileText, Palette, Feather,
  PenLine, Rocket, type LucideIcon,
} from 'lucide-vue-next'

const PRESET_ICON_MAP: Record<string, LucideIcon> = {
  'thesis': ScrollText,
  'legal': Scale,
  'report': BarChart3,
  'commentary': Newspaper,
  'aigc': Sparkles,
  'code': Terminal,
  'notes': BookOpen,
  'news': FileText,
  'meme': Palette,
  'life': Feather,
  'elegant': PenLine,
  'tech': Rocket,
}

function getPresetIcon(presetId: string): LucideIcon {
  return PRESET_ICON_MAP[presetId] ?? FileText
}
```

**Template 中使用**:

```html
<component :is="getPresetIcon(preset.id)" :size="16" />
```

### 5.3 交互规格

| 交互 | 行为 |
|------|------|
| 点击卡片 | 选中状态：`border-color: #D32F2F`, `box-shadow: 0 0 0 3px rgba(211,47,47,0.15)` |
| Hover 卡片 | `translateY(-4px)` + `box-shadow: 0 8px 24px rgba(0,0,0,0.08)` + 显示"应用"按钮 |
| 点击"应用" | emit `apply` 事件，父组件负责将主题应用到 settingsStore |
| 当前主题指示器 | 已选中预设在卡片右上角显示 Lucide `Check` 图标，`color: #D32F2F` |

**主题预览区背景计算函数**:

```typescript
function getPreviewStyle(preset: ExportPreset): Record<string, string> {
  const color = preset.primaryColor
  // 深色主题（编程创造）用深色背景
  if (preset.id === 'code') {
    return {
      background: '#0d1117',
      color: '#c9d1d9',
    }
  }
  // 其他主题用主色的浅色调背景
  return {
    background: `${color}10`, // 10% opacity
    color: color,
  }
}
```

---

## 6. 创作热力图卡片 (Contribution Heatmap Card)

### 6.1 数据源

**来自**: `articleStore.articles` 的 `createdAt` 和 `updatedAt` 字段。  
**统计口径**: 过去 52 周（364 天）每天的**文章活动数**（创建或更新）。  
**数据结构**:

```typescript
/** 日期 -> 活动次数映射 */
type HeatmapData = Map<string, number>

/**
 * 从文章列表生成热力图数据
 * key 格式: 'YYYY-MM-DD'
 */
function buildHeatmapData(articles: Article[]): HeatmapData {
  const map = new Map<string, number>()
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - 363) // 52周 = 364天

  for (const article of articles) {
    // 统计 createdAt
    const created = new Date(article.createdAt)
    if (created >= startDate) {
      const key = formatDateKey(created)
      map.set(key, (map.get(key) || 0) + 1)
    }
    // 统计 updatedAt（如果与 createdAt 不在同一天）
    if (article.updatedAt) {
      const updated = new Date(article.updatedAt)
      if (updated >= startDate) {
        const uKey = formatDateKey(updated)
        if (uKey !== formatDateKey(created)) {
          map.set(uKey, (map.get(uKey) || 0) + 1)
        }
      }
    }
  }
  return map
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

### 6.2 UI 规格

**组件名**: `ContributionHeatmap.vue`  
**文件路径**: `inkforge/src/components/hub/ContributionHeatmap.vue`

**Props**:
```typescript
interface ContributionHeatmapProps {
  /** 文章列表（用于计算热力图数据） */
  articles: Article[]
}
```

**SVG Grid 规格**:

- **行数**: 7（Mon-Sun）
- **列数**: 52（52 周）
- **单元格尺寸**: `12px x 12px`
- **单元格间距**: `3px`
- **单元格圆角**: `2px`
- **总 SVG 宽度**: `52 * (12 + 3) - 3 = 777px`（加左侧标签约 30px = 807px）
- **总 SVG 高度**: `7 * (12 + 3) - 3 = 102px`（加顶部月标签约 20px = 122px）

**颜色阶梯 (5级)**:

| 等级 | 条件 | 颜色 | CSS 变量备注 |
|------|------|------|-------------|
| 0 | count = 0 | `#F5F5F5` | 背景灰 |
| 1 | count = 1 | `#FFCDD2` | accent-100 (红色系) |
| 2 | count = 2 | `#EF9A9A` | accent-200 |
| 3 | count = 3-4 | `#E53935` | accent-500 |
| 4 | count >= 5 | `#B71C1C` | accent-700 |

**颜色映射函数**:

```typescript
function getHeatmapColor(count: number): string {
  if (count === 0) return '#F5F5F5'
  if (count === 1) return '#FFCDD2'
  if (count === 2) return '#EF9A9A'
  if (count <= 4) return '#E53935'
  return '#B71C1C'
}
```

**月份标签**: 在 SVG 顶部绘制月份文字，仅在每月第一周对应的列显示。

```typescript
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
```

**星期标签**: 在 SVG 左侧绘制，仅显示 Mon、Wed、Fri。

```typescript
const DAY_LABELS: Array<{ day: number; label: string }> = [
  { day: 0, label: 'Mon' },
  { day: 2, label: 'Wed' },
  { day: 4, label: 'Fri' },
]
```

**Tooltip**: Hover 单元格时显示 HTML title 属性或自定义 Tooltip。

- 格式: `"2026年3月19日：3 次创作活动"` 或 `"2026年3月19日：无活动"`
- 实现方式: SVG `<title>` 元素（原生 tooltip，无需自定义浮层）

```html
<rect v-for="cell in heatmapCells" :key="cell.key"
  :x="cell.x" :y="cell.y"
  :width="12" :height="12"
  :rx="2" :ry="2"
  :fill="getHeatmapColor(cell.count)"
  class="heatmap-cell">
  <title>{{ cell.dateLabel }}：{{ cell.count > 0 ? cell.count + ' 次创作活动' : '无活动' }}</title>
</rect>
```

**卡片容器 CSS**:

```css
.heatmap-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #ECEFF1;
  border-radius: 16px;
  padding: 24px;
  flex: 2; /* 在 Section 3 中占更多宽度 */
}

.heatmap-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.heatmap-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #263238;
  display: flex;
  align-items: center;
  gap: 8px;
}

.heatmap-card__year-total {
  font-size: 13px;
  font-weight: 500;
  color: #90A4AE;
}

.heatmap-card__year-total strong {
  color: #D32F2F;
  font-weight: 700;
}

.heatmap-svg-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.heatmap-cell {
  transition: opacity 0.1s ease;
  cursor: default;
}

.heatmap-cell:hover {
  opacity: 0.75;
  stroke: #263238;
  stroke-width: 1;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 10px;
  color: #90A4AE;
}

.heatmap-legend__label {
  margin: 0 6px;
}

.heatmap-legend__cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
```

**图例**: 在热力图下方显示颜色图例。

```html
<div class="heatmap-legend">
  <span class="heatmap-legend__label">少</span>
  <div class="heatmap-legend__cell" style="background: #F5F5F5"></div>
  <div class="heatmap-legend__cell" style="background: #FFCDD2"></div>
  <div class="heatmap-legend__cell" style="background: #EF9A9A"></div>
  <div class="heatmap-legend__cell" style="background: #E53935"></div>
  <div class="heatmap-legend__cell" style="background: #B71C1C"></div>
  <span class="heatmap-legend__label">多</span>
</div>
```

### 6.3 热力图数据网格计算

```typescript
interface HeatmapCell {
  key: string          // 'YYYY-MM-DD'
  x: number            // SVG x 坐标
  y: number            // SVG y 坐标
  count: number        // 活动次数
  dateLabel: string    // '2026年3月19日'
  dayOfWeek: number    // 0=Mon, 6=Sun
  weekIndex: number    // 0-51
}

const heatmapCells = computed((): HeatmapCell[] => {
  const cells: HeatmapCell[] = []
  const data = buildHeatmapData(props.articles)
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1 // Mon=0

  // 从 52 周前的周一开始
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (51 * 7 + todayDow))

  const cellSize = 12
  const cellGap = 3
  const labelOffsetX = 30 // 左侧星期标签宽度
  const labelOffsetY = 20 // 顶部月份标签高度

  for (let week = 0; week < 52; week++) {
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + week * 7 + day)

      // 跳过未来日期
      if (currentDate > today) continue

      const key = formatDateKey(currentDate)
      const count = data.get(key) || 0

      cells.push({
        key,
        x: labelOffsetX + week * (cellSize + cellGap),
        y: labelOffsetY + day * (cellSize + cellGap),
        count,
        dateLabel: currentDate.toLocaleDateString('zh-CN', {
          year: 'numeric', month: 'long', day: 'numeric'
        }),
        dayOfWeek: day,
        weekIndex: week,
      })
    }
  }

  return cells
})
```

---

## 7. 字数趋势卡片 (Word Count Trend Card)

### 7.1 数据源

**统计口径**: 过去 30 天，每天所有文章 `rawContent.length` 的累计总和。  
**注意**: 这里统计的是**累计字数**（即该天及之前所有文章的总字数），形成一条递增的面积图。

```typescript
interface TrendDataPoint {
  date: string       // 'MM/DD' 格式
  fullDate: string   // '2026-03-19' 格式
  totalWords: number // 截至该日的累计总字数
}

function buildTrendData(articles: Article[]): TrendDataPoint[] {
  const points: TrendDataPoint[] = []
  const today = new Date()

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    d.setHours(23, 59, 59, 999)

    // 累计截至该日（含该日）创建的所有文章字数
    const totalWords = articles
      .filter(a => new Date(a.createdAt) <= d)
      .reduce((sum, a) => sum + (a.rawContent?.length || 0), 0)

    points.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      fullDate: formatDateKey(d),
      totalWords,
    })
  }

  return points
}
```

### 7.2 UI 规格

**组件名**: `WordCountTrend.vue`  
**文件路径**: `inkforge/src/components/hub/WordCountTrend.vue`

**Props**:
```typescript
interface WordCountTrendProps {
  articles: Article[]
}
```

**SVG 面积图规格**:

- **SVG 尺寸**: `width: 100%`（响应式）, `viewBox: "0 0 400 160"`
- **内边距**: top=20, right=10, bottom=30, left=50
- **绘图区域**: x=[50, 390], y=[20, 130], 即 `width=340, height=110`
- **X 轴**: 30 个数据点，均匀分布
- **Y 轴**: 自适应最大值，分 4 档（0, 25%, 50%, 75%, 100%）

**SVG 路径生成**:

```typescript
const chartPath = computed(() => {
  const data = buildTrendData(props.articles)
  if (data.length === 0) return { line: '', area: '' }

  const maxWords = Math.max(...data.map(d => d.totalWords), 1)
  const xStep = 340 / (data.length - 1)
  const yScale = 110 / maxWords

  const points = data.map((d, i) => ({
    x: 50 + i * xStep,
    y: 130 - d.totalWords * yScale,
  }))

  // 线条路径
  const lineParts = points.map((p, i) =>
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  )
  const line = lineParts.join(' ')

  // 面积路径（闭合到底部）
  const area = `${line} L ${points[points.length - 1].x} 130 L 50 130 Z`

  return { line, area }
})
```

**SVG 渲染**:

```html
<svg viewBox="0 0 400 160" class="trend-svg" preserveAspectRatio="xMidYMid meet">
  <!-- Y 轴网格线 -->
  <line v-for="y in yGridLines" :key="y.value"
    :x1="50" :y1="y.pos" :x2="390" :y2="y.pos"
    stroke="#ECEFF1" stroke-width="1" stroke-dasharray="4 4" />

  <!-- Y 轴标签 -->
  <text v-for="y in yGridLines" :key="'label-'+y.value"
    :x="46" :y="y.pos + 4"
    text-anchor="end" fill="#90A4AE" font-size="9">
    {{ formatNumber(y.value) }}
  </text>

  <!-- 面积填充 -->
  <path :d="chartPath.area"
    fill="#D32F2F" fill-opacity="0.1" />

  <!-- 线条 -->
  <path :d="chartPath.line"
    fill="none" stroke="#D32F2F" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" />

  <!-- X 轴标签（每隔5天显示） -->
  <text v-for="(label, i) in xLabels" :key="'x-'+i"
    :x="label.x" y="148"
    text-anchor="middle" fill="#90A4AE" font-size="9">
    {{ label.text }}
  </text>
</svg>
```

**卡片 CSS**:

```css
.trend-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #ECEFF1;
  border-radius: 16px;
  padding: 24px;
  flex: 1;
}

.trend-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.trend-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #263238;
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend-card__current {
  font-size: 24px;
  font-weight: 700;
  color: #D32F2F;
}

.trend-svg {
  width: 100%;
  height: auto;
}
```

### 7.3 卡片标题区

标题左侧: Lucide `TrendingUp` 图标 + "字数趋势"  
标题右侧: 当前总字数（使用 `formatNumber()`）

---

## 8. 分类分布卡片 (Category Distribution Card)

### 8.1 数据源

```typescript
interface CategorySlice {
  id: string
  name: string
  count: number
  color: string
  percentage: number
}

const CATEGORY_COLORS = [
  '#D32F2F', '#1565C0', '#2E7D32', '#F57C00',
  '#7B1FA2', '#00695C', '#E91E63', '#FF5722',
]

function buildCategoryDistribution(
  categories: Category[],
  articles: Article[]
): CategorySlice[] {
  const total = articles.length
  if (total === 0) return []

  const slices: CategorySlice[] = []

  // 各分类统计
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]
    const count = articles.filter(a => a.categoryId === cat.id).length
    if (count === 0) continue
    slices.push({
      id: cat.id,
      name: cat.name,
      count,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      percentage: Math.round((count / total) * 100),
    })
  }

  // 未分类
  const uncategorized = articles.filter(a => !a.categoryId).length
  if (uncategorized > 0) {
    slices.push({
      id: '__uncategorized',
      name: '未分类',
      count: uncategorized,
      color: '#B0BEC5',
      percentage: Math.round((uncategorized / total) * 100),
    })
  }

  // 按数量降序排列
  slices.sort((a, b) => b.count - a.count)
  return slices
}
```

### 8.2 UI 规格

**组件名**: `CategoryDistribution.vue`  
**文件路径**: `inkforge/src/components/hub/CategoryDistribution.vue`

**Props**:
```typescript
interface CategoryDistributionProps {
  articles: Article[]
  categories: Category[]
}
```

**SVG 环形图 (Donut Chart)**:

- **SVG 尺寸**: `viewBox: "0 0 200 200"`
- **中心**: `(100, 100)`
- **外半径**: 80
- **内半径**: 55（形成环形）
- **间隙**: 每段之间 2px 间隙（通过 `stroke: white; stroke-width: 2` 实现）

**环形图路径计算**:

```typescript
interface ArcPath {
  d: string
  color: string
  name: string
  count: number
  percentage: number
}

const donutArcs = computed((): ArcPath[] => {
  const slices = buildCategoryDistribution(props.categories, props.articles)
  if (slices.length === 0) return []

  const total = slices.reduce((s, sl) => s + sl.count, 0)
  const cx = 100, cy = 100, r = 80
  const innerR = 55

  const arcs: ArcPath[] = []
  let currentAngle = -Math.PI / 2 // 从顶部开始

  for (const slice of slices) {
    const sliceAngle = (slice.count / total) * 2 * Math.PI
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle

    const x1Outer = cx + r * Math.cos(startAngle)
    const y1Outer = cy + r * Math.sin(startAngle)
    const x2Outer = cx + r * Math.cos(endAngle)
    const y2Outer = cy + r * Math.sin(endAngle)

    const x1Inner = cx + innerR * Math.cos(endAngle)
    const y1Inner = cy + innerR * Math.sin(endAngle)
    const x2Inner = cx + innerR * Math.cos(startAngle)
    const y2Inner = cy + innerR * Math.sin(startAngle)

    const largeArc = sliceAngle > Math.PI ? 1 : 0

    const d = [
      `M ${x1Outer} ${y1Outer}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
      `L ${x1Inner} ${y1Inner}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
      'Z',
    ].join(' ')

    arcs.push({
      d,
      color: slice.color,
      name: slice.name,
      count: slice.count,
      percentage: slice.percentage,
    })

    currentAngle = endAngle
  }

  return arcs
})
```

**SVG 渲染**:

```html
<div class="distribution-card__body">
  <div class="distribution-chart">
    <svg viewBox="0 0 200 200" class="donut-svg">
      <path v-for="arc in donutArcs" :key="arc.name"
        :d="arc.d" :fill="arc.color"
        stroke="white" stroke-width="2"
        class="donut-slice">
        <title>{{ arc.name }}：{{ arc.count }} 篇 ({{ arc.percentage }}%)</title>
      </path>
    </svg>
    <!-- 中心文字 -->
    <div class="donut-center">
      <div class="donut-center__count">{{ totalArticles }}</div>
      <div class="donut-center__label">篇文章</div>
    </div>
  </div>
  <!-- 右侧图例 -->
  <div class="distribution-legend">
    <div v-for="slice in categorySlices" :key="slice.id" class="legend-item">
      <div class="legend-dot" :style="{ background: slice.color }"></div>
      <span class="legend-name">{{ slice.name }}</span>
      <span class="legend-count">{{ slice.count }}</span>
      <span class="legend-pct">{{ slice.percentage }}%</span>
    </div>
  </div>
</div>
```

**CSS**:

```css
.distribution-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #ECEFF1;
  border-radius: 16px;
  padding: 24px;
  flex: 1;
}

.distribution-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.distribution-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #263238;
}

.distribution-card__body {
  display: flex;
  align-items: center;
  gap: 24px;
}

.distribution-chart {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}

.donut-svg {
  width: 100%;
  height: 100%;
}

.donut-slice {
  transition: opacity 0.15s ease;
  cursor: default;
}

.donut-slice:hover {
  opacity: 0.8;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.donut-center__count {
  font-size: 28px;
  font-weight: 700;
  color: #263238;
  line-height: 1;
}

.donut-center__label {
  font-size: 11px;
  color: #90A4AE;
  margin-top: 4px;
}

.distribution-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-name {
  color: #263238;
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-count {
  color: #607D8B;
  font-weight: 600;
}

.legend-pct {
  color: #90A4AE;
  min-width: 32px;
  text-align: right;
}
```

### 8.3 卡片标题

标题左侧: Lucide `PieChart` 图标 + "分类分布"

---

## 9. 文章瀑布流 (Article Waterfall Layout)

### 9.1 布局方案

使用 CSS `columns` 实现真实瀑布流。

```css
.waterfall-grid {
  column-count: 3;
  column-gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 响应式 */
@media (min-width: 1441px) {
  .waterfall-grid { column-count: 4; }
}

@media (max-width: 1023px) {
  .waterfall-grid { column-count: 2; }
}

@media (max-width: 767px) {
  .waterfall-grid { column-count: 1; }
}
```

### 9.2 文章卡片规格

**组件名**: `ArticleCard.vue`  
**文件路径**: `inkforge/src/components/hub/ArticleCard.vue`

**Props**:
```typescript
interface ArticleCardProps {
  article: Article
  categoryName: string
  categoryColor: string
  animationIndex: number
}
```

**Emits**:
```typescript
interface ArticleCardEmits {
  (e: 'open', articleId: string): void
}
```

**卡片内容结构**:

```html
<div class="article-card" :style="{ '--i': animationIndex }"
  @click="$emit('open', article.id)">
  <!-- 顶部分类色条 -->
  <div class="article-card__accent" :style="{ background: categoryColor }"></div>

  <!-- 封面图（如有） -->
  <div v-if="coverImage" class="article-card__cover">
    <img :src="coverImage" :alt="article.title" loading="lazy" />
  </div>

  <!-- 标签区 -->
  <div class="article-card__tags">
    <span v-if="article.sourceName" class="article-card__source">
      {{ article.sourceName }}
    </span>
    <span class="article-card__status" :class="statusClass">
      {{ statusLabel }}
    </span>
  </div>

  <!-- 标题 -->
  <h3 class="article-card__title">{{ article.title }}</h3>

  <!-- 内容预览（前200字） -->
  <p class="article-card__excerpt">{{ excerpt }}</p>

  <!-- 底部元信息 -->
  <div class="article-card__meta">
    <span v-if="categoryName" class="article-card__category">
      <Folder :size="12" />
      {{ categoryName }}
    </span>
    <span class="article-card__words">
      <FileText :size="12" />
      {{ wordCount }} 字
    </span>
    <span class="article-card__time">
      <Clock :size="12" />
      {{ relativeTime }}
    </span>
  </div>
</div>
```

**CSS**:

```css
.article-card {
  break-inside: avoid;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #ECEFF1;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(min(var(--i), 10) * 50ms);
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border-color: rgba(211, 47, 47, 0.2);
}

.article-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 16px 16px 0 0;
}

.article-card__cover {
  margin: -20px -20px 16px;
  overflow: hidden;
  border-radius: 16px 16px 0 0;
  max-height: 180px;
}

.article-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.article-card__tags {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.article-card__source {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: #F5F5F5;
  color: #607D8B;
}

.article-card__status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.article-card__status--draft {
  background: #FFF8E1;
  color: #F57C00;
}

.article-card__status--read {
  background: #E3F2FD;
  color: #1565C0;
}

.article-card__status--done {
  background: #E8F5E9;
  color: #2E7D32;
}

.article-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #263238;
  margin: 0 0 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-card__excerpt {
  font-size: 13px;
  color: #607D8B;
  line-height: 1.6;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
  color: #90A4AE;
}

.article-card__meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-card__category {
  font-weight: 600;
  color: #607D8B;
}
```

**内容预览截取**:

```typescript
const excerpt = computed(() => {
  if (props.article.description) return props.article.description.substring(0, 200)
  if (props.article.rawContent) return props.article.rawContent.substring(0, 200)
  return '暂无内容摘要'
})
```

**封面图检测**:

```typescript
const coverImage = computed(() => {
  // 从文章 images 数组中取第一张
  if (props.article.images && props.article.images.length > 0) {
    return props.article.images[0]
  }
  return null
})
```

### 9.3 瀑布流容器组件

**组件名**: `ArticleWaterfall.vue`  
**文件路径**: `inkforge/src/components/hub/ArticleWaterfall.vue`

**Props**:
```typescript
interface ArticleWaterfallProps {
  articles: Article[]
  categories: Category[]
}
```

**Emits**:
```typescript
interface ArticleWaterfallEmits {
  (e: 'open-article', articleId: string): void
}
```

该组件内部封装筛选栏 + 瀑布流 + 空状态，从 HubView 中提取。

---

## 10. 附加增强功能

### 10.1 快速操作浮动按钮 (FAB)

**组件名**: `QuickActionFab.vue`  
**文件路径**: `inkforge/src/components/hub/QuickActionFab.vue`

**Emits**:
```typescript
interface QuickActionFabEmits {
  (e: 'new-article'): void
  (e: 'import-file'): void
  (e: 'from-template'): void
}
```

**定位 CSS**:

```css
.fab-container {
  position: fixed;
  right: 32px;
  bottom: 32px;
  z-index: 40;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
}

.fab-main {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #D32F2F;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(211, 47, 47, 0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fab-main:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 24px rgba(211, 47, 47, 0.4);
}

.fab-main--open {
  transform: rotate(45deg);
  background: #B71C1C;
}

.fab-action {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid #ECEFF1;
  color: #607D8B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fab-action:hover {
  border-color: #D32F2F;
  color: #D32F2F;
  transform: scale(1.08);
}

.fab-action__label {
  position: absolute;
  right: calc(100% + 12px);
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  color: #263238;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  padding: 4px 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  pointer-events: none;
}
```

**展开菜单项**:

| 顺序 | 动作 | Lucide 图标 | 标签文字 | emit 事件 |
|------|------|-------------|---------|-----------|
| 1（最近） | 新建文章 | `FilePlus` | "新建文章" | `new-article` |
| 2 | 导入文件 | `Upload` | "导入文件" | `import-file` |
| 3 | 从模板创建 | `LayoutTemplate` | "从模板创建" | `from-template` |

**展开/收起动画**: 每个 action 按钮使用交错延迟 `animation-delay: calc(var(--i) * 50ms)`。

```css
.fab-action-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: calc(var(--i) * 50ms);
}

.fab-action-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.8);
}

.fab-action-leave-active {
  transition: all 0.15s ease-in;
}

.fab-action-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
```

### 10.2 最近活动时间线

此功能作为 **Section 1 Bento Grid** 中灵感卡片的增强替代方案（可选实现，优先级低于其他功能）。

**数据逻辑**: 从 `articleStore.articles` 中按 `updatedAt` 降序取最近 10 条，生成时间线条目。

```typescript
interface ActivityEntry {
  id: string
  type: 'create' | 'edit'
  articleTitle: string
  articleId: string
  timestamp: Date
  relativeTime: string  // '1小时前', '昨天', etc.
}

const recentActivities = computed((): ActivityEntry[] => {
  return [...articles.value]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime()
                   - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 10)
    .map(a => {
      const isNew = new Date(a.createdAt).getTime() === new Date(a.updatedAt || a.createdAt).getTime()
      return {
        id: a.id,
        type: isNew ? 'create' : 'edit',
        articleTitle: a.title,
        articleId: a.id,
        timestamp: new Date(a.updatedAt || a.createdAt),
        relativeTime: formatRelativeTime(a.updatedAt || a.createdAt),
      }
    })
})
```

### 10.3 键盘快捷键提示

在 Section 1 Header 区域或 FAB 旁边显示快捷键提示。

| 快捷键 | 功能 | 实现方式 |
|--------|------|---------|
| `Ctrl+N` / `Cmd+N` | 新建文章 | `router.push('/workstation')` |
| `Ctrl+F` / `Cmd+F` | 聚焦搜索栏 | `searchInputRef.value?.focus()` |
| `/` | 聚焦搜索栏 | 同上（仅在非输入框聚焦时触发） |

**实现**: 在 HubView 的 `onMounted` 中注册全局键盘监听。

```typescript
function handleGlobalKeydown(e: KeyboardEvent): void {
  const isModKey = e.ctrlKey || e.metaKey

  if (isModKey && e.key === 'n') {
    e.preventDefault()
    startNewProject()
  } else if (isModKey && e.key === 'f') {
    e.preventDefault()
    scrollToSection(3) // Section 4: 文章库
    nextTick(() => searchInputRef.value?.focus())
  } else if (e.key === '/' && !isInputFocused()) {
    e.preventDefault()
    scrollToSection(3)
    nextTick(() => searchInputRef.value?.focus())
  }
}

function isInputFocused(): boolean {
  const active = document.activeElement
  if (!active) return false
  return active.tagName === 'INPUT'
      || active.tagName === 'TEXTAREA'
      || (active as HTMLElement).isContentEditable
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
```

---

## 11. 新增组件清单

| # | 文件路径 | 组件名 | 用途 |
|---|---------|--------|------|
| 1 | `inkforge/src/components/hub/SectionNav.vue` | SectionNav | 右侧分区导航小圆点 |
| 2 | `inkforge/src/components/hub/DayDetailPopover.vue` | DayDetailPopover | 柱状图日期浮窗 |
| 3 | `inkforge/src/components/hub/TemplateMarketCard.vue` | TemplateMarketCard | 模板市场卡片 |
| 4 | `inkforge/src/components/hub/ContributionHeatmap.vue` | ContributionHeatmap | 创作热力图 |
| 5 | `inkforge/src/components/hub/WordCountTrend.vue` | WordCountTrend | 字数趋势面积图 |
| 6 | `inkforge/src/components/hub/CategoryDistribution.vue` | CategoryDistribution | 分类分布环形图 |
| 7 | `inkforge/src/components/hub/ArticleWaterfall.vue` | ArticleWaterfall | 文章瀑布流容器（含筛选栏） |
| 8 | `inkforge/src/components/hub/ArticleCard.vue` | ArticleCard | 单个文章卡片 |
| 9 | `inkforge/src/components/hub/QuickActionFab.vue` | QuickActionFab | 快速操作浮动按钮 |
| 10 | `inkforge/src/components/hub/HubHeader.vue` | HubHeader | Hub 页面 Header（从 HubView 提取） |
| 11 | `inkforge/src/components/hub/StatsDashboard.vue` | StatsDashboard | Bento Grid 统计面板（从 HubView 提取） |
| 12 | `inkforge/src/components/hub/InspirationCard.vue` | InspirationCard | 灵感名言卡片（从 HubView 提取） |
| 13 | `inkforge/src/components/hub/WritingTimeline.vue` | WritingTimeline | 写作活动时间线 |
| 14 | `inkforge/src/components/hub/ProductivityInsights.vue` | ProductivityInsights | 生产力洞察 2x3 指标网格 |
| 15 | `inkforge/src/components/hub/WordDistribution.vue` | WordDistribution | 字数分布柱状图 |
| 16 | `inkforge/src/components/hub/TagCloud.vue` | TagCloud | 标签词云 |
| 17 | `inkforge/src/components/hub/RecentActivity.vue` | RecentActivity | 最近活动日志 |
| 18 | `inkforge/src/components/hub/ExportFrequency.vue` | ExportFrequency | 导出频率分布 |
| 19 | `inkforge/src/components/hub/WritingFlowCard.vue` | WritingFlowCard | 创作流柱状图卡片（修复版，从 HubView 提取） |

**目录结构**:
```
inkforge/src/components/hub/
├── SectionNav.vue
├── HubHeader.vue
├── StatsDashboard.vue
├── WritingFlowCard.vue
├── DayDetailPopover.vue
├── InspirationCard.vue
├── TemplateMarketCard.vue
├── ContributionHeatmap.vue
├── ProductivityInsights.vue
├── WordCountTrend.vue
├── WordDistribution.vue
├── CategoryDistribution.vue
├── WritingTimeline.vue
├── TagCloud.vue
├── RecentActivity.vue
├── ExportFrequency.vue
├── ArticleWaterfall.vue
├── ArticleCard.vue
└── QuickActionFab.vue
```

---

## 12. 修改文件清单

| # | 文件路径 | 修改说明 |
|---|---------|----------|
| 1 | `inkforge/src/views/HubView.vue` | **重构**: 从单文件 Hub 结构演进为 Section Snap Scroll 骨架 + 首屏 Hero 组件群 + 9 张洞察卡的组合。保留核心 computed 属性和 store 引用，将 UI 逻辑下放到子组件 |
| 2 | `inkforge/src/services/export/themes.ts` | **修改**: 将 12 个 `themePresets` 的 `icon` 字段从 Emoji 替换为 Lucide 图标名称字符串（如 `'ScrollText'`, `'Scale'` 等） |
| 3 | `inkforge/src/data/templates.ts` | **修改**: 将 8 个模板的 `icon` 字段从 Emoji 替换为 Lucide 图标名称字符串（如 `'BookOpen'`, `'Scale'`, `'BookMarked'` 等） |
| 4 | `inkforge/src/components/category/AddCategoryModal.vue` | **修改**: L18 `iconOptions` 从 Emoji 数组替换为 Lucide 图标名称数组，图标选择器改为渲染 Lucide 组件 |
| 5 | `inkforge/src/components/category/CategoryPanel.vue` | **修改**: L53 `📚` 替换为 Lucide `Library` 组件，L66 `{{ category.icon || '📁' }}` 替换为动态 Lucide 图标渲染 |
| 6 | `inkforge/src/types/index.ts` | **可选修改**: 如果 `ExportPreset.icon` 类型需要从 `string`（Emoji）明确约束为 Lucide 图标名称，可添加类型注释 |
| 7 | `inkforge/src/data/quotes.ts` | **无修改**: 保持不变，HubView 仍引用 `getDailyQuote()` 和 `formatNumber()` |

---

## 13. 数据流图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Pinia Stores                              │
│                                                                     │
│  articleStore.articles ──────────────────────────────┐              │
│  categoryStore.categories ─────────────────────────┐ │              │
│  assetStore.assets ────────────────────────────┐   │ │              │
│  aiStore (isAvailable, generate) ────────┐     │   │ │              │
│  settingsStore (themePresetId) ───────┐  │     │   │ │              │
└────────────────────────────────────┬──┬──┬─────┬───┬─┤              │
                                     │  │  │     │   │ │              │
                                     │  │  │     │   │ │              │
                           ┌─────────▼──▼──▼─────▼───▼─▼──────────┐  │
                           │         HubView.vue                   │  │
                           │  (Section Snap Scroll 骨架)           │  │
                           │                                       │  │
                           │  Computed:                             │  │
                           │  - stats (articles -> 统计)           │  │
                           │  - weeklyChartData (articles -> 7天)  │  │
                           │  - displayArticles (filter+sort)      │  │
                           │  - activeSectionIndex (scroll)        │  │
                           └──┬──┬──┬──┬──┬──┬──┬──┬──┬───────────┘  │
                              │  │  │  │  │  │  │  │  │               │
                 ┌────────────┘  │  │  │  │  │  │  │  └──────┐       │
                 │               │  │  │  │  │  │  │         │       │
                 ▼               ▼  │  ▼  │  ▼  │  ▼         ▼       │
         ┌──────────┐  ┌─────────┐ │ ┌──┐ │ ┌──┐ │ ┌──┐  ┌──────┐  │
         │HubHeader │  │Stats    │ │ │WF│ │ │TM│ │ │CH│  │Section│  │
         │          │  │Dashboard│ │ │  │ │ │  │ │ │  │  │Nav   │  │
         └──────────┘  └─────────┘ │ └──┘ │ └──┘ │ └──┘  └──────┘  │
                                   │      │      │                   │
                    ┌──────────────┘      │      │                   │
                    │  ┌──────────────────┘      │                   │
                    ▼  ▼                         ▼                   │
              ┌──────────┐              ┌──────────────┐             │
              │Writing   │              │Contribution  │             │
              │FlowCard  │              │Heatmap       │             │
              │          │              │              │             │
              │articles──┤              │articles──────┤             │
              └─────┬────┘              └──────────────┘             │
                    │                                                │
                    ▼                                                │
              ┌──────────┐                                           │
              │DayDetail │                                           │
              │Popover   │                                           │
              └──────────┘                                           │
                                                                     │
   ┌───────────────────────┐   ┌──────────────┐   ┌───────────────┐ │
   │ArticleWaterfall       │   │WordCount     │   │Category       │ │
   │                       │   │Trend         │   │Distribution   │ │
   │ displayArticles ──────│   │ articles ────│   │ articles +    │ │
   │ categories            │   └──────────────┘   │ categories ───│ │
   │                       │                      └───────────────┘ │
   │ ┌───────────────────┐ │                                        │
   │ │ ArticleCard * N   │ │                                        │
   │ └───────────────────┘ │                                        │
   └───────────────────────┘                                        │
                                                                     │
   ┌───────────────────────┐   ┌──────────────┐                     │
   │TemplateMarketCard     │   │Inspiration   │                     │
   │                       │   │Card          │                     │
   │ themePresets (import) │   │ aiStore ─────│                     │
   │ settingsStore ────────│   │ quotes.ts ───│                     │
   └───────────────────────┘   └──────────────┘                     │
                                                                     │
   ┌───────────────────────┐                                        │
   │QuickActionFab         │── emits: new-article, import, template │
   └───────────────────────┘                                        │
                                                                     │
   ┌───────────────────────┐                                        │
   │AddCategoryModal       │── categoryStore.addCategory()          │
   └───────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘

数据流向说明：
  Store → HubView (computed) → 子组件 (props)
  子组件 (emits) → HubView (方法) → Store (actions) / Router (push)
```

**关键数据流路径**:

1. **文章统计路径**: `articleStore.articles` -> HubView `stats` computed -> `StatsDashboard` props
2. **柱状图路径**: `articleStore.articles` -> HubView `weeklyChartData` computed -> `WritingFlowCard` props -> bar click -> `DayDetailPopover` props
3. **热力图路径**: `articleStore.articles` -> `ContributionHeatmap` props -> 内部 `buildHeatmapData()` -> SVG 渲染
4. **趋势图路径**: `articleStore.articles` -> `WordCountTrend` props -> 内部 `buildTrendData()` -> SVG path 计算
5. **分类分布路径**: `articleStore.articles` + `categoryStore.categories` -> `CategoryDistribution` props -> 内部 `buildCategoryDistribution()` -> SVG donut 计算
6. **模板市场路径**: `themes.ts` 静态 import `themePresets` -> `TemplateMarketCard` props -> select/apply emits -> HubView -> `settingsStore`
7. **瀑布流路径**: `articleStore.articles` -> HubView `displayArticles` computed (filter + sort) -> `ArticleWaterfall` props -> `ArticleCard` * N -> click emit -> `router.push('/workstation?id=xxx')`
8. **灵感路径**: `quotes.ts` `getDailyQuote()` + `aiStore.generate()` -> `InspirationCard` props

---

**文档结束。此 Spec 为 Hub 首页重设计的完整实现依据，开发者应严格按照本文档中的组件接口定义、CSS 属性值、数据流描述进行实现，不允许偏离。**
