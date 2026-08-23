# 微信原生媒体、Tauri 原生交互与小红书知乎真实渲染验收

> 阶段：Trellis Execute（本地审查整改中；外部账号门禁 blocked）
> 父任务：`08-02-rendering-editor-wechat-design-system-parent`
> 优先级：P0

本子任务是用户在父任务既有收口之后明确批准的范围扩展；父任务此前将原生媒体和 XHS/Zhihu
账号实测列为 out of scope 的历史结论不覆盖本任务。本任务 PRD 只扩大编辑器验收，不追溯改写父
任务已有证据，也不扩大到发布。

## Goal

在不引入第二套 renderer、store、文章模型或平台私有模板的前提下，完成三个真实闭环：

1. 微信正文图片、封面和草稿继续走官方 API；歌曲、公众号名片、关联文章及其他微信原生媒体
   使用现有真实组件数据和平台编辑器完成可验证的原生插入/读回，不再把静态仿制卡片冒充原生。
2. 在最终 release Tauri / WebView2 软件中关闭窗口、停靠、悬浮、关闭重开、键盘、焦点、动画与
   `prefers-reduced-motion` 的剩余验收门禁。
3. 使用最终 release 的精确小红书与知乎产物，在已登录的真实编辑器中完成粘贴/导入/上传、视觉
   和 DOM 读回；不点击发布，由用户保留最终发布验收权。

完成后，用户可以直接在软件中继续调试渲染；报告能够准确区分本地通过、平台编辑器已渲染、
平台原生手动插入、阻断和未发布，任何本地或浏览器证据都不会被外推成发布成功。

## Reused Authority

- 市场规则：`docs/platform-rendering-rules/market-practices-catalog.md` 已完整沉淀 135、秀米、
  doocs/md、mdnice、TypeZen 与三平台经验。本任务不重复泛化调研。
- 单一转换入口：`convertToNativeFormat()`；三平台继续使用现有 converter、quality detector、
  artifact manifest 和 style-proof audit。
- 组件权威：现有 writing-component registry、canonical JSX、TipTap `InkComponent`、Zod validator
  和 stable serializer。
- 自动首尾权威：现有 delivery-adornments Settings snapshot、slot resolver 和 report。
- 微信服务边界：现有 Tauri command / local service、正文图片上传、永久封面素材、草稿创建和
  错误码处理。
- 原生壳权威：现有 Workstation layout state、layout persistence、desktop service、allowlisted
  inspector utility window、WDIO/Tauri release harness。

## Product Invariants

1. 不新增第二套渲染器、主题 DSL、组件注册表、窗口管理器、平台发布器或重复文章状态。
2. 现有 preset、variant/profile、writing component、文章、设置、素材、历史和快捷键不得删除或
   重命名；修改必须向后兼容。
3. 歌曲、名片、作者、图片、链接、媒体 ID、平台账号和平台状态只来自真实用户数据、官方响应或
   当前已登录编辑器读回；缺失即省略、降级或阻断。
4. 微信原生组件不能靠私有标签、复制平台 DOM、仿制视觉或 sanitizer 放行来证明绑定成功。
5. XHS 权威产物是纯文本与 raster/manifest；Zhihu 权威产物是 clean Markdown 与真实图片
   fallback。不得把 WeChat HTML/SVG 或本地 preview HTML 作为两平台产物。
6. 产品调试和最终截图来自 release Tauri/WebView2；CloakBrowser 仅用于真实平台编辑器外部门禁。
7. UI 图标继续使用已安装图标库或项目自有 SVG path，禁止 Emoji 图标。
8. 证据不保存 Cookie、Token、二维码、HAR、profile 路径、账号 chrome、私有草稿、平台私有 DOM
   或真实资源 ID。

## Requirements

### R-01 单一 artifact 与证据链

- Workstation、Export、Publish 准备、clipboard 和三平台测试都从当前文章修订、平台、preset、
  typography、writing components、delivery 和 assets 构造同一等价的 artifact options。
- 所有平台输出继续经 `convertToNativeFormat()`；不得为实测另写测试专用 renderer 或拼接模板。
- 静态平台编辑器证据拆成两条可连接 receipt：
  1. `releaseArtifactReceipt`：current final EXE SHA-256 + producer hash → exact artifact hash；
  2. `platformReadbackReceipt`：exact artifact hash + platform/ingress/target surface → 外部读回。
  Native shell 不经过 artifact，直接绑定 current final EXE/runtime receipt。
