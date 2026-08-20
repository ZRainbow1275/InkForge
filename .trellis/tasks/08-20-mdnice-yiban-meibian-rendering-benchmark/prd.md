# mdnice、壹伴与美编渲染体验对标研究

## Goal

基于 mdnice 当前 SaaS、壹伴真实微信公众号编辑页行为、美编公开一手资料和 InkForge 当前能力，确定最小、可验证的微信排版优化路线：先证明同一 InkForge 语料经过现有富复制或官方草稿、微信保存、手机预览、Dark Mode 与封面后的真实结果，再只修复有复现证据的共享根因。

## User Value

- 用户看到的是微信最终保存和手机端真实效果，而不是仅在 InkForge 或插件应用态看起来正确。
- 富复制、官方草稿、微信保存和手机结果被分层证明，不再用本地预览、API 成功或“已复制”提示冒充平台保真。
- 复用现有 renderer、主题、SVG、安全和 StyleProof 体系，不为成熟感重复建设模板市场、第二渲染器或高权限浏览器扩展。

## Confirmed Facts

1. 规划期 dirty source 已证明单一 Markdown → WeChat renderer、DOMPurify、Juice、平台后处理、安全 SVG、主题参数、富剪贴板、官方草稿与 preflight/StyleProof。P0 本地实施现绑定 `dev/visual-fixes@51696357`；破坏性的 fixed-sentinel live round-trip/delete/recovery 链已从该基线移除且不作为任务依赖。证据见 `research/inkforge-current-rendering-baseline.md`。
2. mdnice 当前主链路也是同一预览树加 copy-time 规范化、Juice 内联与双 MIME 复制；真正可借鉴的是同源与窄平台分支，不是其旧依赖、模板或 class。证据见 `research/mdnice-current-runtime-evidence.md` 与 `research/mdnice-runtime-rendering.md`。
3. 壹伴在微信原生编辑器内通过 adapter 写入；一次性草稿实测证明其 Markdown 应用态与微信保存重载结果不同：标题/列表保留，引用、粗体与行内代码退回字面 Markdown。证据见 `research/yiban-wechat-editor-runtime.md` 与 `research/yiban-applied-draft-receipt.json`。
4. 壹伴可见的 `50` 个 SVG 素材卡全部带 VIP 标记；唯一无可见 VIP 标记的生成器入口无可观察反应，未取得 SVG applied/save/phone 产物。
5. 美编公开资料足以确认其“扩展注入微信后台 + 官网/素材/账号配套”的工作流，但没有运行态 DOM、SVG 兼容矩阵或微信保存读回；本轮在用户选择收敛规划后保持 deferred。
6. 当前本地 StyleProof 对可选样式和 SVG 管线为 application-ready，但 release 仍因 authenticated PC editor、credentialed channel、phone/Dark Mode 与 cover proof 缺失而 `blocked-by-external`。
7. 当前官方草稿产品入口是 `publishWechatDraft()`：它先重写/上传正文图片、准备永久封面，再调用低层 `createWechatDraft()`。创建结果只返回数量/时间，不返回任意草稿 handle；绑定基线没有任意草稿 readback/delete API，本任务的 corpus 定位与清理只能走唯一短标题 + 正文 sentinel 的可见 UI 流程。
8. 当前官方草稿通道拒绝标题超限、正文 `>=20,000` 字符或 `>=1 MiB`；SVG-heavy 选择可能在写入前即不 eligible。正文图片和永久封面上传也可能产生删除草稿后仍存在的远程素材。

## In Scope

### P0 — 现有通道 exact-artifact 微信闭环

- 建立一个 repo-owned、确定性的微信 fidelity corpus，覆盖标题、正文、行内语义、引用、嵌套/任务列表、表格、代码、公式、图片角色/题注、链接、脚注、Mermaid 和现有写作组件。
- 在实施基线绑定时，从当前 catalog 固定三个已存在且 usable 的代表性选择：普通 inline、SVG-heavy flagship、paste-safe fallback；本地门禁继续覆盖所有 selectable 样式。
- 三个选择均走富复制。官方草稿先对三个选择做**无写入 eligibility/副作用预检**，只执行满足标题、字符/字节、图片与封面条件且得到本批授权的 case；不 eligible 的 case 记录明确 blocked/fallback，不强行写入。
- 当前源码没有该 dry-run owner；P0 先在现有 `wechat-publish.ts` 边界抽取一个无微信写入的 `planWechatDraftPublish()`（最终命名服从绑定基线），让预检命令和 `publishWechatDraft()` 复用同一输入校验、图片分类、唯一上传计数、静态 MIME/扩展名/source 校验与封面判定，并在任何远程上传前完成所有本地 source 规范化和已批准 plan fingerprint 校验。
- 官方草稿使用 `publishWechatDraft()`，但创建后的定位、保存读回和删除采用唯一短标题 + repo-owned 正文 sentinel 的可见草稿列表流程；不伪称已有任意产物的 API readback/delete。
- 分开记录 canonical artifact、channel payload、微信应用态、显式保存后 readback、手机/Dark Mode、封面、草稿 cleanup 和远程媒体 residual state。
- 现有 `PublishView` 作为唯一真实调用桥：冻结当前 input，调用无微信写入 planner，以原生确认展示目标提示、plan fingerprint 与副作用上限；只有用户确认后才把必填 approval 交给 `publishWechatDraft()`。除这条安全闭环外，只对真实保真差异做根因定位。

