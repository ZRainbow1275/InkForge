# Implementation Plan — 微信编辑组件同形与文前文末渲染完善

## 1. Start gate

- [x] 用户已同意创建 Trellis 任务并进入规划。
- [x] 已核验既有 writing component、TipTap atom、masthead、delivery adornment、preview/export
  和 16 preset 链；本轮不是从零重写。
- [x] 已以官方 `doocs/md` 当前源码核验声明式组件、属性填写、JSX 插入和单 registry 渲染模式。
- [x] 用户审阅本任务最终 Goal、范围、验收和技术边界，并在后续消息明确批准实施。
- [x] 仅在批准后运行 `task.py start`；批准前不编辑产品代码。

## 2. Pre-edit protocol

- [x] 主线程实施前运行 `trellis-before-dev`，重读本任务 PRD/design/implement、curated context 和
  适用 frontend spec；sub-agent worker 使用已验证的 JSONL 原生注入，不重复加载同一 skill。
- [x] 记录当前 branch、dirty worktree 和精确目标文件，保护用户已有 257 项无关修改。
- [x] 重新确认 GitNexus index 与当前 commit 一致；对每个拟修改函数/类/方法运行 upstream impact。
- [x] GitNexus 返回 HIGH/CRITICAL 时先报告直接调用者、受影响流程和更小的共享根方案，再编辑。
- [x] 每个切片先补一个能失败的最小回归；不通过时修产品根因，不放宽断言或引入 mock。
- [x] 不新增依赖、renderer、store、文章字段或 preset ID；需要新增文件时先证明现有文件无法承载
  单一职责。

## 3. Ordered implementation slices

### Slice A — Delivery slot resolution and backward-compatible media fields

- [x] 只在现有 delivery service 增加最小纯槽位解析，并固定顺序为 Schema parse → 原顺序 duplicate
  ID 首项保留/后项 invalid report → eligibility → slot promotion → remainder/report；不建立跨 domain
  第三模型。
- [x] song eligibility 固定为 `enabled + title + safe URL`；contact-card eligibility 固定为
  `enabled + displayName`，其 URL/account/description/avatar/QR 均为可选增强。第一条不完整记录不能
  遮蔽后续 eligible 记录。
- [x] `getDeliveryMastheadSong()`、suffix、editor projection 和 report 共同消费一次解析结果，不在
  masthead/suffix 两处重复 `.find()` 或重复 safeParse。
- [x] 复用现有 Zod schema、writing registry metadata、URL normalization 和 report status；不复制
  field definition、renderer 或表单状态。
- [x] 向现有 `SongBlock`/delivery song 添加可选真实 HTTPS `coverUrl`；向 `MpProfile`/delivery
  contact-card 添加可选 `avatarUrl`、`qrImageUrl` 和简介字段。缺失即省略，旧 source/config 不迁移。
- [x] 建立 song 提升、contact-card 自身公众号槽、显式 body component 不搬运、重复 ID 不重复输出
  和多余 contact-card 不静默丢失的失败优先测试。
- [x] 保持旧 delivery snapshot、旧 JSX、未知/旧版本 source 和全部现有组件 round-trip 不变。
- [x] 不新增 YAML/frontmatter 字段；现有 preset-owned colophon 仍由最终 converter 生成且只出现一次。

### Slice B — One real WeChat composition, masthead order, and end profile

- [x] 调整现有 masthead builder：brand lead 后渲染可选真实歌曲，再渲染 preset identity/title，最后
  渲染真实阅读分钟、字数、分类和大于零的扩展统计。
- [x] 移除歌曲位于整个 masthead 之前的游离结构；继续使用 `mastheadComponentId` 阻止 suffix 重复。
- [x] 让 brand lead、阅读分钟、字数和分类使用稳定、微信安全、非 float 依赖的可读结构；阅读分钟
  关闭时自然收拢，全文真实字数继续显示。
- [x] 将自身公众号名片/follow fallback 放在正文后、来源/关联内容前、CC 和 colophon 前；字段
  不完整时按既有 report 语义省略并提示，不生成假原生标签。
