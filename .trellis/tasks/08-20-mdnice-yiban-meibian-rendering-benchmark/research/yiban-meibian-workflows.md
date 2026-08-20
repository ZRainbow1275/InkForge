# Research: 壹伴与美编的公众号编辑工作流对标

- Query: 调查 2026-08-20 可公开访问的壹伴、美编产品与浏览器扩展，覆盖集成形态、编辑/模板/素材工作流、复制或发布路径、HTML/CSS/SVG 边界、权限与登录门槛，并映射到 InkForge。
- Scope: mixed（外部一手公开证据 + 当前仓库只读映射 + 后续根线程的壹伴编辑页脱敏运行态证据）
- Date: 2026-08-20
- Evidence capture: 2026-08-20T17:50:45+08:00（Asia/Shanghai）
- Task boundary: 本任务仍为 planning；未运行 `task.py start`，未修改产品代码。本公开资料子线程没有安装扩展、登录或绑定账号，也没有操作 CloakBrowser/Playwright；后续根线程复用了用户已安装并登录的唯一 CloakBrowser 会话，完成一个任务自有临时草稿的受控闭环。

## Findings

### 1. 结论先行

1. **两者的核心都不是独立网页编辑器，而是 Chromium 浏览器扩展嵌入微信公众号后台。** 用户在微信原生编辑/素材/数据页面内看到增强栏、样式库或侧栏；官网承担下载、登录、会员、素材库或账号管理等配套能力。
2. **成熟工作流的价值在“缩短上下文切换”，不在某套模板源码。** 共同模式是：安装扩展 → 登录 → 添加/授权公众号 → 在微信编辑页选样式或一键排版 → 采集/导入素材 → 预览或转入草稿 → 继续使用微信权限完成发送。InkForge 应借鉴语义化选择、素材溯源、明确交接和预览边界，而不是照搬扩展注入、账号托管或供应商模板。
3. **公开资料只能验证“页面/文档/商店声明存在”，不能验证真正插入后的 DOM、剪贴板、微信清洗或手机渲染。** 壹伴公开页面声称创意 SVG、导入 HTML、H5 源码和 SVG 动态素材；美编帮助只明确“文章源码切换”。两者都没有公开的 HTML/CSS/SVG 允许集、净化规则、粘贴后 DOM 或手机暗色模式证据。
4. **壹伴的账号/发送边界更明确、也更高权限。** 官方帮助写明添加公众号会进入授权页，且仅公众号管理员/创建者可扫码；定时群发、个性推送、模板/订阅通知等还受会员、认证服务号、微信审核或管理员授权限制。美编公开帮助确认登录、添加公众号、授权状态和跨已绑定账号同步，但本次没有找到同等精度的角色权限表。
5. **隐私声明必须按“当前商店披露、官网帮助、旧政策文件”分别保留，不能合并成一个事实。** 壹伴 Chrome 商店当前称不收集或使用数据；其官网帮助称不获取用户密码/Cookie；但商店链接的隐私 PDF（文件名含 20210914）列出手机号、微信标识、公众号 appid、设备/位置/日志及 Cookie 等处理范围。美编商店当前披露处理 Authentication information 与 Website content；其帮助称不获取密码/Cookie。未做运行时网络验证，因此只记录披露差异，不推断实际行为。

### 2. 证据分级与研究方法

| 等级 | 本文含义 | 可以证明 | 不能证明 |
| --- | --- | --- | --- |
| P1 | 当前公开一手页面/商店页/官网静态资源被读取 | 页面内容、版本元数据、公开路由、文档声明确实存在 | 功能运行成功、目标平台保留 |
| P2 | 供应商产品声明 | 供应商声称提供某能力 | 产物格式、兼容性、效果、准确率 |
| I | 从多个 P1/P2 证据得到的有限推断 | 工作流形态或合理产品边界 | 未观察的实现细节 |
| G | 需要安装、登录、扫码或平台权限的门槛 | 下一步需要什么动作 | 门槛后的任何行为 |

公开资料阶段按项目路由先完成 Grok 规划（session 9c91a08945d8，复杂度 3，拆为身份/权限、两产品工作流、综合映射等 5 个子问题），再以 Grok Exa 搜索做二次验证，最后直接读取一手公开 URL 和当前静态资源；该阶段没有打开或控制浏览器。后续壹伴运行态证据由根线程在唯一 CloakBrowser 会话中另行取得。

