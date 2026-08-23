# Technical Design — 微信编辑组件同形与文前文末渲染完善

## 1. Problem statement

当前不是“组件能力为空”，而是三个投影没有共享同一可见结构：

1. `InkComponent` 已保存并校验真实组件 source，但 NodeView 只显示统一的类型/字段摘要卡；
2. `buildReadingTimeHeader()` 已能生成歌曲、品牌引入、标题、阅读时间、字数和分类，但歌曲当前
   位于整段 masthead 之前，且编辑画布不显示该文章抬头；现有 song selector 还会在第一条启用
   但不完整的歌曲处停止，错误地遮蔽后续可用歌曲；
3. `delivery-adornments` 已有歌曲、名片、链接、关联文章与 CC 配置，但配置只在导出/发布界面
   可见，正文编辑页没有对应的前后投影；
4. `usePreviewRenderer()` 的微信分支独立拼接 masthead + body，不调用真实 converter，也不拼接
   delivery suffix；因此预览与普通粘贴产物会持续漂移；
5. 16 套预设已经具备独立 masthead/正文结构，不能为本任务复制 16 份组件 renderer。
6. Workstation 预览读取完整 Settings snapshot，但快捷复制手工重建了更窄的 `exportOptions`；即使
   二者都调用 WeChat converter，也仍会在 delivery、readingSpeed、SVG、typography 和 stats 上漂移。

因此共享根修复是：保留现有数据和最终渲染权威，让微信预览直接消费真实 converter；正文
NodeView 复用现有组件 renderer；delivery 仅增加很薄的槽位解析与编辑投影，并修正现有
masthead/colophon 顺序。

## 2. Architectural invariants

1. Markdown/TipTap source 仍是正文组件的权威；`settings.export.deliveryAdornment` 仍是自动
   文前/文末投递配置的权威。
2. 不新增第二套组件注册表、文章模型、主题 store、平台 renderer 或外部依赖。
3. 编辑态和最终态共享字段、校验结果、preset ID、visual variant、文章统计与资源。NodeView
   可以显示同一受校验 renderer 的只读 visual body，但 canonical source 仍是唯一持久化内容，
   编辑按钮/焦点/错误 chrome 不进入导出产物。
4. 结构可以自动生成，歌曲、账号、作者、图片、URL、二维码、资源 ID 和平台状态不得编造。
5. 既有 16 个 preset ID、全部 writing component ID、现有 delivery 配置及旧文稿 source 保持
   向后兼容，不做破坏性迁移或删除。
6. 微信普通粘贴只能证明 PC 编辑器保留结果；原生歌曲/名片、手机、Dark Mode、同步和发布均
   需要独立平台证据。
7. 本任务不新增 YAML/frontmatter 文章字段。显式正文组件仍存 canonical JSX，自动首尾槽仍存
   canonical Settings；现有 preset-owned InkForge colophon 只在最终 converter 中生成一次。

## 3. Canonical data flow

```text
Markdown JSX / TipTap inkComponent nodes
        └─ writing-components registry + Zod validation
              ├─ wrapper-free definition body extracted from renderWritingComponentSource()
              │     → editor atom visual body
              └─ Markdown render → real WeChat converter

Article/EditedContent/Category + Settings export/preset/delivery
        └─ one immutable Workstation artifact options snapshot
              └─ existing convertToNativeFormat('wechat')
                    ├─ delivery-adornments validation + minimal slot resolution
                    ├─ real markdownToWechatWithStats()/convertToWechatWithStats()
                    └─ { content/html, stats, delivery report }
                          ├─ editor front/end projection (no persistence)
                          ├─ right preview wrapper
                          └─ clipboard safe inline HTML/SVG
```

不建立覆盖两套 domain 的第三个“normalized component model”。新增纯函数只解析 delivery 槽位：

- 第一首 eligible `song` → `masthead-song`；
- 第一张 eligible `contact-card` → `after-body-profile`；
- 其余 delivery 项 → 既有 suffix 顺序；
- 返回稳定 ID、validation/report status 与 dedupe 信息，不保存状态、不包含第二套 HTML 模板；
- `createDeliveryAdornmentFragments()`、DeliveryAdornmentPanel 和编辑纸张前后槽共同消费。

解析只能执行一次并遵循固定顺序：

1. `DeliveryAdornmentConfigSchema.safeParse(snapshot)`；
2. 按原配置顺序扫描 ID，首项保留，后续同 ID（包括跨类型）记为 invalid/omitted report；
3. 对首项集合做 eligibility 校验；
4. 选择首个 eligible song/profile 槽；
5. 已提升条目从 suffix 移除，其余有效条目保持原顺序，invalid/manual-required 继续进入 report。

