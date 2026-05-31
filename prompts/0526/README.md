# 0526 — Inspector 写作辅助三大问题攻坚

User 验收 Phase 2（commit ff4cc7e + 后续 dirty 改动）后发现：

| # | Issue | 文件夹 |
|---|-------|--------|
| 1 | 打字机模式全程无效（不滚动、无段落高亮、开关无差别） | `typewriter-no-effect/` |
| 2 | 暗角聚焦切换无视觉变化 | `vignette-focus-no-effect/` |
| 3 | 专注模式下"退出专注 Esc"按键与发布/模式按钮重叠 | `focus-mode-button-collision/` |

## 流程

1. **research/** — 每问题独立调查产物（agent 独立写入）
2. **prd.md** — 综合研究后产出（main agent 写）
3. **implement** — 基于 prd.md 派 trellis-implement
4. **check** — 基于 prd 派 trellis-check + 手测

## 一致性约束

- 修改一律落 inkforge/，不动 prompts/0526/ 外的研究素材
- 不并入 freezePrototype task / typewriter Phase 2 已 commit 部分
- 三问题独立可回滚（三组 commit 或一组聚合 commit）
- 不引新 npm dep；保持 quality-guidelines（不 mock、不 disable lint）

## 验收

- npm run typecheck / lint / test 全绿
- Tauri 手测三问题逐条达标（user 验收）
- 不退化：现有 Phase 1+2 已落成果（dim/sentence/sidebar/slider）不丢

---

## 0527 续 — 后验收 3 问题（commit fbc1662 后 user Tauri 手测）

| # | Issue | 文件夹 |
|---|-------|--------|
| 4 | 打字机 Tauri 退化（浏览器 E2E 全过但 Tauri 全无效） | `typewriter-tauri-regression/` |
| 5 | 右侧预览框非真机尺寸 | `preview-device-size/` |
| 6 | 移动排版每行 18-22 字 | `mobile-typography-chars/` |

任务 5+6 强耦合（锁 375px 后字号自动达标），合 1 个 PR。
任务 4 独立，等 user Tauri devtools 报告诊断分支后定向修。