- [x] 在 Workstation 从当前 Settings/appearance/title/category/preset 构造一次 immutable artifact options
  snapshot，右侧微信 preview 与快捷复制都把同一 snapshot 交给现有 `convertToNativeFormat()`。
- [x] 让 `convertToNativeFormat()` 的 WeChat 分支委托 `markdownToWechatWithStats()` 并在现有结果上
  返回同次转换的 `content`、可选 `stats` 与 delivery report；不新增第二 artifact API。
- [x] 将 `usePreviewRenderer` 的微信分支改为消费该 native artifact；`renderWechatMockHtml()` 只包软件
  容器。删除 preview 内重复的 options、masthead/song/stats/suffix composition。
- [x] 扩展现有 `PreviewMeta` 暴露同一 artifact stats，供编辑投影下传复用；XHS/Zhihu 分支保持不变。
- [x] 让 converter HTML 与 stats 复用现有 preview token 原子提交；过期 token 同时丢弃两者，避免
  新正文显示旧字数/阅读时间。
- [x] WeChat live article 空正文时停止注入 preset sample，返回真实空 artifact/明确软件空态和零值；
  preset sample 只留在预设浏览语境，不能进入编辑投影、复制或 export history。
- [x] 为 HTML/text/Markdown 输出、unsafe URL、缺失字段、幂等、固定槽位顺序及 preview/export
  normalized DOM/inline-style parity、非默认 delivery/typography/readingSpeed、相同宽度布局、空正文
  和 stale-token stats 补聚焦回归。
- [x] 增加纯本地 XHS/Zhihu 负向回归：其输出不得出现 WeChat root、masthead、delivery HTML、
  WeChat inline CSS/SVG；不执行账号上传、预览或发布。

### Slice C — Shared-renderer TipTap cards and editor front/end projections

- [x] 从现有 `renderWritingComponentSource(source)` 提取 wrapper-free definition visual body；
  `InkComponent` NodeView 只复用该 body，并由唯一 atom 外层持有 canonical source/data sentinel。
  用一层 editor-only chrome 覆盖全部现有注册项，不写 17 套平行模板或嵌套 canonical section。
- [x] `ready` 状态才显示 renderer body；invalid/unknown/unsupported 保留 canonical source、错误和
  可恢复编辑入口。visual links 移出 Tab 序列并截获 pointer/click/Enter/Space；`stopEvent` 只允许
  editor chrome 控件，不得破坏 atom 选择、拖拽、方向键、删除或编辑后焦点恢复。
- [x] 保持 atom selection、drag、edit、delete、keyboard、`aria-invalid`、source serialization、
  Typora/Source 切换和自动保存行为。
- [x] 在 `editor-paper` 的 TipTap 挂载点前后加入只读但可配置的 delivery 投影；不进入正文、字数、
  undo history 或 Markdown。
- [x] 从 Workstation 下传已有 article category 与 WeChat converter stats；EditorPanel 不新建分类查询、
  renderer 或第三份阅读统计。
- [x] 投影按钮复用现有 `DeliveryAdornmentPanel`/组件库配置入口和 canonical Settings；不得增加
  第二份表单状态。
- [x] Source 模式只显示稳定 source 与紧凑 delivery 状态，不内嵌最终微信 HTML。
- [x] 为 selection、focus restore、empty state、disabled state、error targeting 和 no-duplicate
  DOM 增加聚焦回归。

### Slice D — Sixteen-preset component differentiation

- [x] 为 shared masthead song、metrics、writing component 和 end profile 暴露稳定 class/data hook。
- [x] 复用现有 visual variant/profile/preset CSS 扩展，不复制 16 份 renderer 或完整模板。
- [x] 按 design.md 的 16 行合同验证每个 preset 至少三个组件差异维度，并保留共同品牌锚点；
  fingerprint 比较前移除 preset ID/名称、正文文本、数字和纯颜色，防止伪唯一。
