# Implementation Plan — 全样式独立设计与编辑微信一体化

> 本文件是母任务的执行顺序与集成验收门。母任务不复制既有子任务的历史实现；parent 直接切片
> 由 parent 承载，用户后续明确批准的范围扩展可由对应 linked child 暂时成为唯一 current contract，
> 完成后由 parent 汇总。任何时刻禁止 parent/child 同时 current；历史 AC 不决定当前缺口可否跳过。

## 0. Activation and baseline

- [x] 收到用户对本 PRD/design/implement 的后续明确批准。
- [x] 启动 parent；保持 linked child 的既有状态不变，以 parent Slice A–F 为当前验收权威。
- [x] 运行 `python .trellis/scripts/task.py current --source`，记录真实 active-task source；不得因
  `current=(none)` 修改任务层级或伪造状态。
- [x] 运行 `git status --short`、`git diff --stat` 和目标文件精确 diff，建立 dirty worktree清单；
  只保护/修改本轮明确文件，不还原、不清理用户已有变更。
- [x] 检查 GitNexus `InkForge` 索引是否匹配当前分支/commit；若 stale，先串行更新索引。
- [x] 除注入的 scoped research 外，直接阅读权威 spec 的当前相关章节：
  `state-management.md` 的 Canonical Typography/Preset Compatibility、`quality-guidelines.md` 的
  Packaged Desktop Gate、`wechat-svg-modules.md` 的 325–330；若内容与 research 不同，以 spec 为准
  并先修订 parent 文档。
- [x] 对每个将修改的共享 symbol 先运行 upstream impact；HIGH/CRITICAL 必须先报告并缩小切片。
- [x] 运行现有聚焦测试形成红绿基线，保存真实失败，不把产品缺陷归咎于测试。

Suggested baseline:

```powershell
pnpm -C inkforge exec vitest run `
  src/views/__tests__/WorkstationView.desktop-layout.test.ts `
  src/components/export/DeliveryAdornmentPanel.test.ts `
  src/composables/usePreviewRenderer.test.ts `
  src/extensions/SlashCommands.component.test.ts `
  src/extensions/TyporaMode.component.test.ts `
  --reporter=default --maxWorkers=1 --no-file-parallelism
```

Stop rule: 若当前源码与 parent PRD 的事实冲突，先回到规划修正文档，不在实现中偷偷改需求。

## 1. Slice A — semantic toolbar and round-trip

Referenced historical owner: `07-28-rendering-spec-editor-components`

### A1. Failing checks first

- [x] 为 `FloatingToolbar` 建立最小组件测试，不复制 TipTap editor 实现。
- [x] 证明当前 UI 缺少可见的“正文/H1–H6”选择器，并锁定 H4–H6 可达性。
- [x] 覆盖真实 selection 在打开块级菜单后仍存在；执行后 editor focus 恢复。
- [x] 覆盖 paragraph、H1–H6、quote、bullet/ordered/task list、code block 当前状态。
- [x] 覆盖 mixed selection、table cell、code block、`InkComponent` 边界的禁用/可预测行为。
- [ ] 覆盖 390px 等效窄宽、横向/分组弹层、PointerEvent mouse/touch/pen 路径和 reduced motion；
  不要求不存在的硬件专用手势，但所有 pointer 类型必须走同一真实命令与焦点恢复合同。
- [x] 在 `TyporaMode.component.test.ts` 增加标题/引用/列表保存与 Source 往返断言。

### A2. Minimal implementation

- [x] 复用 `FloatingToolbar.vue`、现有 TipTap commands、Lucide 和当前浮层定位；不新增编辑器扩展或
  UI 依赖。
- [x] 增加中文块级语义选择器，支持正文和 H1–H6；字符格式、结构命令按 design 分组。
- [x] 使用 `editor.isActive()` 与既有 chain command 可用性；不把 preset-specific class/HTML 写进文档。
- [x] 窄宽下菜单留在编辑容器内；`Escape`、点击外部、模式切换和销毁正确关闭。
- [x] 复查快捷键、Slash Commands、撤销/重做、自动保存、Source/Typora/Preview 切换无回归。

### A3. Slice gate

- [x] 聚焦测试通过（8 files / 52 tests；另含规则目录和 delivery 联合回归）。
- [x] release 软件中选择真实文字并依次设为 H1–H6，再保存、重开、切 preset；语义保持且视觉变化。
- [ ] 记录该切片准确 diff 和 GitNexus detect-changes；不夹带 16 套视觉重制。

