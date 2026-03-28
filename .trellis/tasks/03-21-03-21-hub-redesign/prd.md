# Hub 首页重设计

## Goal
将 HubView v6 的 Bento Grid + 自由滚动架构升级为四区段全屏滚动 + 数据可视化 + 模板市场 + 瀑布流的企业级首页。

## Priority
P1 — 与 Workstation 可并行，依赖 data-model-upgrade 完成

## Requirements

### Section Snap Scroll
- 四个 Section：Hero+Stats / 创作流+模板市场 / 热力图+趋势+分布 / 瀑布流
- CSS scroll-snap-type: y mandatory
- 右侧导航指示器（小圆点）
- 移动端/Tauri App 端适配

### 创作流卡片修复
- 柱状图 bar 与星期标签使用 CSS Grid 对齐
- 点击 bar 弹出浮窗卡片（DayDetailPopover.vue）显示当日文章

### 模板市场卡片
- 匹配 prototype/inkforge_themes.html 视觉风格
- 数据源：services/export/themes.ts 的 themePresets
- Emoji 全部替换为 Lucide 图标
- 2 列 Grid，卡片 hover 上浮效果

### 创作热力图
- GitHub Contribution Heatmap 风格，52 周 x 7 天 SVG Grid
- 5 级颜色阶梯，真实数据来自 articleStore
- 月份/星期标签，hover Tooltip

### 字数趋势 + 分类分布
- 字数趋势：SVG 面积图，最近 30 天
- 分类分布：SVG 环形图 + 图例
- 纯 SVG，无外部图表库

### 文章瀑布流
- CSS columns 真瀑布流
- 可变高度文章卡片
- 响应式列数（3/2/1）

## Acceptance Criteria
- [ ] 四个 Section 可顺畅切换，snap 效果正常
- [ ] 柱状图 bar 与星期标签完美对齐
- [ ] 浮窗卡片显示真实文章数据
- [ ] 模板市场卡片零 Emoji，全 Lucide 图标
- [ ] 热力图渲染 365 天真实数据
- [ ] 字数趋势/分类分布展示真实数据
- [ ] 瀑布流体现美观的错落布局
- [ ] `pnpm typecheck` 零错误
- [ ] 响应式 1440/1024/768/375 断点均正常

## Technical Notes
- Spec 参考：`docs/specs/01-hub-redesign-spec.md`
- 8 个新组件在 `components/hub/` 目录
- 保持现有 computed 属性和 Store 绑定不变