### P1 — 公式输出决策，条件执行

- 只有 P0 证明公式视觉/语义存在缺口后，才比较当前可读 TeX、source-owned 安全 SVG、现有图片 artifact 三种微信专用输出。
- 证据不足或候选不稳定时保持当前 TeX fallback，不为对齐 mdnice 强行改默认行为。

### Conditional — 编辑页 companion

- 只有现有富复制/官方草稿出现可复现且无法在共享 renderer/channel 边界修复的失败，或用户之后明确要求编辑器内 selection insert，才重新进入独立规划。
- companion 不属于本任务首批实现，也不由本任务预先创建脚手架。

## Requirements

- **R1 Evidence provenance.** 所有结论区分当前运行态、公开一手资料、历史源码、推断和未验证状态；不得把营销声明或应用态 DOM 升级为微信最终证明。
- **R2 Single renderer.** 原始 Markdown 只走 `markdownToWechatWithStats()`，其内部继续复用 `convertToWechatWithStats()`；现有 preview/native/copy/draft 共享该结果，不新增第二 renderer、第二主题 DSL、第二 sanitizer 或重复 catalog。
- **R3 Exact artifact.** `StyleProofArtifact.artifactFingerprint` 继续只标识 canonical renderer artifact。channel payload 与 host semantic readback 使用任务内版本化脱敏 receipt 的独立 semantic fingerprint；三者不得互相覆盖或被写成字节相等。receipt verifier 必须从持久化的规范化摘要重新序列化并计算 fingerprint，不能只验证 SHA-256 字符串形状。
- **R4 Layered truth.** `local-rendered`、`clipboard-copied`、`editor-applied`、`host-saved-readback`、`draft-synced`、`phone-previewed`、`cover-accepted` 与 `published` 是不同状态；前一层成功不自动升级后一层。
- **R5 Host normalization.** 应用态与显式保存重载后的 readback 必须单独采集；保存前看起来正确不能替代宿主读回。
- **R6 Reuse before change.** 优先复用现有 sample/style-proof/manifest/manual-checklist/quality/image/SVG 能力。P0 不给 `StyleProofArtifact` 或 manifest intake 注入未知字段；manifest 只保留现有 `artifactRef`，分层摘要由 task-local verifier 独立校验。
- **R7 Failure-gated code.** 当前源码已证明缺少可执行 dry-run，因此允许先在既有发布边界抽取一个无微信写入的 planner、在当前 `PublishView` 调用点加入一次原生 fail-closed 确认桥，并补聚焦测试；不新增 UI 组件/状态系统。没有真实保真失败不得改 renderer、DOM anchor、样式 token 或公式默认输出。后续差异只在共享根因处做最小修复，不在多个调用点打补丁。
- **R8 No-write preflight.** 每个官方草稿 case 在首次微信远程调用前校验短标题/nonce、正文字符与 UTF-8 字节、图片 host/去重数量、所有可静态判定的 MIME/扩展名/source 兼容性、封面 handle 格式/上传需求、API 凭据目标与当前可见编辑器账号是否一致，以及预计外部副作用；本地 asset/blob source 必须在任何远程上传前全部规范化。账号绑定无法现场确认、任一确定性校验失败或未授权即 blocked。既有 handle 只能标记“格式有效、远端有效性未验证”；账号提示只在现场瞬时比对，receipt 仅保存匹配布尔值和验证方式。
- **R9 Privacy and platform safety.** 不持久化 Cookie、Token、账号标识、凭据、二维码 payload、私有 URL/handle、HAR、原始私有正文或浏览器 profile；禁止发表/群发。草稿、正文图片上传和永久封面素材分别记录副作用与清理能力。
- **R10 External action gate.** 微信写入前必须让用户批准确切 draft case 数、正文图片与永久封面上传上限、手机/封面动作和清理/残留策略；调用现有 `getWechatPublishStatus()` 取得的 API 目标提示必须与用户现场确认的当前可见编辑器账号绑定。登录、扫码、验证码和设备操作由用户在唯一 CloakBrowser/手机上完成。
- **R11 Cleanup recovery.** 每个 case 使用唯一短标题与正文 sentinel；任务内 ledger 记录非敏感 case/state。下一批开始前必须 reconciliation；多候选、响应丢失或删除失败时标为 `cleanup-pending` 并停止，不做广泛删除。
- **R12 Capability provenance.** 每项能力标注 `main committed / dev HEAD committed / dirty-only / external`；实施前必须绑定包含复用能力的明确 commit/branch。
- **R13 Formula fail-safe.** 公式候选必须保留可读 TeX 回退，source-owned SVG 通过现有安全校验，图片走现有 public-HTTPS/image-manifest 边界；任一 gate 失败即退回当前行为。
- **R14 Third-party boundary.** 不复制 mdnice、壹伴、美编的模板 HTML、品牌资产、SVG/path、class/attribute、远程素材、API payload、CDN 或私有实现。
- **R15 Planning gate.** 用户已于 2026-08-21 批准最新规划，实施基线已绑定 `dev/visual-fixes@51696357`，因此允许启动 P0 本地实现；微信写入、媒体上传、手机/封面动作与清理仍须另行批次批准。