- [x] 用同一真实全元素文稿验证 H1–H6、段落、强调、引用、列表、表格、代码、公式、图片/题注、
  全部 writing component、来源、CC、SVG 和 colophon 无回归。
- [x] 验证 320/375/390/586px 无横向溢出、重叠、异常大空白或浅底浅字。

### Slice E — Native software and real WeChat PC acceptance

- [x] 串行运行目标回归、完整 export、ESLint、类型检查、生产构建和 Tauri release build，控制内存。
- [x] 启动新构建的 release `InkForge.exe`；在软件中逐套查看编辑画布、右侧预览、组件编辑、
  song/metrics/end profile 开关与错误状态。
- [x] 对 16/16 套完成 native preset/variant/structure 读回与同一全元素文稿的逐屏视觉检查；不以
  只检查一套基础和四套旗舰替代全部预设。
- [x] 只使用现有单一 CloakBrowser 登录会话打开真实微信公众号 PC 编辑器；由 release 软件现有
  “复制微信富文本”写入系统剪贴板，再普通 Windows `Ctrl+V`。
- [x] 在微信 PC 中对 16/16 完成结构/组件/溢出读回，并对一套基础预设与四套旗舰完成全篇可见
  核对；其余预设的完整审美验收已在 native release 软件中完成，不能互相冒充。
- [x] 读回关键文本、song/profile fallback、metrics、结构指纹、scripts、overflow 和 sanitizer
  结果；不保存账号正文、Cookie、Token、二维码、HAR、profile 或临时截图路径。
- [x] 每套结构化记录 release EXE SHA-256、preset/variant、artifact HTML SHA-256、粘贴后去身份 DOM
  SHA-256、关键 sentinel/组件计数、script/event-handler 计数、`scrollWidth/clientWidth` 和结论；
  每轮先清空测试正文，再由软件复制并普通 `Ctrl+V`，禁止复用历史证据。
- [x] Tauri 只使用非敏感确定性验收文稿并可保存内容区证据；微信只保存结构化去身份读回，或经
  复核的正文区域裁切图。账号 chrome、二维码、私有草稿和浏览器/profile 路径不得入库。
- [x] 在 release 软件中连续执行至少 10 次正文快速编辑与 preset 切换，记录 preview render p50/p95；
  只允许最后 token 写回，输入、选择、滚动和复制按钮不得出现可见卡死。无证据前不新增缓存层。
- [x] 不点击保存、手机预览、同步、定时、群发或发布；不执行小红书/知乎账号测试。

## 4. Expected change surface

以下是实施前的预期候选，不代表全部都会修改；以 GitNexus impact 和实际共享根为准：

- `inkforge/src/services/export/utils.ts`
- `inkforge/src/services/export/index.ts`
- `inkforge/src/services/export/types.ts`
- `inkforge/src/services/export/delivery-adornments.ts`
- `inkforge/src/services/writing-components.ts`
- `inkforge/src/extensions/InkComponent.ts`
- `inkforge/src/components/editor/EditorPanel.vue`
- `inkforge/src/components/export/DeliveryAdornmentPanel.vue`
- `inkforge/src/composables/usePreviewRenderer.ts`
- `inkforge/src/services/export/themes.ts`
- `inkforge/src/services/export/visual-variants.ts`
- `inkforge/src/views/WorkstationView.vue`
- 与上述共享根直接对应的现有测试和 spec 文档。

禁止顺手修改首页、设置、同步、AI、检查器、发布中心、小红书或知乎无关代码。

## 5. Validation commands

聚焦回归按实际变更收敛，至少包括：

- Workstation 真实快捷复制入口与 preview 使用同一 options snapshot/artifact，并覆盖非默认
  delivery、typography、readingSpeed、SVG 与 Custom CSS；
- 旧/新 delivery Settings snapshot 的 parse/persist/reload round-trip；
- NodeView 的选择、编辑、删除、拖拽、键盘、undo、Markdown 序列化、自动保存与重开；
- 空正文无 sample stats、快速连续编辑/切 preset 只提交最后 token，以及 XHS/Zhihu WeChat 泄漏负测。