`getDeliveryMastheadSong()`、suffix、编辑投影和最终 report 都委托这个结果，不得各自再次 `.find()`。

## 4. Component mapping and precedence

| Delivery type | Shared semantic peer | Placement | Final behavior |
| --- | --- | --- | --- |
| `song` | `SongBlock` | `masthead-song` | 第一条启用且字段完整的 delivery 歌曲进入抬头；原生曲库未验证时使用安全链接卡 |
| `contact-card`（delivery） | `MpProfile` | `after-body-profile` | `enabled + displayName` 即可生成自身公众号静态关注卡；URL/账号/简介/头像/QR 可选，原生名片未验证时不冒充原生 |
| `ContactCard` / `MpProfile`（正文 JSX） | 自身 definition | body | 保持用户插入位置，不被自动槽搬运 |
| `image` | `ImageBlock` | body/suffix | 保持既有 HTTPS 图片与 alt/caption 校验 |
| `link` | `LinkBlock` | body/suffix | 保持既有公开链接卡 |
| `related-article` | `ArticleBlock` | body/suffix | 保持既有关联文章安全 fallback |

去重规则：

1. delivery `id` 是自动投递路径的稳定身份；正文 `InkComponent` 继续由 canonical source 标识。
2. 自动 masthead/end slot 只消费 delivery 配置，不移动正文中显式插入的组件。
3. 第一首 `enabled + title + safe URL` 的 delivery song 进入 masthead；第一张
   `enabled + displayName` 的 delivery contact-card
   进入 after-body profile。重复 ID/已提升 ID 不得进入普通 suffix。
4. 多余的有效 contact-card 按原配置顺序继续作为普通 suffix/fallback 输出；只有重复 delivery ID
   才由 report 标记并去重。任何条目都不能静默丢失，正文 `MpProfile` 保持原位置。
5. 同一 delivery ID 在重复预览、preset 切换、复制和导出中只出现一次。
6. `SongBlock`/song 增加可选 `coverUrl`；`MpProfile`/contact-card 增加可选 `avatarUrl`、
   `qrImageUrl` 与简介。全部为 HTTPS/escaped 可选字段，旧 source/config 无需迁移。

这套规则避免新增“placement”文章字段和隐式改写用户正文，同时满足自动首尾投影。

## 5. Editor projection

### 5.1 Body component atoms

`InkComponent` 继续是 selectable/draggable TipTap atom。现有 writing service 从
`renderWritingComponentSource(source)` 提取一个 wrapper-free、仍经过同一 parse/validate/definition
的 visual-body 原语。`ready` NodeView 只嵌入该 body，再套 editor-only chrome；atom 外层保持唯一
`data-ink-component-source`，不产生嵌套 canonical section，也不手写另一套 17 分支模板。其结果覆盖：

- 身份类：头像/标识区、名称、账号、简介、公开资料状态；
- 歌曲类：唱片/音轨标识区、歌曲名、作者、链接/平台确认状态；
- 链接/文章类：来源标签、标题、摘要、域名；
- 图片/图集类：真实缩略资源或明确缺失态、alt/caption；
- 时间线、对比、统计、表格、引文等：显示与最终组件相同的信息层级和大致比例；
- 未知/旧版本：不执行 renderer，保留 source 并显示可恢复错误，不能静默降级为空。

NodeView 把 visual body 中的链接移出 Tab 序列并截获 pointer/click/Enter/Space，避免写作时意外
导航；`stopEvent` 只允许 editor chrome 的真实控件处理自身事件，atom 选择、拖拽、方向键和删除
仍归 ProseMirror。编辑后恢复 atom/正文焦点，并从现有按钮进入同一属性表。
选择框、编辑按钮、错误提示和焦点环不进入 Markdown 或平台 HTML。所有图标使用现有
`lucide-vue-next`，不使用 Emoji。

### 5.2 Automatic front/end slots

在 `editor-paper` 内围绕现有 TipTap 挂载点投影两个非文稿槽：

```text
editor front projection
  [brand guide / article identity summary]
  [optional masthead song]
  [real reading minutes + real word count + optional category]

TipTap document body
  [explicit writing components remain in document order]

editor end projection
  [optional own MpProfile / follow guidance]
  [source / related items summary]
  [optional CC + InkForge colophon summary]
```

