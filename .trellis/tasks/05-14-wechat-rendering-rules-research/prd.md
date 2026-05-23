# 微信公众号渲染规则与精美图文能力研究

## Goal

建立一个独立的 Inkforge 研究任务，系统回答三个问题：微信公众号对 HTML/CSS/SVG 的真实支持规则是什么；Inkforge 如何稳定生成精美的公众号文章和图表；微信后台/接口提供的组件能力应如何接入或降级为发布清单。该任务先做规则、方案和验收边界，不影响现有项目任务和代码。

## What I Already Know

- 用户要求单开任务，不影响项目中其他任务。
- 用户授权本任务可做充分调研与设计，目标是探索公众号 CSS/SVG 支持、精美渲染文章/图表、微信组件应用。
- 当前任务已从独立 research/planning 进入实现执行，`task.json` 状态为 `in_progress`；实现范围按用户确认的“最小真实发布链 + 最小可见状态”薄切推进。
- 当前分支是 `dev/visual-fixes`，已有多个不属于本任务的 dirty/in_progress 任务，本任务不得触碰其代码。
- Inkforge 的实际前端主目录是 `inkforge/`，已有微信导出/预览/发布相关代码。
- 现有微信导出链路已包含 `wechat.ts`、`platform-css.ts`、`css-validator.ts`、`platform-rules/wechat.ts`、`quality-detector.ts` 等模块。
- 官方文档确认草稿 `content` 支持 HTML，但会移除 JS，正文图片 URL 必须来自微信上传图片接口，接口必须服务器端调用。
- 官方未公开完整 CSS/SVG 白名单，CSS/SVG 规则必须以官方接口限制、成熟工具实践和真实预览验证共同约束。

## Assumptions

- 该任务以研究与产品/技术方案起步；在用户确认 MVP 后，已进入并行薄切实现阶段。
- 后续如果进入实现，应复用现有 `inkforge/src/services/export/` 管线，不新建并行微信渲染器。
- “微信提供的组件”分为 API 可自动化能力和后台编辑器原生组件；后者不能靠伪造 HTML 当作完成。

## Requirements

- 形成一份可执行 PRD，明确微信公众号 HTML/CSS/SVG/图片/组件规则、风险与推荐实现路径。
- 将研究材料落到 `research/` 文件，避免只留在对话中。
- 明确官方事实、社区/工具实测结论、本地代码现状三者的边界。
- 设计“精美图文/图表”的可落地策略，而不是只给审美口号。
- 给出后续实现可选路径，并区分复制导出、草稿发布、图片上传、封面素材、后台组件清单。
- 保持任务独立，不修改其他任务，不启动实现阶段，直到需求范围确认。
- 测试号凭据落点采用 `inkforge/.env.local`，该路径已被 `inkforge/.gitignore` 忽略；变量不得使用 `VITE_` 前缀，避免被前端打包暴露。

## Acceptance Criteria

- [ ] `prd.md` 记录目标、需求、验收标准、技术路径、范围外事项和开放问题。
- [ ] `research/wechat-css-svg-rules.md` 记录 CSS/SVG/图表规则、官方事实和 Inkforge 差距。
- [ ] `research/wechat-components-and-api-boundaries.md` 记录微信组件/API 边界与可自动化程度。
- [ ] `research/repo-current-wechat-pipeline.md` 记录本地相关代码路径和当前能力。
- [ ] PRD 至少提出 2 个后续实现方向，并给出推荐项。
- [ ] 明确哪些能力必须真实账号/真实微信后台预览验证，不能用 mock 替代。
- [ ] 用户确认 MVP 范围后，才进入 implementation task start。

## Research References

- [`research/wechat-css-svg-rules.md`](research/wechat-css-svg-rules.md) — CSS/SVG/图表支持规则与本地导出链路差距。
- [`research/wechat-components-and-api-boundaries.md`](research/wechat-components-and-api-boundaries.md) — 微信组件、素材接口、草稿接口和后台组件边界。
- [`research/repo-current-wechat-pipeline.md`](research/repo-current-wechat-pipeline.md) — Inkforge 现有微信导出相关模块速记。

## Technical Approach

### Approach A: 规则库 + 安全图文模板库（推荐）

先把微信安全 HTML/CSS 规则固化成可测试配置，再建设一组可复用精美内容块：标题组、摘要卡、风险提示、时间线、对比表、引用块、代码块、图表图片块。图表默认转图片，组件先做占位和发布清单。

优点：和现有 `export/` 管线匹配，风险低，最容易真实落地。
缺点：第一阶段不会自动插入所有微信后台组件。

