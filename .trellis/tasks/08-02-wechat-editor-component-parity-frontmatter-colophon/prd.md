# 微信编辑组件同形与文前文末渲染完善

## Goal

在保持 InkForge 品牌锚点与现有 16 套微信预设独立设计的前提下，消除写作编辑页、InkForge
平台预览和微信公众号 PC 编辑器之间的视觉割裂。用户应当在写作过程中直接看见并编辑与
微信落地形态同构的真实组件卡片；导出时再由现有平台渲染链生成微信安全的最终 HTML/SVG。

## Background and Confirmed Evidence

- 当前旗舰样板的总体设计方向已得到用户认可，但真实微信公众号编辑器、InkForge 编辑画布
  与右侧平台预览的比例、间距和组件形态仍不完全一致。源码核对确认右侧微信预览仍在独立拼接
  masthead/body，未消费真实 converter 的 delivery suffix，这是当前差异的共享根因。
- 文章抬头已经有“文章值得您享受”品牌锚点，但其下缺少用户要求的可选歌曲组件，阅读时间与
  字数说明也没有在当前可见版式中恢复。
- 文末已有 colophon/CC 等输出基础，但缺少用户要求的“作者自身公众号名片/欢迎关注”组件。
- InkForge 已存在 17 个内置写作组件、TipTap `InkComponent` 原子节点、文章 masthead、delivery
  adornments、视觉预设和微信导出后处理；本任务复用这些能力，不创建第二套 renderer、store
  或平台专用编辑器。
- 用户要求参照 doocs/md 的交互思想：编辑阶段显示可识别、可编辑的组件卡片；最终渲染阶段
  根据目标平台生成真实输出。不得复制第三方私有素材或样式。
- 当前工作树包含大量其他任务改动。本任务必须精确记录并只修改经审查的文件，不删除任何
  现有预设、组件、SVG 模块或平台功能。

## Requirements

### R1. 编辑态与渲染态同源

- 编辑画布、右侧预览和微信导出必须使用同一组件定义、字段值、preset ID 与 visual variant。
- Workstation 必须从当前 Settings、文章标题/分类和外观生成一份不可变 WeChat artifact options
  snapshot；右侧预览与“复制微信富文本”把同一 snapshot 交给现有 `convertToNativeFormat()`。
  WeChat 原生结果扩展返回同次转换的 HTML、stats 和 delivery report，不允许两处各自拼 options。
- `ready` 编辑态原子卡必须复用同一组件 definition renderer 的无 canonical wrapper 可见主体，再包裹软件专属的
  选择、编辑、错误和焦点 chrome；最终只序列化 canonical JSX，不把生成 HTML 写回文稿。
  这不是截图、mock 卡片或第二套模板，用户应能在写作时直接识别微信落地位置和信息层级。
- 组件必须继续支持选择、编辑、删除、键盘导航、错误定位和序列化；不能以截图、mock 卡片或
  不可编辑 HTML 替代 TipTap 原子节点。
- 组件缺少必填字段时显示真实校验错误，不生成虚假歌曲、作者、图片、链接、阅读数据或账号。
- 正文中显式插入的组件继续作为 TipTap `InkComponent` 原子节点存在；自动生成的文章抬头、
  阅读信息和文末投递组件则作为编辑纸张的前后投影视图出现，不把重复 HTML 或占位文本写入
  Markdown，也不改变正文光标、撤销栈和序列化结果。
- 前后投影中的歌曲、阅读信息和名片必须可点击进入现有真实配置入口；关闭或字段不完整时显示
  可操作状态并自然收拢，不能用示例卡片填空。

### R2. 文前歌曲与阅读信息

- 在“文章值得您享受”引入行之后、文章主标题/封面之前提供可选歌曲组件插入/配置能力，
  编辑态、InkForge 预览与微信导出均有对应形态；不再把歌曲游离地放在整段 masthead 之前。
- 歌曲组件只使用用户明确提供的真实歌曲信息或现有平台原生组件配置；允许新增可选的真实
  HTTPS 封面字段。无数据时保持可配置空态或不输出，不能伪造 platform media ID、来源、封面
  或可播放状态。
- 恢复可见的预计阅读时间与文章字数说明，数值必须来自当前真实正文统计，并在编辑、预览、
  微信输出三处保持一致；预览 HTML 与统计必须作为同一次 converter 结果原子提交，过期渲染不得
  用旧数字覆盖新正文。
- 阅读信息至少清晰显示“阅读约 N 分钟”和“全文 N 字”，不得因预设小字、低对比或浮动布局
  在微信清洗后消失；代码、图片、表格等扩展统计只在真实计数大于零时出现。
