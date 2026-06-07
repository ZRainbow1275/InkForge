# 微信公众号 CSS 与 SVG 支持规则研究

## 研究目标

确认微信公众号图文消息对 HTML、CSS、SVG、图片和图表的真实支持边界，并把结论映射到 Inkforge 当前导出链路。

## 信息来源

- 微信官方文档：新增草稿 `draft_add`，`https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html`
- 微信官方文档：上传发表内容中的图片 `uploadImage`，`https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_uploadimage.html`
- 微信官方文档：上传永久素材 `addMaterial`，`https://developers.weixin.qq.com/doc/service/api/material/permanent/api_addmaterial.html`
- 微信官方文档：素材管理入口，`https://developers.weixin.qq.com/doc/subscription/guide/product/asset.html`
- 开源参照：doocs/md，`https://github.com/doocs/md`
- 本地文档：`docs/platform-rendering-rules/wechat-rules.md`
- 本地文档：`docs/微信渲染规则.md`
- 本地代码：`inkforge/src/services/export/platform-css.ts`
- 本地代码：`inkforge/src/services/export/wechat.ts`
- 本地代码：`inkforge/src/services/export/platform-rules/wechat.ts`
- 本地代码：`inkforge/src/services/export/quality-detector.ts`

## 官方可确认事实

- 微信草稿接口的 `content` 字段支持 HTML 标签，但微信会移除 JavaScript，且文章内图片 URL 必须来自“上传发表内容中的图片”接口；外部图片 URL 会被过滤。
- `draft_add` 明确要求接口在服务器端调用，不能从前端直接调用。
- 图文消息封面 `thumb_media_id` 需要永久素材 `media_id`；文章正文中的图片更适合通过 `/cgi-bin/media/uploadimg` 换取 `mmbiz.qpic.cn` URL。
- 官方文档未公开完整 HTML 标签白名单、CSS 属性白名单、SVG 白名单。因此 CSS/SVG 细则必须以官方接口约束 + 微信编辑器实测 + 成熟工具实现共同收敛，不能声称存在完整官方白名单。
- 旧的 `uploadnewsmsg` 文档仍可作为历史兼容参考，但官方页面提示该能力已更新为草稿箱。后续实现应优先对齐 `draft_add`。

## CSS 支持结论

### 必须作为硬规则处理

- 仅依赖内联 `style`，不要依赖 `<style>`、外部 CSS、class 选择器或伪类。
- 禁止 JavaScript、事件属性、`javascript:` URL、`iframe`、`form`、`input`、`button` 等交互节点。
- CSS 变量、`calc()`、`clamp()`、媒体查询、动画、过渡、滤镜应视为不可用。
- Flex/Grid 不应作为主布局方案。文章卡片、信息块、代码块语言角标等应使用 `block`、`inline-block`、`table`、`table-cell`、`float`、`margin` 等降级方案。
- `position: fixed/sticky/absolute` 不稳定，应避免；仅保留 `static/relative`。
- 所有主题样式必须在复制/导出前完成内联，并在最终阶段剥离 `class`。

### 可用但要保守

- `font-size`、`font-weight`、`font-style`、`font-family`、`color`、`line-height`、`letter-spacing`、`text-align` 可作为正文排版主力。
- `margin`、`padding`、`border`、`border-radius`、`background`、`background-color`、`box-shadow`、`opacity` 可用于精美卡片和提示块。
- 渐变在社区工具中有落地案例，但不同客户端有风险。建议导出时同时保留纯色背景 fallback，不把渐变作为唯一语义承载。
- 表格可用，但必须完全内联边框、padding、表头背景、`border-collapse`，并避免依赖响应式 CSS。

## SVG 与图表支持结论

### SVG 的可靠性分层

1. **最高可靠：图表转图片后上传微信图片接口**
   适合 Mermaid、ECharts、复杂流程图、法律/商业图表、数据仪表盘截图。推荐默认路径：SVG/Canvas -> PNG/JPG -> `/cgi-bin/media/uploadimg` -> `<img src="mmbiz...">`。

2. **中等可靠：简单内联 SVG 装饰**
   适合分隔线、角标、简单几何装饰。必须禁用脚本、外链、事件属性、外部字体、复杂滤镜、`foreignObject`。发布前必须人工预览或自动预览截图比对。

3. **低可靠：复杂互动 SVG**
   社区文章常用 SVG 制造长图、点击切换、滑动等效果，但官方缺少稳定公开契约。除非专门做 SVG 模板库并建立真实公众号预览验收，否则不应作为 Inkforge 的默认生成路径。

### 图表建议

- 数据图表默认输出为静态图片，而不是把 ECharts/Mermaid/SVG 代码直接塞进图文 HTML。
- 对需要可复制文字的轻量表格或对比矩阵，优先输出 HTML table。
- 对关系图、流程图、组织结构图、时间线，优先输出图片，并在图片下方保留文字摘要，保证图片失败时仍可读。
- Mermaid 可作为编辑态源格式，但发布态必须经过“图像化或简化 HTML 表格”决策。

## 与 Inkforge 当前代码的差距

- 当前 `platform-css.ts` 已把微信建模为不支持 flex/grid/CSS 变量/calc/clamp/transition/filter，支持 `box-shadow`、`border-radius`、`opacity`、渐变。
- 当前 `wechat.ts` 已有 `DOMPurify -> highlight -> footnote -> juice -> heading decoration -> table enhance -> postProcessForWechat -> enforcePlatformCSS -> wechatComplianceTransform` 管线。
- 当前 `quality-detector.ts` 已能提示 CSS 变量、SVG 图片、外链、过宽图片、`<style>`、不支持标签、Mermaid、LaTeX 降级。
- 本地 `docs/微信渲染规则.md` 中有“top 转 transform”的旧说法；当前代码已移除该策略，因为 `transform` 会被微信 CSS 支持矩阵剥离。后续规范需要以当前代码和重审结论为准。
- 当前任务已补上 `wechat-publish.ts` + Tauri `wechat.rs` 的最小真实发布链，与既有 `convertToWechat` 预览主链并存。
- 现有规则仍偏“防失败”，还缺少“怎样生成精美文章/图表”的完整设计模式库、主题 token 降级规则和系统化图表资产策略；这部分仍主要停留在研究与后续任务层。

## 初步建议

- 把微信导出能力拆成三层：`safe-html`、`visual-patterns`、`asset/component-publish`。
- `safe-html` 负责白名单、CSS 内联、安全清理和兼容性后处理。
- `visual-patterns` 提供标题、摘要卡、信息图卡、时间线、对比表、代码块、引用块、风险提示块等可复用块，全部以微信安全 CSS 实现。
- `asset/component-publish` 负责图片上传、封面素材、图表截图、草稿接口和后台组件清单。
