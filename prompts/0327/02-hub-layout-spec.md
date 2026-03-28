# 02 -- Hub 首页布局修复规范

> 优先级: P0
> 影响文件: HubView.vue, hub/ 组件目录, InspirationCard.vue
> 核心目标: 将创作流图表回归首屏 Hero 卡片，合并冗余入口，重设计 InspirationCard，修复布局冲突，重编排第二屏
> 原型参考: `prototype/inkforge_hub.html`

---

## 一、问题描述

1. **创作流图表被移到了第二屏 (Section 2)**，而原型设计中创作流图表是首屏 Hero 卡片 (2x2) 的核心内容，应当作为用户打开 Hub 后看到的第一个视觉焦点
2. **HeroCard 品牌展示占据过多空间且无实用价值**，当前 Hero 卡片显示 "Ethereal Constructivism" 标签和品牌标语，对创作者无直接价值，应替换为原型中的创作流图表。原 HeroCard 中的统计数字 (篇作品 / 累计字数 / 活跃分类) 应分散到 StatsDashboard 中
3. **card-new (立即开写) 按钮冗余**，首屏已有 HubHeader 的新建按钮、QuickActionFab 浮动按钮、Ctrl+N 快捷键，card-new 是第四个重复入口。将"从模板创建"和"空白草稿"按钮合并到 card-recent 底部，然后删除 card-new，recent 扩展为 1x2
4. **每日名言卡片 (InspirationCard) 设计缺乏灵气**，当前使用红色径向渐变 + 半透明白色背景 + 纹理叠加，视觉上过于复杂。需改为极简左边框风格: 白色背景 + 3px #D32F2F 左边框 + 衬线大字引言
5. **显示溢出/截断问题**，当前 grid-template-rows 使用 `repeat(3, minmax(0, 1fr))` + 固定 `height: calc(100vh - 160px)`，在小屏幕上导致卡片内容被裁切
6. **第二屏 WritingFlowCard 已在首屏呈现**，需要重新编排第二屏内容

## 二、现有布局结构分析

### 当前 HubView.vue Section 结构:

```
Section 0 (首屏): Bento Grid
  |- card-hero (2x2) -- 品牌大卡 + 统计数字 + "新建草稿"/"浏览文章库" 按钮
  |- card-stats (1x2) -- StatsDashboard (今日总览, 文章/字数/完成率/素材 + streak)
  |- card-new (1x1) -- "立即开写" (空白草稿 + 从模板创建)
  |- card-recent (1x1) -- 最近编辑 (标题 + 日期 + 跳转按钮)
  |- card-categories (2x1) -- 分类结构 (最多 3 个分类卡 + 添加分类按钮)
  +- card-inspiration (2x1) -- 每日名言 (InspirationCard 组件)

Section 1 (第二屏): 创作工具区
  |- WritingFlowCard -- 创作流周频分布 (红色渐变背景 + 7 根柱状图 + DayDetailPopover)
  +- TemplateMarketCard -- 主题预设 (导出预设卡片网格)

Section 2 (第三屏): 数据洞察区
  |- ContributionHeatmap -- 贡献热力图
  |- WordCountTrend -- 字数趋势
  +- CategoryDistribution -- 分类分布

Section 3 (第四屏): ArticleWaterfall -- 文章瀑布流
```

### 当前 Bento Grid CSS (HubView.vue line 664-681):

```css
.bento-container {
  width: min(1400px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  grid-template-areas: "hero hero stats new" "hero hero stats recent" "cats cats insp insp";
  gap: 20px;
  height: calc(100vh - 160px);
}

.card-hero { grid-area: hero; }
.card-stats { grid-area: stats; }
.card-new { grid-area: new; }
.card-recent { grid-area: recent; }
.card-categories { grid-area: cats; }
.card-inspiration { grid-area: insp; }
```

### 当前 card-hero 内容 (HubView.vue line 375-410):

- `span.inline-flex` -- "Ethereal Constructivism" 标签 (全大写, 白色/10 背景)
- `h2` -- 品牌标语 "把草稿、素材和灵感压缩进一个可持续滚动的写作首页。"
- `p` -- 当前预设名称说明
- `div.grid.md:grid-cols-3` -- 三个统计迷你卡 (篇作品 / 累计字数 / 活跃分类)
- `div.flex.gap-3` -- 两个按钮: "新建草稿" (白底红字) + "浏览文章库" (透明白边)