- 文前歌曲与预计阅读分钟沿用现有开关；关闭时版式自然收拢，不留下空白槽。全文字数继续按
  既有 masthead 契约显示真实值，不增加另一套统计开关。

### R3. 文末公众号名片与关注引导

- 在文章末尾提供可选的作者自身公众号名片/欢迎关注组件，并与现有 CC、来源链接、作者署名和
  colophon 形成清晰顺序。
- 名片使用用户配置或文章已有的真实名称、账号、简介、头像、二维码和公开资料链接；头像与
  二维码只接受可验证的 HTTPS 资源并作为可选字段。缺失时给出可操作的编辑态错误，不伪造
  公众号、头像或二维码。
- 微信无法通过普通 HTML 生成原生关注卡片时，必须如实采用可读、安全且可配置的静态名片/
  关注引导 fallback；不得声称获得微信原生关注能力。
- 文末顺序固定为：正文 → 作者自身公众号名片/关注引导 → 来源与关联内容 → CC 协议 →
  InkForge colophon；未启用的槽位直接省略，不能留下空白容器。
- InkForge colophon 继续由现有 preset/converter 生成并且最终只出现一次；本任务只校正其顺序、
  去重和 16 套预设的收束表现，不创建文章级 YAML/frontmatter 字段或第二套页脚配置。

### R4. 全部预设扩展

- 现有 16 套微信预设全部覆盖文前歌曲、阅读信息、编辑态组件和文末名片。
- 各预设保留共同品牌锚点，但组件排布、边框、比例、标签、数字呈现、标题/正文节奏与文末收束
  应继续体现各自独立设计，不能退化为只换颜色的同一组件骨架。
- 新增组件不得破坏标题、段落、引用、列表、表格、代码、公式、图片、题注、现有写作组件、
  CC、来源链接或旗舰 SVG。

### R5. 微信安全与真实验收

- 继续使用现有 InkForge 复制按钮和普通 Windows `Ctrl+V` 进入真实微信公众号 PC 编辑器；
  不用 DOM 注入、程序化 paste event、mock 页面或测试专用 renderer 证明成功。
- 右侧微信预览的文章内容必须直接消费与复制按钮相同的 `convertToNativeFormat()` WeChat artifact；
  preview wrapper 只保留软件容器，不再维护第二条 options 或 masthead/body/suffix composition。
  关键 DOM 顺序与复制产物必须一致。
- 在真实微信 PC 编辑器中，对至少一套基础预设和四套旗舰完成全篇视觉核对；对 16 套完成结构、
  组件、溢出、脚本和 sanitizer 读回矩阵。原生 release 软件仍执行 16/16 全篇视觉检查。
- 不点击保存、手机预览、同步、定时、群发或发布；PC 编辑器结果不得外推为移动端、Dark Mode、
  微信原生媒体卡、封面缩略图或发布成功。

## Technical Notes and Confirmed Decisions

- 正文组件的权威仍是现有 `writing-components` 注册表、Zod 校验、JSX/TipTap source 和平台
  renderer；自动文前/文末投递的权威仍是 `settings.export.deliveryAdornment`。正文 NodeView
  复用从现有 `renderWritingComponentSource()` 提取的 wrapper-free definition body；唯一 canonical
  `data-ink-component-source` 只留在 atom 外层。delivery 只增加最小无状态槽位解析，不新增第三个
  store、文章 Schema、YAML/frontmatter 或 renderer。
- delivery `song` 与现有 `SongBlock` 共用字段语义；delivery `contact-card` 在自动投递中承担
  作者自身公众号 `MpProfile`/关注槽，正文中的 `ContactCard` 和 `MpProfile` 继续留在用户插入
  位置。图片、链接和关联文章仍使用既有 renderer/fallback。
- 正文中显式插入的组件遵循文稿位置；delivery 配置中的第一首 eligible 歌曲占 masthead
  歌曲槽，第一张 eligible contact-card 占文末关注槽。重复 ID 和已提升条目必须稳定去重；
  其余条目保持既有顺序并产生可审查 report，不能静默丢失。
- delivery 解析顺序固定为：Schema 校验 → 按原顺序以首项为准处理重复 ID并报告后续重复 →
  eligibility 校验 → song/profile 槽提升 → remainder/report。歌曲 eligibility 为 enabled + title +
  安全 URL；名片 eligibility 为 enabled + displayName，URL、账号、简介、头像和二维码均为可选增强。
- 编辑态“同形”指相同字段、资源、语义槽、比例和信息层级，不把最终微信 HTML/SVG 复制进
  文稿 source；允许 NodeView 在非 editable 容器内显示同一受校验 renderer 结果。编辑控制、
  错误状态和焦点环只存在于软件内，导出前必须剥离。