检索基础设施限制也被保留：

- Grok web_search 多次返回 grok_provider_error，并降级为 source_fallback；因此没有把其摘要当一手证据。
- Grok web_map 对 https://www.mbian.com/ 与 https://yiban.io/help 返回 Tavily HTTP 404。
- 直接 MetaMCP Exa 在 2026-08-20T09:43:17Z 左右返回 HTTP 402 credits exceeded；改用可用的 Grok Exa 做独立检索，再回到官网/商店原页验证。
- Firecrawl 读取 https://www.mbian.com/download 返回 HTTP 403（账号被禁用）。
- 这些失败不影响下述已直接读取的一手页面，但意味着“搜索没有找到”不能被解释为产品不存在。

### 3. Files found（内部权威输入与当前实现）

| Path | 一句话说明 |
| --- | --- |
| .trellis/workflow.md | 研究必须持久化到任务 research 目录，且 planning 与 implementation 分离。 |
| .trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/prd.md | 本研究的公开证据、真实性、版权、登录/安装和不改产品代码约束。 |
| .trellis/spec/frontend/index.md | 把 WeChat-Safe SVG Modules 与视觉变体列为现行前端规格。 |
| .trellis/spec/frontend/wechat-svg-modules.md | 市场编辑器证据、第三方残留、外部证明和安全 SVG 的主合同。 |
| inkforge/src/services/export/themes.ts | 当前微信预设规则目录、preview/export 双轨 CSS 与平台降级说明。 |
| inkforge/src/components/export/ExportModal.vue | 当前预设、SVG 插槽、预检、预览、复制及原生组件人工交接入口。 |
| inkforge/src/services/export/utils.ts | 微信专用富剪贴板字符处理、HTML/plain 双 MIME 和失败闭合。 |
| inkforge/src/services/export/publish-copy.ts | DOMPurify 允许集、SVG 子集和 execCommand 兼容复制。 |
| inkforge/src/services/security/html-sanitizer.ts | 统一 wechat-export 净化器入口。 |
| inkforge/src/services/export/publish-copy.test.ts | 富复制失败语义、安全 SVG 保留及危险构造剥离回归。 |

### 4. 当前 InkForge 可复用基线（本轮只读验证）

- getWechatRenderingRuleCatalog() 已从真实 themePresets 生成预设身份、六类区域、兼容 profile、降级说明和安全不变量，不需要再建一个“竞品模板 DSL”（themes.ts:1680-1726）。
- generateThemeCSS() 已区分 previewCSS 与 exportCSS，并保留旧预设回退；这正适合承载“本地高保真预览”和“微信安全导出”两个不同承诺（themes.ts:1729-1816）。
- ExportModal 已有按平台预设选择（ExportModal.vue:1197-1206）、默认关闭的 SVG 应用插槽（1265-1316）、剪贴板权限预检（1385-1391）、微信渲染与 native handoff report（1455-1485）、富复制失败反馈（1556-1580）及“原生插入仍需公众号编辑器读回”的人工交接（1596-1609）。
- 微信复制会把非 ASCII 文本编码为实体，仅在微信富剪贴板边界应用；现代 ClipboardItem 同时写 text/html 和 text/plain，微信样式复制不把纯文本降级误报为富复制成功，并有净化后的 execCommand 兼容路径（utils.ts:934-1060）。
- 发布复制允许明确的 HTML/SVG 标签和属性集，随后移除 script、style、foreignObject、事件属性和 javascript: URI（publish-copy.ts:1-60）；兼容复制只在 execCommand 返回 true 时成功，并清理临时 DOM/selection（63-93）。
- 通用安全层还保留了统一的 wechat-export sanitizer 入口（html-sanitizer.ts:643-650），新诊断或导入能力应复用它而不是在 UI 内再建允许集。
- 回归覆盖现代剪贴板与兼容路径、禁止纯文本冒充成功、安全 SVG allowlist、危险 SVG 构造剥离，以及全部 27 个 SVG 模块 × 4 persona 的净化覆盖（publish-copy.test.ts:42-104, 133-227）。

**映射结论：** InkForge 已有 renderer、preset、SVG、sanitizer、clipboard、preview 和 handoff 基础。本次对标的最小有价值增量应是工作流可发现性、语义化快捷应用、来源/许可提示和证据状态表达；不是再做一个浏览器扩展、第二渲染器或账号运营平台。