### 当前 card-new 内容 (HubView.vue line 417-443):

- "Start" 标签 + "立即开写" 标题
- "空白草稿" 按钮 (调用 `handleNewArticle`)
- "从模板创建" 按钮 (调用 `handleCreateFromTemplate`)

### 当前 card-recent 内容 (HubView.vue line 445-467):

- "Latest" 标签 + "最近编辑" 标题
- 最近编辑文章按钮 (标题 + 日期, 点击调用 `openArticle`)
- 空状态: "尚无最近编辑记录"

## 三、目标布局设计

### 3.1 首屏 Bento Grid 重新设计

**核心改动**:
1. card-hero (2x2) 替换为创作流图表 (参照原型 `inkforge_hub.html` line 246-344 的 `.card-hero`)
2. 删除 card-new (1x1)，将"从模板创建"和"空白草稿"按钮合并到 card-recent 底部
3. card-recent 扩展为 1x2 (原来 card-new + card-recent 合并)
4. InspirationCard 改为极简左边框风格
5. 原 HeroCard 中的统计数字 (篇作品 / 累计字数 / 活跃分类) 分散到 StatsDashboard 中展示

**新的 Grid 布局**:

```css
.bento-container {
  width: min(1400px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  grid-template-areas:
    "hero hero stats recent"
    "hero hero stats recent"
    "cats cats insp insp";
  gap: 20px;
  height: calc(100vh - 160px);
}

.card-hero { grid-area: hero; }
.card-stats { grid-area: stats; }
.card-recent { grid-area: recent; }
.card-categories { grid-area: cats; }
.card-inspiration { grid-area: insp; }
```

注意: `card-new` 区域已删除，`recent` 从 1x1 扩展为 1x2。

| Grid Area | 尺寸 | 组件 | 说明 |
|---|---|---|---|
| hero (2x2) | 列1-2, 行1-2 | 创作流图表 (内嵌) | 红色渐变背景 + "创作流" 标题 + 周频柱状图 + DayDetailPopover |
| stats (1x2) | 列3, 行1-2 | StatsDashboard | 保留现有设计，垂直排列统计数字 + streak。新增: 篇作品 / 累计字数 / 活跃分类 (从原 HeroCard 迁入) |
| recent (1x2) | 列4, 行1-2 | 继续创作 + 快速创建 | 上半: 最近编辑文章; 下半: "从模板创建" + "空白草稿" 两个小按钮 (合并自 card-new) |
| cats (2x1) | 列1-2, 行3 | 分类结构 | 保留现有设计 |
| insp (2x1) | 列3-4, 行3 | InspirationCard | 极简左边框风格 |

### 3.2 入口精简

**删除**:
- `card-new` 整个卡片 (HTML 块 + grid area CSS)
- `card-hero` 中的 "新建草稿" 按钮
- `card-hero` 中的 "浏览文章库" 按钮
- `card-hero` 中的品牌标语和 "Ethereal Constructivism" 标签
- `card-hero` 中的三个统计迷你卡 (迁入 StatsDashboard)

**合并到 card-recent 底部**:
- "从模板创建" 按钮 (来自原 card-new)
- "空白草稿" 按钮 (来自原 card-new)

**保留的创建入口** (仅 3 个):
1. **card-recent** -- 继续编辑最近文章 + 底部快速创建按钮
2. **QuickActionFab** (右下角浮动按钮) -- 新建/导入/模板
3. **HubHeader "新建" 按钮 + Ctrl+N 快捷键** -- 全局新建

### 3.3 StatsDashboard 扩展

原 HeroCard 中的三个统计数字迁入 StatsDashboard:
- **篇作品**: 从 `articleStore.articles.length` 读取 (原 HeroCard 展示)
- **累计字数**: 从 `articleStore.articles` 累加 `rawContent.length` 读取 (原 HeroCard 展示)
- **活跃分类**: 从 `categoryStore.categories.length` 读取 (原 HeroCard 展示)

这些指标与 StatsDashboard 已有的 "今日总览" 和 "streak" 合并展示，StatsDashboard 保持 1x2 尺寸不变。具体集成方式由 StatsDashboard 组件自行处理 -- 可在现有 stat-item 列表中追加，或新增底部汇总行。

