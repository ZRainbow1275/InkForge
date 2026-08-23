# Research: 当前 InkForge 编辑组件与微信渲染调用链

- Scope: 当前工作树只读核对；未修改产品代码。
- Date: 2026-08-02
- Graph: GitNexus `InkForge` 索引位于当前 `dev/visual-fixes` 提交 `9a2f56e`。
- Tool boundary: Serena `initial_instructions` 与 `activate_project` 均返回 `Invalid request parameters`；以下结论由当前 GitNexus 图谱与精确源码行交叉核验。

## 1. Confirmed source authorities

1. 正文组件的 canonical source 是 PascalCase 自闭合 JSX。`WritingComponentDefinition` 同时拥有字段、版本、renderer 与可选 validator；`InkComponentNode` 只保存 `componentId`、`version`、`props`（`inkforge/src/services/writing-components.ts:3-40`）。
2. `validateWritingComponentNode()` 在运行时检查 Zod shape、危险属性、未知组件、版本、未知字段、必填字段、HTTP/HTTPS URL 与组件 validator（`writing-components.ts:772-839`）。
3. `parseWritingComponentSource()` 与 `serializeWritingComponentNode()` 形成稳定 round-trip；未知或失效 source 保留为可恢复 pending node，不会静默丢失（`writing-components.ts:857-959`）。
4. `renderWritingComponentSource()` 使用同一 definition renderer；`renderWritingComponentsInMarkdown()` 只在 fenced code 外替换完整组件行（`writing-components.ts:946-985`）。
5. 当前内置组件已经覆盖用户点名类型：`MpProfile`、`AuthorBlock`、`QRCodeBlock`、`TipBlock`、`InfoGrid`、`TableBlock`、`TimelineBlock`、`CompareBlock`、`StatBlock`、`GalleryBlock`、`CitationBlock`、`SongBlock`、`ImageBlock`、`LinkBlock`、`ArticleBlock`、`ContactCard`、`WechatMediaBlock`（`writing-components.ts:408-655`）。本任务不需要创建另一套组件库。

## 2. Editor path

1. `EditorPanel` 明确以 Markdown 为跨编辑、导出和预览的权威格式；Typora 模式挂载 TipTap，Source 模式复用 MarkdownEditor（`inkforge/src/components/editor/EditorPanel.vue:3-9,94-109`）。
2. `InkComponent` 仍是 selectable、draggable block atom；`source`、`componentId`、`label`、`status` 都保留在节点属性（`inkforge/src/extensions/InkComponent.ts:71-118`）。
3. 当前 NodeView 的根缺陷不是数据缺失，而是统一摘要卡：只显示最多三项字段、状态和“编辑”按钮，没有复用同一组件 renderer 的真实形态（`InkComponent.ts:120-200`）。
4. 编辑动作已经接到同一 WritingComponentLibrary；slash command 和库插入均复用既有 source 写回与 range replacement，不需要第二份文档状态（`EditorPanel.vue:681-701`；`writing-components.ts:1009-1025`）。
5. `editor-paper` 已绑定当前 platform、preset、visual variant、persona、字体与排版 token；TipTap 挂载点是唯一的 `.tiptap-content`（`EditorPanel.vue:1207-1265`）。因此自动文前/文末投影可以放在该挂载点前后，而不进入 ProseMirror、正文统计、undo 或 Markdown。
6. EditorPanel 已直接读取 canonical Settings 和当前文章标题，但没有当前分类 prop；`WorkstationView` 已有 `articleCategory` computed，并且当前只把它传给 ExportModal（`EditorPanel.vue:136-151,220-245`；`inkforge/src/views/WorkstationView.vue:177-184,3396-3404,4471-4477`）。若编辑投影显示分类，最小改动是把该已有值下传，不新建 store。

## 3. Delivery data and current placement

1. `settings.export.deliveryAdornment` 直接使用 `DeliveryAdornmentConfigSchema`；默认阅读时间开启、300 WPM，组件上限 24，CC 默认 `none`（`inkforge/src/stores/settings.ts:360-373`；`inkforge/src/services/export/delivery-adornments.ts:179-189`）。
2. delivery 类型只有 `song`、`image`、`link`、`related-article`、`contact-card`。每个类型都在现有 Zod schema 中保存真实字段，不含播放器、假 media ID 或平台成功状态（`delivery-adornments.ts:5-11,102-177`）。
3. `getDeliveryMastheadSong()` 当前先选择第一条启用 song，再校验 title + 安全 URL；若该首项不完整，
   它直接返回 `null` 并遮蔽后续完整 song。这是本任务必须由单次槽位解析修正的现有缺陷
   （`delivery-adornments.ts:279-296`）。
