# 多平台排版渲染精修与部署验收

## Goal

在不删除、不遗漏、不大重构任何既有功能/模块/组件的前提下，对 InkForge 当前的微信公众号、小红书、知乎文章排版渲染能力做最终精修和部署前验收。重点以微信公众号为主战场，吸收 135 编辑器、秀米、doocs/md、mdnice、微排版、Redink/小红书排版工具等市面实践，把可落地的规则沉淀到 `docs/` 与 `.trellis/spec/`，并用真实本机应用、真实浏览器、真实测试命令、真实截图/导出产物证明功能可用。

本任务是最终收口父任务：复用并整合已有 `05-14-wechat-rendering-rules-research`、`05-12-export-platform-rendering-real-capability-audit`、`05-12-full-app-functionality-audit-repair`、`06-01-multiplatform-render-svg` 和 `prompts/0601/` 的证据，不重新发明渲染管线，不覆盖既有任务成果。

## Confirmed Facts

- 当前 Trellis task: `.trellis/tasks/06-08-multiplatform-rendering-polish-deployment-acceptance/`，状态 `planning`。
- 当前分支为 `dev/visual-fixes`，工作区已有大量未提交改动；本任务不得回滚、删除或覆盖非本任务改动。
- 实际前端应用在 nested package `inkforge/`；常用命令以 `pnpm -C inkforge ...` 执行。
- GitNexus 当前索引存在但落后 HEAD 67 个提交；进入代码编辑前需要刷新索引或将影响分析标记为可能过期，并用测试/浏览器验证补偿。
- Serena 当前仅暴露说明/仪表盘入口，未暴露可用符号读写工具；代码编辑时优先 GitNexus + 精确文件读取/补丁，记录 Serena 工具限制。
- 135 编辑器已登录并实机观察：其入口覆盖样式中心、模板中心、SVG 样式、SVG 效果、SVG 模版、公众号长图、AI 排版、多平台分发；工作台覆盖标题/正文/图文/引导/布局/节日/行业/SVG、一键排版、剪切板、校对、预览分享、同步公众号等。
- 秀米已登录并实机观察：其入口覆盖图文排版、H5 制作、图片设计；图文工作台覆盖同步公众号、插件复制、继续复制粘贴、生成长图/PDF/视频、导入 Word/Excel/Markdown、导入公众号文章、样刊、一键排版、SVG 图集、左右/上下滑动、路径动画、点击展开/切换/弹出/播放、自由布局、定位、图层、字体、阴影、边框、动画和深色模式高亮。
- `prompts/0601/` 已有真实微信粘贴证据、旗舰 SVG/HTML 块系统、实机截图和 completion report。
- `.trellis/spec/frontend/wechat-svg-modules.md` 已定义 WeChat-safe inline SVG subset、HTML block layer、flagship editorial system、测试要求与真实微信 paste 证据。
- `inkforge/src/services/export/` 已有 WeChat/XHS/Zhihu 导出服务、platform rules、quality detector、preview fidelity、image pipeline、SVG modules 和大量 focused tests。
- 外部研究初步确认：doocs/md 的可借鉴价值在 Markdown parser -> theme renderer -> sanitize -> CSS inline -> clipboard copy -> image/math/code handling；135/秀米的可借鉴价值在丰富元素分类、SVG/交互素材、模板驱动 + 参数修正、一键排版、复制/同步/长图多出口。

## Requirements

- 保留现有架构、设计语言、品牌哲学和功能框架；不得删除任何现有功能、模块、组件、预设或测试。
- 以微信公众号为最高优先级，兼顾小红书和知乎的真实平台边界：
  - 微信公众号输出为 copy/paste 或同步可用的 inline-style HTML + WeChat-safe SVG/HTML block subset。
  - 小红书输出不得伪造富文本正文；默认走纯文本、话题、短段落、图片/长图/海报降级策略。
  - 知乎输出不得携带微信 HTML/SVG 装饰；默认保持 Markdown-compatible 语义，明确公式、代码、表格、图片边界。