## 四、Hero 卡片 = 创作流图表

### 4.1 视觉设计 (参照原型 inkforge_hub.html line 246-344)

```css
.card-hero {
  grid-area: hero;
  background: linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%);
  border: none;
  color: white;
  border-radius: 24px;
  padding: 32px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(211, 47, 47, 0.18);
}

/* 装饰性光晕 (原型 line 255-264) */
.card-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}
```

### 4.2 内容结构

```
+-----------------------------------------------+
| [Activity icon, 48x48, 右上角, opacity: 0.15]  |
|                                                 |
| 创作流                                          |
| 本周产出 N 篇                                   |
|                                                 |
| +--+ +--+ +--+ +----+ +--+ +---+ +--+         |
| |  | |  | |  | |    | |  | |   | |  |         |
| |  | |##| |  | |    | |##| |###| |  |         |
| |##| |##| |  | |    | |##| |###| |##|         |
| +--+ +--+ +--+ +----+ +--+ +---+ +--+         |
| 周一 周二  周三  周四  周五  周六  周日           |
+-----------------------------------------------+
```

**关键设计点**:
- 标题使用 `'Noto Serif SC', serif`，font-size: 28px，font-weight: 700
- 副标题 "本周产出 N 篇"，font-size: 14px，opacity: 0.8
- 右上角大号 Activity 图标 (lucide `Activity`)，48x48，opacity: 0.15，absolute 定位
- 柱状图区域使用 flex: 1 填充剩余空间
- 柱状图样式复用现有 WritingFlowCard 的 `.chart-bar` 逻辑 (白色半透明背景, hover 变实白, active 带 box-shadow)
- 柱状图下方星期标签: font-size: 10px, uppercase, letter-spacing: 0.5px, opacity: 0.6
- 每根柱子悬浮显示 tooltip "N 篇"
- 点击柱子触发 DayDetailPopover (复用现有 WritingFlowCard 的 `handleBarSelect` + `DayDetailPopover` 逻辑)
- 柱状图最小高度: 12px (count 为 0 时也有视觉存在)
- 柱状图最大宽度: 48px (宽屏时不会过度展开)

### 4.3 数据来源

直接复用现有 HubView.vue 中的计算属性:
- `weeklyChartData` -- 7 天柱状图数据
- `weeklyTotal` -- 本周总产出
- `todayIndex` -- 今天星期几 (0=周一, 6=周日)
- `selectedDayIndex` -- 当前选中的日
- `selectedDayArticles` -- 选中日的文章列表
- `selectedDayTitle` -- 选中日的标题
- `popoverAnchorRect` -- Popover 锚点位置

不再将这些 props 传递给独立的 WritingFlowCard 组件，而是直接在 HubView.vue 的 card-hero template 中使用。WritingFlowCard 组件不再在首屏出现。

### 4.4 实现方式: 内嵌到 HubView.vue

**不使用独立组件的原因**: Hero 卡片的创作流图表是首屏的核心视觉元素，与 HubView.vue 的数据流紧密耦合 (selectedDayIndex, popoverAnchorRect 等)。内嵌可以避免 props 透传层级过深的问题。

**Template 修改**: 将 `card-hero` 的 `<article>` 内容替换为:

```html
<article class="card-hero">
  <!-- 右上角装饰图标 -->
  <Activity :size="48" class="card-hero__bg-icon" />

  <!-- 标题区 -->
  <h2 class="card-hero__title">创作流</h2>
  <p class="card-hero__subtitle">本周产出 {{ weeklyTotal }} 篇</p>

  <!-- 柱状图区域 -->
  <div class="card-hero__chart">
    <div
      v-for="(count, index) in weeklyChartData"
      :key="`hero-bar-${index}`"
      class="card-hero__bar-wrapper"
    >
      <button
        type="button"
        class="card-hero__bar"
        :class="{
          'is-today': index === todayIndex,
          'is-selected': index === selectedDayIndex,
        }"
        :style="{ height: getHeroBarHeight(count) }"
        :title="`${weekDayLabels[index]}: ${count} 篇`"
        @click="handleBarSelect(index, $event)"
      >
        <span class="card-hero__tooltip">{{ count }} 篇</span>
      </button>
    </div>
  </div>

  <!-- 星期标签 -->
  <div class="card-hero__labels">
    <span v-for="label in weekDayLabels" :key="label">{{ label }}</span>
  </div>

  <!-- DayDetailPopover (Teleport) -->
  <DayDetailPopover
    :visible="selectedDayIndex !== null"
    :date-title="selectedDayTitle"
    :articles="selectedDayArticles"
    :anchor-rect="popoverAnchorRect"
    @close="closeDayPopover"
    @open-article="openArticle"
  />
</article>
```

