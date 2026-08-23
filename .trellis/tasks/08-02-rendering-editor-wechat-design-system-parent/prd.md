# InkForge 全样式独立设计与编辑微信一体化母任务

> 阶段：Trellis Implementation / `in_progress`
> 优先级：P0
> 用户已批准实施；当前按本 PRD/design/implement 继续开发与验收。

## Goal

把 InkForge 的“写作编辑 → 语义组件 → 16 套独立排版 → 原生软件预览 → 复制微信富文本 →
微信公众号 PC 编辑器普通粘贴”收成一条真实、可复验的产品链。

用户应当能够在 InkForge 编辑台中明确看见当前文本是正文、H1–H6、引用、列表、代码或其他
语义；在光标处插入、配置并继续编辑真实组件；切换任一微信预设后，编辑态、平台预览、复制
产物与微信 PC 编辑器中的落地结果使用同一文稿、同一 preset、同一真实字段和同一转换产物。

最终 16 个微信预设都必须是经过独立艺术指导的出版版式。它们可以共享安全、语义、真实数据
和移动可读性底座，但不得共享可见的 masthead、标题卡、正文骨架、组件卡或文末结构后只换色。

## User Value

1. 写作时即可理解和修改最终文章结构，不再依赖“导出后才知道是什么”。
2. 每套预设都像一份独立出版物，而不是原子模块的机械拼装或同模板换色。
3. InkForge 原生软件中看到的内容，与复制到微信公众号 PC 编辑器后的内容保持可解释对应。
4. “可用”由真实转换、原生软件和微信普通粘贴证据证明，不由浏览器 mock、字符串差异或组件数量冒充。

## Confirmed Facts and Root Causes

### F-01 标题语义能力存在，但当前交互不可发现、不可稳定复现

- `FloatingToolbar.vue:498-522` 已有 H1/H2/H3 的真实 `toggleHeading()` 命令；引用、列表、代码块、
  表格等命令也存在。
- 当前工具栏把约 30 个无文字标签的图标放在一个可换行浮层中，标题层级只靠 `Heading1/2/3`
  图标和 hover title 表达，缺少“正文 / 标题 / 引用”等清楚的块级语义选择器。
- 现有自动测试没有覆盖“真实选区 → 浮层出现 → 切换标题 → 保存 → 预览/复制保持同一语义”的完整链。
- 因此当前缺陷不是“没有标题命令”，而是语义状态、发现性、选区稳定性和跨投影验收不完整。

### F-02 正文组件入口与自动文前/文末配置是两条不同业务流，当前被错误混接

- `WorkstationView.vue:3699-3708` 的 Stage“组件”按钮已调用 `openWritingComponentLibrary()`，会进入
  正文写作组件库。
- `EditorPanel.vue:1300-1427` 的文前歌曲、阅读信息、文末公众号名片属于自动 delivery 投影，
  其“配置”按钮发出 `open-delivery-settings`。
- `WorkstationView.vue:3421` 当前把该事件直接映射为 `showExportModal = true`；测试
  `WorkstationView.desktop-layout.test.ts:288` 还锁定了这条错误关系。
- 所以用户点击“添加真实文前歌曲 / 配置”却进入导出文章，不是误操作，而是当前信息架构错误。
- 现有 `DeliveryAdornmentPanel.vue` 已是 Export 与 Publish 共用的真实配置表面，可以复用；无需新增
  第二套配置状态或把导出弹窗当编辑器设置页。

### F-03 编辑态已经有组件原子节点和前后投影，但仍存在共享骨架与成品割裂

- `EditorPanel.vue` 已挂载 `InkComponent`，支持 JSX/TipTap 往返、重新编辑、错误态和光标恢复。
- 编辑器中的 ready 组件卡已能复用真实 definition visual body；缺失字段不会伪造示例数据。
- 编辑纸张已有微信文前/文末投影，但 `EditorPanel.vue:2486-2721` 仍以一套通用几何控制所有 preset；
  `EditorPanel.vue:2346-2484` 只为部分 VisualVariant 添加有限标题差异，尚未形成 16 套独立编辑投影。
