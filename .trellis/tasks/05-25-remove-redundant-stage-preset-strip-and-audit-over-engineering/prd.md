# Remove redundant stage preset strip + audit over-engineering

## Goal

撤回 commit `63042a9` 加在 Workstation **stage panel 顶部**的两条冗余 UI（`.stage-preset-strip` 12 chip 横条 + `.stage-preset-meta` 元信息条），同时把其中的 **preset 元信息显示**作为「功能增强」并入 inspector 原有 `排版风格` section 的 `.preset-strip`。其余三项辅助改动（`preset-fade` crossfade、`.preview-sample-hint` 空稿角标、`topPresets` 改用 `getPlatformPresets`）逐项审视后保留或调整。

## Why（用户原话）

> 这一栏（指 stage 顶 preset 横条）就很明显是多余的设计，不需要，在右侧的检查器可以切换风格就可以了。
> 一并存在 inspector，而不是简单地删除，而是基于原有设计的功能的增加。

引申反思：上一轮我把"stage panel 没有 preset 切换"判为 critical defect，没问 inspector 已有切换是否足够，直接加 UI → 过度设计。本任务同时审计其余 4 项是否同类问题。

## What I already know

- commit `63042a9` 改 WorkstationView.vue：+216 / -8 行
- 新增 5 个面（按代码位置）：
  1. `.stage-preset-strip`（line 2687 region）— 12/5/3 平台感知 chip 条
  2. `.stage-preset-meta`（line ~2710 region）— 当前 preset 的 `name + persona + description`
  3. `preset-fade` `<transition>` 包裹 `.preview-content`（line 2783-2792，CSS 4641-4649）— 200ms opacity crossfade
  4. `.preview-sample-hint`（line ~2778-2779）— 空稿渲染示例时的角标
  5. `topPresets` computed（line ~991）— 从 `themePresets.slice(0,5)` 改成 `getPlatformPresets(selectedPlatform.value)`，inspector `.preset-strip`（line 2977-2994）与 stage `.stage-preset-strip` 共享同一数据源
- Inspector `排版风格` section（line 2929-3000 区域）已含：accent-picker、preset-strip（12/5/3 chip）、版心宽度 control。但**没有**任何 persona / description 显示。
- 数据 API：`getPlatformPresets(platform)`、`getPresetById(id)` 已存在于 `services/export/index.ts`，无需新建。

## Assumptions (temporary)

- 删除 stage 顶部两个面后，preset 切换路径**只剩 inspector**。inspector 默认展开还是默认折叠？需要检查 inspector toggle 状态默认值（在 R2/R3 测试中观察到 stage panel 默认折叠，但 inspector 状态尚未确认）。
- preset-fade 跟 stage-preset-strip 解耦——transition 包裹的是 `.preview-content`，触发条件是 `defaultPresetId` 变化。inspector chip 点击同样会触发。
- preview-sample-hint 独立于 preset 切换 UI，跟 stage 顶两条无关。

## Open Questions

- [x] **Q1（stage-preset-strip + meta chip 命运）** → 都删，并把 meta 信息**功能增强**并入 inspector。
- [x] **Q2（meta 信息并入 inspector 的具体方式）** → **B**：每个 chip 改成"图标 + name + 下方一行 persona 微标签"，chip 变高，不做 hover 预览。
- [x] **Q3**：`preset-fade` crossfade → 改为 **100ms**（减半，保留过渡感、降低延迟感）。
- [x] **Q4**：`.preview-sample-hint` 空稿角标 → **保留原状**（防误解，标识 placeholder）。
- [x] **Q5**：`topPresets = getPlatformPresets(selectedPlatform.value)` → **保留**（修复真 bug，跟 stage 顶冗余无关）。
- [x] **Q6（连锁审计）**：inspector 默认 `collapsed=true`（line 173/453）。**但**折叠态已有 `.inspector-collapsed-bar`（12px 触发条 + hover red indicator + click 展开，line 2872-2878 + CSS 4265-4283）。入口已存在 → **无需新增 UI**，不动原默认状态。冷启用户路径：点 inspector 折叠触发条 → 展开 → 在 `排版风格` section 切 preset。

## Requirements (evolving)

- 删除 `.stage-preset-strip` template + CSS + `topPresets` 在 stage 模板的引用
- 删除 `.stage-preset-meta` template + CSS + `activePresetMeta` computed（若 inspector 已展示则无消费者）
- inspector `.preset-chip` 改造为"icon + name 上行 + persona 微标签下行"双行布局
- 保留 `topPresets` 共享数据源（Q5 待最终确认）
- 保留/调整其余 3 项按 Q3/Q4 答案

## Acceptance Criteria (evolving)

- [ ] stage 顶不再出现 `.stage-preset-strip` 与 `.stage-preset-meta`（grep zero match）
- [ ] inspector `.preset-chip` 在 chip 内显示 persona 子文本
- [ ] inspector preset 切换功能保持原有平台感知行为（12/5/3 chip 平台自动切换）
- [ ] preset 切换后 `.preview-content` 仍能正确重渲染（不破坏 preset-fade，如保留）
- [ ] `pnpm typecheck && pnpm lint && pnpm test --run` 全绿
- [ ] Playwright 实测：3 个平台 chip 切换全部正确反映 persona 微标签 + 激活态

## Definition of Done

- 3 检（test / typecheck / lint）全绿
- Playwright 视觉验证 ≥ 3 个 preset chip 切换 + persona 微标签 + active 状态
- 至少 1 张截图证据保存到 `.trellis/tasks/<id>/evidence/`
- commit 信息追溯 `63042a9` 的"反思 → 修正"链

## Out of Scope (explicit)

- 不动 preset 本身的 CSS（preset-decorations、preset-fonts、themes.ts）
- 不改 export pipeline（wechat/xhs/zhihu converters）
- 不动 hub-page / hero-empty-btn / hero-continue-btn 现有逻辑
- 不在本任务里整顿历史 prior-session 60+ 完成未归档任务（独立任务）

## Technical Notes

- 主修改文件：`inkforge/src/views/WorkstationView.vue`
- 涉及 line 区间（commit `63042a9` 内）：
  - 模板：2687-2740（stage-preset-strip + stage-preset-meta）、2783-2792（preset-fade）、2777-2782（preview-sample-hint）、2977-2994（inspector preset-strip）
  - script：~991-1030（topPresets / activePresetMeta computed）、1400-1408（usePreviewRenderer 接 previewMeta）
  - CSS：~4530-4640（stage-preset-strip + stage-preset-meta + sample-hint）、4641-4649（preset-fade）、5322+（preset-strip 原始）
- 关联 spec：
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
  - `.trellis/spec/guides/code-reuse-thinking-guide.md`
- 关联前序任务：
  - `.trellis/tasks/archive/2026-05/05-23-preset-typography-overhaul/prd.md` — AC 原始来源

## Research References

无外部研究（纯内部 UI 撤回 + 增强，无新技术选型）

## Decision (ADR-lite, evolving)

**Context**: 上一轮 commit `63042a9` 在 stage panel 加了过度设计的预设切换条；用户明确反馈冗余，要求并入 inspector。
**Decision**: 删 stage 顶 2 条，把 meta 信息以"chip 双行布局"形式增强进 inspector preset-strip。
**Consequences**: stage panel 顶部恢复纯净；inspector chip 变高，列宽下载需要复测；冷启时若 inspector 折叠则用户无入口（Q6 待答）。
