# PRD — 移动排版每行 18-22 字

## User 要求

> "整体的渲染排版的字号务必要保持在手机上观看，每行18-22个字"

## Math

- 中文方块字单字 ≈ 1em 宽
- 移动设备 375px viewport：
  - 容器宽 375
  - 左右 padding 20+20 = 40
  - 内容宽 335
  - 16px font → 335 / 16 = 20.9 chars/line ✓
  - 15px font → 335 / 15 = 22.3 chars/line ✓
  - 14px font → 335 / 14 = 23.9 chars/line ✗

**现状**：`MarkdownPreview.vue` L106 `font-size: 16px` 已正确，但**容器宽不锁** → 当宽度被 split-pane 拉到 600+px 时单行 38+ 字，超出。

## Root cause

字号已正确，但**容器宽度失控**。前置任务 `preview-device-size` 锁 375px 后，本任务字号自然命中 18-22 字。

## Decision

**Approach A** — 与 preview-device-size 任务并入：宽度锁 375px 后字号 16px 命中 20.9 字，**不需要单独改字号**

**Approach B** — 不锁宽度，改用 ch 单位 / max-width: 22ch 限制行长

放弃 B：原因 ch 单位与 Chinese 字宽不严格 1:1（fallback font 偏差），且与 device-frame 视觉解耦冲突

**选 A**。

## Requirements

依赖 `preview-device-size` 完成后验证：

1. 375px 容器宽 + 16px 字号 → 中文每行 18-22 字（实际 20-21）
2. 列表 / 标题 / 引用 / 表格 各自 font 比例不破（继承 MarkdownPreview.vue 现有规则）
3. h1 22px / h2 18px / h3 16px 不动
4. 长英文单词 `word-wrap: break-word` 已存在 L108 ✓

## Acceptance Criteria

- [ ] 实测 375px 内典型中文段落每行 18-22 字
- [ ] 标题 / 列表 / 引用 不窜行
- [ ] `npm run typecheck` / `lint` / `test` 全绿

## Out of Scope

- 不改 font-size（已正确）
- 不引入 user-adjustable 字号 slider
- 不动 PublishView typography

## Files Touched

无独立 file change，依赖 `preview-device-size` 任务

## Verification

完成 `preview-device-size` 后 Playwright 量测：
- DOM eval: `getBoundingClientRect()` 取 .markdown-preview 宽 = 375
- 取首段 textContent.length / lines （视口换行）

或 user Tauri 手测：截图数中文字符