- 用户最新截图证明：编辑态标题、组件和最终微信预览仍无法形成稳定、可理解的一一对应。

### F-04 唯一转换链已经存在，不需要第二套 renderer

- 当前应用已有 `resolveVisualVariant()`、writing-components registry、`convertToNativeFormat()`、
  `markdownToWechatWithStats()`、Juice、sanitize、SVG 安全模块和质量检测器。
- 现有 spec 要求 Workstation 预览、复制、Export 与 Publish 消费同一 preset/variant 和转换结果。
- 本轮根修复应删除重复拼装和错误入口，不增加 renderer、主题 DSL、store、数据库表或第三个组件模型。

### F-05 既有“已完成”记录不能推翻用户最新的原生视觉否决

- `07-28-rendering-spec-editor-components`、`07-31-preset-brand-differentiation`、
  `07-31-wechat-editor-paste-validation` 与 `08-02-wechat-editor-component-parity-frontmatter-colophon`
  中已有若干 AC 标记为完成。
- 用户在当前 release 软件中仍能复现标题不可发现、delivery 配置误入 ExportModal、编辑/预览割裂和
  版式同构，因此这些 AC 只作为历史证据，不作为本母任务的最终通过结论。
- 母任务重新打开集成验收；只有当前修复后的原生软件与新一轮微信普通粘贴证据可以关闭门禁。

## Product Invariants

1. Markdown/TipTap 语义文稿仍是正文权威；Settings delivery snapshot 仍是自动文前/文末权威。
2. 文档保存语义，不把微信成品 HTML/SVG、编辑器控制 UI 或 preset 专属视觉样式写回正文。
3. 共享层只负责语义、安全、真实数据、字体 fallback、移动可读性和平台降级；可见艺术构图归 preset。
4. 16 个现有微信 preset ID、全部组件 ID、文章、分类、素材、设置、历史和平台功能不得删除或重命名。
5. 歌曲、名片、作者、来源、数字、图片、链接、二维码、媒体 ID 与平台状态不得编造。
6. UI 图标只使用已安装图标库或源代码自有 SVG path；不使用 Emoji。
7. 最终产品是 release Tauri / WebView2 软件；浏览器只用于微信公众号真实编辑器外部门禁。

## Requirements

### R-01 母任务与现有任务收口

- 本任务作为集成母任务，拥有需求映射、依赖顺序、跨切片验收和最终交付判断。
- 本母任务是唯一集成验收权威；实施时只允许一个经批准的 current contract。父任务直接切片由
  parent 承载，后续明确批准的范围扩展可由对应 linked child 暂时成为 current contract，完成后再由
  parent 汇总。子任务历史 AC 不得跳过 parent 重新打开的缺口，也不得与 parent 并行成为 current。
- 复用并链接现有工作流，不创建重复任务或重复实现：
  1. `07-28-rendering-spec-editor-components`：编辑器语义、组件入口、检查器和排版基础；
  2. `07-29-rendering-visual-system-reconstruction`：原始 Atomic + Variant + Profile 设计权威；
  3. `07-30-brand-rendering-design-recovery`：品牌视觉根因与七方向；
     - 其子任务 `07-31-preset-brand-differentiation`：16 个 preset 的逐套差异化；
  4. `08-02-wechat-editor-component-parity-frontmatter-colophon`：组件同形、文前/文末和同源转换；
  5. `07-31-wechat-editor-paste-validation`：真实微信公众号 PC 普通粘贴矩阵。
- 子任务历史 AC 不自动汇总为母任务通过；母任务必须用当前 build 重新验收。

### R-02 可发现、可复现的编辑语义工具栏

- 选中文本或把光标放入块时，工具栏明确显示当前语义，并提供带中文名称的块级选择：正文、
  H1–H6、引用、无序/有序/任务列表、代码块和可用的其他块语义。
- 字符级格式（加粗、斜体、删除线、下划线、行内代码、高亮、文字颜色、上下标、链接）与
  块级语义分组，不再用一排无标签图标混合表达。