- EXE 变化时先失效 `releaseArtifactReceipt` 和 shell receipt；新最终 release 若逐字节复现相同 artifact，
  可重新连接仍有效的 `platformReadbackReceipt`。若 bytes、ingress 或目标合同变化，则 platform receipt
  `invalidated` 并重跑。docs/evidence-only 变更不失效。
- WeChat 有副作用的 API 不复用静态 artifact 规则：`wechatApiLiveReceipt` 绑定 current final EXE、
  backend/service hash、Schema、cleanup protocol version、脱敏账号能力指纹及本次 live round-trip。
  其中任一变化都必须重跑 add/get/delete/reconcile；相同 request bytes 不能替代 live proof。

### R-02 微信官方 API 媒体绑定

- 正文图片继续通过真实微信正文图片上传接口取得可用 URL，并在最终 HTML 中完成 URL 替换和
  读回；本地、`blob:`、`data:`、私网或未上传图片不得被报告为平台 ready。
- 封面继续使用真实永久素材和 `thumb_media_id` preflight；不存在、权限不足或错误码必须可见并
  阻断草稿创建。
- 草稿创建继续由 Tauri/local service 执行，凭据不进入 Web runtime；真实返回和错误码进入现有
  publish/audit 状态，不用成功 toast 代替 readback。
- 草稿 live gate 由单一 backend-only 受限操作执行 `draft_add → getDraft → draft_delete → getDraft
  absence readback`。Vue/Web runtime 不获得通用 get/delete command，也不接收 `media_id`；只得到
  hash/count/error/cleanup state 组成的脱敏 receipt。
- Backend 在 add 前创建 operation intent，生成非敏感唯一 operation marker，并把 marker 嵌入专用
  仓库校准草稿的可读字段；不修改用户文章。获得返回 ID 后立即原子更新当前 Tauri app-data 下的
  私有 `cleanup_pending` journal，并在 `finally` 删除且确认 absence。
- 启动/重试先用 backend-only 官方 draft batch list 按 marker + payload hash 唯一重识别并清理。零个/
  多个候选、列表权限缺失或无法可靠匹配时不得猜测删除，保持 `blocked` 并显示明确人工清理步骤；
  人工清理也必须通过 marker absence readback 才关闭。journal 不进入 IndexedDB、ActivityLog、日志、
  导出或仓库，确认 absence 后删除。
- Recovery 固定 `count=20`、`no_content=0`，从 `offset=0` 遍历至完整 `total_count`；分页不前进、
  `item_count` 异常或中途错误均为 blocked，不能按“零候选”处理。`canonicalDraftRecoveryHash` 只使用
  服务端清洗后仍稳定可读的 article type、规范化 title/author/explicit digest、marker 与正文可见文本
  sentinel；排除 media ID、临时 URL、update time、HTML 属性顺序和服务端生成字段。
- 以当前官方字段为准执行 parity preflight：`digest` 最多 120 个字，并用 120/121 边界测试锁定；
  前端、Rust、spec 或测试仍接受 121–128 时先修共享 Schema，再调用真实 API。
- 复用现有服务和 Schema。只有当前字段不足以承载官方返回时才做最小向后兼容扩展，不创建新的
  WeChat client 或媒体数据库。

### R-03 微信原生歌曲、公众号名片和媒体交接

- `SongBlock`/delivery song、`MpProfile`/contact-card、`ArticleBlock`、`WechatMedia` 等继续使用
  当前真实组件数据和 canonical source；正文组件保留用户插入位置，自动 song/profile 槽保持现有
  masthead/end 顺序和去重规则。
- 每个当前 registry definition 在最终 report 中必须得到明确 disposition：可安全富文本、静态
  fallback、平台原生手动插入或阻断；遗漏、空输出或伪原生均失败。
- 覆盖矩阵从运行时 registry 动态枚举 `registry ID → disposition → fallback → handoff → local/external
  evidence`，不得维护第二份手写组件清单；未知、重复、缺失或未执行行直接失败。
- 对官方 API 未提供稳定字段的歌曲、公众号名片、文章/视频等原生组件，InkForge 生成可操作的
  handoff：组件类型、正文锚点、真实可见名称/标题、所需字段、预期平台动作和完成状态。
- 同类型组件的 handoff 不使用 registry type ID 冒充实例 ID。每次最终 artifact 从规范化 AST 派生
  临时 occurrence key（至少含 artifact hash、AST ordinal、component type 与 props hash），并要求
  锚点唯一；歧义、重复或无法定位时 fail closed。该 key 不写回文章、Settings 或新 store。