**Script 修改**: 添加 `Activity` 图标导入 (from lucide-vue-next)，添加 `getHeroBarHeight` 函数:

```typescript
import { Activity, Clock3, FilePlus2, LayoutTemplate, MoveRight } from 'lucide-vue-next'

const weekDayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function getHeroBarHeight(count: number): string {
  const maxCount = Math.max(...weeklyChartData.value, 1)
  const minHeight = 8
  const percentage = (count / maxCount) * 100
  return `${Math.max(percentage, minHeight)}%`
}
```

### 4.5 Hero 卡片完整 CSS

```css
.card-hero {
  grid-area: hero;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 32px;
  border-radius: 24px;
  overflow: hidden;
  color: white;
  background: linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%);
  border: none;
  box-shadow: 0 24px 48px rgba(211, 47, 47, 0.18);
}

.card-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.card-hero__bg-icon {
  position: absolute;
  top: 32px;
  right: 32px;
  opacity: 0.15;
}

.card-hero__title {
  margin: 0;
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 700;
}

.card-hero__subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  opacity: 0.8;
}

.card-hero__chart {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  min-height: 0;
}

.card-hero__bar-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 100%;
}

.card-hero__bar {
  width: 100%;
  max-width: 48px;
  min-height: 12px;
  border: none;
  padding: 0;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  position: relative;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-hero__bar:hover {
  background: rgba(255, 255, 255, 0.95);
}

.card-hero__bar.is-today {
  background: white;
  box-shadow: 0 -4px 20px rgba(255, 255, 255, 0.4);
}

.card-hero__bar.is-selected {
  background: rgba(255, 255, 255, 0.88);
  transform: translateY(-4px);
}

.card-hero__tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  background: #263238;
  color: white;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.card-hero__bar:hover .card-hero__tooltip {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.card-hero__labels {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}
```

## 五、card-recent 合并设计

### 5.1 新的 card-recent 结构

card-recent 扩展为 1x2 (占据原来 card-new + card-recent 的空间)。上半部分显示最近编辑的文章，下半部分放置合并自 card-new 的快速创建按钮。

```
+-----------------------------+
| [Clock3 icon] 最近编辑       |
|                              |
| 2024 AI 趋势报告.md          |
| 2026年3月27日                |
|                              |
| [草稿]          [-> 打开]    |
|------------------------------|
| [LayoutTemplate] 从模板创建   |
| [FilePlus2] 空白草稿          |
+-----------------------------+
```

### 5.2 Template 修改

将现有 `card-recent` 的 `<article>` 替换为:

```html
<article class="card-recent rounded-[20px] border border-slate-200 bg-white/90 p-6 backdrop-blur-xl">
  <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
    Latest
  </p>
  <h3 class="mt-2 text-lg font-bold text-slate-800">
    最近编辑
  </h3>

  <!-- 最近编辑文章 -->
  <button
    v-if="latestArticle"
    type="button"
    class="mt-4 flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left"
    @click="openArticle(latestArticle.id)"
  >
    <span class="text-base font-bold leading-7 text-slate-800">{{ latestArticle.title }}</span>
    <span class="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
      <Clock3 :size="14" />
      {{ new Date(latestArticle.updatedAt || latestArticle.createdAt).toLocaleDateString('zh-CN') }}
    </span>
  </button>
  <div
    v-else
    class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400"
  >
    尚无最近编辑记录
  </div>

  <!-- 分隔线 -->
  <div class="my-4 h-px bg-slate-100" />

  <!-- 快速创建按钮 (合并自 card-new) -->
  <div class="space-y-3">
    <button
      type="button"
      class="flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:border-red-200 hover:text-red-700"
      @click="handleCreateFromTemplate"
    >
      <LayoutTemplate :size="16" />从模板创建
    </button>
    <button
      type="button"
      class="flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:border-red-200 hover:text-red-700"
      @click="handleNewArticle"
    >
      <FilePlus2 :size="16" />空白草稿
    </button>
  </div>
</article>
```

