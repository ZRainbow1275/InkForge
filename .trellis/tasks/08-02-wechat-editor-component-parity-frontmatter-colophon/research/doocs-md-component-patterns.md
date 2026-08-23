# Research: doocs/md 内置 JSX 组件架构与编辑器 UX 模式

- Query: 调研官方 doocs/md 仓库及在线编辑器中 `MpProfile`、`QRCodeBlock`、`AuthorBlock` 与 song/media 风格组件相关实现，提炼 InkForge 可重实现且不复制受保护资产/模板的源码表示、插入/编辑、校验、预览、微信安全降级与可选元数据模式；同时核对 InkForge 既有 doocs/md 决策。
- Scope: mixed（官方 doocs/md 当前源码与官方站点；InkForge 当前代码、Trellis specs、既有研究/文档）
- Date: 2026-08-02

## Findings

### 1. 研究快照与证据边界

- 官方仓库：[`doocs/md`](https://github.com/doocs/md)；在线编辑器：[`https://md.doocs.org/`](https://md.doocs.org/)。
- 本次源码结论固定到 `main` 在 2026-07-31 14:28:42 UTC 的提交 [`e50183350afd48162641420d671050bbd882d668`](https://github.com/doocs/md/commit/e50183350afd48162641420d671050bbd882d668)，避免将会继续变化的 `main` 当成稳定接口。
- 证据优先级为：固定提交源码 > 官方架构文档/PR > 官方仓库搜索 > 搜索引擎发现结果。搜索聚合结果曾错误声称仓库中没有 `mp-common-profile`，也曾推测不存在的 frontmatter 字段语义；这些说法均被固定提交源码直接否定，未用于结论。
- 本次没有登录微信公众平台、没有采集浏览器网络请求、Cookie、`fakeid`、凭据或平台资产；也没有以在线预览外观证明微信原生发布能力。

### 2. Files found

#### 2.1 doocs/md 官方源码与文档

| 文件 | 一句话说明 |
|---|---|
| [`packages/shared/src/types/component.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/shared/src/types/component.ts#L1-L51) | JSX 组件定义、prop 类型、模板、示例和注册表的共享数据契约。 |
| [`packages/core/src/extensions/component.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L1-L548) | 七个内置组件、模板引擎、属性解析、PascalCase block tokenizer、未知组件错误及 HTML 渲染。 |
| [`apps/web/src/components/editor/dialogs/CustomComponentDialog.vue`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/CustomComponentDialog.vue#L1-L615) | 内置/自定义组件浏览、属性填写、插入/复制、导入/导出和公众号资料入口。 |
| [`apps/web/src/components/editor/dialogs/ComponentPropFill.vue`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/ComponentPropFill.vue#L1-L132) | 按 prop 生成表单、实时调用核心渲染、净化预览并展示最终 JSX snippet。 |
| [`apps/web/src/lib/component-snippet.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/lib/component-snippet.ts#L1-L108) | 示例属性解析、必填检查、占位/默认值和稳定 self-closing snippet 生成。 |
| [`apps/web/src/lib/component-snippet.test.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/lib/component-snippet.test.ts#L1-L149) | snippet、引号选择、必填字段等编辑器辅助逻辑的 Vitest 覆盖。 |
| [`apps/web/src/composables/useComponentCompletion.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/composables/useComponentCompletion.ts#L1-L247) | CodeMirror 中组件名/prop 自动完成、代码上下文排除和键盘行为。 |
| [`apps/web/src/components/editor/editor-header/InsertDropdown.vue`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/editor-header/InsertDropdown.vue#L29-L76) | 工具栏“插入 → 组件”入口。 |
| [`apps/web/src/composables/slashCommands.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/composables/slashCommands.ts#L220-L249) | `/component` slash command 打开同一组件对话框。 |
| [`apps/web/src/components/editor/dialogs/CustomComponentForm.vue`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/CustomComponentForm.vue#L1-L180) | 自定义组件名/模板的表单校验和模板预览。 |
| [`apps/web/src/stores/customComponent.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/stores/customComponent.ts#L9-L101) | 内置与用户定义合并、`custom_components` 持久化和 renderer registry。 |
| [`apps/web/src/stores/render.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/stores/render.ts#L64-L166) | 把同一组件 registry 注入核心 renderer，并把定义变化纳入重渲染 fingerprint。 |
| [`packages/core/src/utils/markdownHelpers.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/utils/markdownHelpers.ts#L1-L90) | Markdown → HTML → DOMPurify 的统一净化边界，显式放行 `mp-common-profile`。 |
| [`apps/web/src/lib/bootstrap/setup-components.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/lib/bootstrap/setup-components.ts#L1-L59) | 浏览器本地注册 `mp-common-profile` Web Component，模拟平台卡片预览。 |
| [`packages/core/src/renderer/renderer-impl.ts`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/renderer/renderer-impl.ts#L150-L180) | frontmatter 剥离、正文阅读量计算、阅读提示和 `markedComponent` 注册。 |
| [`docs/architecture.md`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/docs/architecture.md#L35-L50) | 官方 monorepo 与 Markdown → Marked → DOMPurify → theme → preview → copy-time Juice 管线。 |
| [`docs/mp-card.md`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/docs/mp-card.md) | 公众号名片的使用说明及平台侧 ID 获取背景；不作为 InkForge 获取或保存凭据的依据。 |
| [`PR #1794`](https://github.com/doocs/md/pull/1794) / [`PR #1795`](https://github.com/doocs/md/pull/1795) | 分别记录对话框实时预览、组件/prop 自动完成与 prop-fill UX 的引入背景。 |

#### 2.2 InkForge 当前代码、spec 与既有研究

| 文件 | 一句话说明 |
|---|---|
| `.trellis/tasks/08-02-wechat-editor-component-parity-frontmatter-colophon/prd.md:3-97` | 当前任务明确要求三处同源组件、真实数据、编辑/序列化能力、微信静态安全降级和“不复制受保护资产/模板”。 |
| `inkforge/src/services/writing-components.ts:3-40,73-145,408-655,772-959` | InkForge 已有组件定义/节点契约、Zod 信任边界、内置 `MpProfile`/`AuthorBlock`/`QRCodeBlock`/`SongBlock`/`WechatMedia`、校验、解析、稳定序列化和 fail-closed 渲染。 |
| `inkforge/src/extensions/InkComponent.ts:71-200` | TipTap 中组件是可选择、可拖拽的 block atom，并由规范源串派生 label/summary/status/error。 |
| `inkforge/src/components/editor/WritingComponentLibrary.vue:75-201,299-615` | 当前组件库已共用 parse/validate/render/serialize 服务，支持编辑已有源串、键盘/焦点管理、真实预览和错误展示。 |
| `inkforge/src/components/editor/EditorPanel.vue:330-436` | source 与 Typora 两种编辑模式都把同一 canonical JSX 写回原文，已有节点编辑按精确 range 替换。 |
| `inkforge/src/services/export/delivery-adornments.ts:102-188,279-423,549-773` | 歌曲、公众号/联系卡、阅读量和 colophon 已有 Zod 数据模型、去重、正文统计和微信安全链接降级。 |
| `.trellis/spec/frontend/visual-variant-system.md:107-144,181-246` | preset/variant 只能改变表现；编辑器与预览必须是同一状态的两种投影，组件节点不可伪造数据，最终 HTML 必须落入微信安全子集。 |
| `.trellis/spec/frontend/wechat-svg-modules.md:17029-17053` | 单一组件 registry、PascalCase self-closing JSX、Zod 边界、稳定序列化及平台安全 fallback 的现行契约。 |
| `.trellis/spec/frontend/flagship-element-catalog.md:39-69` | 新元素必须声明 artifact type、fallback、validator、sentinel、provenance 与 action state，禁止伪造公众号原生部件。 |
| `docs/platform-rendering-rules/wechat-rules.md:1-5,58-62,587-591` | 微信原生组件属于有条件的平台 artifact，必须以已验证 ID/选择器 fail closed，不能由普通预览冒充。 |
| `docs/platform-rendering-rules/market-practices-catalog.md:1-27,47-53,283-319,952-964` | doocs/md 只提供公开架构与工作流参考，不授权复制受保护模板/资产，也不证明平台发布能力。 |
| `.trellis/tasks/07-28-rendering-empty-output-fix/research/doocs-component-system.md:1-48` | 2026-07-28 已确认 doocs/md 的 registry、JSX 插入、未知组件错误、MpProfile 双重预览/输出和“无 SongBlock”。 |
| `.trellis/tasks/archive/2026-06/05-14-enhance-wechat-rendering/research/doocs-md-format-insert-style-reference.md:1-65` | 既有决策已把 doocs/md 的 format/insert/style 当交互参考，同时排除伪后端/伪原生组件。 |
| `prompts/0601/research/oss-md-architecture.md:1-235` | 既有架构研究把 doocs/md 定位为 parse/theme/inline/copy 管线基准，明确不能借此引入第二 renderer。 |

### 3. 官方实现的代码模式

#### 3.1 源码表示：组件实例是 Markdown 中的 JSX，定义是独立 registry 数据

1. `CustomComponentDef` 是纯数据：稳定 `id`、PascalCase `name`、说明、含 `{{prop}}` 的 HTML template、typed props、`builtIn`、示例和时间戳；registry 按组件名索引（[`component.ts:8-38`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/shared/src/types/component.ts#L8-L38)）。
2. 当前内置 registry 只有七项：`MpProfile`、`QRCodeBlock`、`AuthorBlock`、`TipBlock`、`TableBlock`、`InfoGrid`、`BadgeGroup`（[`component.ts:7-124`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L7-L124)）。固定提交中没有 `SongBlock`、音频卡或媒体播放器内置项；因此 InkForge 的歌曲/媒体能力是自身产品范围，不是 doocs/md parity 事实。
3. 文档中的组件实例是 PascalCase block JSX，例如 `<QRCodeBlock url="…" />`。解析器支持 self-closing 与 paired tag；扫描引号以允许属性值中的 `>`，要求 closing tag/尾部仅有空白，并跳过 fenced code（[`component.ts:357-412`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L357-L412)、[`component.ts:414-507`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L414-L507)）。
4. prop 语法仅识别带单/双引号的 `name="value"` / `name='value'`（[`component.ts:126-136`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L126-L136)）。未知组件不是静默消失，而输出显式错误块（[`component.ts:509-544`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L509-L544)）。
5. 模板变量默认 HTML escape；数组循环项也 escape；只有 paired component 的 `children` 被当作 raw HTML 传递（[`component.ts:260-309`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L260-L309)）。最终仍经过 DOMPurify，因此“模板插值 escape + 统一输出净化”是两层边界，而不是允许任意 HTML 直通。
6. 用户组件定义持久化为 `custom_components`，实例仍只存在于 Markdown JSX 中。内置与用户定义按 name 合并，用户定义可以覆盖内置项（[`customComponent.ts:9-37`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/stores/customComponent.ts#L9-L37)）。这是 doocs/md 的扩展策略，不适合原样搬到 InkForge：覆盖安全敏感内置组件会削弱稳定版本、validator 与 fallback 契约。

#### 3.2 编辑器插入与编辑 UX：多入口进入同一库，最终只修改 canonical Markdown

1. doocs/md 编辑器是 CodeMirror 原文编辑，不是把组件实例保存为第二套可视化文档模型。工具栏“插入 → 组件”（[`InsertDropdown.vue:29-76`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/editor-header/InsertDropdown.vue#L29-L76)）和 `/component`（[`slashCommands.ts:220-249`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/composables/slashCommands.ts#L220-L249)）都打开同一个 dialog。
2. dialog 用“内置/自定义”tab、可展开组件卡、prop 文档、prop-fill、实时预览和 snippet 预览完成渐进式披露；插入前检查 prop-fill 中的必填值，最后统一执行 `editorStore.insertAtCursor(snippet)`（[`CustomComponentDialog.vue:122-161`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/CustomComponentDialog.vue#L122-L161)）。
3. CodeMirror 自动完成区分组件名与 prop：输入 `<` 或 PascalCase 前缀列组件；输入已知组件后的属性前缀列未使用 prop；代码块/行内代码中停用；组件 snippet 接受后替换已输入范围，prop 接受后把光标放到引号内（[`useComponentCompletion.ts:63-75`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/composables/useComponentCompletion.ts#L63-L75)、[`useComponentCompletion.ts:94-145`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/composables/useComponentCompletion.ts#L94-L145)、[`useComponentCompletion.ts:148-200`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/composables/useComponentCompletion.ts#L148-L200)）。接受键只保留 Enter/click，不绑定会与 Markdown indent 冲突的 Tab（[`useComponentCompletion.ts:219-247`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/composables/useComponentCompletion.ts#L219-L247)）。
4. doocs/md 当前源码没有找到“选中已渲染组件卡 → 用同一 prop form 回填并替换该实例”的交互；插入后的实例仍主要通过原文和 autocomplete 编辑。InkForge 已有 TipTap atom、精确 range replacement 和 existing-source 回填，不能为了追随 doocs/md 而倒退成仅原文编辑。

#### 3.3 表单与校验：doocs/md 的 UX 可借鉴，但信任边界不足以直接复用

1. prop-fill 根据定义生成字段，boolean 使用 Select，其余 `string`/`number`/`array` 都落到通用 Input；同一组 values 同时驱动预览和 snippet（[`ComponentPropFill.vue:17-58`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/ComponentPropFill.vue#L17-L58)、[`ComponentPropFill.vue:61-130`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/ComponentPropFill.vue#L61-L130)）。这是“schema 驱动表单”的好模式，但不是 URL、整数范围、数组 shape 或平台 ID 的语义校验。
2. required 且无默认值的字段在 form state 中先置空；`missingRequiredProps()` 对 trim 后空值报错；空 optional prop 不写进 snippet；序列化按 definition prop 顺序生成 self-closing JSX（[`component-snippet.ts:52-78`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/lib/component-snippet.ts#L52-L78)、[`component-snippet.ts:80-108`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/lib/component-snippet.ts#L80-L108)）。
3. required 校验只出现在 dialog 的“用已展开 prop-fill 插入/复制”路径。核心 `renderTemplate()` 只叠加 defaults 与 raw props，不检查 required、未知 prop、URL、number range 或平台 ID（[`component.ts:311-339`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L311-L339)）。若直接在原文输入缺失必填字段，renderer 会把缺失值渲染为空。
4. 自定义组件表单只校验 PascalCase 名称、用户组件重名和非空模板（[`CustomComponentForm.vue:86-133`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/CustomComponentForm.vue#L86-L133)）；JSON 导入仅检查顶层数组及 `name`/`template` 是否存在（[`CustomComponentDialog.vue:78-119`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/CustomComponentDialog.vue#L78-L119)）。因此不能把 TypeScript interface 当运行时 schema。
5. InkForge 当前 `writing-components.ts:73-145,772-839` 的 Zod、危险键、未知/version/unknown-prop、HTTPS URL 和 per-component validator 已比 doocs/md 严格；应保留这一边界，把 doocs/md 的表单渐进披露和 autocomplete 当 UX 参考，而不是替换现有 validation service。

#### 3.4 预览渲染：同一 renderer/registry 投影，不建立第二套业务定义

1. prop-fill 调用核心导出的 `previewComponent(def, values)`，随后使用核心 `sanitizeHtml()`，再 `v-html` 展示；旁边展示由相同 values 生成的 canonical snippet（[`ComponentPropFill.vue:45-58`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/ComponentPropFill.vue#L45-L58)）。
2. 页面 render store 把 `componentStore.registry` 传入 `renderer.reset()`；definition 的 template、props、updatedAt 被纳入 fingerprint，所以定义变化会触发正文重新渲染（[`render.ts:70-106`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/stores/render.ts#L70-L106)、[`render.ts:128-166`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/stores/render.ts#L128-L166)）。
3. 官方架构管线是 Markdown → `@md/core`/Marked extensions → DOMPurify → CSS/theme preview；只有复制到微信时才在 web 导出层运行 Juice inline（[`docs/architecture.md:35-50`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/docs/architecture.md#L35-L50)）。可借鉴的是“一个 registry、一个 canonical source、多个受约束投影”，不是复制 doocs/md renderer 到 InkForge。
4. InkForge 当前普通 TipTap `InkComponent` node view 是状态/摘要卡而不是平台同源视觉卡（`InkComponent.ts:120-200`）。本任务可在仍由 canonical source + shared definition 派生的前提下，给受支持内置组件增加原创的 component-specific visual projection；不能把最终微信 HTML/template 粘进 ProseMirror node view，也不能另建组件实例 store。

#### 3.5 `MpProfile`：平台标签输出与本地视觉替身是两件事

1. doocs/md 的 `MpProfile` definition 需要 `mpId`、`nickname`，可选头像/简介，并输出微信专用 `<mp-common-profile>`；相关平台 class、示例 ID、Logo URL和模板都写在内置定义中（[`component.ts:7-26`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L7-L26)）。
2. DOMPurify 只额外允许 `mp-common-profile` tag；脚本、事件、iframe 或任意 custom tag 并未因此被整体放行（[`markdownHelpers.ts:17-45`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/utils/markdownHelpers.ts#L17-L45)）。
3. 普通浏览器不认识该微信标签，所以 web app 注册同名 Web Component，并在 Shadow DOM 中模拟卡片（[`setup-components.ts:3-16`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/lib/bootstrap/setup-components.ts#L3-L16)、[`setup-components.ts:25-59`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/lib/bootstrap/setup-components.ts#L25-L59)）。该文件包含大段微信风格 CSS/class 和平台外观细节；InkForge 只能借鉴“浏览器使用可识别的替身，交付使用平台 artifact 或安全 fallback”的分层方式，必须自己设计原创卡片比例、排版、图标与空态，不能复制 CSS、class、Logo、示例 ID、截图或模板。
4. “sanitizer 保留标签”不等于“微信会接受并正确绑定名片”。InkForge 只有在平台路径、ID provenance、粘贴/发布行为被真实验证时，才可把 native artifact 标记为 supported；否则按现有规则输出静态、可读的安全 profile/link card，仅在真实 URL 存在时可点击，并清楚标为 fallback。
5. doocs/md 保存的公众号资料是可复用显示元数据，并可一键生成 `MpProfile` snippet；但是当前实现会在无 Logo 时回落到 doocs 自有 Logo（[`CustomComponentDialog.vue:214-236`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/CustomComponentDialog.vue#L214-L236)）。InkForge 不得采用该资产或任何假默认资料；缺少真实头像时应使用原创中性占位或直接省略头像。

#### 3.6 `QRCodeBlock` 与 `AuthorBlock`：结构可参考，外观/template/资产不可复制

1. `QRCodeBlock` 的 required `url`、可选文字/尺寸及中央图片区结构可作为 prop/信息层级参考，但 doocs/md 通过第三方 `api.qrserver.com` 动态生成二维码（[`component.ts:27-46`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L27-L46)）。这会把目标 URL 发送给外部服务，也把交付依赖放到第三方；InkForge 当前“真实 HTTPS QR image + target URL”模式更符合可验证、可控和微信静态交付要求。
2. `AuthorBlock` 的 required name、optional avatar/bio 和紧凑双列信息架构适合参考（[`component.ts:47-67`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts#L47-L67)），但应由 InkForge preset/variant 自己生成原创样式。缺少 avatar/bio 时应按 optional 字段省略，而不是插入 doocs 示例人物或占位简介。
3. 两者共同可复用的产品模式是：组件库卡片展示名称/用途/prop 文档；schema 驱动字段；即时 preview + canonical source；插入后保留选择、编辑、删除、键盘和 serialization。不可复用的是具体 HTML template、CSS、示例数据、Logo/头像、二维码服务和视觉资产。

#### 3.7 song/media 与可选元数据：必须区分“doocs 有什么”与“InkForge 要做什么”

1. 固定提交的内置 registry 和全仓源码搜索没有 `SongBlock` 或歌曲/音频组件。doocs/md 不能为 InkForge `SongBlock` 的 props、交互或微信 fallback 提供 parity 标准；其相关设计必须以 InkForge PRD、现有 `writing-components.ts` 和 `delivery-adornments.ts` 为权威。
2. doocs/md 对阅读数据采用正文派生模式：`front-matter` 解析后只把 `body` 交给 renderer，并从正文计算 reading time；解析失败时才对原串计算（[`renderer-impl.ts:161-180`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/renderer/renderer-impl.ts#L161-L180)）。当 count 开关关闭或正文词数为零时，阅读提示不输出（[`renderer-impl.ts:239-250`](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/renderer/renderer-impl.ts#L239-L250)）。
3. 当前 `ParseResult` 没有把 frontmatter attributes 暴露给组件系统；因此 doocs/md 只证明“frontmatter 与正文渲染/统计分离”，不证明 `song`、作者、公众号、colophon 等 frontmatter key 已有官方 schema 或会自动驱动 JSX 组件。
4. InkForge 已在 `services/export/delivery-adornments.ts:345-423,632-673,764-773` 从正文计算阅读分钟/字数并确保 masthead/song 不重复；这一逻辑应继续作为 editor、InkForge preview 和 WeChat preview 的单一统计源。本任务不新增 frontmatter 组件 metadata；自动首尾组件继续使用现有 Zod Settings domain。
5. InkForge 的歌曲组件已有“真实 title + 可选 artist + validated URL；微信无原生能力时降级为安全链接卡；无 URL 时 manual-required/fail closed”的现成路径（`delivery-adornments.ts:549-578`）。本任务应把它视觉化到 editor/preview，而不是伪造可播放控件、假封面、平台曲库 ID 或“已插入微信音乐”状态。

### 4. InkForge 可重实现的架构与 UX 决策

| 关注点 | 可重实现模式 | 必须保留的 InkForge 边界 | 不应复制/引入 |
|---|---|---|---|
| Source representation | PascalCase self-closing JSX；definition/schema 统一描述字段、默认值、required、版本与 renderer。 | 继续使用 `WritingComponentNode.source`/canonical serialization；同一源串驱动 source、TipTap、preview、WeChat。 | doocs HTML templates、示例 JSX、第二组件实例 store。 |
| 插入入口 | toolbar/library、slash command、输入时 name/prop completion 均汇入同一 library/service。 | 继续保留已有 TipTap 选中、编辑、删除、range replacement、键盘和 focus 行为。 | 只支持 raw CodeMirror 编辑的能力倒退。 |
| 表单 | schema 驱动控件、required 标记、字段说明、实时组件预览、canonical source 预览。 | URL/HTTPS、数字范围、枚举、数组 shape、平台 ID、危险 key 全部由现有 Zod + component validator 在插入和 render 两端执行。 | 仅 TypeScript interface、仅 UI required 检查、宽松 JSON import。 |
| 编辑器视觉 | 为 `MpProfile`、QR、Author、Song/Media 生成原创、可识别、与最终信息层级同源的 atom card。 | node view 只投影真实 props/validation；invalid/incomplete 有可访问错误，不输出假内容；最终 HTML仍走 shared renderer。 | 微信 CSS/class/Logo/截图、doocs template、把最终 renderer 嵌进 ProseMirror。 |
| Preview | prop values 同时驱动卡片和 source；定义/variant 变化触发同源重渲染。 | `renderWritingComponentSource()`/现有 preset/variant 为唯一视觉业务入口；variant 只改表现。 | 新 renderer、新平台 editor、新视觉身份。 |
| 微信交付 | 平台原生 artifact 与浏览器静态替身明确分层；unsupported 时安全 HTML fallback。 | 先验证 capability/provenance；没有 native proof 时输出静态 profile/QR/link，明确 fallback/manual 状态。 | 仅靠 `<mp-common-profile>` 或 lookalike preview 声称原生支持。 |
| optional metadata | 公众号资料、作者资料、歌曲资料可作为复用 metadata；阅读量从正文确定性计算。 | 缺失即省略/中性空态；真实值才能进入序列化与导出；本任务沿用 Settings/JSX，不新增 frontmatter key。 | doocs 示例账号、默认 Logo、假歌曲、假阅读量、猜测式 frontmatter key。 |
| 扩展性 | 一个 registry、一套 stable serializer、显式 unknown/unsupported 状态。 | 内置 definition/version/validator/fallback 不允许用户同名覆盖；自定义组件仍受安全 schema 限制。 | 任意 HTML template、脚本/events、用户覆盖安全敏感 built-in。 |

建议实现次序（研究结论，不是代码修改）：

1. 先让现有 `writing-components.ts` 定义成为四处投影的唯一权威，不新增 store/renderer。
2. 给 `InkComponent` node view 增加按 component id 分派的原创视觉 projection，同时继续从 canonical source 解析并显示 `ready/incomplete/invalid`。
3. 让 Writing Component Library 与 node edit 共用同一字段 schema、校验、preview 和 serializer；可选补 slash/autocomplete，但都只调用现有插入服务。
4. `MpProfile`、QR、Author、Song/Media 分别声明 native artifact、static fallback、validator、provenance 与 action state；微信 preview 只展示实际将交付的结果。
5. 阅读量只从既有 Markdown 正规化后的真实正文计算；在 editor、InkForge preview、WeChat preview 使用同一结果并保证仅出现一次，不新增 frontmatter 统计分支。

### 5. Related specs / prior decisions

- 当前任务 PRD `.trellis/tasks/08-02-wechat-editor-component-parity-frontmatter-colophon/prd.md:15-20,26-52,62-97` 已明确：复用 TipTap `InkComponent`、masthead、delivery adornments、preset 与 export postprocess；不建第二 renderer/store/platform editor；doocs/md 只提供“可编辑、可识别组件卡 → 平台最终输出”的方法参考。
- `.trellis/spec/frontend/visual-variant-system.md:181-207` 要求所有 variant 使用同一 validated model，`.trellis/spec/frontend/visual-variant-system.md:215-235` 要求 editor/preview 是同一状态的不同投影并禁止假数据；本研究与该决策一致。
- `.trellis/spec/frontend/wechat-svg-modules.md:17029-17053` 已规定单一 registry、Zod boundary、PascalCase self-closing JSX、atomic `inkComponent`、稳定 serialization 和 platform-safe fallback；无需另建 doocs 风格组件系统。
- `.trellis/spec/frontend/flagship-element-catalog.md:39-69` 与 `docs/platform-rendering-rules/wechat-rules.md:587-591` 共同排除伪原生公众号/媒体控件。
- 既有 `.trellis/tasks/07-28-rendering-empty-output-fix/research/doocs-component-system.md:1-48` 和 `prompts/0601/research/oss-md-architecture.md:200-235` 已决定只借鉴公开架构，不复制 UI/assets/templates、不引入 doocs runtime dependency；本次当前提交复核没有理由推翻该决定。
- 较旧 `docs/编辑器需求文档PRD.md` 中“fork/直接复用”类措辞是历史方案，和当前 task PRD、现行 specs 及市场实践边界冲突；实现时应以后者为准。

### 6. External references

- [doocs/md 官方仓库](https://github.com/doocs/md)
- [固定研究提交 `e501833`](https://github.com/doocs/md/commit/e50183350afd48162641420d671050bbd882d668)
- [doocs/md 在线编辑器](https://md.doocs.org/)
- [官方架构文档](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/docs/architecture.md)
- [官方组件核心实现](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/extensions/component.ts)
- [官方组件共享类型](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/shared/src/types/component.ts)
- [官方编辑器组件对话框](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/CustomComponentDialog.vue)
- [官方组件 prop-fill 与 preview](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/components/editor/dialogs/ComponentPropFill.vue)
- [官方 CodeMirror 组件自动完成](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/apps/web/src/composables/useComponentCompletion.ts)
- [官方 sanitizer / Markdown helper](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/packages/core/src/utils/markdownHelpers.ts)
- [官方公众号卡说明](https://github.com/doocs/md/blob/e50183350afd48162641420d671050bbd882d668/docs/mp-card.md)
- [PR #1794：组件实时预览](https://github.com/doocs/md/pull/1794)
- [PR #1795：组件/prop autocomplete 与 prop-fill](https://github.com/doocs/md/pull/1795)

## Caveats / Not Found

- **未发现官方 song/media built-in：** 在固定提交的七项 registry 和相关全仓检索中没有 `SongBlock`、歌曲卡、音频播放器。结论仅限提交 `e501833`；以后 main 新增功能需重新核验。
- **未验证微信原生接受行为：** 本研究没有在微信 PC 编辑器中粘贴/发布 `<mp-common-profile>`，因此不能证明 tag、`mpId`、class 或数据属性在当前平台仍被接受。doocs 本地 Web Component 只证明网页替身可显示。
- **没有把 doocs 外观当授权素材：** `setup-components.ts` 含大段平台风格 CSS/class；`component.ts` 和 dialog 含 doocs Logo、示例 ID、示例人物和第三方 QR 服务。它们只用于识别架构边界，不能复制进 InkForge。
- **校验存在已确认缺口：** doocs core renderer 不执行 required/URL/范围/platform-ID 校验，JSON component import 也没有完整 runtime schema；InkForge 不应降低现有 Zod/fail-closed 标准。
- **frontmatter 没有组件元数据 schema：** 当前 doocs renderer 只剥离 frontmatter 并计算正文 reading time，未发现 `song`、`author`、`mpProfile`、`colophon` 的官方 frontmatter 契约。搜索结果中的 `read_time` 等字段示例没有源码支持，已排除。
- **现有实例的可视化回填编辑未找到：** doocs 当前对话框擅长新建/插入，自定义 definition 也可编辑；但未发现从已插入 JSX 实例选中后回填 prop form 并原位替换的实现。InkForge 已有此能力，应保留。
- **测试边界：** 官方 tree 中找到了 `component-snippet.test.ts`、`useComponentCompletion.test.ts`、`merge-localized-components.test.ts`，未找到 core `markedComponent` parser/renderer 的直接 test 文件；parser 边界结论来自当前源码，不等同于完整回归证明。
- **在线 UX 未做浏览器手测：** 为遵守不留浏览器/凭据 artifacts 且尽快收敛，本次审查在线编辑器对应的固定提交实现与官方 PR，没有创建浏览器会话；响应式、焦点细节和线上部署是否恰好等于该提交仍未验证。
- **历史文档冲突：** InkForge 旧 PRD 中可能出现 fork/直接复用措辞；现行 task PRD、Trellis specs 与市场实践文档明确要求 architecture-only、单 renderer 和不复制模板/资产，后者优先。