### Approach B: 草稿发布链优先

优先打通微信 API：上传正文图片、上传永久封面、创建草稿、preflight 检查。精美模板只做基础版。

优点：最接近“真实发布”，能尽早证明不是复制粘贴 demo。
缺点：依赖真实公众号凭据和权限；没有模板库时文章视觉提升有限。

### Approach C: SVG 互动模板库优先

围绕公众号 SVG 黑科技建立可视化模板和交互效果库，追求高级排版与互动。

优点：视觉冲击强，可探索公众号特色玩法。
缺点：官方契约不稳定，预览验收成本高，不适合作为默认主路径。

## Decision (ADR-lite)

**Context**: 单走模板库风险最低但真实发布证明不足；单走草稿发布链能证明 API 能力但视觉价值不足；复杂 SVG 互动风险最高，不适合作为默认主线。

**Decision**: MVP 采用“并行薄切”：同时做最小微信安全图文模板库和最小真实发布链路。模板侧只覆盖一组高价值基础块；发布侧只覆盖正文图片上传、封面素材 preflight、草稿创建前校验和发布清单，不伪造后台组件。

**Consequences**: 范围比单轨 MVP 更大，但能同时证明“渲染精美”和“真实可发布”。必须严格限制第一阶段块数量和 API 能力数量，复杂互动 SVG、小程序卡片自动插入、投票/视频号等后台组件仍放入后续任务。

## Recommendation

按“并行薄切”进入下一步设计：第一阶段同时交付规则/模板最小集与真实发布链最小集。SVG 互动玩法放入后续实验任务，避免用不稳定技巧污染默认导出链。

## Implementation Checkpoint (2026-05-16)

- 用户已确认 MVP 不再停留在纯研究阶段，而是落地“最小真实发布链 + 最小可见状态”。
- 当前已落地的真实能力包括：凭据状态探测、正文图片上传、封面永久素材上传、草稿创建前校验、草稿创建、ExportModal 真实状态展示、`WechatUploader` 从 stub 切到真实发布服务委托。
- 当前仍明确不做：群发 publish、伪造小程序/视频号/投票等后台专有组件 HTML、复杂互动 SVG 默认发布链、全面模板库/视觉组件库改造。

## MVP Scope

- **规则最小集**：沉淀微信 HTML/CSS/SVG 支持矩阵，统一 `platform-css`、`quality-detector`、文档和测试用例中的规则口径。
- **模板最小集**：至少覆盖标题组、摘要卡、引用/风险提示块、对比表/信息表、时间线、图表图片块。
- **图表最小集**：Mermaid/ECharts/SVG 源默认转 PNG/JPG 发布图，保留源数据和图片失败时的文字摘要。
- **发布最小集**：按用户后续提供的公众号/测试号凭据推进真实调用，实现可执行的 server-side/Tauri 边界，覆盖正文图片 `uploadimg`、封面永久素材 `thumb_media_id` preflight、`draft_add` 草稿 payload 校验、错误码解释。
- **组件最小集**：建立后台组件占位和发布清单，不自动伪造小程序卡片、视频号、投票、音频等专有组件 HTML。
- **凭据最小集**：凭据只允许进入 `inkforge/.env.local` 或后续安全存储；实现只能提交变量名、schema、示例占位、redacted 日志，不提交真实 `appsecret`、access token、media_id 私密值。
- **验证最小集**：静态规则测试 + 本地浏览器复制预览 + 测试号真实正文图片上传/封面素材校验/草稿创建；如果凭据未到位，真实调用项必须诚实标记为 pending。

## Expansion Sweep

### Future Evolution

- 规则库可演进为多平台 `rendering-policy`：微信、小红书、知乎、飞书、公众号长图。
- 模板库可演进为“行业文章组件”：法律意见、投研分析、课程讲义、产品发布、技术教程。

### Related Scenarios

- 与现有 ExportModal / PublishView / PreviewPanel 保持一致。
- 与图片资产管线、Markdown extension、quality-detector、platform-css 合流。

### Failure and Edge Cases

- 微信接口没有凭据、access_token 过期、素材上传失败、账号权限不足。
- 外部图片被过滤、SVG 复制失败、复杂 CSS 被微信后台清理、手机端暗色模式反转异常。
- 小程序卡片、投票、视频号等后台组件无法通过公开 API 伪造。

## Out of Scope