- 在已登录微信公众号 PC 编辑器中，使用真实可用条目执行原生插入并读取目标正文 surface 的可见
  标题/昵称/组件类型与顺序。不存在真实条目或账号权限时保持 `manual-native-insert`/`blocked`，
  不能用假数据补齐。
- 普通 HTML 静态卡仍可作为可读 fallback，但 UI 和 report 必须明确它不是原生歌曲/名片/媒体。
- 不点击手机预览、定时、群发或发布；测试结束清空或丢弃一次性编辑内容。

### R-04 原生窗口与停靠生命周期

- Manager、Stage、Inspector 的折叠/展开、固定/悬浮、in-app float、allowlisted Tauri utility
  window、关闭、重新打开和重新停靠都使用当前真实状态与数据源。
- 关闭悬浮/侧载窗口后原内容、滚动、当前平台、当前 preset、选区和编辑焦点不丢失；重新打开不出现
  空壳、重复卡、不可点击遮罩或布局跳变。
- 未固定 Inspector 的 hover reveal 不改变编辑纸张 geometry；固定/停靠才占据布局列。
- 合法持久化状态在软件重启后恢复；非法或过期 bounds/state 经现有 Schema/边界回退，不把窗口
  恢复到不可见屏幕或负尺寸。
- Web runtime 继续诚实降级，不伪造 native window success。
- 先从当前能力表生成有效行，而非对全部状态做笛卡尔积：Manager/Stage 只覆盖 collapse/expand；
  Inspector panel 覆盖 pin/hover/collapse；Inspector widget 覆盖 dock/float/native/close/redock。
  每行记录 expected state、geometry、focus、persistence、motion 与 release readback；新增能力必须先
  进入同一能力表，unsupported 只能显式记录，不能为过矩阵发明窗口能力。

### R-05 键盘、焦点与输入命中

- Tab/Shift+Tab、Enter/Space、Escape、方向键和现有快捷键在 manager tabs、Inspector widget、
  浮动/原生窗口、delivery/component controls 与编辑器之间形成可预测顺序。
- 打开面板/窗口后焦点进入可操作标题或首控件；关闭/重新停靠后恢复到原触发器或原编辑选区。
- Escape 只关闭当前最上层可关闭 surface，不同时退出 Focus mode、丢失编辑选择或触发系统菜单。
- 输入证明使用真实 OS/Tauri pointer/keyboard hit testing 与当前 editor surface，不以脚本 `.click()`、
  注入 selection 或只检查 DOM 存在冒充交互成功。
- IME、现有 editor keymap、Command Palette、Focus/Typewriter 模式和全局快捷键不得回归。

### R-06 动画、竞态与 reduced motion

- 展开、折叠、停靠、悬浮、关闭和重新打开等待真实 transition/layout completion；禁止用固定 sleep
  掩盖竞态。
- 连续快速切换至少 10 轮后只保留最后请求状态，不出现旧面板回写、焦点漂移、双层遮罩或 editor
  geometry 累积偏差。
- effective reduced motion 为产品持久化设置 `settings.appearance.reducedMotion` 与 OS
  `prefers-reduced-motion: reduce` 的逻辑 OR；任一开启即关闭非必要位移、缩放、呼吸和滚动动画。
  状态变化、焦点环和可见反馈仍保留，等待逻辑不能因为 transition duration 为零而挂起。
- 覆盖四种 authority 组合：仅产品设置、仅 OS、两者都关闭、effective reduce 且实际 transition
  duration 为零；DOM class/data 与 JavaScript wait 必须读取同一 effective 结果。
- 默认 motion 下动画平滑但不阻断输入；若多个现有调用点需要相同等待，仅复用/扩展现有最小 helper，
  不引入动画库。

### R-07 小红书真实编辑器渲染实测

- 从最终 release 导出同一真实验收稿的 XHS 纯文本及至少一套真实图片页/长图 artifact pack；
  manifest 的页序、尺寸、格式、bytes、cover、裁切和正文图号引用全部通过现有 validator。
- 实施前先证明 release Export 路径可调用现有 card slicer、raster/file writer 与 manifest constructor
  写出真实文件；`convertToNativeFormat()` 仅接收/校验 caller-supplied manifest 不算产物能力。若该
  生产接线未完成，AC-08 预先保持 `blocked`，不得从测试 helper 或历史 evidence 拷贝文件。