- 现有快捷键继续可用；鼠标、键盘、触屏笔和窗口窄宽下都能稳定打开、执行、关闭并恢复焦点。
- 工具栏只写入语义。切换 preset 后同一 H2 仍是 H2，但由当前 preset 重新呈现其独家样式。
- 多块选区、表格单元、原子组件、代码块内部等边界必须给出可预测行为，不静默破坏结构。
- 保存、关闭重开、Typora/Source 切换后，标题和其他语义保持不变；编辑态和微信转换读到同一结果。

### R-03 编辑态组件与自动投递配置分工

- Stage“组件”和 `/组件` 继续打开同一个正文组件库，并在保存的光标位置插入 `InkComponent`。
- 文前歌曲、阅读信息、文末公众号名片、来源、CC 和 colophon 配置打开编辑器专用的轻量 drawer/
  sheet；复用 `DeliveryAdornmentPanel` 与同一 Settings snapshot，不打开 `ExportModal`。
- ExportModal 只负责导出；PublishView 只负责发布准备；正文组件库只负责显式文稿组件；delivery
  配置只负责自动文前/文末槽。四者的文案、按钮和路由不得互相冒充。
- 正文组件在编辑器中显示由真实 definition renderer 派生的可识别主体、组件类型、真实字段摘要、
  选择/编辑控制和错误状态；编辑 chrome 不进入 Markdown 或微信产物。
- delivery 投影缺少真实字段时显示紧凑、可操作的待配置状态；最终微信 HTML 不输出空槽或假卡片。

### R-04 编辑、预览、复制和发布准备使用同一 artifact snapshot

- 当前文章正文修订、标题、分类、preset、variant/profile、Typography、组件 source、delivery、SVG
  选择与阅读速度形成一次不可变 artifact options snapshot；统计是该次转换的原子输出，不是输入。
- 微信右侧预览和“复制微信富文本”共同调用现有 `convertToNativeFormat('wechat')`；ExportModal 与
  PublishView 不得各自重建窄化 options 或重复拼 masthead/body/suffix。
- 同次转换原子返回 HTML、stats、delivery report 和必要诊断；过期 token 不能以旧标题、旧字数、
  旧 preset 或旧组件覆盖当前结果。
- 编辑投影不复制最终微信 DOM，但必须由同一 snapshot 得到相同标题语义、真实字段、preset 身份、
  组件层级和阅读统计；任何差异必须是“可编辑 chrome / 宿主宽度”导致，而非第二套内容模板。
- “同一 snapshot”指同一正文修订与同一有效设置必须得到深度等价的 `NativeExportOptions` 输入，
  不是要求跨路由共享对象引用或缓存同一 HTML。Workstation 预览与快速复制使用同一个当前快照；
  ExportModal 以它为打开基线，用户在弹窗中改平台/预设后产生新的显式快照，取消不反写基线；
  PublishView 由同一构建边界从路由文章和 canonical Settings 复建等价输入。

### R-05 16 套 preset 各自拥有完整出版构图

- 验收单位是全部 16 个微信 preset，而不仅是 7 个 VisualVariant。
- 每套 preset 独占：masthead 构图、H1–H6 比例和编号语言、正文节奏、引用/列表/表格/代码/图片
  轮廓、writing-components 形态、歌曲/统计位置、作者名片和文末收束。
- 任意两套去掉颜色、preset 名称、固定品牌文案、文章文本和数字后，仍可通过结构、比例、节奏和
  组件轮廓辨认；不得出现“同标题卡 + 同正文 + 同组件卡 + 同 footer”只换色。
- 独立性门必须产出 16 个分区结构签名和完整 120 对比较矩阵。签名忽略文本、数字、颜色、
  preset/data 标识和空装饰节点，保留有效 DOM 层级、非颜色几何、H1–H6 节奏、正文流、组件轮廓
  与文末结构；单纯添加 `data-*`、空节点或改名称不能制造差异。
- 共同品牌锚点仅保留 InkForge identity、`文章值得您享受`、真实 metadata、字体纪律、窄屏可读性
  和唯一 colophon；这些锚点不得强制共同几何。