## 2. Slice B — delivery routing and editor configuration surface

Referenced historical owners:

- `07-28-rendering-spec-editor-components`：Workstation 入口与可达性；
- `08-02-wechat-editor-component-parity-frontmatter-colophon`：delivery 内容与投影。

### B1. Failing checks first

- [x] 修改 `WorkstationView.desktop-layout.test.ts` 的错误期望：
  `open-delivery-settings` 必须打开 delivery surface，且 `ExportModal` 保持关闭。
- [x] 覆盖导出按钮仍只打开 `ExportModal`，发布按钮仍进入 Publish Center，Stage“组件”仍打开
  writing component library。
- [x] 覆盖歌曲、阅读信息、文末名片和 CC 的触发入口定位到同一 `DeliveryAdornmentPanel`。
- [ ] 覆盖关闭表面后焦点、选区、编辑 scroll anchor 与当前 article 不变。（焦点恢复组件测试已通过；选区/滚动待 release 软件验收。）

### B2. Minimal implementation

- [x] 在 `WorkstationView.vue` 中建立与 `showExportModal` 独立的单一可见状态；使用现有 modal/sheet
  承载原语直接挂载 `DeliveryAdornmentPanel`。
- [x] 把 `EditorPanel @open-delivery-settings` 改接新表面；删除错误路由，不改 ExportModal 责任。
- [x] 面板直接消费 Settings store；不新建表单副本、Pinia store、schema 或数据库字段。
- [x] 将可选 focus target 作为短暂 UI 状态传递，仅定位面板区域，不持久化到文稿或 Settings。
- [x] 保留 Export/Publish 中现有 `DeliveryAdornmentPanel` 用法和全部控件。

### B3. Slice gate

- [x] Workstation、Delivery panel 和相关 Export/Publish 入口测试通过（专用窗口与 Settings 同源）。
- [x] release 软件真实点击交付配置入口，确认打开专用“文章组件与交付配置”对话框且不进入导出文章；
  歌曲、阅读时间、CC、图片、链接、关联文章和名片均保留在该同源配置面。
- [ ] 没有空 slot、假歌曲、假账号或假媒体状态进入最终 HTML。

## 3. Slice C — one artifact snapshot and editor/preview parity

Referenced historical owner: `08-02-wechat-editor-component-parity-frontmatter-colophon`

### C1. Impact and failing checks

- [ ] 对 `platformArtifactOptions`、`usePreviewRenderer`、`convertToNativeFormat`、微信 converter 与
  Export/Publish 调用链运行 GitNexus upstream impact。
- [ ] 添加同一文章 snapshot 的测试矩阵：title、category、preset、Typography、delivery、readingSpeed、
  component source、stats 在 preview/copy/export/publish preparation 中一致。
- [ ] 添加 stale token 测试：快速切标题/preset/article 后旧 HTML/stats/report 不能回写。
- [ ] 添加空文章测试：不注入 preset sample，不伪造字数或文章身份。

### C2. Minimal implementation

- [ ] 继续使用现有 `NativeExportOptions`；将各 surface 的窄化 options 拼装改为复用同一 snapshot，
  不引入第三个 normalized context。
- [ ] 将“同一 snapshot”落实为同正文修订/有效设置下深度等价的 canonical inputs：Workstation
  preview/copy 共享当前只读值；ExportModal 从该 baseline 初始化且取消不反写；PublishView 通过
  同一纯构建边界复建等价值。不得增加全局 artifact store 或持久化版本表。
- [ ] 微信预览和快速复制继续由 `convertToNativeFormat('wechat')` 产生同一内容 artifact。
- [ ] ExportModal/PublishView 只补齐消费接口；不得各自重新拼 masthead/body/suffix。
- [ ] `PreviewMeta` 同 token 提交 stats/report，`EditorPanel` 只接收该真实 stats。
- [ ] XHS/Zhihu 路径保持平台隔离，运行负向 wrapper 泄漏测试。

### C3. Editor projection

