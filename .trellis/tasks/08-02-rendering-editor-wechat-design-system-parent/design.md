# Technical Design — 全样式独立设计与编辑微信一体化

## 1. Decision summary

本母任务采用用户确认的边界：

- 继续使用一套 Markdown/TipTap 语义、一套 writing-component registry、一套 Settings delivery
  snapshot、一套微信安全转换链；
- 16 个现有微信 preset 分别拥有完整的可见出版构图，不共享 masthead、标题卡、正文骨架、
  组件卡和文末几何后只换色；
- 编辑器存语义和真实字段，不存最终微信 HTML/SVG 或 preset 专属成品模板；
- 原生 release Tauri/WebView2 是产品验收面；微信公众号普通粘贴、原生媒体编辑器读回以及
  XHS/Zhihu 不发布的真实编辑器导入/上传是彼此独立的外部落地门。

这不是新建渲染系统。最小正确方案是修正现有入口和数据流，并在现有 `presetId` 分支中完成
各套艺术指导。不得增加 renderer、主题 DSL、组件注册表、store、数据库表或依赖。

## 2. Existing ownership and change boundary

| Concern | Existing authority to reuse | Planned responsibility |
|---|---|---|
| 正文语义 | TipTap `EditorPanel`、Markdown round-trip、StarterKit H1–H6 | 浮动工具栏只调用既有语义命令 |
| 正文组件 | `InkComponent` + `writing-components.ts` + Zod | 编辑态复用 definition visual body，不建第二套组件模板 |
| 自动文前/文末 | `settings.export.deliveryAdornment` + `DeliveryAdornmentPanel` | 增加编辑器专用承载面，状态仍由 Settings 管理 |
| 当前平台产物 | `NativeExportOptions` + `platformArtifactOptions` | 作为 Workstation 当前 artifact snapshot，不再手工窄化拼装 |
| 微信转换 | `convertToNativeFormat('wechat')` / `markdownToWechatWithStats()` | 预览、复制、Export、Publish 使用同一转换合同 |
| preset 映射 | `themes.ts` + `resolveVisualVariant()` + ArticleProfile | 继续使用 16 个 ID；可见构图按 preset 独立 |
| 渲染规则目录 | 现有 preset/variant/profile/catalog 元数据 | 提供 typed 只读描述与校验，不生成第二份 HTML |
| 安全与兼容 | Juice、DOMPurify、quality detector、SVG safe subset | 全 preset 共用，不允许按版式绕开 |
| 外部证明 | 单一任务 CloakBrowser 会话 + WeChat/XHS/Zhihu 真实编辑器 | 普通粘贴、原生组件插入或平台导入/上传读回；不发布、不保存敏感账号证据 |

当前可直接复用的事实：

1. `EditorPanel` 已配置 `heading: { levels: [1, 2, 3, 4, 5, 6] }`；Slash Commands 也已有
   正文和 H1–H6，所以本轮无需新增 TipTap extension。
2. `FloatingToolbar` 已有 H1–H3、引用、列表、代码、表格和字符格式命令，但交互是一排混合图标。
3. `WorkstationView.platformArtifactOptions` 已聚合 preset、标题、分类、Typography、delivery 与
   export settings，并同时供 `usePreviewRenderer()` 和快速复制使用。
4. `EditorPanel` 的 `open-delivery-settings` 仍在 Workstation 被直接映射为 `showExportModal = true`，
   这是入口错误而非渲染器缺失。

切片所有权补充：`07-31-preset-brand-differentiation` 独占 16 套最终可见 composition；
`08-02-wechat-editor-component-parity-frontmatter-colophon` 只拥有 registry component body、delivery
slots、统计和 canonical artifact 输入，不再实现另一套 preset masthead/body/footer。

后续范围扩展 `08-09-native-media-shell-xhs-zhihu-render-acceptance` 独占微信官方媒体/原生组件
交接、native shell 全状态矩阵和 XHS/Zhihu 编辑器渲染实测。它复用本 design 的单一 artifact 与
安全底座，实施期间可作为唯一 current contract；parent 保持集成权威但不并行执行。

## 3. Canonical data flow

```text
Article + current content + category
TipTap/Markdown semantic source
Settings appearance/export/delivery
selected platform + selected preset
                │
                ▼
existing immutable NativeExportOptions snapshot
                │
      ┌─────────┴──────────┐
      │                    │
      ▼                    ▼
editor projection       convertToNativeFormat(platform)
(semantic, editable)          │
      │                       ├─ Workstation preview
      │                       ├─ system clipboard copy
      │                       ├─ ExportModal artifact
      │                       └─ PublishView preparation
      │
      └─ same preset/variant/profile, real fields, component source and returned stats
```