### 5. 外部一手参考与当前性

| 产品 | URL | 2026-08-20 直接观察 | 证据/限制 |
| --- | --- | --- | --- |
| 壹伴 Chrome 商店 | https://chromewebstore.google.com/detail/%E5%A3%B9%E4%BC%B4-%C2%B7-%E5%B0%8F%E6%8F%92%E4%BB%B6/ibefaeehajgcpooopoegkifhgecigeeg | Extension；v12.3.14；2026-08-18 更新；11.09 MiB；200,000 users；4.1/107；网站所有者创建 | P1 商店元数据；用户数/评分会变 |
| 壹伴官网 | https://yiban.io/ | v12.3.14，页面写 2026-08-19；列出 Markdown 排版、创意 SVG、导入 HTML 等新增功能 | P1 页面 + P2 产品声明 |
| 壹伴帮助 | https://yiban.io/help | 扩展形态、微信后台入口、排版/样式/采集/预览/发送/账号授权说明；页面自述界面可能随版本变化 | P1 文档存在；未运行功能 |
| 壹伴下载 | https://yiban.io/download | Chrome/Edge 商店入口及手动 CRX/开发者模式说明 | P1；未下载/安装 |
| 壹伴 Edge 商店 | https://microsoftedge.microsoft.com/addons/detail/opgmkccdkhgbenppbopeekfdlancpdgf?hl=zh-CN | 静态 HTML title 为“壹伴 · 小插件 - Microsoft Edge Add-ons” | P1 仅验证页面/ID；详情为动态内容 |
| 壹伴隐私 PDF | https://cdn.yiban.io/%E5%A3%B9%E4%BC%B4%E5%8A%A9%E6%89%8B-%E9%9A%90%E7%A7%81%E6%94%BF%E7%AD%96-JH_20210914.pdf | 12 页；文件名含 20210914；正文列出注册、公众号、设备/位置、日志、H5 授权和 Cookie 等范围 | P1 文件内容；正文未找到明确修订日期，可能陈旧 |
| 美编官网 | https://www.mbian.com/ | 定位为公众号编辑/运营助手；公开 SPA 壳 | P1 |
| 美编 SPA 当前入口 | https://www.mbian.com/static/js/app.b7a2d23aa39efdd63a3e.js | 注册 /login、/material/*、/person 等路由及未授权跳转逻辑 | P1 当前一方静态资源；hash 可能变 |
| 美编帮助 | https://www.mbian.com/help | 官方路由；当前帮助正文由官网静态 chunk 提供 | P1；动态路由本身需 JS |
| 美编帮助静态快照 | https://www.mbian.com/static/js/2.2ba9a58adbdb3b6a3ad6.js | 插件工作方式、样式、排版、源码、导入、采集、预览、同步、安全说明 | P1 当前一方静态资源；hash 可能变 |
| 美编下载静态快照 | https://www.mbian.com/static/js/4.e1af6ee11c8b6656e048.js | 浏览器列表、Edge 商店 ID、CRX/拖拽/开发者模式说明 | P1；未下载/安装 |
| 美编用户协议 | https://www.mbian.com/protocol | 当前公开协议路由；正文由 chunk 28 提供 | P1 |
| 美编协议静态快照 | https://www.mbian.com/static/js/28.780b424de3c4492b3f05.js | 知识产权、上传内容责任、概括性隐私条款 | P1；不是细粒度权限清单 |
| 美编 Chrome 商店 | https://chromewebstore.google.com/detail/%E7%BE%8E%E7%BC%96%E5%8A%A9%E6%89%8B/fjohbkcfdceimhfkdcbldnjgdjndnbeg | Extension；v3.1.0；2025-07-09 更新；5.57 MiB；10,000 users；3.9/7；网站所有者创建 | P1 商店元数据；较壹伴更新旧 |
| 美编 Edge 商店 | https://microsoftedge.microsoft.com/addons/detail/%E7%BE%8E%E7%BC%96%E5%8A%A9%E6%89%8B/aiddcfpabhgbhcgggaajoeaonoeadlob?hl=zh-CN | 静态 HTML title 为“美编助手 - Microsoft Edge Add-ons” | P1 仅验证页面/ID；详情为动态内容 |