4. `createDeliveryAdornmentFragments()` 计算真实 word count/minutes，跳过已提升的 masthead song，再把其余组件按配置顺序写入 suffix，最后写 CC；invalid/manual-required 进入 report 而不是伪造输出（`delivery-adornments.ts:345-422`）。
5. 完整 URL 的歌曲和 contact card 在微信均只输出安全链接 fallback；缺 URL 分别为 `manual-required` + omitted，不声称原生歌曲或原生名片（`delivery-adornments.ts:549-610`）。
6. 当前 DeliveryAdornmentPanel 仍把所有平台组件描述为“按列表顺序写入正文尾部、许可协议之前”，与 song 已被提升到 masthead 的事实不一致；实施时需同步 placement 文案，而不是新增配置页（`inkforge/src/components/export/DeliveryAdornmentPanel.vue:263-294`）。

## 4. Actual WeChat export path

`convertToWechatWithStats()` 的当前主链是：

```text
delivery reading config + first complete song
  -> real statistics
  -> untrusted body sanitization / code / alert / footnote processing
  -> buildReadingTimeHeader(stats, article metadata, preset/variant, song)
  -> processed body + footnotes
  -> createDeliveryAdornmentFragments(..., mastheadComponentId)
  -> suffix
  -> theme CSS + Juice
  -> heading/preset decorate
  -> safe SVG modules + typography
  -> WeChat post-process + platform CSS + compliance transform
```

Anchors: `inkforge/src/services/export/wechat.ts:1213-1224,1323-1355,1361-1429`。

当前 `buildReadingTimeHeader()` 已生成真实 `阅读约 N 分钟`、`全文 N 字` 和正数扩展统计，但有三个已确认问题：

1. song HTML 在 `<section class="ink-article-masthead">` 之前整体输出，而不是在品牌引入行之后（`inkforge/src/services/export/utils.ts:854-895`）。
2. category 仍依赖 `float:right`，窄屏/微信清洗后存在可见性与节奏风险（`utils.ts:850-853`）。
3. brand lead 同样依赖两个 float span；顺序和读回必须以真实微信 PC 粘贴再次验证（`utils.ts:881-893`）。

## 5. Preview drift: shared root cause

`usePreviewRenderer()` 没有调用真实 WeChat converter。它独立执行：Markdown render → sanitize → `calculateStats()` → `buildReadingTimeHeader()` → body → `preset.decorate(..., 'preview')` → preview wrapper（`inkforge/src/composables/usePreviewRenderer.ts:226-300`）。

这造成当前用户截图中的“右侧预览与实际粘贴不一致”不是单个 CSS 缺陷，而是并行 composition drift：

1. preview 不调用 `createDeliveryAdornmentFragments()`，因此看不到文末 profile、来源/关联组件、CC 等真实 suffix；
2. preview 直接读取 `enableReadingTime`/`readingSpeed`，export 则先经过 `resolveDeliveryReadingTime()`；
3. preview 使用单独的 stats 入口与 `preview` decorate target，export 使用完整 sanitizer/Juice/WeChat compliance 链；
4. 继续在 preview 手工补 song/profile/metrics 会扩大第二条渲染链。

最小共享根方案：Workstation 从 Settings/title/category/appearance 生成一次 artifact options snapshot；
preview 与快捷复制都把它交给现有 `convertToNativeFormat('wechat')`。该入口的 WeChat 分支委托
`markdownToWechatWithStats()` 并返回同次 HTML/stats/report；`renderWechatMockHtml()` 只保留软件容器。
这同时消除 preview 的第二套 composition 和快捷复制的窄 options 重建。

为编辑画布提供真实数字时，只扩展现有 `PreviewMeta` 暴露 converter 已返回的 `wordCount`、`readingTime` 及正数扩展统计，再由 Workstation 下传；不在 EditorPanel 重新计算第三份统计。