- 普通正文保持连续阅读流，不把每段包成原子卡、轨道、色块或多重边框。
- 当前 16 套方向基线继续沿用已批准命名，但每行必须完成独立设计：
  `thesis`、`legal`、`report`、`commentary`、`aigc`、`code`、`notes`、`news`、`meme`、`life`、
  `elegant`、`tech`、`flagship-kiln`、`flagship-kiln-paste-safe`、`flagship-tempera`、`flagship-amber`。

### R-06 完整语义与真实组件覆盖

- 每套覆盖 H1–H6、段落、strong/em/del/underline、高亮、上下标、行内代码、链接、无序/有序/
  任务/嵌套列表、引用、提示、金句、分隔线、表格、代码块、KaTeX、Mermaid、图片、题注、图集、
  脚注、引文来源、参考资料和目录。
- 每套覆盖现有正文组件：时间线、对比卡、数据统计卡、图集、引文来源、歌曲、作者/公众号名片、
  图片、链接、关联文章、联系人/名片、二维码、表格、信息网格和微信媒体描述。
- 覆盖表从现有 writing-component registry 枚举，不维护第二份手写组件目录。每个当前与以后新增
  的 definition 必须在 converter report 中得到 `rich-safe`、`static-fallback` 或
  `manual-native-insert` 的真实结果；遗漏或静默空输出直接失败。
- 文前可选真实歌曲位于品牌引入之后、标题主体之前；阅读时间和字数来自当前真实正文。
- 文末顺序为：正文 → 作者自身公众号名片/关注 fallback → 来源/关联 → CC → 唯一 InkForge colophon。
- 微信无法通过普通 HTML 证明原生歌曲、关注卡或媒体组件时，输出可读、安全、明确的静态 fallback
  或待平台手动插入说明，不伪装为平台原生成功。

### R-07 微信安全与“正确渲染”的证明口径

- 预览、复制和最终 HTML 继续通过现有 inline、sanitize、质量检测、SVG 安全和幂等门禁。
- 输出不依赖外链 CSS、脚本、事件、伪元素、正文定位、复杂 flex/grid、filter/mask、长文本 SVG、
  135/秀米残留或远程信标。
- 每套都必须有 HTML 可读 fallback；被微信清洗的 SVG 或 CSS 必须如实记录，不以预览成功冒充保留。
- “本轮保证正确”需要同时满足：
  1. release InkForge.exe 中编辑/预览/复制同源；
  2. 16/16 preset 的本地结构、安全、视觉和无溢出门禁；
  3. 已登录微信公众号 PC 编辑器中的普通 Windows `Ctrl+V` 逐套读回与视觉检查。
- PC 普通粘贴不能外推为手机预览、Dark Mode、交互 SVG、封面缩略图、原生媒体、同步、定时、
  群发或发布成功；这些保持独立外部门禁。

### R-08 原生软件视觉闭环

- 所有产品内调试和最终截图来自 release Tauri / WebView2 `InkForge.exe`；Vite/浏览器只作诊断。
- 使用同一篇真实、无虚构外部事实的完整验收稿，自动生成 16 套首屏/中段/组件/文末 contact sheet，
  不再要求用户逐套等待。
- 验收稿是仓库自有、确定性、非私密的正式校准文稿，只陈述 InkForge 自身能力和显式测试数据；
  不使用用户私稿、外部作者身份、平台账号、虚构媒体状态或未获授权素材。
- 每次改动都必须同时检查编辑页与平台预览；不能只看 HTML 字符串、CSS 长度或一张局部截图。
- 视觉验收至少覆盖 390px 等效手机宽度、桌面宽度、窗口缩放、长短标题、长段落和组件丰富文稿。

### R-09 技术债与兼容

- 删除重复拼装、错误路由和已经被唯一 converter 替代的局部逻辑；不删除现有产品能力。
- 不新增 renderer、主题 DSL、组件注册表、状态 store、数据库 schema、运行时模板资源或依赖。
- 保护大量 unrelated dirty changes；每个切片精确文件、精确测试、可独立回退，不做广泛重构。
- 不自动操作微信手机预览/群发/发布；后续批准子任务可在不发布的前提下完成微信原生媒体及
  小红书/知乎真实编辑器导入、上传和读回，最终发布仍由用户手测。

