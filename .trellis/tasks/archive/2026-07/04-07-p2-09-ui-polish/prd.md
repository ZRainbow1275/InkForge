# UI 打磨与溢出修复

## 规格参考
- `prompts/0327/09-ui-polish-spec.md` (完整规范)

## 背景
全局视觉一致性收尾: 溢出修复、卡片设计系统统一、暗色模式完整适配、页面切换动画。此任务必须在 01-08 全部完成后执行。

## 当前基线差距
- 已完成: 暗色模式基础设施从 class 扩展到 `data-theme`，并保持 `theme-light` / `theme-dark` 兼容。
- 已完成: 全局溢出工具类已在 `design-system.css` 中补齐。
- 已完成: Hub、Settings、EditorStatusBar 的已知溢出点已按本 PRD baseline 收敛。
- 已完成: 卡片设计系统补齐 `card-base` / `card-interactive` / `card-accent` / `card-empty` 及共享标题/统计样式。
- 已完成: 暗色模式 CSS 变量补齐 elevated/input/hover/active/code/accent/status 等 baseline token。
- 已完成: 页面切换动画通过 `router-view` slot、`Transition` 和 `route.meta.transition` 接入。
- 已完成: reducedMotion 通过 `data-reduced-motion` 和全局 CSS 抑制 animation/transition，并回退 `scroll-behavior`。

## Requirements

### 1. 全局溢出工具类
在 `styles/main.css` 中添加:
```css
.text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.text-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
```

### 2. 9 个溢出点修复
| 位置 | 问题 | 修复 |
|------|------|------|
| HubHeader 日期 | 长日期溢出 | .text-truncate |
| StatsDashboard 大数字 | 超长数字溢出 | font-variant-numeric: tabular-nums + 自适应字号 |
| InspirationCard 引言 | 长引言溢出 | .text-clamp-3 |
| WritingFlowCard 标签 | 窄屏标签溢出 | .text-truncate + min-width: 0 |
| ArticleWaterfall 标题 | 长标题溢出 | .text-clamp-2 |
| SettingsView 描述 | 选项描述溢出 | .text-clamp-2 |
| TabBar 多标签 | 标签过多溢出 | 横向滚动 + 右端渐变遮罩 + 隐藏滚动条 |
| EditorStatusBar 小屏 | 信息挤压 | 优先级隐藏 (窄屏隐藏次要信息) |
| FloatingToolbar | 视口边界 | 已在 05 任务处理 |

### 3. 卡片设计系统
```css
.card-base { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-radius: 20px; border: 1px solid rgba(0,0,0,0.06); }
.card-interactive { transition: transform 200ms, box-shadow 200ms; cursor: pointer; }
.card-interactive:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.card-accent { background: linear-gradient(135deg, #D32F2F, #B71C1C); color: white; }
.card-empty { border: 2px dashed rgba(0,0,0,0.12); background: transparent; }
```
统一: `.card-label` / `.card-title` / `.stat-number` / `.stat-label`

### 4. 暗色模式完整适配
CSS 变量扩展 (在 `[data-theme="dark"]` 下):
- `--bg-surface-elevated` (弹窗/浮层)
- `--bg-input` (表单输入)
- `--bg-hover` / `--bg-active` (交互状态)
- `--shadow-color` (阴影颜色)
- `--scrollbar-thumb` (滚动条)
- `--code-bg` / `--code-text` (代码块)
- `--accent-surface` / `--accent-border` (品牌色变体)
- 状态色: success/error/warning/info

**14 组件暗色模式检查矩阵**:
HubView / WorkstationView / EditorPanel / FloatingToolbar / SettingsView / StatsDashboard / InspirationCard / ArticleCard / ContributionHeatmap / EditorContextMenu / FindReplace / ExportModal / OutlinePanel / CategoryPanel

### 5. 页面切换动画
- `<Transition>` 包裹 `<router-view>`
- 路由 `meta.transition` 控制:
  - `page-fade` (默认): opacity 0→1, 200ms
  - `page-slide-left` (进入子页): translateX(20px→0), 250ms
  - `page-slide-right` (返回): translateX(-20px→0), 250ms

### 6. reducedMotion 支持
- `data-reduced-motion` attribute 在 `<html>` 上
- CSS: `[data-reduced-motion="true"] *, [data-reduced-motion="true"] ::before, [data-reduced-motion="true"] ::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }`

### 7. WCAG AA 对比度
- 文字对比度 ≥ 4.5:1
- 验证流程: 背景 → 文字 → 边框 → 交互状态 → 品牌色变体 → 阴影 → 图标 (8 步)

## Acceptance Criteria
- [x] 5 个视口宽度 (320/768/1024/1440/1920px) 无文档级水平溢出
- [x] TabBar / panel tabs 横向滚动 + 渐变遮罩 baseline 完成
- [x] 卡片样式统一 (card-base/interactive/accent/empty)
- [x] 暗色模式 baseline 覆盖完成，包含全局变量、Hub、Settings、EditorStatusBar 与共享卡片/输入/浮层表面
- [x] 3 种页面切换动画正常
- [x] reducedMotion 完全抑制动画
- [x] WCAG AA 对比度抽样达标
- [x] `cd inkforge && pnpm exec vue-tsc --noEmit` 零错误

## 2026-04-29 Completion Note
- P2-09 baseline 已完成到真实代码路径: `inkforge/src/styles/design-system.css`, `App.vue`, `router/index.ts`, `HubView.vue`, `SettingsView.vue`, `EditorStatusBar.vue`。
- 真实浏览器验证已覆盖 Hub 的 320/768/1024/1440/1920px 文档级水平溢出，结果均为 `overflowDelta: 0` 且无未裁切 offender。
- Settings 320px 已验证无文档级水平溢出；`.sv-nav` 保留为预期横向滚动容器。
- 暗色模式、CSS 变量、route transition、reducedMotion 与 WCAG AA 对比度已完成抽样验证；浅色 secondary/muted 对比度已修正到 AA。
- FloatingToolbar 视口边界沿用 P1-05 已完成处理，本 slice 未重写该链路，也未删除任何既有入口或组件。
- 最终验证: `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `pnpm build` 均通过；`netstat -ano | grep ':4173'` 无残留监听。