### 5.3 删除 card-new

从 HubView.vue template 中完全删除以下块 (line 417-443):

```html
<!-- 删除整个 card-new article -->
<article class="card-new ...">
  ...
</article>
```

从 CSS 中删除:
```css
.card-new { grid-area: new; }
```

## 六、InspirationCard 极简左边框风

### 6.1 设计理念

放弃当前的径向渐变 + 纹理叠加设计。改为:
- **纯白背景**: `#FFFFFF`
- **红色左边框**: `3px solid #D32F2F`
- **大字号衬线引言**: `'Noto Serif SC', serif`, 18px, line-height: 1.75
- **作者底部细线分隔**: 1px solid #ECEFF1 上方的作者署名

**不需要**: 渐变、装饰性引号 SVG、毛玻璃效果、纹理层。

### 6.2 新的 InspirationCard.vue 样式

保留现有的 Props 和 Emits 接口不变:
```typescript
defineProps<{
  quote: string
  author: string
  loading: boolean
  aiAvailable: boolean
  sourceLabel: string
}>()

defineEmits<{
  (e: 'refresh'): void
  (e: 'configure'): void
}>()
```

**新 Template**:

```html
<section class="inspiration-card">
  <div class="inspiration-card__header">
    <span class="inspiration-card__label">每日灵感</span>
    <button
      v-if="props.aiAvailable"
      type="button"
      class="inspiration-card__action"
      :class="{ 'is-spinning': props.loading }"
      :disabled="props.loading"
      title="生成新灵感"
      @click="emit('refresh')"
    >
      <RefreshCw :size="14" />
    </button>
    <button
      v-else
      type="button"
      class="inspiration-card__action"
      title="配置 AI"
      @click="emit('configure')"
    >
      <Settings2 :size="14" />
    </button>
  </div>

  <div class="inspiration-card__body">
    <p
      v-if="props.loading"
      class="inspiration-card__loading"
    >
      AI 正在为你生成新的灵感片段...
    </p>
    <template v-else>
      <p class="inspiration-card__quote">
        "{{ props.quote }}"
      </p>
      <div class="inspiration-card__divider" />
      <p class="inspiration-card__author">
        {{ props.author }}
      </p>
    </template>
  </div>

  <span class="inspiration-card__source">{{ props.sourceLabel }}</span>
</section>
```

**新 CSS**:

```css
.inspiration-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px 24px 24px 28px;
  border-radius: 20px;
  overflow: hidden;
  background: #FFFFFF;
  border: 1px solid #ECEFF1;
  border-left: 3px solid #D32F2F;
}

.inspiration-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.inspiration-card__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #D32F2F;
}

.inspiration-card__action {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(96, 125, 139, 0.16);
  background: transparent;
  color: #607D8B;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.inspiration-card__action:hover:not(:disabled) {
  color: #D32F2F;
  border-color: rgba(211, 47, 47, 0.28);
}

.inspiration-card__action.is-spinning :deep(svg) {
  animation: inspiration-spin 0.9s linear infinite;
}

.inspiration-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  margin-top: 18px;
}

.inspiration-card__quote {
  margin: 0;
  font-family: 'Noto Serif SC', serif;
  font-size: 18px;
  line-height: 1.75;
  color: #37474F;
}

.inspiration-card__divider {
  width: 100%;
  height: 1px;
  background: #ECEFF1;
  margin: 12px 0;
}

.inspiration-card__author {
  margin: 0;
  font-size: 13px;
  color: #90A4AE;
}

.inspiration-card__loading {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #607D8B;
}

.inspiration-card__source {
  margin-top: auto;
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(38, 50, 56, 0.06);
  color: #607D8B;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

@keyframes inspiration-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

## 七、第二屏 (创作工具区) 重新编排

由于 WritingFlowCard 的创作流图表已移入首屏 Hero 卡片，第二屏的内容需要重新规划。WritingFlowCard 不再在第二屏重复出现，改为 TemplateMarketCard (主) + 快速操作卡片 (副)。

### 7.1 新的 Section 1 内容

```
Section 1 (第二屏): 创作工具区
  |- TemplateMarketCard (主, 1.15fr 宽度) -- 主题预设卡片网格 (保留现有实现)
  +- QuickActionsCard (副, 0.85fr 宽度) -- 快速操作合集