### R-10 文档与证据

- 更新 `.trellis/spec/frontend/visual-variant-system.md`、微信 SVG/组件规则和必要 docs，记录：
  语义工具栏、组件/投递信息架构、16 套结构合同、微信安全边界和真实验收结果。
- 证据区分自动结构门、原生视觉门、微信 PC 粘贴门和未验证外部门；不得把任一层替代另一层。
- 不提交 Cookie、Token、二维码、账号截图、HAR、浏览器 profile、本机临时路径或私有文稿全文。

### R-11 可执行渲染规则目录与后续自定义开发

- 在现有 `themes.ts`、visual variant/profile、preset decorator、writing-component registry 与安全
  converter 之上，建立一套强类型、只读、可枚举的渲染规则目录；它是现有真实实现的说明与约束
  入口，不是第二套 renderer、模板 DSL、主题 store 或运行时 JSON 解释器。
- 目录必须覆盖全部 16 个微信 preset，并为每套记录稳定 ID、品牌锚点、masthead、H1–H6 节奏、
  正文流、语义块轮廓、正文组件处理、song/metrics、文末结构、微信降级边界、允许自定义项和不得
  破坏的安全/可读性不变量。
- 规则目录必须由实际 preset/variant/profile 定义直接引用或派生；测试同时枚举真实微信 preset
  与规则条目，任何遗漏、重复、未知 ID 或与实际输出结构指纹漂移都失败。禁止再维护一份与运行时
  无关、靠人工同步的 16 套说明表。
- 对外提供最小稳定的 typed read API，供检查器、验收报告、文档生成和后续自定义开发读取；业务
  渲染仍只通过现有 `selectPreset()` / converter 链执行，目录本身不得拼装或注入成品 HTML。
- 在 `docs/platform-rendering-rules/` 与相关 frontend spec 中记录扩展方法：复用安全底座、如何为
  新 preset 声明独立构图规则、需要通过的语义/组件/微信安全/结构差异门，以及哪些字段不得伪造。

## Parent–Child Requirement Map

| Workstream | Owning existing task | Parent acceptance |
|---|---|---|
| 编辑语义、标题工具栏、正文组件入口与 delivery 错误路由 | `07-28-rendering-spec-editor-components`（历史归属；以 parent 重新打开的 Slice A/B 为准） | AC-01–AC-04 |
| 原始视觉体系与品牌规则 | `07-29-rendering-visual-system-reconstruction` | AC-05–AC-08 |
| Variant/Profile 视觉根因 | `07-30-brand-rendering-design-recovery` | AC-05–AC-08 |
| 16 套 preset 独立可见 composition | `07-31-preset-brand-differentiation`（嵌套于 07-30；唯一视觉实现归属） | AC-05–AC-09 |
| 编辑组件、文前文末、同源 artifact 输入 | `08-02-wechat-editor-component-parity-frontmatter-colophon`（不拥有 preset 可见构图） | AC-03–AC-05、AC-08 |
| 微信公众号 PC 普通粘贴 | `07-31-wechat-editor-paste-validation` | AC-10–AC-12 |
| 可执行渲染规则目录与自定义扩展合同 | 本 parent 直接集成；复用现有 export catalog/variant/theme 权威 | AC-06、AC-08、AC-15 |
| 微信官方媒体/原生组件交接、Tauri 壳完整验收、XHS/Zhihu 编辑器实测（不发布） | `08-09-native-media-shell-xhs-zhihu-render-acceptance`（用户后续批准的范围扩展；实施期间可作为唯一 current contract） | AC-08–AC-09、AC-12–AC-14、AC-16–AC-18 |

## Acceptance Criteria