```bash
pnpm -C inkforge exec vitest run \
  src/extensions/InkComponent.test.ts \
  src/services/writing-components.test.ts \
  src/services/export/writing-components-platform.test.ts \
  src/services/export/article-masthead.test.ts \
  src/services/export/delivery-adornments.test.ts \
  src/services/markdown-ext/writing-components.test.ts \
  src/composables/usePreviewRenderer.test.ts \
  src/services/export/visual-variants.test.ts \
  src/views/__tests__/WorkstationView.desktop-layout.test.ts \
  --reporter=default --maxWorkers=1 --no-file-parallelism

pnpm -C inkforge exec vitest run src/services/export \
  --reporter=default --maxWorkers=1 --no-file-parallelism

pnpm -C inkforge exec eslint <exact-changed-source-and-test-files> --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge exec tauri build
pnpm -C inkforge style-proof:application-preflight
```

若 build 改写 `inkforge/tsconfig.tsbuildinfo`，仅恢复该生成文件；不广泛还原工作树。

## 6. Review and evidence gates

- [x] 运行 GitNexus `detect_changes(scope=all)` 并以 exact diff 区分本任务与既有 dirty changes。
- [x] 两名独立只读 reviewer 分别审查正确性/回归和范围/证据；主线程处理 findings 后重跑最小检查。
- [x] `git diff --check` 对精确任务文件和产品文件通过。
- [x] 敏感扫描确认没有账号、Cookie、Token、二维码、HAR、浏览器 profile、临时截图路径、私有
  草稿正文或真实平台资源 ID 进入仓库。
- [x] 更新 `.trellis/spec/frontend/wechat-svg-modules.md`、必要的视觉 variant/component contract、
  task evidence 和 completion report；不把 PC 结果外推为未验证能力。
- [x] 未经用户明确要求不 stage、commit、push 或创建 PR。

## 7. Rollback points

1. delivery slot resolution/新增可选字段可独立回退，旧 registry/delivery 数据仍可直接工作；
2. preview delegation 与 masthead/end order 可分别按现有 converter/builder join point 独立回退；
3. editor projection/NodeView 仅影响本地 presentation，不迁移文稿或 Settings；
4. preset CSS 通过稳定 class hook 回退，不删除任何 preset、variant、SVG 或组件；
5. 任一真实平台结果不稳定时保留安全静态 fallback 和 `manual-required`，不升级为原生成功状态。

## 8. Stop rules

- 用户未批准最终规划总结时停止在 planning，不运行 `task.py start`。
- GitNexus HIGH/CRITICAL 未评审、真实数据不可得、组件只能靠 mock、或需要破坏性迁移时停止并
  回到 PRD 重新决策。
- 自动检查、release 软件视觉验收和微信 PC 普通粘贴中任一必需门失败时不得报告本轮完成。

## 9. 2026-08-02 Final Acceptance Evidence

### Product and rendering evidence

- 同一不可变 WeChat artifact options snapshot 驱动右侧预览与现有“复制微信富文本”；两者共同
  调用 `convertToNativeFormat('wechat')`，HTML、stats 与 delivery report 使用同一 render token
  原子提交。正文显式组件继续持久化 canonical JSX，自动首尾投影不进入 Markdown、undo 或字数。
- 文前顺序为品牌引入 → 可选真实歌曲安全卡 → preset identity/title → 真实阅读分钟/字数/分类；
  文末顺序为正文 → 自身公众号静态关注 fallback → 来源/关联 → CC → 单一 InkForge colophon。
- 16 套预设在 Release 软件中使用同一全元素文稿完成结构、组件与视觉矩阵；四套带 SVG 的旗舰
  各保留 10 个 source-relative 安全 inline SVG，其余 12 套没有获得意外 SVG。