```

### 7.2 QuickActionsCard 设计

QuickActionsCard 是一个新的轻量卡片，聚合工作台常用操作:

```
+-------------------------------+
| [Zap icon] 快速操作            |
|                                |
| [FileText] 导入 Markdown 文件  |
| [Download] 导出当前文章        |
| [FolderPlus] 创建新分类        |
| [Image] 上传素材               |
|                                |
| 提示: 按 Ctrl+K 打开命令面板   |
+-------------------------------+
```

**Props**: 无 (直接从 stores 和 router 调用操作)

**视觉设计**:
- 与普通 bento-card 一致: 白色毛玻璃背景, 圆角 20px, 边框 1px solid rgba(0,0,0,0.06)
- 每个操作按钮: flex 行, 左侧 lucide 图标 + 文字, 圆角 16px, hover 时轻微上浮 + 红色边框
- 底部提示文字: font-size: 12px, color: #90A4AE

**实现方式**: 内嵌到 HubView.vue Section 1 中，或创建独立 `components/hub/QuickActionsCard.vue` 组件。

### 7.3 Section 1 Template

```html
<section
  :ref="(element) => setSectionRef(element, 1)"
  class="hub-section"
>
  <div class="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
        Section 2
      </p>
      <h2 class="mt-2 text-4xl font-bold text-slate-800">
        创作工具区
      </h2>
    </div>

    <div class="grid gap-5" style="grid-template-columns: 1.15fr 0.85fr;">
      <TemplateMarketCard />
      <QuickActionsCard />
    </div>
  </div>
</section>
```

### 7.4 WritingFlowCard 组件保留但不在首页使用

WritingFlowCard 组件文件保留不删除 (其他视图可能复用)，但从 HubView.vue 的 Section 1 中移除导入和引用。首屏 Hero 卡片已内嵌了创作流图表，不再需要独立的完整版。

## 八、响应式布局

### 8.1 桌面端 (1024px+)

使用上述 4 列 Grid 布局:

```css
grid-template-columns: repeat(4, minmax(0, 1fr));
grid-template-rows: repeat(3, minmax(0, 1fr));
grid-template-areas:
  "hero hero stats recent"
  "hero hero stats recent"
  "cats cats insp insp";