- 把市场学习内容沉淀为规则而非临时口号：更新 `docs/platform-rendering-rules/**`、`docs/微信渲染规则.md` 或新增聚合规则文档，并同步必要 `.trellis/spec/frontend/**`。
- 样式丰富性必须服务于 InkForge 原本“墨铸/Quiet Press/flagship editorial”设计方向；吸收 135/秀米的元素分类和交互模式，但不复制受版权保护模板。
- 不使用 Emoji 作为 InkForge UI 图标或规则库装饰图标；图标必须走已有图标库或 inline SVG 几何/路径。
- 所有新增或修改规则必须具备测试或浏览器验证路径；禁止 mock、模拟成功、伪造发布或把 preview-only 结果当真实平台通过。
- 必须保护本机内存和运行稳定性：不启动过量并行进程，不在未确认端口/进程前广泛 kill，不同时运行重型 dev/build/test 组合。
- 最终验收需要覆盖：
  - 冒烟：真实 Vite app 主要页面和 ExportModal/preview 打开。
  - E2E/浏览器：桌面 + 390px 移动视口，控制台错误、截图、DOM 宽度/溢出。
  - TDD/单测：导出服务、platform rules、SVG modules、quality detector、preview fidelity。
  - 类型/构建：non-mutating lint、vue-tsc、production build。
  - 部署前：Tauri/native 或明确记录本机工具链 blocker；真实平台凭据缺失只能标为 blocked/unavailable，不可 pass。

## Acceptance Criteria

- [ ] `design.md` 和 `implement.md` 完成，且能直接指导 Phase 2 执行。
- [ ] `research/market-rendering-practices.md` 记录 135/秀米实机观察、外部资料、doocs/md/OSS lessons、平台约束和 InkForge 规则映射。
- [ ] `docs/` 中存在更新后的多平台排版规则文档，明确微信/XHS/知乎输出合同、元素分类、SVG/HTML 安全子集、降级策略、禁止项和验证方法。
- [ ] `.trellis/spec/frontend/` 更新必要规则，未来修改 SVG/HTML block/平台导出时可直接执行。
- [ ] 微信公众号导出最终 HTML 不依赖 `<style>`、class selector、CSS var、unsupported flex/grid/animation/filter、未清理 `katex-html` 或 raw markdown leakage。
- [ ] 微信旗舰/增强预设在 preview 与 export 目标均保持品牌视觉层级，且不少于现有 flagship 系统能力。
- [ ] 小红书 publishable output 是真实纯文本/图片/长图策略，不泄漏 raw HTML 或 Markdown 控制符。
- [ ] 知乎 publishable output 是 Markdown-compatible，并对 HTML/SVG/自定义块做可解释降级。
- [ ] 135/秀米可借鉴规则转化为 InkForge rule catalog，不复制账号私有内容、不抓取受版权保护模板、不发布到用户账号。
- [ ] 真实浏览器验证包含 desktop 和 mobile screenshots、console error sweep、overflow/visibility checks。
- [ ] Focused tests 覆盖本轮修改的导出规则和负例；已有 SVG modules/flagship pipeline tests 不退化。
- [ ] 完整质量门至少包括：focused Vitest、export/service Vitest、ESLint quiet、vue-tsc、build；无法运行项必须有精确 blocker。
- [ ] GitNexus impact 在每个实际修改符号前运行或记录工具/index blocker；最终 `gitnexus_detect_changes` 或等效 diff scope review 完成。
- [ ] 最终报告列出真实修改文件、证据截图/命令、仍需真实账号/平台权限验证的 blocker，不把 blocked 项计入 pass。

## Out of Scope

- 删除、替换或大规模重构现有 app、导出管线、主题系统、组件库或任务体系。
- 自动发布到 135、秀米、微信、小红书、知乎，或触碰用户账号安全设置、支付、团队授权、发布权限。
- 复制 135/秀米/其他平台的受版权保护模板、用户私有素材或会员资源。
- 用 HTML 伪造微信后台原生组件，如小程序卡片、投票、视频号、公众号名片、音频组件；这些只能列入发布清单/真实后台步骤或通过官方能力验证。
- 把无凭据的微信/知乎/小红书上传、同步、发布标记为成功。

## Open Questions

当前没有阻塞规划的问题。用户已授权创建任务、完成 135/秀米登录，并要求无需额外确认继续推进；但 Trellis 工作流仍要求复杂任务在 `task.py start` 前完成规划 artifact review gate。

## Notes

- 135 实机截图：
  - `C:\Users\HP\Downloads\135-editor-logged-in-home-2026-06-07T20-19-45-968Z.png`
  - `C:\Users\HP\Downloads\135-editor-workbench-2026-06-07T20-20-43-979Z.png`
- 秀米实机截图：
  - `C:\Users\HP\Downloads\xiumi-logged-in-home-2026-06-07T20-21-28-670Z.png`
  - `C:\Users\HP\Downloads\xiumi-paper-editor-2026-06-07T20-22-19-668Z.png`