## 6. Minimum implementation shape

1. **Body atom:** 从 `renderWritingComponentSource(source)` 提取同一 parse/validate/definition 驱动的
   wrapper-free visual body，ready NodeView 只嵌入该 body；唯一 canonical wrapper/source sentinel 留在
   atom 外层。invalid/unknown 保留当前可恢复错误卡，无需为 17 个 built-in 手写 17 套 renderer。
2. **Automatic front/end projections:** 放在 `.tiptap-content` 前后，读取现有 Settings、当前标题/分类、当前 preset/variant 与 preview stats；点击只打开现有 DeliveryAdornmentPanel/WritingComponentLibrary。它们不进入 contenteditable、Markdown、undo 或字数。
3. **Masthead:** 只调整既有 `buildReadingTimeHeader()` 的 DOM 顺序与微信安全布局：brand lead → optional song fallback → preset identity/title → metrics。
4. **End matter:** delivery `contact-card` 在自动投递语义中作为自身公众号 profile/follow 槽；正文显式 `ContactCard`/`MpProfile` 保持原位置。自动 profile 位于 body/footnotes 后、其他 delivery source/related 组件与 CC 前；同一 delivery ID 只输出一次。
5. **Preset differentiation:** 复用当前 16 preset、7 visual variant、persona/profile CSS 和 stable data/class hooks。`themePresets` 当前确有 16 项（12 基础 + `flagship-kiln`、`flagship-kiln-paste-safe`、`flagship-tempera`、`flagship-amber`，`inkforge/src/services/export/themes.ts:506-1473`）；不复制 renderer。

## 7. Tests already present and required deltas

- `article-masthead.test.ts` 已覆盖真实 metadata、7 variant、16 preset structural fingerprint 与 song 去重，但当前断言名称仍明确要求 song “before article header”（`inkforge/src/services/export/article-masthead.test.ts:60-334`）；该测试必须改成 brand lead 后、identity 前的节点顺序。
- `delivery-adornments.test.ts` 已覆盖 config/schema/report/fallback；需新增 profile-before-related-before-license 与 duplicate omission。
- `usePreviewRenderer.test.ts` 目前只检查 masthead song/title/reading time，不检查 word count、suffix/profile/CC 或 preview-vs-export DOM parity（`inkforge/src/composables/usePreviewRenderer.test.ts:274-360`）。
- `InkComponent.test.ts` 只覆盖通用 summary card、selected/error/edit callback；需新增 ready renderer reuse、invalid preservation、no-editor-chrome serialization 和 keyboard/focus 回归。
- `markdown-ext/writing-components.test.ts` 已覆盖包含 `[[wikilink]]`/`==highlight==` 的组件 source 在
  opaque token 管线后保持 source、ID 与 status；本任务必须保留该回归，不能把已生成组件 HTML
  再交给行级 Markdown 正则。
- 现有 `visual-variants.test.ts` 与 `platform-export-rendering.test.ts` 可承载 7 variant/16 preset/WeChat sanitizer/overflow 回归，不另建大而重复的视觉测试框架。

## 8. Candidate symbols and risk notes

实施前必须对实际修改符号运行 GitNexus upstream impact。当前高概率共享根：

- `buildReadingTimeHeader`
- `convertToWechatWithStats` / `markdownToWechatWithStats`
- `createDeliveryAdornmentFragments`
- `renderWritingComponentSource`
- `InkComponent`
- `usePreviewRenderer`
- `EditorPanel` 与 `WorkstationView` 的现有 props/computed glue

主要风险：

1. preview 改用真实 converter 后渲染成本上升；先复用既有 debounce/stale token，只有实际性能证据不足时再优化，不能预建缓存层。
2. NodeView 复用 renderer HTML 时必须只接受已通过现有 parser/validator 的输出，editor controls 放在外层且不得进入 source/export。
3. 自动 contact-card 语义改变必须保持旧配置可解析；按 Schema → duplicate ID 首项保留/后项报告
   → eligibility → promotion → remainder 的顺序，只提升第一条 `enabled + displayName` 卡，其余有效卡
   按原配置顺序继续进入普通 suffix，不能静默丢失。
4. release 软件与真实微信 PC 普通粘贴是最终证据；浏览器 preview、单测和历史粘贴记录都不能代替本轮验收。