### 6. 工作流对标总表

| 维度 | 壹伴 | 美编 | 验证边界 |
| --- | --- | --- | --- |
| 核心集成 | Chromium 扩展直接搭载公众号后台；本轮已观察到侧栏、工具面、Shadow DOM 与微信正文 editor adapter | Windows/Mac Chromium 扩展，主要功能显示在微信平台各页面 | 壹伴：运行态 + 静态扩展结构；美编：P1 文档，未观察注入 DOM |
| 官网角色 | 下载、登录/注册、个人中心、样式/云笔记等配套 | 登录、公众号/素材/模板/样式/个人中心等 SPA 配套 | P1 路由/页面 |
| 编辑增强 | 字体、缩进、间距、全文处理、图片效果、emoji、源码、自动排版 | 段落/图片/全局格式、源码切换、连续格式刷 | P1 文档声明 |
| 样式/模板 | 左栏分类、关键词/颜色/行业筛选、套系、收藏、样式中心 | 模板样式点击插入、选中后结构/空行/颜色操作、收藏分组 | P1 文档声明 |
| 一键排版 | 批量映射标题/引用/段落 | 先配置方案，再把标记的标题/引用/加粗等映射到样式 | P1 文档声明 |
| 素材 | 样式/文章/图片/GIF 采集、URL 导入、手机传图、云笔记 | 文章/样式/图片/视频采集、URL/素材库/Word 导入、图片搜索 | P1 文档；“原样”属于 P2 |
| 预览 | 基础/无限永久链接；iPhone 深色模式模拟 | 永久预览链接，原素材存在时保持有效 | P1 文档；未做真实手机读回 |
| 草稿/跨号 | 全文采集可选账号并写入公众号草稿；图片入素材库 | 当前账号素材可发送到其他已绑定账号 | P1 文档；未执行 |
| 发送/发布 | 文档覆盖定时群发、个性推送、模板/订阅/客服推送，权限条件很多 | 帮助只明确微信后台内定时发送的取消流程；未找到独立直发 API 的公开证据 | P1 文档边界 |
| HTML/CSS/SVG | Markdown 一键排版已取得应用/保存/重载结构摘要；SVG 目录已运行态计数，但未取得可用 SVG applied 产物 | 帮助明确“文章源码切换”，未出现产品级 SVG 支持合同 | 壹伴：Markdown 运行态 + SVG `blocked`；美编：P1 文档，无运行时产物 |
| 账号边界 | 注册/登录 + 绑定公众号；管理员/创建者扫码；高阶发送需认证/会员/审核 | 会员登录；添加公众号跳转微信；显示授权状态；部分官网素材/个人路由未登录会转 /login | P1 文档/静态路由 |

**复制路径的关键差异：** 本次公开一手文档没有为壹伴或美编描述一个类似 InkForge 的“生成独立富 HTML → 写入系统剪贴板 → 用户粘贴”主流程。两者的样式按钮直接作用于微信公众号编辑器，随后进入微信草稿/预览/发送链路；因此它们能证明的是“编辑器内工作流设计”，不是可移植的剪贴板格式或 HTML 导出合同。

### 7. 壹伴：详细工作流与边界

#### 7.1 集成与编辑

- 官方帮助把壹伴定义为运行在浏览器上的公众号运营管理扩展，可直接搭载微信公众号后台，不必切到第三方编辑器；支持 Windows/Mac 上的 Chromium 浏览器，公开列出 Chrome、Edge、360、QQ 等，明确不支持 Safari/IE/Firefox 等。
- 微信图文编辑页出现第二排增强功能和左侧样式栏。用户可以按语义类别、关键词、颜色或行业找样式，点击插入；收藏和“我的样式”降低重复查找成本。
- 一键排版把标题、引用、段落等内容角色批量绑定到所选样式。产品价值是“语义角色 → 视觉方案”，不是模板 HTML 本身。

#### 7.2 素材与导入

- 微信文章页右侧工具箱可圈选并收藏样式；全文采集可选择公众号账号并进入草稿；非公众号网页由扩展弹窗发起采集。
- URL 导入、网页图片/GIF 入微信图片素材库、手机扫码传图和云笔记形成跨来源素材入口。
- “样式无变化”“原样保存”等为供应商效果声明。本次没有比较源 DOM、写入草稿后的 DOM、图片是否全部重托管、版权/链接残留或微信二次清洗。

