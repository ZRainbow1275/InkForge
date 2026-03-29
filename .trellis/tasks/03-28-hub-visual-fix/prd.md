# Hub 首页视觉修正

## 规格参考
- `prompts/0327/02-hub-layout-spec.md` (完整规格)
- `prompts/0327/09-ui-polish-spec.md` (溢出修复)

## Goal
按照 spec-02 将 Hub 首屏 Bento Grid 的视觉传达从"品牌展示"改为"数据驱动的创作流"。

## Requirements

### 1. Hero 卡片 (card-hero 2x2) 替换为纯创作流图表
- **删除**: 品牌标语 "把本周的创作流直接铺在首页。"
- **删除**: 描述段落 "最近 7 天累计..."
- **删除**: "继续创作" 按钮
- **删除**: "浏览文章库" 按钮
- **删除**: "WRITING FLOW" 标签
- **保留**: 红色渐变背景 (from-red-700 to-red-800)
- **内容替换为**:
  - 右上角 Activity 图标 (48x48, opacity 0.15)
  - 标题 "创作流" (Noto Serif SC, 28px, 700)
  - 副标题 "本周产出 N 篇" (14px, opacity 0.8)
  - 柱状图 (复用 weeklyChartData, 白色半透明柱子, flex:1 填满)
  - 星期标签 (10px, opacity 0.6)
  - DayDetailPopover (复用现有逻辑)
- **不再使用 WritingFlowCard 子组件**，直接内嵌到 HubView template

### 2. InspirationCard 极简重设计
- **删除**: 现有的 rgba 背景 + border + backdrop-blur
- **新样式**:
  - 白色背景 (bg-white)
  - 3px 左边框 (#D32F2F)
  - 圆角 rounded-[20px]
  - 引言文字: Noto Serif SC, 20px, slate-800, line-clamp-3
  - 作者: 14px, slate-500
  - 标题 "每日灵感" + AI刷新按钮保留在顶部
  - 来源标签保留在底部

### 3. 入口精简
- Hero 中的创建入口全部删除
- 保留的 3 个入口:
  1. card-recent 底部的 "空白草稿" + "从模板创建"
  2. QuickActionFab (右下角浮动按钮)
  3. HubHeader "新建" 按钮 + Ctrl+N

## Acceptance Criteria
- [ ] Hero 卡片仅显示创作流图表，无品牌文案和按钮
- [ ] InspirationCard 使用左边框极简风格
- [ ] Hero 中无创建入口按钮
- [ ] TypeScript 零错误 (vue-tsc --noEmit)
- [ ] 布局在 1920px / 1440px / 1024px / 768px 下正常显示

## Technical Notes
- HubView.vue 是主要修改文件
- InspirationCard.vue 需要重写样式
- WritingFlowCard.vue 在首屏不再引用（可能在 Section 2 仍有使用，勿删文件）
- DayDetailPopover.vue 复用现有组件
- 需要导入 Activity 图标 from lucide-vue-next