- 不做与本任务无关的大范围 Inkforge 改造；实现仅限用户确认的微信薄切范围。
- 不伪造 `media_id`、草稿发布结果或微信后台组件 HTML。
- 不把复杂互动 SVG 作为默认发布路径。
- 不替代微信后台最终预览；真实发布能力必须经过真实账号/真实后台验证。

## Open Questions

- 当前没有阻塞实现的开放问题；剩余事项见完成审计中的范围外清单。

## Definition of Done

- 研究文件与 PRD 写入任务目录。
- 用户确认 MVP 范围。
- 若进入实现阶段，先运行 `task.py start`，再按 Trellis Phase 2 执行。
- 后续实现必须跑 lint/typecheck/test，并在需要时做真实浏览器/微信后台预览验证。

## Technical Notes

- 当前 `shell=bash` 在本环境落到 WSL 且没有 `python`，Trellis 脚本本轮在 Windows PowerShell 侧执行。
- 当前 `task.py create` 在 PowerShell 输出中出现中文标题 mojibake，但 `task.json` 实际 UTF-8 内容正确。
- 当前仓库 dirty tree 很大；本任务实际改动集中在 `.trellis/tasks/05-14-wechat-rendering-rules-research/**`、`.trellis/spec/backend/**`、`inkforge/src/services/export/**`、`inkforge/src/components/export/ExportModal.vue`、`inkforge/src-tauri/src/commands/wechat.rs` 与相关 Tauri 注册点。
- Memory MCP 未找到专门的“微信公众号 CSS/SVG”项目记忆；Codex 本地记忆中存在 Inkforge 微信发布和前端工作流相关历史，已作为项目边界参考。
- 已在 `inkforge/.env.example` 增加 `WECHAT_APP_ID`、`WECHAT_APP_SECRET` 变量示例，明确只供 Tauri / 本地服务端边界读取。
- 根目录 `.gitignore` 未忽略 `.env.local`，但 `inkforge/.gitignore` 已忽略 `.env`、`.env.local`、`.env.*.local`；因此测试号凭据继续优先放 `inkforge/.env.local`，并仅由 Tauri/本地服务端读取。
## Repair Target - 2026-05-16

The active repair target is the P1 WeChat API validation mismatch found during
the deeper review: local validation must not accept payloads that the current
WeChat `draft_add`, `media/uploadimg`, or `material/add_material` contracts will
reject.

### Repair Scope

- Split article-body image upload validation from permanent-cover material
  validation.
- Enforce article-body image JPG/PNG and 1 MB limit before invoking
  `media/uploadimg`.
- Enforce permanent-cover material BMP/GIF/JPG/PNG and permanent-material image
  limit before invoking `material/add_material`.
- Enforce draft metadata limits before invoking `draft/add`: title 32 chars,
  author 16 chars, digest 128 chars, content source URL 1 KB and HTTP(S), and
  content under both 20,000 chars and 1 MB.
- Align the ExportModal title field with the 32-character WeChat limit.
- Update focused frontend/Rust tests and backend capability contract docs.

### Out of Scope for This Repair Slice

- Cover image picker/upload UI in ExportModal.
- `article_type=newspic`, `image_info`, `cover_info`, and crop-coordinate UI.
- Credential verification against the live token API.
- Access-token cache eviction/retry after endpoint-level invalid-token errors.
- Real WeChat API draft creation without user-provided credentials.

## Rendering Polish + Format/Insert/Style Slice - 2026-05-16

User follow-up: 当前微信渲染仍不够好看，并希望参考 doocs/md 的
“格式 / 插入 / 样式”能力模型。

### Success Criteria

- WeChat export preview has a stronger default visual hierarchy: title,
  section heading, quote, table, figure, image, and code block should look like a
  polished article rather than plain Markdown HTML.
- ExportModal separates style controls from format controls.
- Style controls include font family, font size, primary color swatches, code
  theme, and Mac code block mode.
- Style controls must reach the actual WeChat renderer, not only update local UI
  state.
- Existing editor insert capability must include a real image insert path wired
  to the Asset Pipeline; backend-native WeChat components must not be faked as
  HTML.
- Tests must verify style overrides are applied and unsafe color input is not
  injected into CSS.
- Browser smoke must verify the new controls render in the real ExportModal and
  the preview remains non-empty.

### Scope Boundary

- This slice improves the WeChat export renderer and adds a real editor image
  insert entry point.
- It does not build a complete doocs/md-style top editor menubar.
- It does not generate fake mini-program cards, voting widgets, official-account
  cards, or video account cards.

### Reference Artifact

- `research/doocs-md-format-insert-style-reference.md`