- 投影读取当前 article/category、delivery snapshot、preset/variant，以及真实 converter 已返回并
  经 Workstation 下传的 stats；EditorPanel 不计算第三份字数或阅读时间。
- WeChat live article 为空时不注入 preset sample；preview 显示明确空态，编辑投影显示真实零值/
  未开始状态。preset sample 只留在预设浏览语境，不能进入真实文章 stats 或复制 artifact。
- 投影不得成为 `contenteditable` 的一部分，不参与正文选择、撤销、Markdown 序列化或字数统计。
- 每个投影卡具有“配置/编辑”按钮，调用现有 delivery 配置或组件表单；不再创建第二个配置页。
- Source 模式显示稳定 JSX/Markdown source，另以窄状态条说明自动首尾投递，不把最终 HTML
  塞进源码编辑器。
- 空配置只显示一个紧凑可操作入口；导出不输出空容器。

## 6. Final WeChat composition

### 6.1 Masthead order

现有 `buildReadingTimeHeader()` 调整为：

```text
masthead shell
  brand lead: INKFORGE · <identity> | 文章值得您享受
  optional real song / safe link fallback
  preset-specific identity / title composition
  real reading minutes | optional category
  real word count | positive code/image/table counts
```

歌曲从 masthead 外部移入 brand lead 之后、identity 之前。缺少真实 title 或安全 URL 时不生成
假播放器；delivery report 保持 `manual-required`/`invalid` 的真实边界。

品牌引入、歌曲和阅读信息不能依赖 float 才可见。最终微信安全 HTML 使用明确 block/inline-block
结构、可读字号和对比度；微信清洗后仍须读回“阅读约 N 分钟”“全文 N 字”。关闭预计阅读时间
只省略分钟提示，全文字数继续显示真实值，保持旧设置语义。

### 6.2 End order

```text
body（含生成的脚注/参考文献）
  → own MpProfile / follow fallback
  → source and related links
  → CC license
  → InkForge colophon
```

名片至少需要真实显示名称；公开 URL、账号、简介、头像或二维码仅在用户提供并通过 Schema/URL
校验后出现。普通 HTML 无法证明微信原生关注卡时输出独立、可读的 InkForge-owned 静态卡；
只有真实 URL 时才可点击，并在 report 中保留平台内确认提示。

### 6.3 Preview parity

Workstation 先从当前 Settings/appearance/title/category/preset 生成一次 immutable artifact snapshot。
微信 preview 与快捷复制都把该 snapshot 交给现有 `convertToNativeFormat('wechat')`；该入口的 WeChat
分支改为委托 `markdownToWechatWithStats()` 并返回同次转换的 `content`、`stats` 和 delivery report。
preview 只把 `content` 交给 `renderWechatMockHtml()` 做软件容器包装，并把 `stats` 写入
`PreviewMeta`。这同时删除 preview 中重复的 masthead、reading speed、song 和 suffix composition，
也消除快捷复制的窄 options 重建。HTML/stats/report 沿用现有 preview token 作为一个结果提交，
过期 token 同时丢弃；相同内容宽度下 preview 与复制产物的内容 DOM/inline style 必须一致，不同
宿主宽度只允许响应式换行。XHS/Zhihu 分支与账号边界不变。

## 7. Sixteen-preset differentiation

不复制组件模板。复用现有 `presetId → visualVariant/profile → CSS/recipe` 链，为共享语义槽
增加可由现有 preset/variant 选择器覆盖的稳定 class/data 属性。右侧预览已使用真实 converter，
因此 16 套的最终 inline style、decorate 与 safe SVG 不再由 preview 猜测。

每套至少在下列三类中的三项保持独立：

- song 槽的标签、轨道、边线或封套比例；
- metrics 的排列、分隔、数字强调和 category 对位；
- body component 的标题/摘要/媒体占比；
- end profile 的头像/印章/账号/关注引导构图；
- masthead 与 colophon 的连接/收束方式。

七个 visual variant 提供共享艺术方向，十个 article profile/16 个 preset 通过现有 profile
composition 添加差异。共同品牌锚点只保留 InkForge identity、引导语、真实 metadata、字体
回退和窄屏可读性，不强制同一几何骨架。

实施与验收使用下列 16 行结构合同；每行至少落实三个非颜色差异：