- 微信 PC 普通粘贴 16/16 通过：受信任系统剪贴板同时携带 `text/plain`/`text/html`，标题、品牌、
  歌曲、阅读时间、字数、统计组件、名片、CC 与 colophon sentinel 全部保留，scripts、
  `foreignObject`、事件属性与水平 overflow 均为 0。正文目标通过同一 trusted paste event、DOM
  mutation、sentinel 与尺寸读回绑定；“第一个可见 `.ProseMirror`”或仅宽高匹配不再算证据。
- 微信 PC 普通粘贴矩阵所用 Release EXE SHA-256：
  `119c5a0b197fe6436d13db6839950a78356fa7dcb13231df2e7b6af47866ce28`。
- 最终交付 Release EXE SHA-256：
  `6afaa6c0b7f4e1410d9013e81c5cb823ab2ec8899e66f85827c9965230b62bd4`。矩阵之后的产品改动包括移除
  `PublishView` 重复 clipboard fallback、补齐真实 media 字段与可访问校验、通过既有 Schema 生成不可变
  delivery snapshot、即时清除过期 preview metadata 并保留微信空正文、规范化 Markdown URL 分隔符，
  以及增加 flagship song-frame 类别差异。最终 Release 已重新通过完整原生 E2E；结构化微信矩阵未在
  最终二进制重跑，仍严格绑定前一个 SHA，不改写归属。

### Verification

- 聚焦 Vitest：10 files / 134 tests passed。
- 完整 export 串行 Vitest：48 files / 1482 tests passed。
- 精确 ESLint：passed。
- `vue-tsc --noEmit --pretty false`：passed。
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`：passed，5575 modules，
  Vite build 48.99s；最终 Tauri `beforeBuild` 再次完成同一 5575-module build，56.99s。
- `pnpm -C inkforge style-proof:application-preflight`：`application-ready`；27 SVG modules、
  108 module/persona pairs，全部本地 gallery/sentinel/safe/pipeline issue 为 0。
- 最终 Release 原生 E2E：1 spec / 13 tests passed，55.3s；含编辑/首尾投影、16 preset geometry、
  preview/copy、Custom CSS、rich-copy history、三套 flagship SVG、22–24 CJK 字符行宽和 10 轮性能。
- 原生 10 轮性能（最终完整套件）：内部 render p50/p95 11/12ms；真实编辑到预览稳定 wall
  p50/p95 1104/1180ms；600ms 延迟复核仍为最后 marker、赤陶旗舰与预期 SVG。
- GitNexus 在最终源码上完成增量重建（22,611 nodes / 40,945 edges / 300 flows）；
  `detect_changes(scope=all)` 因工作区既有 175 个 dirty 文件、832 个 changed symbols 报告
  `critical`，不将该全局风险误归于本任务。任务产品/文档采用精确路径完成 diff 审查。
- 精确任务与产品文件 whitespace check、敏感值/profile/session/auth artifact scan 均通过；两名独立
  reviewer 的正确性/回归和范围/证据 findings 已处理，并重跑目标回归、完整 export、静态检查、
  production build 与最终 Release 原生 E2E。

### Evidence files

- `wechat-pc-ordinary-paste-matrix-20260802.jsonl`
- `wechat-pc-ordinary-paste-matrix-summary-20260802.txt`
- `native-preview-performance-20260802.txt`
- `native-evidence/preset-contact-sheet-20260802.png`
- `native-evidence/preset-top-preview-contact-sheet-20260802.png`
- `native-evidence/preset-component-contact-sheet-20260802.png`
- `native-evidence/preset-end-contact-sheet-20260802.png`
- `prompts/0601/evidence/e2e/native-preview-performance-20260802.png`

### Boundaries

- 未点击微信保存、手机预览、同步、定时、群发或发布；PC 普通粘贴结果不外推到手机、Dark Mode、
  原生歌曲/关注卡、封面缩略图或发布成功。
- 按用户要求取消小红书、知乎账号上传/发布测试；完整 export 回归仅证明本地负向隔离。
- 本轮没有新增依赖、第二 renderer、第二 store、文章 Schema/YAML 字段或 preset ID，也没有删除
  既有组件、SVG 模块、平台功能或回退路径。