### 3.1 Snapshot rules

- 一次状态变更只生成一个当前 snapshot；不得在 Preview、Copy、Export 或 Publish 分别推断标题、
  preset、Typography、delivery 或 readingSpeed。
- snapshot 继续使用现有 `NativeExportOptions` 和 Settings 类型，不新建“渲染上下文”模型。
- `usePreviewRenderer()` 的 token 同时提交 HTML、stats、report；旧 token 整体丢弃，不能让旧标题、
  旧 preset 或旧统计覆盖当前结果。
- 编辑投影不消费最终微信 DOM，但从同一状态得到 preset/variant/profile、文章标题/分类、真实
  组件字段和 converter 返回的 stats。允许的差异只有编辑 chrome、contenteditable 行为和宿主宽度。
- XHS/Zhihu 继续进入各自 adapter；不得接收微信 wrapper、CSS 或 SVG 装饰。
- snapshot 等价按 `正文修订 + platform + preset + canonical Settings + delivery source` 的深度输入
  比较判定，不要求跨路由共享引用，也不新增运行时版本 store。测试可计算只用于证据的输入摘要。
- Workstation 是当前编辑会话 snapshot 的生产者；Stage 和快速复制消费同一个只读值。
- ExportModal 打开时以该值为 baseline。用户在 modal 内切换 platform/preset 或修改其既有局部选项
  后，明确生成新 snapshot；取消只丢弃 modal 局部状态，不更改原 baseline 或文章。
- PublishView 跨路由不携带活对象，通过同一纯构建边界从 route article 与 canonical Settings 生成
  深度等价输入。相同输入必须得到相同 native artifact；不同用户选择不得被伪装为“同一快照”。

### 3.2 Content and delivery precedence

- 正文中的显式组件仍由 JSX/`InkComponent` 持久化，并保持用户插入位置。
- 自动文前歌曲、阅读统计、文末自身名片、来源、CC 和 colophon 继续来自 Settings delivery。
- 自动槽不写入正文、undo、Markdown 或字数；显式组件不被自动槽搬运。
- 缺失真实字段时，编辑态显示可操作的待配置状态；最终产物省略空槽或输出明确静态 fallback，
  绝不填充示例歌曲、作者、账号、数字、图片、URL 或 media ID。

## 4. Semantic formatting interaction

### 4.1 Toolbar composition

保留 `FloatingToolbar.vue` 和已有命令，只调整信息架构：

1. 浮层第一项是带中文当前值的块级语义选择器：`正文`、`一级标题` 至 `六级标题`、`引用`、
   `无序列表`、`有序列表`、`任务列表`、`代码块`。
2. 常用字符格式独立成组：加粗、斜体、删除线、下划线、行内代码、高亮、文字颜色、上下标、链接。
3. 对齐、图片、表格、分隔线等结构命令进入次级组/更多菜单，避免 30 个无标签图标同时换行。
4. 按钮继续使用已安装 Lucide 图标；中文可见标签与 `aria-label` 同时存在，不使用 Emoji。
5. 窄窗口采用横向滚动或分组弹层，不允许浮层撑出编辑区或遮挡选区。

### 4.2 Command and selection contract

- 当前块状态使用 TipTap `isActive()` 计算；混合多块选区显示“多种格式”，不得伪装成单一标题。
- 执行前使用现有 `can().chain().focus()`/selection 机制；打开菜单不能先让选区丢失。
- H1–H6 直接调用现有 `toggleHeading({ level })`；正文调用 `setParagraph()`；不插入 preset HTML。
- 表格单元、原子组件、代码块内部和不兼容多块选区按 `can()` 禁用并说明原因，不静默破坏节点。
- 点击外部、`Escape`、编辑器销毁、Source/Preview 模式切换都要清理浮层；焦点回到原选区。
- 保存、重开和 Typora/Source 往返只验证语义 round-trip。preset 切换后，节点类型不变，视觉由
  当前 preset 投影更新。

### 4.3 Test seam

组件测试必须覆盖：

- paragraph → H1–H6 → paragraph；
- 真实 Range 选区下打开菜单后 selection 未丢失；
- 引用、列表、代码块及字符格式分组；
- mixed selection、table cell、`InkComponent` 和 code block 边界；
- Typora/Source/保存重开后 Markdown 结构不变；
- 同一 H2 在两个不同 preset 下仍是同一语义节点但视觉投影不同。

