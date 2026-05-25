# focus-mode-typography-consistency

## Goal

WritingAssistPanel（写作辅助面板，嵌入检查器右栏）字号/字重与 Inspector 其他段落不一致，造成视觉断层。本任务将面板内的标题/标签/小字字阶**严格对齐 Inspector 基准**，保留统计数字（22px）作为强调点。仅做样式归一化，不改任何业务逻辑/DOM 结构。

## Requirements

1. 段落标题（写作辅助 h3、写作目标、暗角设置、环境音 header）统一：**12px / 600 / #607D8B**。
2. 次级标签（当前文稿/每分钟字数 card-label、副文案、目标行 goal-row-top、音量 range label）统一：**11px / 500 / #90A4AE**（与 inspector 同栏次级颜色对齐，避免比基准更深）。
3. 强调数字（assist-card strong、pomodoro-display strong）保留 **22px**，颜色 #263238 不变。
4. 删除 `.eyebrow` "专注写作" 元素（全局无第二处使用，10px uppercase 不符合 InkForge 中文文案排版风格）。h3 "写作辅助" 直接作为面板首行。
5. 按钮内字号统一：assist-focus-btn / assist-toggle / pomodoro-actions button / sound-grid button 内文字 **12px / 600**（不再使用 800）。
6. assist-toggle 内副状态文字（"开启"/"关闭"/`${vignette.height}px`）保持现位置但字号 **11px / 500**。

## Acceptance Criteria

- [ ] `.eyebrow` 整段从 template + style 中移除。
- [ ] `.writing-assist-header h3` 改为 12px / 600 / #607D8B。
- [ ] `.assist-section-title`、`.ambient-header` 改为 12px / 600 / #607D8B（weight 不再 800）。
- [ ] `.assist-card-label`、`.goal-row-top`、`.assist-range` label 改为 11px / 500 / #90A4AE。
- [ ] `.assist-focus-btn`、`.assist-toggle`、`.pomodoro-actions button`、`.sound-grid button` 字号 12px / weight 600（按钮内 span 11px / 500）。
- [ ] `.assist-card strong`、`.pomodoro-display strong` 保留 22px / #263238。
- [ ] 业务逻辑（番茄钟开始/暂停/重置/跳过、环境音播放/停止/音量、暗角开关/高度、目标进度）功能未变（手动验证）。
- [ ] `pnpm typecheck` + `pnpm lint` 通过。
- [ ] 仅 `WritingAssistPanel.vue` 改动（template 删除 eyebrow 段；其余仅 `<style scoped>`）。

## Definition of Done

- 改动局限于 `inkforge/src/components/editor/WritingAssistPanel.vue`。
- 截图前后对照入 `evidence/`（before / after 各一张）。
- typecheck + lint + 已有测试绿。
- 风险评估：低（视觉层，纯 CSS + 一行 template 移除，无逻辑影响）。

## Technical Approach

直接修改 `<style scoped>` 内对应类的 CSS 规则，并从 template 删除 `.eyebrow` `<p>` 节点。无新增依赖，无 props 变更，无 store 调用变化。

## Decision (ADR-lite)

**Context**: WritingAssistPanel 嵌于 inspector-section 内，但内部字阶（10px-15px-22px 跨度，800 weight）与 inspector 基准（12px/600）视觉错位。

**Decision**: 严格归一到 inspector-label 基准（方案 A）。删除 eyebrow 装饰元素。强调数字保留 22px。

**Consequences**:
- 优点：与同栏其他 inspector-section 视觉混排无错位；纯 CSS 改动，回滚成本接近零。
- 取舍：失去 eyebrow uppercase 装饰；面板首行视觉权重略降（但符合"嵌入式 section"定位）。
- 风险：极低。

## Out of Scope

- 不提取全局 typography token / CSS variables（避免跨组件大改）。
- 不改 Inspector 其他 section 的样式。
- 不动 WritingAssistPanel 的 script / props / store 接口。
- 不改主题（暗色模式）。
- 不调整 grid layout / spacing / 圆角 / 阴影。

## Technical Notes

- Inspector 基准：`inkforge/src/views/WorkstationView.vue:4775-4841`
  - `.inspector-title`：12px / 600 / #607D8B
  - `.inspector-label`：12px / 600 / #607D8B
- WritingAssistPanel 当前样式：`inkforge/src/components/editor/WritingAssistPanel.vue:318-573`
- 渲染入口：`WorkstationView.vue:3157-3175`
- gitnexus_impact 待跑：`WritingAssistPanel` 组件被引用范围（预期仅 WorkstationView）。