| Preset | Song / metrics | Body component | End profile / close |
| --- | --- | --- | --- |
| `thesis` | 罗马序号、双轨元数据 | 译注脚栏、细规则 | 文献式署名、双线收束 |
| `legal` | 章节号、法条坐标 | 条款卡、证据链侧轨 | 案卷名片、卷宗线 |
| `report` | 大号章节数字、数据带 | 指标卡、编号时间线 | 机构信息板、结论条 |
| `commentary` | WIRE 标签、短分隔 | 事实/观点对照卡 | 来源编辑卡、双规则 |
| `aigc` | BUILD 标签、版本格 | 模型统计板、构造线 | 构建身份牌、状态轨 |
| `code` | 终端提示、版本号 | 代码/步骤卡、等宽层级 | 开发者卡、命令行收束 |
| `notes` | NOTE 标签、便签指标 | 知识卡、回链批注 | 学习者卡、纸张折页 |
| `news` | 报头、日期/字数列 | 摘要双栏、来源线 | 记者名片、报尾双线 |
| `meme` | 贴纸标签、跳号指标 | 海报卡、切纸块 | 创作者贴纸、印章收束 |
| `life` | 信笺题记、留白指标 | 段落卡、手记引线 | 作者信笺、余白收束 |
| `elegant` | 书卷章节号、细字指标 | 首字下沉、古典分章 | 藏书票名片、花体分隔 |
| `tech` | 电路节点、版本指标 | 数据网格、协议卡 | 技术身份板、节点终止 |
| `flagship-kiln` | 炉火色块、铸造编号 | 几何料块、方格模组 | 墨铸印章、厚重底座 |
| `flagship-kiln-paste-safe` | 纯 HTML 铭牌、稳定数字列 | 无脆弱层的铸造卡 | 静态印章、粘贴安全双线 |
| `flagship-tempera` | 画稿页码、编辑标签 | 层叠纸片、注释边栏 | 编辑名片、画框式收束 |
| `flagship-amber` | 琥珀编号、时间/数据轨 | 对比与时间线主板 | 档案名片、铜色终章牌 |

结构 fingerprint 在比较前必须移除 preset ID、preset 名称、正文文本、数字和纯颜色值；比较节点
类型、层级、顺序、slot 几何类别和装饰 recipe。指纹不同只是自动门，不能替代 16/16 release
Tauri 全篇视觉检查。

## 8. doocs/md lessons and non-copy boundary

对当前官方 `doocs/md` main 分支的源码审阅确认：

- `CustomComponentDef` 将组件作为声明式定义和类型化 props；
- 内置/用户组件合并为一个 registry，并传入同一 Markdown renderer；
- `ComponentPropFill` 用相同定义生成表单、即时预览和 JSX snippet；
- 组件库只调用现有光标插入 API，不维护第二份文章；
- CodeMirror source 保留 JSX，最终 preview 才渲染 HTML。

InkForge 复用这些架构原则，但不照搬 doocs/md 的 CodeMirror-only 编辑表现、模板、CSS、商标、
示例账号、远程资源或 `<mp-common-profile>` 成功假设。InkForge 已有更强的 TipTap atom round-trip，
本任务只升级其编辑投影。

## 9. Compatibility, safety, and accessibility

- 旧 delivery snapshot 缺失新增可选字段时按空值解析；显式关闭的开关保持关闭。
- 文稿中的未知 YAML/frontmatter（若来自导入）继续由既有 Markdown 路径原样处理，本任务不读取、
  迁移或回写它来驱动 song/profile/CC/colophon。
- 旧 `InkComponent` source 不改写；新增可选 cover/avatar/QR/description 字段不使旧组件失效。
- URL 继续只允许无凭据 HTTP/HTTPS；图片继续要求 HTTPS；危险属性、脚本、事件、iframe、
  外部 CSS 和不受支持的平台标签仍由现有边界拒绝。
- 键盘可到达投影和原子卡的编辑按钮；状态不能只靠颜色表达；错误使用 `aria-invalid`/可见文本。
- 320–586px 无横向溢出；reduced-motion 下关闭非必要位移动画。

## 10. Operational and rollback plan

1. 每个共享符号编辑前运行 GitNexus upstream impact；HIGH/CRITICAL 先报告并缩小方案。
2. 先为 preview/export parity、slot order、真实统计、去重和 NodeView renderer reuse 增加失败回归。
3. 每个切片可按 delivery slot resolution、preview delegation、editor projection、masthead/end output、
   preset CSS 独立回退。
4. 回退不能删除/重写用户文稿、delivery snapshot、组件定义或 preset ID。
5. 最终只以 release `InkForge.exe` 的编辑/预览结果和真实微信 PC 普通粘贴读回作为视觉证据。