- `SongBlock`/delivery song 可增可选 `coverUrl`；`MpProfile`/delivery contact-card 可增可选
  `avatarUrl`、`qrImageUrl` 和现有简介字段。新增字段均向后兼容、缺失即省略且不触发迁移。
- WeChat 右侧预览与快捷复制共同调用 `convertToNativeFormat()`；其 WeChat 分支委托
  `markdownToWechatWithStats()`，返回的同次 stats 是编辑投影、预览与复制链的共同数字来源，
  不在 EditorPanel 再计算第三份 word count/reading time。
- doocs/md 可借鉴的是“声明式组件定义 → 类型化属性填写 → 即时预览 → 在当前光标插入稳定
  JSX → 同一注册表渲染”的架构；InkForge 保留自身 TipTap 原子节点、主题与平台净化链，不复制
  doocs/md 的模板、CSS、平台账号数据或组件资源。
- 所有新增开关与字段默认遵循“可选、真实数据驱动、缺失不输出”；既有文章、组件 source、
  preset ID 和 delivery 配置无需破坏性迁移。

## Acceptance Criteria

- [x] AC-1：编辑画布中可插入并识别真实正文组件，并可见可配置的文前歌曲/阅读信息与文末
  公众号名片投影；正文组件可编辑、可删除、可键盘访问，投影可打开真实配置，错误字段可定位。
- [x] AC-2：同一组件定义和真实字段值驱动编辑画布、InkForge 平台预览与微信导出，无第二套
  状态或重复 renderer。
- [x] AC-2A：右侧微信预览与复制按钮消费同一 artifact options snapshot 和
  `convertToNativeFormat()` WeChat 结果；song、masthead、正文组件、文末 profile、
  来源/关联、CC 与品牌收尾的关键 sentinel、出现次数、DOM 顺序和 inline style 与复制产物一致。
  相同内容宽度下几何结构一致；不同宿主宽度仅允许响应式换行，不允许维护不同文章模板。
- [x] AC-3：阅读时间和字数来自当前正文统计；编辑、预览和微信 PC 读回结果一致。
- [x] AC-4：文前歌曲和文末名片均可启用/关闭，并支持可选真实歌曲封面、公众号头像/二维码；
  名片只有 displayName 时可输出不可伪装成原生卡片的静态关注 fallback；缺少各自 eligibility
  必需数据时不输出虚假内容并给出明确错误。
- [x] AC-4A：歌曲位于品牌引入行之后、文章身份主体之前；文末名片位于正文之后、来源/CC/
  colophon 之前；同一 delivery 条目不会同时出现在已提升槽和普通 suffix。正文中显式插入的组件
  仍严格保留用户选择的位置，不做无稳定身份依据的跨域自动去重。
- [x] AC-5：16 套微信预设全部具有独立且可辨识的组件组合，同时保留 InkForge 品牌锚点；
  16/16 均在 release Tauri 软件中完成全篇视觉检查，不以仅含 preset ID/颜色的指纹代替。
- [x] AC-6：标题、正文、引用、列表、表格、代码、公式、图片、题注、现有组件、CC、来源链接和
  旗舰 SVG 无回归，无固定宽度、水平溢出、重叠、异常空白或浅底浅字。
- [x] AC-7：原生 Tauri 软件内完成编辑态与右侧预览的逐套视觉验收；浏览器仅作为真实微信编辑器
  的外部验收工具，不作为最终产品。
- [x] AC-8：真实微信公众号 PC 普通粘贴矩阵保留关键文本、组件/fallback、结构与品牌样式，
  `scripts=0` 且水平 `overflow=0`。
- [x] AC-9：目标测试、完整 export 串行回归、编辑器回归、ESLint、类型检查、生产构建和 Tauri
  release 构建通过；本地 XHS/Zhihu 负向回归证明 WeChat masthead/suffix/CSS/SVG 未泄漏，但不做
  两个平台的账号测试。
- [x] AC-10：spec、规则文档和任务证据记录真实能力边界，且不包含账号、Cookie、Token、二维码、
  HAR、浏览器 profile、临时路径或私有草稿截图。

## Out of Scope

- 小红书、知乎发布或真实账号上传测试；
- 微信手机预览、Dark Mode、交互 SVG、封面缩略图、同步、定时、群发和发布；
- 绕过微信权限生成原生歌曲/关注卡、伪造 media ID 或平台返回；
- 新增第二套渲染器、主题 store、文章数据模型或 16 套预设的重复分叉；
- 新增文章级 YAML/frontmatter 字段或把 Settings delivery 配置复制进文稿；
- 复制 doocs/md、135、秀米或微信的受保护素材、私有 DOM 或完整模板。