## Acceptance Criteria

- [ ] **AC1 Research complete.** mdnice、壹伴、美编证据矩阵完整；壹伴 applied/save/readback/delete receipt 可解析且不含敏感信息；美编运行态明确 deferred。
- [ ] **AC2 Reuse matrix complete.** 当前能力按 `main / dev HEAD / dirty-only / external` 标注，已存在的 renderer、主题、SVG、clipboard、draft、application preflight、StyleProof 与 receipt 不进入重复建设清单；仅新增缺失的 draft publish preflight。
- [ ] **AC3 Planning artifacts complete.** `prd.md`、`design.md`、`implement.md` 收敛，无 blocking open question；两个 JSONL 含真实 spec/research 条目并通过 Trellis validate。
- [ ] **AC4 Baseline bound before start.** task metadata 绑定明确 implementation branch/commit；依赖 dirty-only 能力时先落到可审查基线或重新规划，未绑定时保持 planning。
- [ ] **AC5 Corpus deterministic.** 一个 repo-owned corpus 具有稳定 hash，覆盖 P0 节点矩阵和 source-owned media role；同输入、commit、choice/options 重复生成 canonical fingerprint 一致。
- [ ] **AC6 Local and eligibility gates pass.** application gates/相关测试/typecheck/build 对绑定基线通过；新增无微信写入 planner 被 `publishWechatDraft()`、当前 `PublishView` 和可执行 preflight 命令共同调用。CLI 输出 `wechat-draft-preflight/v1` 完整报告：全部请求 case 都完成分析时 exit `0`，即使部分/全部 ineligible；缺文件、未知参数以外的未处理失败或报告不完整时 exit `1`，未知参数 exit `2`。每个 draft case 在网络写入前冻结 input，展示并确认 input/plan identity、title/char/byte/media/cover eligibility、API/editor 账号目标匹配结果与副作用上限；approval 缺失或 identity 改变均在首次上传前失败。strict release 在外部证据完成前仍正确 blocked。
- [ ] **AC7 Existing channels verified truthfully.** 三个 choice 均完成富复制 exact-artifact apply/save/reload；所有 eligible 且获批的官方草稿 case 通过 `publishWechatDraft()` 创建，并以唯一标题 + 正文 sentinel 找到、读回和删除。至少一个官方草稿 case 必须完成；无 eligible case 时本项保持 blocked。
- [ ] **AC8 Phone and cover verified.** 对每个已执行 case，同一 canonical identity/channel receipt 取得真实手机、Dark Mode 与封面结果；PC DOM、插件样例预览或本地截图不得替代。
- [ ] **AC9 Cleanup and residual state verified.** 草稿删除后立即刷新、至少 `15s` 后复查，最多 `30s` 有界 reconciliation；仍存在则 `cleanup-pending`。正文图片/永久封面若无删除合同，明确记录 `residual-external-media`；若 `publishWechatDraft()` 中途失败导致实际上传数不可观察，则记录批准上限、最后确认阶段、`actualUploadCount: unknown` 与 `residual-external-media-unknown`，并阻断完成声明，不得用预计数冒充实际数或称为完整 absence。
- [ ] **AC10 Fingerprints remain distinct.** manifest 的 `artifactFingerprint` 与 canonical artifact 一致且保留 `artifactRef`；task receipt 使用 `wechat-fidelity-receipt/v1` 和 `wechat-semantic-readback/v1` 分别持久化规范化 payload/readback 摘要与 fingerprint，独立 verifier 重新计算并逐项比对。receipt 字段不经过 manifest intake。
- [ ] **AC11 Root-cause outcome explicit.** 除已确认缺失的共享 preflight planner 外，差异被归类为 renderer、channel preparation、host save normalization、mobile/Dark Mode、cover 或 external-media side effect；只修改被证据指向的共享边界。若无保真缺陷，记录“仅新增发布安全 preflight，无渲染产品改动”。
- [ ] **AC12 Formula decision explicit.** P0 无公式缺口则 P1 不启动；有缺口时产出 TeX/SVG/image 对比和 keep/change 决策，任何 change 都有 TeX fallback 与真实微信回滚证据。
- [ ] **AC13 Truthful final state.** 最终报告明确 application-ready、blocked-by-external 或更高状态的依据；没有手机/账号/发布证据时不得声称 release/publish complete。