- [ ] 编辑纸张投影当前 preset/variant/profile、真实标题/分类、可选歌曲状态、阅读时间/字数和文末摘要。
- [ ] H1–H6、引用、列表、表格、代码、图片和正文组件使用当前 preset 的编辑投影规则。
- [ ] 自动首尾投影不进入 contenteditable、Markdown、undo 或字数；editor chrome 不进入微信产物。
- [ ] 组件 ready body 复用 registry renderer；invalid/unknown source 可恢复且不丢原文。
- [ ] 预览与编辑的标题、组件层级、真实字段、stats 和 preset 身份可解释对应。

### C4. Slice gate

- [ ] `usePreviewRenderer`、Workstation、Typora、writing-components、delivery、export 聚焦测试通过。
- [ ] release 软件中同一文章对照编辑页、Stage 预览、分栏预览和复制产物，无旧标题/旧 preset 漂移。

## 4. Slice D — sixteen preset independent compositions

Referenced design chain:

1. `07-29-rendering-visual-system-reconstruction`：唯一视觉系统与七 Variant 合同；
2. `07-30-brand-rendering-design-recovery`：品牌方向和 shared-visible-skeleton 清除；
3. `07-31-preset-brand-differentiation`：16 个最终 preset 的逐套 art direction。

### D0. Rendering-rule catalog contract

- [x] 先审计 `themes.ts`、`visual-variants.ts`、`style-catalog.ts` 与现有 fingerprint/report 类型，
  复用能承载规则的最近权威；禁止新建第二套 renderer、主题 DSL 或手写 preset ID 清单。
- [x] 增加最小 typed 只读 rule descriptor/API，覆盖品牌锚点、六个 composition 分区、平台降级、
  安全不变量与允许自定义项；目录不保存 HTML/CSS 模板，也不执行渲染。
- [x] 测试从真实微信 preset 列表对账 16/16 rule：无遗漏、重复、未知 ID，variant/profile 与实际解析
  一致；规则分区与 normalized fingerprint/report 可追踪，writing-component 覆盖仍动态枚举 registry。
- [x] 在 frontend spec 与 `docs/platform-rendering-rules/` 记录后续自定义流程和必过门禁；文档示例
  使用仓库自有字段，不包含平台账号或虚构媒体信息。

### D1. Rebaseline

- [x] 使用同一真实全元素验收稿生成当前 16 套 structure fingerprint 和 release contact sheet。
- [x] 逐项标记共享 masthead、标题卡、正文骨架、组件卡和 footer 的来源；不以历史 AC 为通过证据。
- [x] 为 design §7.1 定义的六分区规范化签名建立失败测试，并生成 16 行签名与完整 120 对比较矩阵；
  最终 sanitizer/inlining 后的 converter output 也必须比较。
- [x] 增加反作弊回归：只改 `data-*`、preset 名称、固定文案、数字、颜色或空装饰节点不能使一对
  composition 通过。
- [ ] 为普通 paragraph-only 稿建立连续阅读流测试，防止每段卡片化。

### D2. Shared base reduction

- [ ] 共享层只保留 reset、安全字体、响应式图片、表格/代码最低可读性和 editor chrome。
- [ ] 将通用可见 masthead/左轨/标题卡/quote/component/footer 从共享层移至现有 preset/profile 分支。
- [x] 不增加 CSS/JSON 主题 DSL，不复制 converter；直接复用现有 builders、recipes、decorators 和 hooks。

### D3. Per-preset completion checklist

对下列每个 preset 分别完成并勾选，不能批量写“沿用同 Variant”：

- [ ] `thesis`
- [ ] `legal`
- [ ] `report`
- [ ] `commentary`
- [ ] `aigc`
- [ ] `code`
- [ ] `notes`
- [ ] `news`
- [ ] `meme`
- [ ] `life`
- [ ] `elegant`
- [ ] `tech`
- [ ] `flagship-kiln`
- [ ] `flagship-kiln-paste-safe`
- [ ] `flagship-tempera`
- [ ] `flagship-amber`

每一项完成定义：

1. design.md 第 7 节对应整体方向已落实；
2. masthead、H1–H6、连续正文、引用/列表/表格/代码/图片、组件、song/metrics、profile/CC/
   colophon 均有该 preset 的可辨轮廓；
3. 与其他任一 preset 至少三个非颜色维度不同；
4. 390px 等效宽度和桌面宽度无溢出、重叠、过大标题、不可读字体、浅底浅字或异常空白；
5. 缺失真实字段诚实省略/fallback；
6. sanitizer、SVG、幂等和平台隔离回归通过；
7. release 编辑投影和预览同时目检，不只看 HTML/CSS 字符串。