- [ ] AC-01：选区浮动工具栏以中文、可发现的语义选择器稳定显示当前正文/H1–H6/引用/列表/
  代码块状态；字符格式和块语义清楚分组，键盘、鼠标与 PointerEvent（含 touch/pen 路径）均可
  操作，390px 等效窄宽不溢出或遮挡选区。
- [ ] AC-02：真实选择文本后切换 H1–H6、引用、列表等语义，Typora/Source、保存、关闭重开后保持，
  预览和微信转换读到相同结构；多块/表格/组件边界行为有自动回归。
- [ ] AC-03：Stage“组件”与 `/组件` 打开正文组件库；文前/文末“配置”打开专用 delivery 配置表面；
  二者都不误开 ExportModal，Export 与 Publish 职责保持独立。
- [ ] AC-04：正文组件在编辑态可识别、可选择、可编辑、可删除、可键盘访问；真实字段、错误状态和
  预览主体与最终定义同源，编辑 chrome 不泄漏到 Markdown/微信 HTML。
- [ ] AC-05：编辑器、右侧微信预览、复制、Export 与 Publish 对同一正文修订和有效设置生成深度
  等价的 canonical artifact options；Workstation 预览/复制共用当前快照，显式平台/预设修改生成
  新快照，取消不反写，且 HTML/stats/report 无旧 token 覆盖。
- [ ] AC-06：16/16 微信 preset 的规范化分区结构签名唯一；120 对比较报告证明任意两套至少在
  masthead、标题节奏、正文组织、组件轮廓、song/metrics 和文末收束中的三个非颜色维度不同，
  且 `data-*`、名称、空节点不能计为差异。
- [ ] AC-07：16/16 在 release InkForge.exe 中完成首屏/中段/组件/文末视觉验收；无同模板换色、
  横向溢出、重叠、浅底浅字、异常大空白、过大标题或不可读小字。
- [ ] AC-08：完整语义稿在每套中覆盖标题、段落、强调、列表、引用、表格、代码、公式、图表、图片、
  来源、由当前 registry 动态枚举的全部正文组件、文前歌曲/统计、文末名片/CC/colophon；每个组件
  都有真实平台结果分类，缺失真实数据不输出假内容或静默空卡。
- [ ] AC-09：编辑页的当前标题、组件、preset 身份和阅读统计与平台预览可解释对应；编辑态保持流畅，
  不回归暗处聚焦、打字机、选区、撤销、自动保存或窗口缩放。
- [ ] AC-10：16/16 产物通过微信安全、幂等、sanitizer、SVG、危险节点、远程 URL、第三方残留和
  overflow 自动门；XHS/Zhihu 本地负向回归无微信 wrapper 泄漏。
- [ ] AC-11：16/16 使用同一最终 release 软件真实复制按钮与普通 Windows `Ctrl+V` 进入已登录
  微信 PC 编辑器，逐套滚动检查全篇关键文本、结构、内联样式和可读 fallback；每行证据的
  `releaseExeSha256` 必须等于最终交付 EXE，代码或产物变化会使整张矩阵失效并要求重跑。
- [ ] AC-12：验收报告按证据批次明确列出微信 PC 普通粘贴、后续原生媒体编辑器读回、XHS/Zhihu
  编辑器渲染与手机/Dark Mode/封面视觉缩略图/同步/定时/发布的独立状态，不跨批次外推能力。
- [ ] AC-13：聚焦单测、编辑器交互回归、完整 export 串行测试、ESLint、`vue-tsc`、生产构建、Tauri
  release 构建、application preflight 和 GitNexus `detect_changes` 全部通过。
- [ ] AC-14：相关 spec/docs 完成收口，且证据中无账号、Cookie、Token、二维码、HAR、profile、
  临时截图路径或私有文稿泄漏。
- [ ] AC-15：项目内存在覆盖 16/16 微信 preset 的 typed 渲染规则目录；它与真实 preset ID、
  variant/profile、六分区结构指纹和 writing-component 覆盖自动对账，提供只读查询与自定义扩展文档，
  且不新增第二套 renderer、主题 DSL、运行时模板解释或重复组件注册表。
