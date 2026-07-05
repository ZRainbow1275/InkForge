# Hub 首页布局修复

## 规格参考
- `prompts/0327/02-hub-layout-spec.md`
- `prompts/0420/specs/00-wave1-current-truth.md`

## Goal
在保持现有 `HubView.vue` 页面骨架和真实数据链路不变的前提下，把首页主叙事重新拉回“创作流 + 真创建入口 + 草稿继续工作”，并完成桌面、平板、手机三个断点下的真实回归。

## 2026-04-23 当前实现真相
- Hero 区已经围绕“继续创作 + 本周产出 + 周频创作流”组织，不再是纯品牌口号占位。
- `QuickActionFab` 已真实接通 `空白创建 / 模板创建 / 导入文档` 三入口，并支持键盘菜单语义。
- `card-new` 没有被删除，而是在“绝不删除现有模块”的硬约束下收口为“创作工具”卡，承接模板创建、导入文档、草稿/素材/连续创作天等信号。
- `card-recent` 已保留真实最近文稿列表，并补入 `空白草稿` 与 `从模板创建` 两个内联创建入口。
- 第二屏已经真实渲染 `模板市场 + Quick Actions` 两块，不是空壳跳板；点击模板会写入真实草稿并跳入 `Workstation`。
- `TemplatePicker.vue` 已与 Hub 主链接线，模板入口不再停留在孤立弹层。
- 首页 `草稿箱` 信号卡已经展示真实 `draft` 数量、最近更新时间、最近三篇草稿预览，并提供 `继续最近草稿 / 查看全部草稿` 两条真实入口。
- `每日灵感` 卡已经收口为极简白底左红边风格，同时保留 `AI 创作 / 本地名言` 的真实内容来源切换。

## Bundle 收口边界
本任务关闭的是 `p0-02 hub-layout`，不是把 0420 中所有对 Hub 的长期理想态一次性做完。以下内容不再阻塞关闭：
- 不要求把 `HubView.vue` 按 0420 新 spec 一次性拆成完整的 `QuickActionsCard.vue` / `WritingFlowCard.vue` 等新文件
- 不要求物理删除 `card-new`；当前仓库的顶层约束明确禁止删除已有模块，因此本轮采用“重收口职责、保留模块表面”的方式
- 不要求把所有 Hub 未来统计面板一次性扩充到更大的数据洞察体系，那属于后续 bundle

## Acceptance Criteria
- [x] Hero 卡片已回到首页首屏主叙事，真实显示创作流与继续创作入口。
- [x] `card-new` 不再承担重复的第四条空白新建路径，而是收口为“创作工具”卡。
- [x] `card-recent` 已包含真实最近文稿列表和内联 `空白草稿 / 从模板创建` 动作。
- [x] 灵感卡已切为极简风格，并继续保留真实 `AI / 本地名言` 内容来源。
- [x] 第二屏已真实落地 `模板市场 + Quick Actions`，模板点击后会写入真实草稿并进入工作站。
- [x] Hub 的 `空白 / 模板 / 导入 / 草稿箱` 四类动作均走真实 store/router 链路，无 mock。
- [x] 桌面、平板、手机三档都已做真实浏览器回归，且没有新增 console error。
- [x] `pnpm -C D:/Desktop/Inkforge/inkforge exec vue-tsc --noEmit` 通过。
- [x] `pnpm -C D:/Desktop/Inkforge/inkforge build` 通过。

## Validation

### 桌面主页
- `http://127.0.0.1:3006/`
- 真实可见：
  - `创作流`
  - `继续创作`
  - `创作工具`
  - `最近编辑`
  - `Section 2 / 模板市场`
  - `Quick Actions`
  - `草稿箱`
- 控制台无新增 error

### 手机断点
- Playwright `iPhone 13` 口径真实回归
- 全页截图已落盘：
  - `C:\Users\HP\Downloads\hub-iphone13-p0-02-2026-04-22T22-33-29-877Z.png`
- 页面在手机断点下仍可完整渲染 Hero、第二屏模板市场、Quick Actions、草稿箱和文章列表
- 控制台无新增 error

### 平板断点
- Playwright `iPad Pro 11` 口径真实回归
- 全页截图已落盘：
  - `C:\Users\HP\Downloads\hub-ipadpro11-p0-02-2026-04-22T22-33-45-209Z.png`
- 页面在平板断点下仍可完整渲染 Hero、第二屏模板市场、Quick Actions、草稿箱和文章列表
- 控制台无新增 error

## 收口结论
`p0-02` 的任务包目标已经由当前代码和真实浏览器验收覆盖完成。当前仍未完成的是更大的 0420 Hub 远期结构演进，而不是这条 bundle 自己的交付。因此本任务在 `2026-04-23` 收口为 `completed`。

## Out-of-Bundle Follow-ups
- 如果后续仍要推进 0420 的更彻底 Hub 组件化，可再拆分 `HubView.vue`，但这不是本 bundle 的关闭前提
- 更大的数据洞察和首页统计扩充应归入后续 `data-insights` 一类任务包
- 后续如需继续强化小屏排版，可以基于当前截图再做定向 polish，而不需要否定本轮真实响应式闭环