### D4. Full semantic corpus

- [ ] H1–H6、段落、strong/em/del/underline、高亮、上下标、行内代码、链接。
- [ ] 无序/有序/任务/嵌套列表、引用、提示、金句、分隔线。
- [ ] 表格、代码块、KaTeX、Mermaid、图片、题注、图集、脚注、来源、参考资料和目录。
- [ ] 时间线、对比、统计、图集、引文、歌曲、作者/公众号名片、图片、链接、关联文章、联系人/
  名片、二维码、表格、信息网格和微信媒体描述。
- [ ] 品牌引入、可选歌曲、真实阅读时间/字数、文末自身名片、来源/CC/唯一 colophon。
- [ ] 测试从现有 writing-component registry 动态枚举全部 definition；对每个 ID 读取真实 converter
  结果/report，并判定 `rich-safe`、`static-fallback` 或 `manual-native-insert`。禁止维护第二份手写
  组件清单；任何未枚举、静默空输出或未分类 ID 失败。

### D5. Slice gate

- [x] 16/16 normalized structure fingerprints unique；该门只防同构，不替代视觉检查。
- [x] 16/16 release contact sheet 的首屏/中段/组件/文末全部人工通过。
- [ ] 发现两套同构时只修对应 preset/profile 分支，不能靠改颜色或增加无语义装饰过门。

## 5. Slice E — native release acceptance

Parent integration gate;本切片不新增独立产品实现，修复仍发生在前述 A–D 的现有代码路径中。

2026-08-09 scope extension：下方尚未关闭的 manager/stage/inspector、键盘、焦点和 reduced-motion
门由 linked child `08-09-native-media-shell-xhs-zhihu-render-acceptance` 的生成式 native shell 矩阵
承载；实施期间该 child 是唯一 current contract，parent 只汇总结果。

- [x] 设置 `$env:NODE_OPTIONS='--max-old-space-size=4096'`，串行构建 release Tauri。
- [x] 只启动新生成的 release `InkForge.exe`；Vite 浏览器仅作故障诊断，不作为成品证据。
- [ ] 在软件内用同一真实验收稿检查：
  - [x] 块级工具栏选择与保存；
  - [x] 组件插入/编辑/错误/删除；
  - [x] delivery 设置入口与投影；
  - [x] preset 即时切换和统计；
  - [x] 16 套首屏/中段/组件/文末；
  - [ ] manager/stage/inspector 折叠、悬浮/停靠、暗处聚焦、打字机、分栏、缩放；
  - [ ] 键盘、焦点、reduced motion 和长短标题。
- [ ] 使用仓库自有、确定性、非私密校准文稿；原生 contact sheet 的脱敏成品与机器报告保存到任务
  evidence，记录相对路径和 SHA-256，不包含本机路径、私有文章、账号态或运行时 profile。
  - [x] 编辑器专项的 source、持久化 Markdown、最终微信 HTML、精确 harness、机器报告和哈希已保存到
    `native-evidence/editor-experiment-20260803/`；16 套 contact sheet 的统一迁入仍随本项保持 open。
- [ ] 任何原生视觉失败回到对应切片修复并重新构建；浏览器看似正常不能覆盖 WebView2 失败。

## 6. Slice F — WeChat PC ordinary paste

Referenced historical proof owner: `07-31-wechat-editor-paste-validation`

- [ ] 复用该任务唯一 CloakBrowser profile/session；不启动 Playwright 或第三浏览器。
- [ ] 只在用户已经登录且编辑器可见时操作；不读取/记录 Cookie、Token、二维码、账号敏感信息。
- [ ] 每套从 release 软件真实点击“复制微信富文本”，再在微信 PC 编辑器执行普通 Windows
  `Ctrl+V`；不得用 DOM 注入、ClipboardEvent 合成或开发者工具替代普通粘贴。
- [ ] 16/16 读回：标题、正文、组件、歌曲 fallback、阅读时间/字数、名片 fallback、CC、colophon、
  inline style、安全 SVG/fallback、无 135/秀米残留。
- [ ] 每套都滚动检查全篇：首屏、全部标题层级、连续正文、中段语义块、registry 组件、SVG/fallback
  和文末；不再以代表预设替代其余 11 套。