## 5. Component and delivery information architecture

### 5.1 Body component library

- Stage“组件”、Slash `/组件` 和编辑 atom 的“编辑”继续进入同一个现有组件库/表单。
- 新组件插入复用现有 saved selection 与 `BlockBoundaryInsertion`；不直接调用裸 `insertContent()`
  绕过块边界。
- ready atom 嵌入同一个 definition visual body，并加 editor-only 选择、拖拽、编辑、错误和焦点 chrome。
- 链接/媒体在编辑态不可误导航；键盘选择、删除、前后移动和重新编辑保持 ProseMirror 行为。

### 5.2 Delivery settings sheet

Workstation 增加与 `showExportModal` 独立的轻量可见状态，例如 `showDeliverySettings`，并在现有
modal/sheet 原语中直接挂载 `DeliveryAdornmentPanel`：

- `EditorPanel @open-delivery-settings` 只打开该表面；
- 文前“添加真实歌曲”、抬头“配置”、文末名片/CC 配置都进入该表面并定位相应区域；
- 面板直接读写同一 Settings store，不复制 local form model；
- 关闭后焦点回到触发按钮，编辑滚动位置和选区不跳动；
- `ExportModal` 只由导出按钮打开；Publish Center 继续由发布按钮打开；
- 原有 `DeliveryAdornmentPanel` 在 Export/Publish 中的使用保持兼容。

不新增第二个“自动组件库”。正文组件与自动 delivery 的界面可共享表单组件，但状态域和插入语义
必须分开。

## 6. Editor/preview correspondence

### 6.1 Editor projection

`EditorPanel` 继续是一张可编辑纸张，而不是把最终微信 HTML 放进 `contenteditable`。它需要显示：

- 当前 preset/variant/profile 的身份与版式节奏；
- 当前真实标题、分类、文前歌曲状态、阅读分钟和字数；
- TipTap 中 H1–H6、引用、列表、表格、代码、图片与正文组件的 preset 对应投影；
- 正文后的自身名片/关注状态、来源/CC/colophon 摘要；
- 明确的编辑 chrome，且这些 chrome 不进入 Markdown 或平台产物。

编辑投影与预览的对应不是像素完全相同，而是以下合同相同：语义节点、真实字段、preset 身份、
组件层级、阅读统计和版式意图。最终微信 sanitizer/inlining 造成的安全降级只发生在平台产物中，
并由诊断/report 明示。

### 6.2 No shared visible skeleton

共享 CSS 只允许负责：

- reset、字体 fallback、行宽、图片响应式、表格/代码最低可读性；
- focus/selection/editor chrome；
- 真实字段和安全 fallback 的基本可访问性。

共享层不得定义所有 preset 都使用的报头几何、左轨、统一标题卡、统一圆角组件卡、统一 quote、
统一目录或统一 footer。现有 profile/variant hooks 可复用，但每个 `presetId` 必须拥有完整的可见
composition 分支。不得为此引入运行时模板语言；直接使用现有 `themes.ts`、visual-variant builder、
decorator 和稳定 data hooks 是最小实现。

## 7. Sixteen independent art directions

下表是成品结构合同，不是可任意混搭的原子菜单。每行必须作为整体出版方向打磨；共享品牌锚点
不要求共享位置或几何。

