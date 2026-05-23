# 微信公众号组件与发布 API 边界研究

## 研究目标

厘清“微信提供的各项组件”在 Inkforge 中可以做到什么程度：哪些可通过官方 API 自动化，哪些只能作为后台编辑器中的人工插入项，哪些适合作为导出前检查清单。

## 信息来源

- 微信官方文档：新增草稿 `draft_add`
- 微信官方文档：上传发表内容中的图片 `uploadImage`
- 微信官方文档：上传永久素材 `addMaterial`
- 微信官方文档：素材管理入口
- Grok Search 检索：公众号文章组件、小程序卡片、`mpvoice`、`mpvideo`
- 本地代码：`inkforge/src/views/PublishView.vue`
- 本地代码：`inkforge/src/components/export/ExportModal.vue`
- 本地代码：`inkforge/src/services/export/wechat-publish.ts`
- 本地代码：`inkforge/src/services/export/image-pipeline/uploaders/wechat.ts`
- 本地代码：`inkforge/src-tauri/src/commands/wechat.rs`
- 本地记忆：既有 WeChat preflight 已校验 `thumb_media_id` 可通过 `cgi-bin/material/get_material` 获取，永久图片素材可能返回二进制而非 JSON。

## 官方 API 能力边界

### 可自动化

- 新增草稿：`/cgi-bin/draft/add`，核心字段包括 `articles`、`title`、`author`、`digest`、`content`、`content_source_url`、`thumb_media_id`、评论开关、封面裁剪字段。
- 上传正文图片：`/cgi-bin/media/uploadimg`，返回可放入文章内容的图片 URL。
- 上传永久素材：`/cgi-bin/material/add_material`，图片返回 `media_id` 和 `url`，封面图可使用永久素材 `media_id`。
- 获取、删除、批量获取永久素材：素材管理章节提供对应接口，可用于 preflight 和素材库同步。
- 图片消息 `newspic`、商品相关 `product_info.footer_product_info` 在 `draft_add` 字段中出现，但属于特定能力场景，应先做账号权限和错误码兜底。

### 不能从前端直连

- 公众号接口都要求服务端调用；`access_token`、`appsecret`、素材上传和草稿创建不能放在浏览器前端。
- Inkforge 如果要真自动化发布，必须走本地 Tauri command 或后端服务代理，并且要有 token 缓存、过期刷新、错误码解释、敏感信息存储策略。

### 不宜手写模拟的组件

- 小程序卡片、音频、视频号、投票、商品、公众号名片、历史图文等后台组件通常由公众平台编辑器生成专有结构。
- 官方没有公开稳定的完整 HTML 标签契约；社区提到的 `mpvoice`、`mpvideo` 等标签应视为后台生成结果，而不是 Inkforge 可以随意拼接的公共 API。
- 因此 Inkforge 的第一阶段不应伪造这些组件 HTML，而应提供“组件占位 + 发布清单 + 后台插入引导 + 草稿接口能力探测”。

## 组件分类建议

| 组件类型 | Inkforge 第一阶段策略 | 说明 |
| --- | --- | --- |
| 正文图片 | 可自动化 | 编辑态资产上传或导出时上传到 `uploadimg` |
| 封面图 | 可自动化 | 永久素材 `media_id` + `thumb_media_id` preflight |
| HTML 图文正文 | 可自动化 | 微信安全 HTML + inline CSS |
| 图表/流程图 | 半自动化 | 编辑态生成 SVG/Canvas，发布态默认转图片并上传 |
| 小程序卡片 | 半自动化 | 保留占位与参数；建议后台插入或后续验证官方能力 |
| 视频/视频号 | 半自动化 | 保留占位；优先后台插入 |
| 音频/语音 | 半自动化 | 保留占位；优先后台插入 |
| 投票 | 人工后台组件 | 不伪造 HTML |
| 商品/带货 | 条件自动化 | `draft_add` 有商品字段，但需账号权限探测 |
| 阅读原文 | 可自动化 | `content_source_url` 字段 |
| 评论开关 | 可自动化 | `need_open_comment`、`only_fans_can_comment` |

## 2026-05-16 当前 MVP 落地状态

- 已落地：发布能力状态探测；正文图片上传到 `uploadimg`；封面图上传到 `add_material`；草稿创建前的标题/正文/封面/外链图片校验；`draft/add` 草稿创建；ExportModal 中的真实 blocked/ready 状态展示。
- 已明确边界：凭据只允许在 `inkforge/.env.local` 或系统环境变量中由 Tauri / 本地服务端读取；Web runtime 只返回 honest blocked 状态，不伪造可发布。
- 仍未自动化：小程序卡片、视频号、音频、投票、商品等后台专有组件插入；真正群发 publish；真实公众号后台预览验收自动化。

## 精美图文与组件结合的可行产品形态

1. **微信安全图文模板库**
   提供标题组、摘要卡、关键结论卡、引用块、风险提示块、时间线、两栏对比、步骤流程、法律/商业分析表格。全部生成 inline CSS HTML。

2. **图表资产流水线**
   支持 Mermaid/ECharts/SVG 源，默认转 PNG/JPG 并上传微信正文图片接口，生成稳定 `<img>`。保留源数据以便后续编辑。

3. **公众号组件占位系统**
   在 Markdown 中允许声明类似 `:::wechat-miniapp`、`:::wechat-video`、`:::wechat-vote` 的语义块。导出时不生成伪组件，而是生成发布清单，并在预览中显示待后台插入的位置。

4. **草稿发布 preflight**
   检查标题、摘要、封面、正文图片、外链、字符/大小、SVG/图表、评论、原文链接、账号权限，给出阻断/警告/建议三级结果。

## 风险

- 微信后台编辑器能力会灰度变化，非官方 HTML 组件结构可能随时失效。
- 草稿接口文档字段描述存在版本差异，不能只信旧素材接口。
- 图表转图需要真实图片上传链路；没有公众号凭据时只能产出本地预览和待上传清单，不能假装已发布。
- 小程序/商品/投票等组件受账号权限影响，必须在真实账号上做 capability detection。

## 当前结论

- 第一阶段已经可以把“可自动化的 API 边界”和“必须人工后台插入的组件边界”清楚分开。
- 后续若继续扩展组件能力，应优先做 capability detection / 发布清单，而不是尝试伪造后台专有 HTML 结构。

## 建议的验收方式

- 静态规则：生成 HTML 不含 `<style>`、`class`、JS、危险标签、外部图片 URL、未内联 CSS 变量。
- 资产规则：正文图片 URL 来自微信上传接口，封面 `thumb_media_id` 通过素材接口 preflight。
- 视觉规则：至少覆盖正文、代码块、表格、引用块、提示卡、时间线、图表图片 7 类样式。
- 平台规则：导出结果可复制到微信公众号编辑器并通过手机预览，不出现布局塌陷、图片丢失、脚本过滤残留。