#### 7.3 预览、草稿与发送

- 基础永久链接有 500 次点击门槛，链接来自 api.yiban.io；草稿生成该链接后不能继续发布/群发，发布或群发后链接失效。无限版仅限认证服务号，需手动更新，管理员会收到提醒。
- “深色模式预览”是插件内 iPhone 深色模式模拟，不是实际手机微信验收。
- 定时群发最高可配置到 10 天，但官方帮助同时要求标准版会员和认证公众号。个性推送要求认证服务号与管理员授权；模板消息可能先经微信官方审核；订阅通知、48 小时客服推送也受微信账号类型、用户行为和平台规则限制。
- 因而，壹伴的“发布路径”更准确地表述为：扩展在微信后台内提供增强入口，并在经过账号/微信权限后发起动作；不能把商店文案理解为无需微信权限的独立发布通道。

#### 7.4 HTML/CSS/SVG

- 官网当前列出“创意 SVG、导入 HTML”，Chrome 商店文案列出编辑 H5 源代码和 SVG 动态素材；帮助页列出“编辑源代码”。
- 当前帮助正文搜索不到产品合同意义上的 SVG、HTML 或 CSS 字样；唯一 H5 相关帮助是外链/订阅通知场景。公开资料没有说明标签/属性 allowlist、CSS 内联策略、foreignObject/SMIL 支持、脚本剥离、图片托管、微信粘贴后的保留率或暗色模式行为。
- 因此可验证结论仅是“供应商公开声称并提供源码入口”；不能得出“任意 HTML/CSS/SVG 可安全发布”。

#### 7.5 权限、登录与披露

- 最小产品门槛：安装扩展 → 注册/登录 → 添加账号 → 微信授权页 → 公众号管理员/创建者扫码。公众号运营者角色按帮助说明不能完成该授权。
- Chrome 商店公开页没有列出 manifest host permissions 或安装确认弹窗的完整权限。点击 Add to Chrome 才能看到安装权限，而安装不在本任务授权范围内。
- 当前 Chrome 商店称开发者不收集或使用数据；帮助称不获取用户密码/Cookie。商店链接的旧隐私 PDF 则覆盖微信头像/昵称/unionID/openID、手机号、公众号头像/昵称/appid、设备标识与位置、日志和 Cookie 等。可能存在版本/口径差异；未安装抓包，故只标记“披露不一致，待供应商澄清”。

### 8. 美编：详细工作流与边界

#### 8.1 集成与网页伴侣