- [ ] 构建完成后先记录最终 release EXE 与 installer SHA-256。每行 manifest 必须记录 preset ID、
  相同 `releaseExeSha256`、native artifact SHA-256、rich clipboard channel、可信 paste/目标正文绑定、
  settled DOM 摘要、关键节点/inline-style/SVG 计数、宽度/overflow、UTC 时间和结论。
- [ ] 任何代码、默认设置或打包产物变化都使旧矩阵失效；重新构建后 16/16 全部重跑，不能混用
  历史 binary 或历史 artifact 行。
- [ ] 粘贴后不点击保存、手机预览、同步、定时、群发或发布；用可丢弃草稿/清理路径保持账号安全。
- [ ] 对任何被微信清洗的属性/SVG 如实标记 fallback 或 blocked，不把 PC 文本保留外推为原生媒体。

Stop rule: 若登录失效、平台结构变化、验证码/账号确认出现，停止外部动作并保留本地完成状态；
不得改用自动发布或伪造平台证据。

## 7. Automated validation matrix

所有重型任务串行，避免本机内存峰值。按切片运行最小门，最终再运行全量门。

### 7.1 Focused tests

```powershell
pnpm -C inkforge exec vitest run `
  src/components/editor/FloatingToolbar.test.ts `
  src/views/__tests__/WorkstationView.desktop-layout.test.ts `
  src/components/export/DeliveryAdornmentPanel.test.ts `
  src/composables/usePreviewRenderer.test.ts `
  src/extensions/SlashCommands.component.test.ts `
  src/extensions/TyporaMode.component.test.ts `
  src/services/export/platform-export-rendering.test.ts `
  --reporter=default --maxWorkers=1 --no-file-parallelism
```

若最终测试文件名依现有约定调整，记录准确命令，不创建重复测试套件。

### 7.2 Export regression

```powershell
pnpm -C inkforge exec vitest run src/services/export `
  --reporter=default --maxWorkers=1 --no-file-parallelism