- 在已登录小红书真实创作编辑器中使用该精确产物完成正文粘贴与图片上传/排列；不使用 HTML、
  inline SVG、raw Markdown 或测试脚本直接改 editor state。
- 视觉与 DOM/readback 必须确认标题/正文未丢失、段落顺序正确、无控制符泄漏、图片顺序与 manifest
  一致、无裁切/重叠，并绑定 artifact fingerprint。
- 平台限制若与市场默认值不同，记录当前账号可见事实并留在可配置 checklist；不把 18 图、20MB
  等市场值硬编码为永久合同。
- 停止在发布前，不点击“发布”或等价按钮；平台发布状态保持 false。

### R-08 知乎真实编辑器渲染实测

- 从最终 release 导出同一真实验收稿的 clean Markdown 与所需真实图片 fallback/manifest；最终
  Markdown 不含 WeChat wrapper、inline style、inline SVG、本地/`data:`/私网/临时 URL。
- 实施前先证明 release Export 路径能用现有 image pipeline 写出 Zhihu fallback bytes 与 manifest；
  只构造或验证 caller-supplied manifest 不算产物能力。未接线时 AC-09 保持 `blocked`。
- 通过当前知乎编辑器实际提供的 paste/import/upload 入口导入精确产物；不通过脚本写入 Draft.js
  state，不把本地 preview HTML 当成知乎成功。
- 读回标题、H1–H6、段落、强调、列表、引用、代码语言、表格、公式以及图片 alt/caption。若当前
  入口不能把某个 Markdown 语义转为编辑器 block，必须显式记录 manual/blocked，不隐藏 raw syntax。
- 需要图片时使用真实平台上传返回或可访问 HTTPS；上传后的正文引用与 manifest 对齐。
- 停止在发布前，不点击“发布”或等价按钮；平台发布状态保持 false。

### R-09 文档、规则与无敏感证据

- 更新相关 spec/docs，记录最终微信原生媒体 disposition、Tauri 交互合同、XHS/Zhihu editor
  readback 和仍未证明的边界。
- 复用现有 typed style/component/proof catalog；只补缺失规则或查询，不再维护手写重复列表。
- 证据只保存脱敏结构、哈希、计数、目标类型、无账号正文的安全裁切或文本报告。
- XHS/Zhihu 发布、WeChat 手机/Dark Mode/同步/定时/群发均保持独立未验证状态。

## Acceptance Criteria

- [x] AC-01：三平台全部通过现有 `convertToNativeFormat()`；没有新增 renderer、store、平台 client、
  theme DSL 或重复 component registry。
- [ ] AC-02：微信真实正文图片 URL、永久封面素材、`thumb_media_id` 和草稿路径在 release 软件中
  通过成功/失败 readback；单一 backend-only 操作完成 `add → get → delete → absence readback`，
  crash/restart 通过 marker + payload hash 唯一重识别 `cleanup_pending`；unknown outcome 保持 blocked
  直至人工清理和 absence readback。Web 无任意 ID 读删能力，`digest` 120/121 边界通过，凭据与真实
  `media_id` 不进入前端、日志或证据；batch list 全量分页、`no_content=0`、>20 草稿及服务端规范化
  后 canonical hash 回归通过。
- [x] AC-03：由真实 registry 动态生成的全组件矩阵逐 ID 对账 disposition、fallback、handoff 和
  evidence；未知、遗漏、静默空输出均失败，歌曲、名片、文章和媒体没有伪造原生 HTML、假 ID、
  假封面或假成功；每个实例使用唯一临时 occurrence key，歧义锚点 fail closed。
- [ ] AC-04：至少一项真实歌曲和一项真实公众号名片/媒体在微信公众号目标正文 surface 完成原生
  插入与可见/DOM 读回；不可用项必须明确为 `manual-native-insert` 或 `blocked`，但这些状态不能勾选
  AC-04，任务保持未完成，静态 fallback 仍可正常使用。
- [x] AC-05：由当前能力表动态生成 shell 矩阵：Manager/Stage collapse/expand，Inspector panel
  pin/hover/collapse，Inspector widget dock/float/native/close/redock；每个有效行的 state、geometry、
  focus、persistence、motion 与适用的重启恢复均在最终 release 通过，未知/缺失/未执行行失败。
- [x] AC-06：鼠标命中、Tab/Shift+Tab、Enter/Space、Escape、现有快捷键和编辑焦点/选区恢复通过；
  不以脚本点击或 DOM 存在替代真实输入。