- 官方帮助静态资源描述其为 Windows/Mac Chromium 浏览器插件；登录官网后扩展可继承登录状态。添加公众号会跳转微信公众号平台，成功后在列表内切换，页面显示授权状态。
- 官网 SPA 公开注册 /login、/reg、/createAccount、/bindSelect、/bindAccount、/media、/material/*、/commonTemplates、/style、/person、/protocol 等路由。未授权响应会把 media、material、person 等区域转到 /login，说明官网是伴侣/素材/账号面，而非完全公开编辑器。
- 插件能力分布在微信首页、素材管理、内容分析、编辑器和文章页面；这与壹伴同属“注入微信后台 + 云端配套”模式。

#### 8.2 编辑、样式与一键排版

- 模板样式点击后插入微信编辑器；选中后可删除、清框架保留文字/图片、加前后空行、换当前颜色，收藏项可以分组。
- 编辑增强覆盖段落间距/缩进、批量图片边框/圆角/阴影、全局对齐/字重/颜色/清格式/背景、源码切换和连续格式刷。
- 一键排版先保存方案，再把特定文本标记映射为标题、引用、加粗等样式。InkForge 已有结构化 Markdown/组件语义，若借鉴应直接读取 AST/节点角色，不必复制美编面向纯富文本的魔法标记。

#### 8.3 素材、导入与交接

- 官方帮助列出 URL/美编素材库图文导入、Word 导入、图片编辑/搜索，以及文章、样式、图片、视频采集。
- 采集文章被描述为保留原样并存入美编素材库，这是效果声明；本次未核验第三方样式、图片链接、版权、跟踪参数或微信清洗。
- 素材同步路径是微信后台“内容与互动 → 草稿箱 → 发送到其他账号”，对象为已绑定账号。它是账号权限工作流，不等于匿名 HTML 导出。
- 永久链接依赖原素材仍存在。公开帮助关于定时群发只证明微信后台内存在取消步骤，不能证明美编独立实现了发布 API。

#### 8.4 HTML/CSS/SVG

- 帮助只明确“文章源码切换，可利用代码优化文章”。当前产品正文没有 SVG/foreignObject/SMIL 支持说明；静态 bundle 中出现的 HTML/CSS 字符串多为前端运行库，不是产品格式合同。
- 没有找到公开 allowlist、sanitizer、剪贴板 MIME、微信粘贴后 DOM 或手机暗色模式证明。因此美编只能作为“源码入口/编辑工作流”参考，不能作为 SVG 兼容结论来源。

#### 8.5 权限、登录与披露

- Chrome 商店当前披露会处理 Authentication information 与 Website content，并声明不出售、不用于与核心功能无关的目的等；其隐私链接仅回到官网，而不是一个细粒度权限文档。
- 官方帮助称不获取密码/Cookie，遵循微信第三方平台接口规则。公开用户协议只有概括性隐私条款，同时要求用户对上传文字/图片/视频等知识产权负责。
- exact manifest permissions、host permissions、install prompt 和绑定授权细目均需实际安装/登录才能看到，本次未执行。

### 9. “公开可验证”与“不能据此声称”的矩阵

| 结论 | 状态 | 理由 |
| --- | --- | --- |
| 两产品当前均有 Chrome 扩展商店页 | 已验证 P1 | 直接读取当前页面和 ID |
| 两产品均有 Edge 商店页 | 已验证 P1（页面存在） | 官网下载页给出 ID，Edge 静态 title 与产品名相符 |
| 样式点击/一键排版/素材采集工作流被官方文档描述 | 已验证 P1 文档 | 只证明文档声明，不证明运行结果 |
| 壹伴支持创意 SVG、导入 HTML、H5 源码 | P2 产品声明 | 官网/商店出现；缺少产物和兼容合同 |
| 美编支持文章源码切换 | P1 文档声明 | 具体代码范围/净化/保留未验证 |
| 采集或导入可“原样”保留 | 未验证效果 | 无 before/after DOM、图片和手机读回 |
| 插件内暗色预览等同真实 iPhone/微信暗色效果 | 不成立 | 仅本地模拟说明 |
| 在微信后台看到发布/定时入口等同发布成功 | 不成立 | 缺账号授权、平台响应、草稿/手机/公开页读回 |
| 商店隐私声明等同运行时无数据处理 | 不成立 | 无运行时验证，且壹伴旧政策范围更广 |
| 市场模板/DOM 可直接变成 InkForge 资产 | 禁止 | PRD 与现行 spec 均要求只提炼机制并重写为 InkForge-owned |

### 10. 对 InkForge 的可执行启示（按优先级）

> 后续根线程已在用户安装的壹伴 12.3.14 中完成一次性 Markdown 应用、保存、重载读回与删除/absence 复核，并在 InkForge 当前 dirty source 中完成能力映射，见 `yiban-wechat-editor-runtime.md` 与 `yiban-applied-draft-receipt.json`。这些能力不是 `main`/release 事实；实施前仍须绑定包含它们的 commit。

#### 已覆盖 / 拒绝重复矩阵

| 公开资料启示 | 当前 dirty-source 覆盖 | 决策 |
| --- | --- | --- |
| 手工交接与 proof 状态 | ExportModal/Publish Center preflight、copy feedback、StyleProof/external gates | 不再列为 P0/P1 功能 |
| 语义快捷样式、字体/字号/主题色、SVG slots | typed catalog、theme presets、option SVG modules 与现有控件 | 不复制供应商模板，不建第二主题系统 |
| HTML/CSS/SVG 诊断 | source-owned 模块、兼容性 lint、quality report、DOMPurify/publish-copy sanitizer 与测试链 | 不把 `checkWechatSafe` 单独称为 sanitizer，不重建诊断框架 |
| 官方草稿与 add/read/delete/absence receipt | dev HEAD 有 draft creation；受限 live round-trip 仅 dirty source 存在 | 不重建；dirty-only 能力落定前禁止开工 |

#### 仍成立的优先级

| 优先级 | 候选 | 用户结果 | 最小复用点 | 风险/不复制 | 可观察验收与回滚 |
| --- | --- | --- | --- | --- | --- |
| P0 | 现有富复制 + 官方草稿的 exact-corpus PC/手机/封面证据 | 确认真实微信而非本地模拟的保留/降级行为 | 复用当前 canonical renderer、clipboard preparation、draft API、StyleProof gates | 不发布；不把 preview 或插件目录 DOM升级为微信证明 | PC editor readback、phone/Dark Mode、cover receipt 分开记录；测试草稿删除并确认 absence |
| P1 | 同 corpus 的公式视觉分叉 | 决定继续 TeX fallback，还是采用受控 SVG/image fallback | 复用当前 KaTeX/微信后处理与 corpus | mdnice 的 MathJax SVG 只是参考，不直接复制 | 三种产物在 PC 保存与手机端对比；证据不足保持默认 |
| P1 | 安全导入需求验证（先证明真实痛点，不先写导入器） | 判断 URL/HTML 导入是否比现有流程更有价值 | 先审计现有文章模型、sanitizer、图片处理 | 来源/许可/远程图片/作者工具 DOM 风险高 | 只有真实用户样本显示缺口后再设计；无证据则删除候选 |
| Conditional | `mp.weixin.qq.com`-only selection-insert companion | 仅在现有 channel 失败或明确要求时减少切换 | 复用唯一 renderer；只增加最小 host adapter | 可能 autosave；私有 API、MAIN-world bridge、扩展维护与正文边界 | companion-owned nonce subtree 摘要读回；不整篇 replace；宿主不识别即 fail closed |
| Deferred | 多账号运营、粉丝分析、群发/模板消息、变现 | 与本次渲染目标弱相关 | 无 | 会把 InkForge 变成账号运营 SaaS，扩大权限和合规面 | 保持 out of scope |

#### 最小首批建议

首批只补证据：使用当前富复制/官方草稿通道完成同一 repo-owned artifact 的 PC editor、phone/Dark Mode、cover 与删除/absence 闭环。companion 不进入首批；只有现有通道出现可复现失败，或用户明确要求编辑器内 selection insert 时再重开设计。

### 11. 明确“不应照搬”

1. 不做需要读取任意网页/公众号后台内容的侵入式扩展注入，除非未来有单独批准、最小权限设计和完整安全评审。
2. 不复制壹伴/美编模板 HTML、品牌视觉、类名、素材 URL、付费资产或采集库。
3. 不提供“原封不动采集任意公众号排版”的默认承诺；导入必须有来源、许可、净化、图片处理和残留报告。
4. 不照搬官网提供的 CRX 拖拽和浏览器开发者模式安装流程；这会绕开商店更新/审查边界。
5. 不把多账号切换、粉丝数据、定时群发、模板/订阅消息和变现混入渲染首批范围。
6. 不把编辑器内永久链接或暗色模拟当作微信公开页、手机或发布证明。
7. 不新增模板 DSL、第二 renderer 或独立主题库；当前 typed catalog、preset、decorator、SVG module 和 export sanitizer 已是更合适的所有权边界。

### 12. Exact gates：若要继续验证，必须停在这些门槛

| Gate | Exact URL / action | 为什么停止 |
| --- | --- | --- |
| 壹伴 Chrome 安装权限 | https://chromewebstore.google.com/detail/%E5%A3%B9%E4%BC%B4-%C2%B7-%E5%B0%8F%E6%8F%92%E4%BB%B6/ibefaeehajgcpooopoegkifhgecigeeg → Add to Chrome | 点击后才出现精确权限确认；属于扩展安装 |
| 美编 Chrome 安装权限 | https://chromewebstore.google.com/detail/%E7%BE%8E%E7%BC%96%E5%8A%A9%E6%89%8B/fjohbkcfdceimhfkdcbldnjgdjndnbeg → Add to Chrome | 同上 |
| 壹伴 Edge 安装 | https://microsoftedge.microsoft.com/addons/detail/opgmkccdkhgbenppbopeekfdlancpdgf?hl=zh-CN → 获取 | 动态商店详情/权限需要浏览器交互并安装 |
| 美编 Edge 安装 | https://microsoftedge.microsoft.com/addons/detail/%E7%BE%8E%E7%BC%96%E5%8A%A9%E6%89%8B/aiddcfpabhgbhcgggaajoeaonoeadlob?hl=zh-CN → 获取 | 同上 |
| 壹伴登录/绑定 | https://yiban.io/ 或扩展 Y 图标 → 登录/注册 → 添加账号 → 微信授权页 → 管理员扫码 | 账号、扫码和公众号授权均由用户亲自完成 |
| 美编登录/绑定 | https://www.mbian.com/login → 插件登录 → 添加公众号/跳转微信平台 | 需要账号状态；具体角色/权限需实际授权页确认 |
| SVG 真实产物验证 | 在微信编辑页找到一个明确无可见 VIP 标记且实际可用的 SVG authoring 入口，再检查 applied DOM、保存读回与手机读回 | 当前 50 个素材卡全有可见 VIP 标记；唯一无可见 VIP 标记的生成器入口两次真实点击后均无可观察反应，不得绕过付费门槛 |

本子线程的公开资料研究没有触碰浏览器。后续根线程复用当前唯一 CloakBrowser 会话完成了用户明确授权的一次性草稿闭环；没有关闭旧标签页，没有打开或修改旧草稿。

## Related Specs

- .trellis/workflow.md:7-10, 352-379：研究应持久化，规划与实现分离。
- .trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/prd.md:16-29, 31-45：要求区分证据/声明/推断，禁止 mock、复制资产和未批准登录/安装/代码修改。
- .trellis/spec/frontend/index.md:23-25：视觉变体、WeChat-safe SVG 与旗舰元素目录是现行规范。
- .trellis/spec/frontend/wechat-svg-modules.md:4187-4252：只有点击后应用 DOM 才是 applied evidence；营销页只能作 taxonomy evidence；禁止复制第三方 authoring DOM。
- .trellis/spec/frontend/wechat-svg-modules.md:4371-4422：市场研究只允许类别、聚合结构和可复用规则，必须重写为 InkForge-owned。
- .trellis/spec/frontend/wechat-svg-modules.md:4434-4489：市场 capability metadata 不能提升证明状态；交互 SVG/H5 在同产物手机/平台证明前保持 blocked 或 external-handoff。
- .trellis/spec/frontend/wechat-svg-modules.md:14571-14664：安全 SVG 富复制净化与全部模块覆盖只证明本地产物，不证明微信手机、同步或发布。
- .trellis/spec/frontend/wechat-svg-modules.md:14936-15025：现有 ExportModal 已有默认关闭的语义 SVG 插槽，市场学习不能复制供应商源码。
- .trellis/spec/frontend/wechat-svg-modules.md:17191-17242：typed rendering catalog 是唯一描述边界，不存模板 HTML/CSS，也不建立第二渲染器。

## Caveats / Not Found

1. **本公开资料子线程没有安装扩展、登录或绑定公众号。** 后续根线程复用了用户已安装/已登录的壹伴，取得 Markdown applied DOM、显式保存、重载读回与删除/absence 证据；仍没有剪贴板 payload、免费 SVG applied DOM、手机预览、暗色模式、封面或发布证据。
2. **美编仍未获得 exact manifest/host permissions。** 壹伴 12.3.14 的 CRX/Manifest 已由根线程验证；其 exact 权限和编辑器 adapter 见 `yiban-wechat-editor-runtime.md`。美编当前仍停在公开资料边界。
3. **未找到两产品公开的 HTML/CSS/SVG 允许集或兼容矩阵。** 壹伴有 SVG/HTML/H5 产品文案，美编有源码入口说明，但都不足以推导 sanitizer 或微信支持。
4. **未找到美编独立直发 API 的公开一手证据。** 帮助中的草稿同步和定时发送取消都位于微信后台工作流。
5. **Edge 商店正文是动态内容。** 本次静态读取只验证官方链接、扩展 ID 与 HTML title；没有声称 Edge 版本、用户数或权限。
6. **美编隐私公开材料粒度不足。** Chrome 商店给出两类数据处理；官网隐私链接回首页，公开用户协议只有概括条款。
7. **壹伴隐私披露存在时间/口径差异。** PDF 文件名像 2021-09-14 快照，但正文未显示明确修订日期；不能用旧 PDF 单独描述 2026 运行时，也不能忽略它与当前商店声明的差异。
8. 用户数、评分、版本和静态 chunk hash 都会变化；引用值只代表 2026-08-20 的公开页面快照。