```

### 7.3 Static and production gates

```powershell
pnpm -C inkforge exec eslint <本轮精确变更的 .ts/.vue 文件> --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
$env:NODE_OPTIONS='--max-old-space-size=4096'
pnpm -C inkforge build
```

构建前记录 `inkforge/tsconfig.tsbuildinfo` 的 tracked/dirty/hash 状态。不得自动恢复；只有它在基线
clean、由本轮构建单独改变且精确 diff 证明没有用户内容时，才允许按该文件单独恢复。

### 7.4 Application and native gates

```powershell
pnpm -C inkforge style-proof:application-preflight
pnpm -C inkforge style-proof:application-acceptance
pnpm -C inkforge style-proof:current-round
pnpm -C inkforge tauri:build
pnpm -C inkforge test:e2e
```

- `test:e2e` 使用项目现有 WebdriverIO/Tauri 路径，不引入 Playwright。
- 若 native 驱动不支持全套连续会话，逐 preset 独立启动并保存可审计结果；不得把驱动问题当产品通过。

### 7.5 Diff and graph gate

```powershell
git diff --check -- <本轮精确文件>
git diff --stat -- <本轮精确文件>
```

- [x] 运行 GitNexus `detect_changes(scope='all')` 检查真实 diff；若工作树有无关改动，结合精确 diff
  人工隔离，不根据全局 dirty 误判本轮 blast radius。
- [ ] 每个 Slice 另存其开始前的目标文件状态、精确 `git diff -- <paths>`、目标 symbol upstream
  impact 和结束后的 expected-symbol 映射；全局 `scope='all'` 只能发现异常，不能单独证明该 Slice
  的 blast radius。
- [x] 检查 preset ID、component ID、Settings schema 和三平台 wrapper 无删除/重命名。
- [ ] 检查 staged diff（若进入提交阶段）无 `.env`、Token、Cookie、auth、HAR、QR、profile、日志、
  数据库、本机绝对路径或账号截图。

## 8. Documentation and final review

- [x] 更新 `.trellis/spec/frontend/visual-variant-system.md`：语义工具栏、preset-visible ownership、
  编辑/预览 correspondence 与 16 套最终合同。
- [ ] 更新 `.trellis/spec/frontend/flagship-element-catalog.md`：组件入口和 delivery/正文分工。
- [x] 仅在 SVG/微信门禁事实发生变化时更新 `wechat-svg-modules.md`，不重复历史证据。
- [x] 更新 docs/验收报告，分别列出 automated、release visual、WeChat PC paste 和 external-unverified。
- [x] 文档化 typed 渲染规则目录的只读 API、16 套 composition contract、允许自定义项和禁止绕开的
  安全/平台降级门；通过自动对账避免运行时与文档双份漂移。
- [x] 运行两个独立只读 reviewer：correctness/scope 与 evidence/compatibility；主线程处理有效发现。
- [x] 做最终 adversarial self-review：需求遗漏、共享骨架回归、数据造假、平台外推、可访问性、性能、
  unrelated dirty changes、敏感证据和过度抽象。
- [x] 重新运行最小受影响门和最终完整门；不能用旧历史结果代替当前 build。

## 9. Definition of ready for user testing

只有以下全部成立，才可交付用户重点调试渲染并准备发布：

- [ ] AC-01–AC-18 均有当前 build 证据；其中 AC-16–AC-18 由 linked child
  `08-09-native-media-shell-xhs-zhihu-render-acceptance` 返回最终 release 与平台编辑器证据；
- [ ] 16/16 preset 在原生 release 软件可选择、可编辑、可预览、可复制，且逐套独立设计通过；
- [ ] 16/16 微信 PC 普通粘贴通过或对实际平台清洗给出明确、用户可见的安全 fallback；
- [ ] 不存在 delivery 配置误开 ExportModal、标题语义不可复现、编辑/预览旧状态或空渲染；
- [ ] 完整测试、lint、typecheck、production build、Tauri build 和 application acceptance 通过；
- [ ] 微信原生媒体编辑器读回、native shell 全状态矩阵、XHS/Zhihu 编辑器导入/上传读回均完成；
  XHS/Zhihu 未执行发布，微信手机、Dark Mode、同步、定时、群发和发布等边界没有被虚报；
- [ ] 精确 diff、GitNexus 与敏感信息检查通过，未删除任何现有功能、模块、组件或 preset。

## 10. Planning review closure

- [x] 母任务保持唯一集成权威；parent 直接切片与用户后续批准的 linked child 串行成为唯一
  current contract，禁止并行 current；旧子任务 AC 不再绕过当前复现缺陷。
- [x] 可见 composition 与 component/delivery/artifact ownership 已去重。
- [x] snapshot 等价、modal 修改/取消和跨路由复建语义已定义，不增加第二个状态系统。
- [x] 16 个签名、120 对矩阵、反作弊规则与 registry 动态组件覆盖已定义。
- [x] 最终 EXE SHA、逐套全篇微信读回、失效重跑和脱敏证据字段已定义。
- [x] 自动 `git restore` 已移除；每个 Slice 使用精确 diff/impact，不用全局 dirty 归因。

## 11. 2026-08-02 current-build rule catalog and native acceptance record

### 11.1 Integrated rendering rules

- `getWechatRenderingRuleCatalog()` now derives one typed, read-only row for each of the 16 real
  WeChat presets. It reuses the existing preset, visual-variant, profile and writing-component
  registries; no second renderer, store, theme DSL, dependency or hand-written preset/component
  list was added.
- Each row records brand anchors, six composition zones (`masthead`, `headingRhythm`, `bodyFlow`,
  `semanticBlocks`, `componentsAndDelivery`, `ending`), platform degradation, safe invariants,
  existing customization knobs, locked fields and implementation-side fingerprints.
- `rendering-rule-catalog.test.ts` renders the same deterministic full-structure article through
  the real `convertToWechatWithStats()` path for all 16 presets. Final normalization discards copy,
  ids/classes/data attributes, URLs, colors, custom properties and empty wrappers while retaining
  hierarchy and non-color geometry. The current build has 16/16 unique final signatures and all
  120/120 preset pairs differ in at least three final composition zones.
- The anti-cheat regression proves that changing only text, identifiers, URLs, colors or empty
  wrappers cannot satisfy the independence gate. `flagship-kiln-paste-safe` owns a separate static
  inline ending and does not reuse the SVG footer path.

### 11.2 Current automated verification

- Targeted ESLint for the exact TypeScript/Vue changes: PASS.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: PASS.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  PASS, 49 files / 1487 tests.
- Full Vitest: PASS, 143 files / 2126 tests.
- `$env:NODE_OPTIONS='--max-old-space-size=4096'; pnpm -C inkforge build`: PASS, 5578 modules.
- `pnpm -C inkforge style-proof:application-preflight`: PASS, `application-ready`.
- `pnpm -C inkforge style-proof:application-acceptance`: PASS,
  `application-acceptance-ready`, `canClaimCurrentRoundTarget=true` for
  `application-svg-style-wechat-local`.
- `pnpm -C inkforge style-proof:current-round`: PASS.

### 11.3 Prior release-software evidence (superseded by §12)

- Release Tauri build: PASS with `--bundles none`; generated `InkForge.exe` size is 17,701,888 bytes
  and SHA-256 is `e9869d72fe3f29ddc3be6e5beb1d3c02d8e5e7d2ba3799ed0ca5d3f22cd34312`.
- WebdriverIO drove that exact release executable through WebView2, not a Vite browser. Native SVG
  rendering acceptance: PASS, 1 spec / 13 tests. It exercised all 16 preset editor/Stage/export
  geometries, real writing/delivery components, 22–24 CJK characters per line and ten rapid
  edit-plus-preset rounds. Final marker, preset, SVG and editor state all settled correctly.
- Native render p50/p95: 11 ms / 24 ms. Native edit-plus-settle wall p50/p95:
  1160 ms / 1215 ms.
- Native Settings ownership check: PASS, 1 test. AI, Advanced and About reset only their real
  owning fields in the release application.
- The current 16-set top, component and ending contact sheets were inspected one by one. No blank
  preview, clipping, overlap or unreadable ending was observed. Relative evidence remains under
  the linked component-parity task `native-evidence/` and `prompts/0601/evidence/e2e/`; no account,
  browser-profile or private-article artifact was created.

### 11.4 Honest boundary

- That prior local application build was accepted for its bounded checks. The exact release had not yet
  completed the 16/16 WeChat PC ordinary `Ctrl+V` readback matrix, so Slice F and the parent
  release-ready definition remain open.
- This record does not prove WeChat phone preview, mobile Dark Mode, mobile SVG interaction,
  cover acceptance, native song/profile/media cards, credentialed sync, scheduled/group send or
  publish success. Xiaohongshu and Zhihu publication tests remain user-owned manual work.

### 11.5 Review and diff reconciliation

- Two independent read-only reviewers found stale-body copy/export, final-artifact matrix,
  historical-proof wording, modal keyboard propagation, optional Inspector coupling, caret-only
  toolbar visibility and pending-stat projection issues. The valid findings were fixed at their
  shared owners and covered by the focused tests; no duplicate renderer or state layer was added.
- The final focused rerun passed: 6 files / 113 tests. Exact tracked and untracked whitespace checks
  passed. The sensitive scan found only ordinary render-token identifiers and contract prose; no
  credential value, account artifact, local browser path, Cookie, HAR, QR or runtime log remains in
  the exact slice. No file is staged.
- GitNexus `detect_changes(scope='all')` reports CRITICAL because the pre-existing shared worktree
  contains 178 changed files / 882 changed symbols and 56 affected processes. That global result is
  not attributed to this slice. The pre-edit impacts for this slice's shared owners were LOW, and
  the exact-file tests, type-check, production build and release WebView2 checks are the bounded
  evidence used here.

## 12. 2026-08-03 release editor experiment completion

### 12.1 Root causes and permanent regressions

- The release experiment first proved that the live ProseMirror DOM held bold, italic, strike,
  inline code, link, underline, highlight, subscript and superscript correctly, but a saved H6
  followed immediately by Markdown caused those marks to reopen as literal text. The shared root
  cause was the raw-HTML heading emitted by `transformTocAndHeadings()` without a blank-line boundary.
  The transform now emits that boundary for H1-H6, and the production-like three-round Tiptap test
  keeps an adjacent heading/inline-semantics fixture.
- The final WeChat sanitizer omitted the semantic `<mark>` tag. `convertToWechatWithStats()` now
  permits that safe tag. The same dirty branch already carried source-image `width`/`height`; the
  final attribute safety net now restricts them to one-to-six-digit values on `<img>`, removes
  dimensions from table/cell HTML, and preserves only numeric or `100%` dimensions required by the
  trusted `<svg>`/`<rect>` renderer. The permanent pipeline regression verifies the visible mark,
  external-link footnote, component visible content, removed diagnostics/scripts, image conversion,
  rejected table/cell dimensions and retained responsive SVG geometry.
- Typora intentionally keeps formula and Mermaid source editable instead of injecting preview-only
  KaTeX/SVG DOM into StarterKit. A direct probe proved that the old optional-renderer DOM duplicates
  formula text and drops Mermaid during TipTap parsing. The production round-trip therefore preserves
  formula source and a visible `language-mermaid` code block; enhanced formula/diagram rendering stays
  in the platform preview/export surface until a source-preserving editor node is implemented.
- External links and writing-component diagnostics were not product defects: the default WeChat
  contract converts an external link to visible label + superscript + `引用链接`, while final safety
  cleanup removes `data-*` and may remove classes. Native acceptance therefore checks the footnote
  structure and every registry component's visible proof marker, never private DOM attributes.

### 12.2 Exact software experiment

- Production build: PASS, 5578 modules. Release Tauri build: PASS with `--bundles none`.
- Exact executable: `inkforge/src-tauri/target/release/InkForge.exe`, 17,698,304 bytes,
  SHA-256 `52e63429fbb9159786080d59f337065e2504903070618f83793f8b4db6b89414`.
- WebdriverIO/tauri-driver exercised that release through the real Tauri WebView2 surface. The
  dedicated editor experiment passed after performing visible H1-H6/paragraph transformations,
  save/reload, delivery routing, component-library insertion/edit/update/atomic delete, and final
  Markdown readback. The persisted corpus retained every current registry component, all inline and
  block semantics, formulas, Mermaid source, footnotes, nested/task lists, table, code and the final
  sentinel without escaped Markdown or wikilink drift.
- The resulting WeChat preview probe passed with `strong=16`, `emphasis=2`, `strike=1`, one underline,
  one subscript, twelve superscripts, four tables, one code block, six images and 30 total SVG nodes
  across preset and component output.
  The semantic highlight survived as `<mark>` with `rgb(255, 243, 176)` background; the external-link
  label/reference/footnote URL all survived; no raw external anchor or literal Markdown remained;
  all dynamic writing-component visible markers were present and the final sentinel was reached.
- Current local visual evidence was inspected for the semantic toolbar, dedicated delivery dialog,
  writing-component library and WeChat artifact. The source-of-truth Markdown readback is 101 lines
  and contains no account artifact, browser profile, Cookie, token, QR, HAR or private draft data.

### 12.3 Verification and remaining boundary

- Focused regression: PASS, 8 files / 52 tests.
- Full export regression after the final sanitizer change: PASS, 49 files / 1489 tests. Its first
  run caught missing responsive SVG dimensions; the shared final safety net was corrected and the
  complete serial suite then passed.
- Exact-file ESLint and `vue-tsc --noEmit`: PASS. Production build and release build: PASS.
- The isolated release editor experiment was rerun after the final production and sanitizer changes:
  PASS, 1 spec / 1 test in 24 seconds. Its independently parsed 70,237-byte artifact has SHA-256
  `cf236c6aaa1b23dee9f9a1e2daca51116a48b4de99527e2f28ca49e3f544793a`, one visible
  `<mark>`, all 17 registry component proof markers, the external-link label/reference/URL,
  no raw external anchor, no component diagnostic data attribute, no literal Markdown and no script.
- The redacted source, persisted Markdown, final HTML, exact harness and machine report now live under
  `native-evidence/editor-experiment-20260803/`. Its README records relative paths, byte counts,
  SHA-256 values, the exact reproduction command and the external-platform cannot-claim boundary.
- The same release was also run against the existing six-file native E2E collection. The dedicated
  editor experiment and SVG rendering file passed; the collection ended at 4/6 spec files because
  existing Settings tests could not open some Hub drafts/tree/migration controls and expected the
  exact sync badge text `未配置` while the UI exposed `disabled未配置`. Those failures are recorded as
  separate Settings-suite defects and are not represented as a green full E2E run.
- This closes the previously missing **release editor experiment**, not the parent task. Slice C
  snapshot parity, remaining native shell/keyboard/reduced-motion checks, 16/16 current-release
  ordinary WeChat Ctrl+V readback, and the parent release-ready definition remain open. No phone,
  credentialed sync, scheduled send, publication, XHS publication or Zhihu publication is claimed.