- [ ] AC-16：微信正文图片、永久封面素材、`thumb_media_id` 与草稿使用现有官方 API/Tauri 边界
  通过真实成功/失败 readback；歌曲、公众号名片和媒体以真实组件数据完成平台原生插入/读回，
  static/manual/blocked 不冒充 native success。
- [ ] AC-17：按真实能力表生成原生矩阵并在最终 release 通过：Manager/Stage collapse/expand；
  Inspector panel pin/hover/collapse；Inspector widget dock/float/native/close/redock；各行覆盖适用的
  重启恢复、键盘、焦点、默认动画与 reduced motion，不为 Manager/Stage 发明原生窗口。
- [ ] AC-18：最终 release 的 exact XHS plain-text/raster 产物与 Zhihu clean-Markdown/image 产物在
  已登录真实编辑器完成导入/上传/视觉与 DOM 读回；两平台均停止在发布前，publication=false。

## Out of Scope

- 小红书、知乎发布、自动互动或自动账号运营；编辑器导入/上传/读回由 AC-18 的后续批准子任务承载。
- 微信手机预览、Dark Mode、交互 SVG、封面视觉缩略图/裁切/手机端预览、授权同步、定时、群发和发布。
- 绕过微信权限或私有接口伪造原生歌曲、关注卡、媒体 ID 或平台返回；真实编辑器插入/读回由
  AC-16 的后续批准子任务承载。
- 复制 doocs/md、135、秀米、微信公众号编辑器的受保护模板、私有 DOM、素材或账号数据。
- 删除、重命名或迁移现有 preset、组件、文章、设置、素材和历史。

## Risks

1. **视觉自由与维护分叉**：若把“每套独立”实现为 16 个独立 renderer，会产生安全修复和组件升级的
   16 路漂移；推荐只让可见 art direction 独立，语义/安全转换保持唯一。
2. **编辑态伪同形**：把最终微信 HTML 直接塞入 contenteditable 会破坏光标、撤销和序列化；应以同一
   语义和 renderer body 做编辑投影，而非把成品 DOM 写回文稿。
3. **平台证明外推**：本地预览或 PC 粘贴都不能证明手机、Dark Mode、原生媒体或发布；报告必须分门。
4. **大量 dirty changes**：实施必须按子任务切片、精确 diff 和串行重型验证，避免覆盖用户已有工作。

## Confirmed Decisions

1. **共享语义/安全/微信转换底座，禁止共享可见版式骨架。** 这是用户于 2026-08-02 选择的推荐
   策略。16 套 preset 各自拥有完整可见构图，但不分叉为 16 个 renderer、store 或数据模型。
2. **编辑器保存语义，不保存成品模板。** 浮动工具栏写入正文、H1–H6、引用、列表、代码块等
   TipTap/Markdown 语义；preset 切换只改变该语义在编辑投影和最终微信产物中的呈现。
3. **正文组件与自动投递设置保持两条清楚的交互流。** 正文组件库负责光标处的显式组件；文前
   歌曲、阅读信息和文末名片/CC 使用现有 Settings 与 `DeliveryAdornmentPanel` 的专用编辑表面。
4. **母任务完成门包含原生软件、微信 PC 普通粘贴和后续批准的三项扩展。** release Tauri/WebView2
   中 16/16 编辑/预览/复制同源；微信普通粘贴、原生媒体编辑器读回、native shell 全状态矩阵与
   XHS/Zhihu 编辑器渲染分别取证。手机、Dark Mode、同步、定时、群发和发布仍是独立外部门禁。
5. **父任务是唯一集成权威，current contract 串行切换。** parent 直接切片由 parent 承载；用户
   后续批准的 linked child 可在其范围内成为唯一 current contract，完成后由 parent 汇总。任何时刻
   不允许 parent 与 child 同时作为 current，也不得以历史已勾选 AC 跳过新复现缺陷。
6. **渲染规则必须沉淀为可执行目录。** 后续自定义开发读取与校验同一套 typed preset 元数据；
   实际 HTML/SVG 仍由现有 preset 与 converter 生成，规则目录不演变成第二套主题系统。
