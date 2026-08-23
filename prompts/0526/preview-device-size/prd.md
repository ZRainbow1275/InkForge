# PRD — 右侧预览框非真机尺寸

## 症状

> "右侧的渲染框不是真机尺寸，显示还是有问题"

## 现状定位

`inkforge/src/views/WorkstationView.vue`:

- L3886 `.split-pane-right`: `flex: var(--split-right-ratio, 0.5) 1 0; min-width: 280px` → 占视口约一半，**非固定真机宽**
- L3974 `.split-preview-content`: 内部容器 `padding: 20px 24px`，无宽度约束
- L4231 `.preview-mode-body :deep(.markdown-preview)`: 全屏预览模式 `max-width: 920px` → 桌面尺寸，**非手机**

`inkforge/src/components/editor/MarkdownPreview.vue`:

- L96-100 `.markdown-preview`: `height:100%; padding:20px` → 跟随父容器宽度
- L106 `font-size: 16px; line-height: 1.6` → 字号本身 OK，但宽度不约束时单行字数失控

## Root cause

预览框宽度跟随容器（split-pane 半屏 / preview-mode 920px），**不是真机移动设备宽**。User 实际期望：模拟手机预览 → 375px 锁定。

## Decision (ADR-lite)

**Approach A**（推荐）— 增设 `.preview-device-frame` 居中容器，宽 375px

- 包裹 `<MarkdownPreview>` 两处使用点（split-pane + preview-mode）
- 内部 markdown-preview 填满 375px 宽
- 容器层：圆角 + 1px 灰边 + 居中 + 浅灰背景（视觉暗示 "手机框"）
- Split-pane-right 宽度依然 ratio 可变，但内部内容锁 375px → 多余空间留白

**Approach B** — 直接给 `.split-pane-right` / `.preview-mode-body` 设 `max-width: 375px`，居中

放弃：缺乏 "设备框" 视觉，与 Approach A 比无优势

**选 A**。

## Requirements

1. `MarkdownPreview` 外层包 `.preview-device-frame`，固定宽 375px
2. Split-pane + preview-mode 两处入口都包
3. 容器视觉：白底 + 1px `#e2e8f0` 边 + 圆角 16px（轻量手机感）
4. 父容器多余空间留白（背景透出 / 浅灰填充）
5. 不动 `MarkdownPreview.vue` 内部样式（保持 16px 字 / 1.6 line-height）
6. 移动端响应：viewport < 600px 时取消 375px 锁定，让 frame 占满父容器

## Acceptance Criteria

- [ ] 桌面 split-view: preview 显示宽 375px，居中，左右留白
- [ ] 全屏 preview-mode: 同样 375px，居中
- [ ] 中文段落每行 18-22 字（16px 字号 + 335px 内容宽 ≈ 20.9 字）
- [ ] 缩到 < 600px 视口时 frame 占满，不溢出
- [ ] `npm run typecheck` / `lint` / `test` 全绿
- [ ] PublishView / ThemesView / ExportModal 各自 preview 不波及（独立）

## Out of Scope

- 不动 MarkdownPreview.vue 内部 (字号 / 行高 / 颜色)
- 不动 PublishView / ThemesView preview 框
- 不引入 device-emulation toolbar（小尺寸切换 SE / Pro / Max 留下次）
- 不并入 typewriter-tauri-regression 任务

## Files Touched

- `inkforge/src/views/WorkstationView.vue` — 添加 `.preview-device-frame` CSS + template 包裹两处

## Technical Notes

- 375px = iPhone SE / iPhone 12 mini / 通用安卓最窄主流
- 335px content (375 - 20*2 padding) / 16px ≈ 20.9 → 命中 18-22 字 range
- Tauri 默认 webview2 桌面，需要靠 CSS 模拟移动