| Preset | Masthead / identity | Heading and reading rhythm | Components | Ending |
|---|---|---|---|---|
| `thesis` | 书脊、卷次、罗马序号、版本双轨 | 译注式 H1–H6、连续论文正文、脚注细规 | 术语/引文/图版像校勘页 | 文献署名、版本谱系、双线收束 |
| `legal` | 法条坐标、案卷编号、权威标尺 | 条款层级、编号证据链、克制正文 | 法条/对比/来源卡沿证据侧轨 | 案卷名片、卷宗封线 |
| `report` | 深色产业剖面、大章节数字、数据带 | 结论先行、指标层级、短节奏 | 统计/时间线/表格形成分析板 | 机构信息板、结论条 |
| `commentary` | WIRE 标签、观点期号、事实状态 | 粗黑标题、短导语、事实与判断分节 | 事实/观点对照、来源摘录 | 编辑来源卡、双规则报尾 |
| `aigc` | BUILD 标签、模型/版本矩阵、冷热铸场 | 构建阶段标题、数据化小节 | 模型统计、Prompt/媒体/对比板 | 构建身份牌、状态轨终止 |
| `code` | 终端提示、commit/版本号、深色日志面 | 等宽层级、步骤编号、代码优先 | 代码、命令、复现步骤、协议表 | 开发者卡、命令行收束 |
| `notes` | NOTE 标签、问题—概念—证据索引 | 便签层级、回链标题、舒缓正文 | 知识卡、批注、关系/信息网格 | 学习者卡、纸张折页 |
| `news` | 独立报头、日期/版次/来源列 | 新闻标题、摘要、正文层级分明 | 摘要栏、来源线、时间线/图集 | 记者名片、报尾双线 |
| `meme` | 编辑贴纸、跳号期次、海报切纸 | 高对比短标题、错落但不牺牲阅读 | 海报/金句/图集使用拼贴轮廓 | 创作者贴纸、印章收束 |
| `life` | 信笺题记、日期、大片安静留白 | 低层级温和标题、长文呼吸 | 手记引线、图片/引文如信件附件 | 作者信笺、余白结束 |
| `elegant` | 典籍扉页、章节号、藏书标识 | 宋体长文、首字下沉、古典分章 | 图版、引文、注释如典藏页 | 藏书票名片、细饰分隔 |
| `tech` | 电路节点、协议号、版本指标 | 工程标题、参数层级、紧凑正文 | 数据网格、协议卡、拓扑/时间线 | 技术身份板、节点终止 |
| `flagship-kiln` | 构成主义炉火封面、铸造编号、方格 | 厚重标题、几何章节、稳定正文 | 料块、方格、图版与安全 SVG | 墨铸印章、厚重底座 |
| `flagship-kiln-paste-safe` | 独立纯 HTML 铭牌、渠道状态、稳定数字列 | 无脆弱 SVG 的铸造层级 | 纯 flow/table-safe 铸造卡与 fallback | 静态印章、粘贴安全双线 |
| `flagship-tempera` | 画稿页码、编辑标签、纸层索引 | 画册标题、批注式小节、疏密变化 | 层叠纸片、图集、注释边栏 | 编辑名片、画框式收束 |
| `flagship-amber` | 琥珀档案封面、时间/数据轨、编号 | 档案标题、时间章节、稳重正文 | 对比/时间线/统计形成档案主板 | 档案名片、铜色终章牌 |

### 7.1 Differentiation gates

每两套在去除颜色、preset 名称、文章正文、数字和固定品牌文案后，至少在以下六项中的三项不同：

1. masthead DOM 层级和视觉重心；
2. H1–H6 比例、编号和段前后节奏；
3. 普通段落的缩进、行距、留白和衔接方式；
4. quote/list/table/code/figure 的轮廓；
5. writing-components 与 song/metrics 的信息层级；
6. profile/CC/colophon 的文末收束。

结构指纹只防止同构回归，不能证明审美。最终必须用同一完整验收稿在 release 软件生成每套的
首屏、中段、组件和文末 contact sheet，并逐套目检。

可复现结构门按以下方式生成：

1. 对最终 sanitize/inlining 后的 HTML 分成 masthead、heading rhythm、body flow、semantic blocks、
   writing components/song/metrics、ending 六区；
2. 清除文本节点内容、数字、颜色值、preset 名称/ID、`data-*` 与无语义空装饰节点；
3. 保留有意义的标签层级、顺序、非颜色 inline 几何、对齐、边框形态、SVG 几何类别和章节编号
   结构；
4. 生成 16 个稳定分区签名和 120 对差异矩阵；每对至少三区不同；
5. 测试拒绝仅靠 `data-*`、空节点、固定文案或颜色造成的差异，并保存机器可读矩阵；
6. 视觉 reviewer 仍逐套检查原生 contact sheet，机器签名不得替代审美结论。

### 7.2 Executable rendering-rule catalog

后续自定义开发需要稳定入口，但不能把本轮重新扩张为主题语言。最小方案是在现有 export catalog
边界内增加强类型、只读的 composition rule 描述，并让真实 preset 定义与测试共同消费它：

```text
existing preset id / visual variant / article profile
                         │
                         ├─ existing decorator + converter -> delivered HTML/SVG
                         │
                         └─ typed rule descriptor -> inspector/docs/fingerprint/report
```

每条 descriptor 只描述已经存在的实现合同：`presetId`、brand anchors、masthead、heading rhythm、
body flow、semantic blocks、writing-components、song/metrics、ending、platform degradation、safe
invariants、customization knobs。它不得含可执行模板字符串、任意 CSS、HTML 片段或另一个 component
registry，也不得被 converter 当作第二条渲染路径。