- [x] AC-07：产品设置与 OS 偏好按 OR 合并；仅产品、仅 OS、均关闭、effective reduce/零时长四组
  行为通过，10 轮快速切换只提交最后状态且无可见竞态。
- [ ] AC-08：release Export 真实写出 XHS 精确纯文本和 raster 文件/manifest，再在真实编辑器完成
  粘贴/上传/顺序/裁切/泄漏读回；测试 helper/历史文件不可替代，发布未触发。
- [ ] AC-09：release Export 真实写出 Zhihu clean Markdown 和图片 fallback bytes/manifest，再在真实
  编辑器完成语义/图片/公式/代码/表格读回；未转换语义被诚实标记，发布未触发。
- [x] AC-10：聚焦 Vitest、完整 export 串行 suite、精确 ESLint、`vue-tsc`、生产 build、Tauri release
  build、目标 WDIO native E2E、application preflight 和 GitNexus `detect_changes` 全部通过；
  `not-run`、`blocked`、`invalidated` 或失败均不能勾选本项。
- [ ] AC-11：静态平台用 `releaseArtifactReceipt` 证明 current final EXE → exact artifact，再由
  `platformReadbackReceipt` 证明 exact artifact → 平台读回；只有 exact hash/ingress/target 不变才复用
  后者。WeChat API 使用独立 `wechatApiLiveReceipt`，绑定 current EXE、backend/schema、cleanup protocol
  与脱敏账号能力；任一变化都重跑 live round trip，不能靠相同 request bytes 复用。
- [x] AC-12：spec/docs/evidence 完成收口，敏感扫描无 Cookie、Token、二维码、HAR、profile、账号
  chrome、私有草稿、临时路径或真实平台资源 ID。
- [x] AC-13：最终报告逐项区分 `not-run`、`local`、`platform-editor-rendered`、
  `manual-native-insert`、`blocked` 和 `invalidated`；`published=false` 是独立布尔边界。只有相应
  required gate 的精确成功状态才能勾选 AC，不把浏览器编辑器渲染外推为手机、同步或发布成功。

## Out of Scope

- 小红书、知乎发布、自动互动或自动账号运营；
- 微信手机预览、Dark Mode、封面视觉缩略图/裁切/手机端预览、授权同步、定时、群发和发布；
- 逆向或调用微信、小红书、知乎的私有发布 API，复制平台私有 DOM/模板或保存账号凭据；
- 新增第二套 renderer、窗口管理器、组件注册表、文章模型、主题系统或运行时模板解释器；
- 删除、重命名或迁移任何现有 preset、组件、功能、文章、设置、素材或历史；
- 再次进行无明确缺口的 135/秀米/doocs/md 泛化研究。

## Risks and Stop Rules

1. **平台原生能力受账号/灰度影响**：真实条目或权限不可得时保持 blocked，不能降级验收标准。
2. **外部证据易失效**：产品修复必须先完成，最终 release 后再测三平台；后续改动要求重跑。
3. **Workstation 共享范围大**：每个共享符号编辑前做 GitNexus impact；HIGH/CRITICAL 先报告再缩小。
4. **dirty worktree 很大**：精确路径 diff，禁止 reset、广泛格式化、`git add .` 或顺手清理无关代码。
5. **本机资源有限**：重型 Vitest/export/build/Tauri/WDIO 串行执行，限制 worker，避免浏览器和构建并发。
6. 用户未批准本规划最终摘要前保持 `planning`，不运行 `task.py start`，不编辑产品代码。
7. 任一 required external row 为 `not-run`、`manual-native-insert`、`blocked` 或 `invalidated` 时，
   对应 AC 保持未完成；边界记录不能替代通过。

## Confirmed Decisions

1. 复用已经完成的 135、秀米、doocs/md、mdnice 与三平台研究，不重新复制或发明模板。
2. 微信歌曲/名片/原生媒体采用“真实语义绑定 + 平台编辑器原生插入 + 静态安全 fallback”的混合
   策略；官方 API 能力只用于其公开支持的图片、封面和草稿字段。
3. XHS/Zhihu 做真实编辑器渲染实测，但不发布；最终发布由用户手动完成。
4. 原生交互以 release Tauri/WebView2 为验收主体，浏览器不作为最终软件。
5. 一个子任务承载三个独立切片，共享最终 release 和证据契约，不再拆出重复子任务。