```

### 8.2 平板端 (768px - 1024px)

```css
@media (max-width: 1023px) {
  .bento-container {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: auto;
    grid-template-areas:
      "hero hero"
      "stats recent"
      "cats insp";
    height: auto;
  }

  .card-hero {
    min-height: 320px;
  }
}
```

### 8.3 手机端 (< 768px)

```css
@media (max-width: 767px) {
  .bento-container {
    grid-template-columns: 1fr;
    grid-template-areas:
      "hero"
      "recent"
      "stats"
      "cats"
      "insp";
    height: auto;
  }

  .card-hero {
    min-height: 360px;
  }

  .card-recent {
    min-height: auto;
  }
}
```

注意:
- 手机端 `hero` 卡片需要 min-height: 360px 以确保柱状图可读
- 平板端 `hero` 卡片需要 min-height: 320px
- 平板端和手机端都改为 `height: auto` 避免内容裁切

## 九、具体代码修改指引

### 9.1 HubView.vue Script 修改

1. **添加导入**: `Activity`, `Clock3`, `FilePlus2`, `LayoutTemplate` 图标 (from lucide-vue-next)，`DayDetailPopover` 组件
2. **添加常量**: `weekDayLabels` 数组
3. **添加函数**: `getHeroBarHeight(count: number): string`
4. **移除导入**: `WritingFlowCard` (如果第二屏不再使用)
5. **添加导入**: `QuickActionsCard` (新组件，如果使用独立组件方式)

### 9.2 HubView.vue Template 修改

1. **替换** card-hero 的 `<article>` 内容 (line 375-410) -- 替换为创作流图表 (见第四节 Template)
2. **删除** card-new 的 `<article>` 块 (line 417-443)
3. **替换** card-recent 的 `<article>` 内容 (line 445-467) -- 合并快速创建按钮 (见第五节 Template)
4. **添加** DayDetailPopover 到 card-hero 中 (或使用 Teleport 确保 z-index 正确)
5. **修改** Section 1 (第二屏) -- 替换为 TemplateMarketCard + QuickActionsCard

### 9.3 HubView.vue CSS 修改

1. **删除** `.card-new { grid-area: new; }`
2. **修改** grid-template-areas: 删除 `new`，`recent` 扩展到行1-2
3. **添加** `.card-hero__*` 系列样式 (见第四节 CSS)
4. **更新** 响应式断点的 grid-template-areas (见第八节)
5. **删除** 原 card-hero 的品牌相关样式

### 9.4 InspirationCard.vue 修改

1. **替换** 整个 `<template>` 块 (见第六节)
2. **替换** 整个 `<style>` 块 (见第六节 CSS)
3. **保留** `<script setup>` 不变 (props 和 emits 接口不变)

### 9.5 StatsDashboard.vue 扩展

将原 HeroCard 中的统计数字 (篇作品 / 累计字数 / 活跃分类) 集成到 StatsDashboard。StatsDashboard 组件可能需要:
1. 新增 props 接收这些统计数值，或直接在组件内部读取 store
2. 在现有 stat-item 列表末尾追加三个统计行

### 9.6 QuickActionsCard 新建 (可选)

如果使用独立组件方式:
- 创建 `components/hub/QuickActionsCard.vue`
- 使用 lucide 图标 (`FileText`, `Download`, `FolderPlus`, `Image`, `Zap`)
- 每个操作按钮绑定到对应 store action 或 router push

## 十、文件清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | `views/HubView.vue` | Grid 布局重排: 删除 card-new, card-hero 替换为创作流图表, card-recent 扩展为 1x2 并合并快速创建按钮, 更新响应式断点, 第二屏改为 TemplateMarketCard + QuickActionsCard |
| 修改 | `components/hub/InspirationCard.vue` | 重新设计: 极简左边框风格 (白底 + 3px 红色左边框 + 衬线引言) |
| 修改 | `components/hub/StatsDashboard.vue` | 扩展: 集成原 HeroCard 中的统计数字 (篇作品/累计字数/活跃分类) |
| 新增 | `components/hub/QuickActionsCard.vue` | 快速操作合集 (导入/导出/新建分类/上传素材) |
| 保留 | `components/hub/WritingFlowCard.vue` | 文件保留但从 HubView 首页移除使用 |
| 保留 | `components/hub/DayDetailPopover.vue` | Hero 卡片内嵌使用 |
| 保留 | `components/hub/TemplateMarketCard.vue` | 第二屏主卡片 |

## 十一、验收标准

- [ ] 首屏 Hero 卡片 (2x2) 显示创作流图表: 红色渐变背景 `linear-gradient(135deg, #D32F2F, #B71C1C)` + 周频柱状图 + "创作流" 标题
- [ ] Hero 柱状图支持 hover 显示 tooltip + click 弹出 DayDetailPopover
- [ ] 不存在独立的 card-new 卡片
- [ ] card-recent (1x2) 包含最近编辑文章 + 底部"从模板创建"和"空白草稿"两个小按钮
- [ ] 原 HeroCard 的统计数字 (篇作品/累计字数/活跃分类) 已迁入 StatsDashboard
- [ ] InspirationCard 使用极简左边框风格: 白色背景, 3px #D32F2F 左边框, Noto Serif SC 18px 衬线大字引言, 作者底部细线分隔
- [ ] InspirationCard 无渐变、无装饰性引号 SVG、无毛玻璃效果
- [ ] 首页入口精简为 3 个: card-recent / QuickActionFab / HubHeader+Ctrl+N
- [ ] 第二屏内容为 TemplateMarketCard (主) + QuickActionsCard (副)，不再包含 WritingFlowCard
- [ ] 桌面 (4列) / 平板 (2列) / 手机 (1列) 三端 Bento Grid 布局正确，无元素溢出或截断
- [ ] Grid areas: `"hero hero stats recent" / "hero hero stats recent" / "cats cats insp insp"`
- [ ] 所有数据来自真实 Store (非 Mock)
- [ ] 所有图标使用 lucide-vue-next (无 Emoji)
- [ ] DayDetailPopover 在 Hero 卡片中正确工作