对账门同时枚举 `themes.ts` 中真实微信 preset 和规则目录：16/16 一一对应、无重复/未知项；规则
声明的 variant/profile 与解析结果一致；六分区声明必须能映射到最终 normalized fingerprint；组件
覆盖仍从 writing-component registry 动态取得。后续新增或定制 preset 时，开发者只扩展现有
preset 实现并补一条同源 descriptor，随后通过结构、安全、组件覆盖、原生视觉和微信 PC 粘贴门。

## 8. WeChat output and proof boundary

### 8.1 Safe delivered artifact

最终微信 HTML 继续遵守现有安全子集：

- 文字和可重排内容优先 HTML；SVG 只承载短几何、短标签和已验证装饰；
- 不依赖 class/id/style sheet、脚本、事件、伪元素、外链资源、position、flex/grid、filter/mask、
  CSS variable、`calc()` 或长文本 SVG；
- 图片必须有安全 URL/alt，表格和代码可横向降级但不能撑破文章；
- 135/秀米/doocs/md 只提供工作流和视觉语法参考，任何其私有 DOM、素材、CDN、模板几何和
  authoring residue 都不得进入产物；
- sanitizer、quality detector、SVG validator 与幂等检查对 16 套统一执行。

### 8.2 Completion evidence

本轮“可以交给用户实测”的最小证据链：

1. release `InkForge.exe` 中工具栏语义、组件插入、delivery 配置、编辑投影、预览和复制可用；
2. 16/16 preset 完整语义稿通过结构、安全、溢出和独立性自动门；
3. 16/16 preset 在 release 软件完成首屏/中段/组件/文末目检；
4. 从 release 软件真实复制，通过普通 Windows `Ctrl+V` 粘贴到已登录微信公众号 PC 编辑器，
   逐套读回关键文本、结构、inline style 和 fallback；
5. 不点击保存、预览到手机、群发或发布，不提交账号态证据。

证据链必须绑定同一最终产物：记录 release EXE 与 installer 的 SHA-256；每个 preset 行记录
`presetId`、`releaseExeSha256`、native artifact SHA-256、clipboard rich-HTML channel、可信 paste
事件与目标正文绑定、settled DOM 摘要、关键节点/样式/SVG 计数、宽度/overflow、UTC 时间和结论。
代码、设置默认值或打包产物一旦变化，旧 16 行矩阵全部失效。原生 contact sheet 使用仓库自有
校准文稿并保存脱敏成品；微信账号界面截图、账号状态和本机路径不进入仓库。

这条证据只能证明 PC 编辑器普通粘贴，不能证明原生歌曲/名片/媒体。后者由 linked child
`08-09-native-media-shell-xhs-zhihu-render-acceptance` 独立插入/读回；手机预览、Dark Mode、交互
SVG、封面视觉缩略图/裁切/手机预览、同步、定时、群发和发布仍为 `unverified`/外部门禁。

## 9. Compatibility, accessibility, and performance

- 保留 16 个微信 ID、5 个 XHS ID、3 个 Zhihu ID、现有 Settings schema、文章与组件 source；
  不做迁移，不删除功能。
- H1–H6 和组件控制必须有中文标签、键盘路径、`aria-*`、焦点环和至少 44px 触控目标或等效菜单项。
- `prefers-reduced-motion` 关闭非必要动画；浮层、sheet、panel 切换不能改变正文 selection 或滚动锚点。
- 预设切换复用现有 debounce/token；不在每次光标移动时跑第二次完整 converter。
- contact sheet 和重型测试串行运行；Tauri build 与浏览器门禁不并行，避免本机内存峰值。
- Parent 直接切片只运行 XHS/Zhihu 本地转换负向回归；linked child 使用真实编辑器执行导入/
  上传/读回但不发布，二者不得混为同一证据批次。

## 10. Rollout and rollback

按独立可回退切片推进：

1. 先加失败测试并修正语义工具栏和 delivery 路由；
2. 再统一 artifact snapshot 消费与编辑投影；
3. 然后逐 preset 完成独立可见 composition；
4. 同步建立并对账 typed 渲染规则目录与自定义扩展文档；
5. 最后进行 release 原生视觉和微信 PC 粘贴；后续批准的 linked child 再串行完成原生媒体、
   shell 全状态与 XHS/Zhihu 编辑器门禁。

任何切片失败只回退该入口或对应 preset 分支。不得通过回滚删除 preset、组件、Settings 字段或
安全检查，也不得引入第二套 renderer 来绕过回归。