## Key Decisions

1. **证据优先，不先加功能。** 首批关闭真实微信 fidelity 不确定性，而不是复制竞品功能面。
2. **代表性三样式，官方草稿 eligibility-gated。** 富复制覆盖三类；官方草稿只写入安全、合规且获批的 case，超限本身就是可观察的 blocked 结果。
3. **应用态与保存读回分离。** 壹伴实测已证明二者可能不同，此合同直接进入 InkForge 验收。
4. **不新增任意草稿 API。** 当前 P0 用唯一短标题 + 正文 sentinel 做可见 readback/delete；若这条人工闭环不足，再另立任务设计 handle API。
5. **不新增媒体副作用。** 优先复用用户明确批准的既有 WeChat-hosted test image 与 cover handle；若需要上传，必须按上限单独授权并保留 residual ledger。调用中途失败且无法观测实际数量时宁可记 unknown 并阻断，也不伪造精确计数。
6. **公式是唯一 P1 视觉候选。** 默认不改；真实微信证据决定 SVG、图片或保留 TeX。
7. **companion 与美编运行态延后。** 当前证据不足以证明它们比复用现有 channel 更有价值。
8. **只实现已证实的缺口。** P0 必须补共享发布 preflight 与现有调用点的一次原生确认；若真实微信没有保真失败，则不再改渲染、样式、公式，不新增 UI 组件或状态系统。

## Out of Scope

- 第二 renderer、第二主题系统、开放模板 DSL、竞品模板/素材导入或任意网页采集。
- 壹伴式账号中心、云笔记、粉丝数据、素材市场、会员、群发、定时发送、AI 面板或远程 H5 authoring。
- `<all_urls>`、cookies、proxy、webRequest 等高权限扩展设计。
- 本任务内新增任意公众号草稿的通用 handle/readback/delete API；人工闭环失败时另行规划。
- 未经单独批准的微信写入、媒体上传、发送到手机、发布、群发或长期保留测试草稿。
- 以 mdnice MathJax SVG、壹伴 SVG 目录 DOM 或美编源码入口推导微信 SVG whitelist。
- 在没有真实用户样本前建设 URL/HTML/Word 导入器。

## Risks and Deferred Items

- 主工作树仍有大量用户既有 dirty changes；P0 只在绑定 commit 的隔离工作树实施，不从主树 dirty overlay 取能力。该风险已从启动阻断降为持续隔离约束。
- 微信编辑器、保存 sanitizer、手机和封面行为可能随平台更新变化；外部证据必须带时间并遵循 freshness 规则。
- SVG-heavy canonical HTML 可能超过当前官方草稿 `<20,000` 字符限制；计划以 preflight blocked/paste-safe fallback 表达，不绕过通道限制。
- 正文图片上传和永久封面素材当前没有纳入草稿删除闭环；缺少预批准 media binding 时官方草稿媒体 case 保持 blocked。
- API 凭据目标与当前 CloakBrowser 可见编辑器账号无法以非敏感方式现场确认一致时，官方草稿 case 保持 blocked；不得写入后再猜测目标账号。
- `publishWechatDraft()` 中途失败不会返回此前已成功上传的精确数量；此时只能保留批准上限和 unknown residual 状态，不能完成该 batch。
- 美编运行态、免费 SVG applied/save/phone、公开发布页和 companion 均 deferred；它们不阻断 P0 规划收敛。
