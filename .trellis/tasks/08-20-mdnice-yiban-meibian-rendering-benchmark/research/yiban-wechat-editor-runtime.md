# 壹伴 12.3.14：微信公众号编辑页运行态与本地扩展结构证据

- 采集日期：2026-08-20（Asia/Shanghai）
- 目标：在用户已经打开的微信公众号图文编辑页内，先只读观察壹伴的真实集成、Markdown、模板与 SVG 工作流，再按用户后续明确授权，用一个任务自有临时草稿完成最小应用/保存/读回/删除闭环，并与本机已安装 CRX 的静态结构交叉验证。
- 浏览器边界：复用本项目默认的唯一 CloakBrowser 会话；没有启动第二个浏览器，没有读取 Cookie、Token、二维码、账号资料或私有 API 响应。
- 编辑边界：第一阶段只切换 `MD`、`排版`、`SVG`、`热门`导航；第二阶段只操作标题含“临时验证/请勿发布”的任务自有草稿，导入 repo-owned Markdown、使用首个一键排版方案、显式保存、重载读回，最后删除并刷新确认不存在。没有打开或修改旧草稿，没有调用微信草稿预览、群发或发表，也没有点击任何 VIP 素材；一次点击“默认模板”打开了壹伴自带的样例手机预览（不是测试正文），随即关闭且未持久化截图。
- 可复核索引：`inspect_yiban_crx.py` 对用户保留的原始 CRX 生成 `yiban-crx-12.3.14-receipt.json`；只读浏览器脱敏计数保存在 `yiban-editor-runtime-receipt.json`；一次性写入闭环保存在 `yiban-applied-draft-receipt.json`。三份 receipt 均不含第三方源码、页面正文、私有 URL、Token 或截图。

## 1. 结论

1. **壹伴的成熟点是“微信编辑器内的写入适配层”，不是独立渲染器。** 本轮静态追踪到的 template、Markdown 与 dynamic-material insert/replace 路径收口到 `Editor.insertHtml()` / `Editor.setContent()`；它同时包含 legacy UEditor 和当前 ProseMirror/微信 `__MP_Editor_JSAPI__` 分支。独立的 copy helper 不属于这条正文写入主路径。
2. **UI 贴合微信靠的是就地增强。** 左侧排版面板直接复用微信的 `#js_mp_sidemenu` 区域，工具面使用 `mpa-*` 命名与大量 open Shadow DOM 隔离；正文仍是微信原生编辑器，保存、预览、发表仍由微信按钮完成。
3. **Markdown 是“语义角色映射到 inline HTML”，但真正入口比面板卡片多一步。** 文件导入后标题 root 变化；所跟踪正文序列化未变且仍显示 Markdown 标记。右下“一键排版”会打开独立的微信 `articlestruct` 页面，选择方案并“使用此排版”后，正文才出现 `data-mpa-md-root=1`、`data-mpa-md-key=8`。随后点击无可见 VIP 标记的“默认模板”只打开壹伴样例手机预览，正文序列化没有变化；因此不能把这次点击写成模板已应用。
4. **SVG 面板展示的不是静态图标库，而是远程 authoring + 可交互 SVG 素材目录。** 运行态目录含轮播、滑动、展开、翻页、显示、音频和滚动等分类；当前目录 DOM 大量使用 SVG/SMIL/`foreignObject`。静态追踪显示素材卡“开始制作”连接 `yiban.io` H5 iframe，返回的 `materialHtml` 再进入本轮追踪到的编辑器适配路径；本轮没有点击任何 VIP 素材卡，唯一无 VIP 标记的生成器入口点击后也没有出现可观察的 H5 authoring 流程。
5. **保存成功不等于结构原样保留。** 应用态正文的序列化 HTML 长度为 `2767`，含 `13` 个 `section`、`1` 个 `ul`、`2` 个 `li`、`data-mpa-md-root=1`、`data-mpa-md-key=8`；保存并重载后序列化 HTML 长度变为 `1642`，含 `6` 个 `section`、`2` 个 `h1`、同样的 `ul/li`，且所有 `data-mpa-md-*` 被清除。可见标题和列表保留，但引用、粗体和行内代码退回带 Markdown 标记的普通文本。因此目录预览或应用态 DOM 都不能替代保存读回，更不能替代手机/暗色模式证明。
6. **本轮没有可验证的免费 SVG 闭环。** 运行态 `50` 个 `.material-item-svg` 卡片全部带可见 `vip-icon`；顶部“SVG生成器”没有可见 VIP 标记，但两次真实点击均没有出现可观察的页面、弹窗或正文变化，所以没有上传图片，也没有伪称已插入免费 SVG。
7. **InkForge 当前 dirty source 已有单一 renderer、canonical native result、富剪贴板、预检、历史、样式参数、官方草稿 API 与受限往返 receipt；其中若干能力只存在于 dev HEAD 或 dirty worktree。** 因此不应再实现壹伴式素材市场、第二主题系统或重复 receipt。壹伴研究只识别出一个新增的编辑器内 channel 候选；当前优先级仍是先用现有通道补 PC/手机/封面真实证据，而不是自动建设 companion。

## 2. 运行态 UI 与布局

### 2.1 可见信息架构

编辑页内实际出现：

- 顶层工具：`排版 / MD / 写作 / 配图 / 工具`；
- 排版分类：`最新 / 热门 / 模板 / 样式 / SVG / 背景 / 行业 / 我的 / 更多`；
- 右侧功能面：`Chat / 云笔记 / 账号 / 互动 / 通知 / 设置`；
- 独立能力根：文章/图片/文字/视频采集、编辑增强、标题助手、智能写作、发布前违规检测、模板面板、自动标签、定时发送、文章预览、语音输入、通知等。

这说明壹伴把能力拆成多个页面插件；本轮追踪到的 template/Markdown/dynamic-material 正文写入路径收口到共享 editor adapter。

### 2.2 与微信原生编辑器的对齐方式

当前窗口为 `1361 × 790` CSS px，DPR `1.5`。只记录布局，不保存页面截图或正文：

- 微信原生顶部工具栏 `#js_editor_toolbarbox`：fixed，宽约 `1355px`，`z-index:1100`；
- 壹伴排版区所在微信原生侧栏 `#js_mp_sidemenu`：fixed，宽约 `434px`，`z-index:1000`；
- 壹伴 `.template-panel.material`：absolute，约 `434 × 665px`，`z-index:800`，嵌在上述原生侧栏；
- 微信正文 `#js_editor`：约从 `x=559` 开始、宽 `578px`；壹伴未用自己的正文编辑器覆盖它；
- 右侧功能面采用 Shadow DOM，关闭时整体停在视口右侧，打开时才以 fixed panel 进入。

因此它不是在整页上叠一张“假微信编辑器”，而是复用微信已有栏位、工具栏和正文 DOM，再用固定前缀/Shadow DOM 降低样式冲突。

### 2.3 Shadow DOM 与插件隔离

当前页检测到 `26` 个 open Shadow Root。可识别宿主包括：

- `mpa-plugin-root-container#mpa-rootsc-article-gatherer`
- `...-image-gatherer`
- `...-edit-enhance`
- `...-page-clipper`
- `...-text-gatherer`
- `...-video-gatherer`
- `...-title-assistant`
- `...-intelligent-writing`
- `...-before-posting-violation-detection`
- `...-template-panel`
- `...-automatic-tagging`
- `...-scheduled-send`
- `...-wx-article-preview-dialog`
- `...-voice-input`
- `...-side-function-panel`
- notifier / notification-manager

Shadow DOM 主要隔离插件 chrome；本轮追踪到的文章 HTML 写入路径进入微信编辑器，并由共享 adapter 处理 selection、history 和 content change。

## 3. MD 面板：真实行为与静态调用链

### 3.1 运行态

只读打开 `MD` 后先观察到：

- `Markdown排版：已关闭`，有独立开关；后续一次性测试中启用后，开关本身没有改变既有正文序列化；
- 说明为通过工具栏和快捷键进行全文格式标记；
- `MD模板库` 分为 `套装模板 / 单样式`；
- 当前目录展示多套命名模板；后续测试只点击了无 VIP 标记的“默认模板”。

后续一次性测试补充了真实入口差异：

1. 导入 `yiban-test-corpus.md` 后标题 root 发生变化；所跟踪正文序列化与导入前相同，且仍显示 Markdown 标记；
2. 左侧绿色 `auto-typesetting-btn` 图片入口收到真实 click 后没有产生 DOM、弹窗或网络变化；
3. 右下 `.ailayout-btn_wrp` 才打开微信 `articlestruct` 一键排版页；首个方案能把标题、列表、引用、粗体和行内代码显示为排版预览；
4. “使用此排版”返回一个新的编辑页实例，稳定后正文出现 `data-mpa-md-root=1` 与 `data-mpa-md-key=8`；
5. 再点击“默认模板”只打开壹伴样例手机预览，正文序列化结果不变；该动作不是微信草稿预览，也不能作为模板已应用证据。

### 3.2 语义标记与默认结构

本地 `mpa-editor.js` 的 Markdown manager 单次静态追踪观察到以下标记；对应 bundle 哈希、出现次数和 byte offset 可由 receipt 复核：

- `data-mpa-apply-md`
- `data-mpa-md-single-style`
- `data-mpa-md-key`
- `data-mpa-md-content`
- `data-mpa-md-root`

默认 style map 只覆盖有限角色：`heading-1/2/3`、`bullet-list`、`ordered-list`、`bold`、`strikethrough`、`blockquote`、`code-block`、`text`、`rootStyle` 与 `common`。输出以 `section`、`ul/ol/li`、`pre/code` 和 inline style 为主。

快捷输入同样以语义为核心：`# / ## / ###`、`-`、`1.`、`**文本**`、`> `、代码块、删除线和分割线。应用模板时，manager：

1. 克隆当前文章；
2. 把现有内容归一为文本、Markdown key、列表、表格、引用、代码块、图片和特殊块；
3. 逐角色套用 style map；
4. 保留图片/表格/微信特殊节点的专门路径；
5. 用 `data-mpa-md-root` 包住结果、写入 article UUID；
6. 通过共享 `setContent()` 一次替换并保存 style config。

静态代码还显示 Markdown 模式会生成 article UUID，并通过壹伴 API 读写 `articleStyleConfig`。运行态已启用开关并完成一次应用，但没有读取任何私有 API 请求或响应；因此该模式仍不能被描述为完全离线的本地格式化器。

这与 InkForge 的启示不是“复制它的模板 HTML”，而是继续让 Markdown AST/现有语义槽直接驱动当前 renderer；不要退回对纯富文本做脆弱的文本猜测。

## 4. 微信编辑器写入适配层

### 4.1 当前页面能力探测

当前微信页同时观察到：

- `window.__MP_Editor_JSAPI__`；本次枚举到的 own enumerable keys 为 `invoke` 与 `on`，不据此声称完整 API 只有这两个键；
- 两个 `.ProseMirror` 容器；
- legacy `window.UE` 对象；
- `#js_editor_toolbarbox` 与 `#js_mp_sidemenu`。

这解释了壹伴为何保留两条实现分支：微信后台编辑器正在迭代，插件必须适配不同编辑器世代，而不能把某一层 DOM 当永久 API。

### 4.2 本轮追踪到的 adapter 路径

单次静态代码追踪得到的关键路径：

```text
traced template / markdown / dynamic-material routes
  -> TemplateManager.insert(...) or MarkdownManager.applyTemplate(...)
  -> Editor.insertHtml(...) / Editor.setContent(...)
     -> saveHistory()
     -> waitUntilReady()
     -> legacy UEditor: execCommand("inserthtml") / ue.setContent(...)
     -> current editor: __MP_Editor_JSAPI__.invoke({
          apiName: "mp_editor_insert_html" | "mp_editor_set_content"
        })
     -> success: restore scroll if needed, resolve marked nodes, saveHistory()
     -> error: restore scroll and reject
```

该次追踪还观察到：为处理 ProseMirror 写入后节点引用失效，插入前会为顶层节点生成 `data-mpa-action-id` 或临时 class，成功后再从当前正文中找回实际节点；图片有透明背景 shim；整篇替换有 table `colgroup` 清理和滚动冻结/恢复。

`yiban-crx-12.3.14-receipt.json` 独立记录了 CRX、选定 bundle 哈希，以及 `__MP_Editor_JSAPI__`、`mp_editor_insert_html`、`mp_editor_set_content` 等标识的 byte offset；调用顺序本身仍需对该哈希对应的原始 CRX 做代码审阅，receipt 不复制或节选供应商源码。

壹伴还在编辑器、工具栏和文章切换区域挂 MutationObserver/contentchange/selectionchange 监听。这些都是“适应宿主变化”的维护成本，也说明扩展桥必须与本地 renderer 解耦并可独立禁用。

### 4.3 本轮追踪到的模板与 SVG 路径

- 普通模板通过 `TemplateManager.insert()` 处理 selection/空文档/模板匹配后调用 `editor.insertHtml()`；
- 整套模板若可能清空当前文章，会先显示明确确认对话框；
- 动态素材把返回的 `materialHtml` 标为 `data-mpa-dynamic-material`，记录 vendor/source 元数据后，仍调用同一个 insert/replace 路径；
- 样式复制是独立的小功能：一次性监听 `copy`，写 `text/html`，调用 `execCommand('copy')`。这不是正文交付的主路径。

## 5. SVG 面板与远程 authoring

### 5.1 运行态目录

只读打开 `SVG` 分类后观察到：

- 顶部 `SVG生成器`，说明为上传图片一键生成 SVG；
- 分类包括图片滑动、轮播、展开、翻页、点击显示、答题互动、信封、播放音频、文字滚动和创意玩法；
- 每个卡片分开提供“开始制作”和“样式说明”；后续一次性测试扫描到 `50` 个 `.material-item-svg` 卡片，全部带可见 `vip-icon`，因此没有点击任何素材卡。

顶部“SVG生成器”卡没有可见 VIP 标记。对生成器“开始制作”分别做了一次 Playwright 真实 click 和一次 Windows UIA 物理 click，均未出现可观察的页面、弹窗或正文序列化变化。为避免绕过付费边界，仓库自有候选图片没有上传，本轮免费 SVG 插入结论保持 `blocked`。

只在壹伴 `.template-panel.material` 内取数（不扫描微信正文）；该目录 DOM 包含插件 icon 与素材预览，不能等同最终文章 DOM：

- `543` 个 SVG 根；
- `202` 个 `foreignObject`；
- `237` 个 `animateTransform`、`127` 个 `animate`、`25` 个 `set`；
- `60` 个 SVG 含交互/时序相关 attribute；
- 大量 `image`、`g`、`path`、`use`、`clipPath`、`data-mpa-image-*` 与动态素材标记。

这证明壹伴素材目录大量依赖 SVG/SMIL 与编辑元数据，但不能证明这些节点会全部进入文章或被微信保存/手机端保留。

### 5.2 H5 iframe 组合

运行态只记录了去除 query 的公开 resource path：

- `https://yiban.io/h5/svg`
- `https://yiban.io/h5/one_click_svg`
- `https://yiban.io/h5/card_workspace`

静态追踪观察到 SVG editor iframe 发送消息时使用配置的 `targetOrigin`，接收时检查 `event.origin`；所审阅片段没有建立 `event.source` 校验证据，因此不能称为完整的双向来源绑定。返回 `materialHtml` 后会触发 `intertDynamicMaterial`，再进入本轮追踪到的 TemplateManager 路径。也就是说壹伴把复杂 authoring 放在远程 H5 中，扩展负责宿主集成与写入。

InkForge 不应照搬这条远程 token/VIP/materialHtml 通道；当前 dirty source 的 27 个 source-owned SVG 模块、兼容性 lint、DOMPurify/publish-copy sanitizer 与注册表测试链是更小、更可控的边界。`checkWechatSafe` 只是兼容性 lint，不单独充当 sanitizer。

## 6. 本机 CRX 静态证据

### 6.1 可复核标识

样本来自用户已安装并保留的 CRX；官方公开下载入口为 `https://yiban.io/download`，但本研究不声称该 landing page 当前下载字节必然与本机样本相同。

可用 Python 标准库重放脱敏索引（原始 CRX 仍由用户保留在本机，receipt 不记录其完整路径）：

```bash
CRX="$(python -c 'import os; from pathlib import Path; print(Path(os.environ["USERPROFILE"]) / "Downloads" / "壹伴小插件12.3.14.crx")')"
python .trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/research/inspect_yiban_crx.py \
  "$CRX" \
  --output .trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/research/yiban-crx-12.3.14-receipt.json
```

脚本直接解析 CRX3 header/ZIP，输出 Manifest 选定字段、归档项数、选定 bundle 大小/哈希和短模式的计数/byte offset；不解包到仓库，不输出源码片段。该命令在本轮 exit `0`，生成的 JSON 又经 `python -m json.tool` 验证。

- 扩展 ID：`ibefaeehajgcpooopoegkifhgecigeeg`
- CRX：CRX3，版本 `12.3.14`，约 11.6 MB，`2162` 个归档项
- CRX SHA-256：`2e468b31399e78121d92ccc71ccdd8bbb4412bd9f8dd5922578b15d7e5deda77`
- Manifest V3，minimum Chrome `95`

主要文件：

| 文件 | Bytes | SHA-256 |
|---|---:|---|
| `content-script.js` | 7,500,217 | `3785e40017d80c9f4bfd355d160112f3f2b44560501dff26b95689dec29a495b` |
| `mpa-editor.js` | 2,633,010 | `4bd599b7841cc6ca8310eb9a1e19021cc05b249a6004a447a38e849ebdbfb61d` |
| `editor-bootstrap.js` | 587,059 | `b4347602964edda9eaef1a50ca64b6a9244a04b5b63e06ddc2e1c52850621730` |
| `background-script.js` | 373,127 | `ed9ed8e8c14e19c95663e286a71f048937e5b71876d9cacca4ff9fea063ef812` |
| `data-poster.js` | 46,224 | `220715a2f44c209f0b85522f0192667098679e12d215e8c1f48023bb0392a791` |

此前临时解包只位于 Codex sandbox temp，已清理；未把 CRX、源码、HAR 或页面快照复制进仓库。仓库仅保存上述标准库脚本和 source-free receipt。

### 6.2 权限与注入面

Manifest 权限包括：

- `sidePanel`、`tabs`、`storage`、`unlimitedStorage`、`cookies`、`notifications`、`contextMenus`
- `webRequest`、`proxy`、`alarms`
- `declarativeNetRequestWithHostAccess`、`declarativeNetRequestFeedback`
- `host_permissions: ["<all_urls>"]`

主 content script 在 `document_start` 注入，`all_frames:true`，匹配微信页和 `*://*/*`；另有微信专用 html2canvas/JSZip/Jimp，以及 appmsg 页的 dark-mode、Mammoth、docx-preview。Web-accessible resources 包括模板、assets、`mpa-editor.js`、`editor-bootstrap.js` 与 `data-poster.js`。

**这套权限规模服务于壹伴完整运营套件，不是 InkForge 最小微信交付桥的合理默认。** 如果以后获批做 companion，默认只允许 `https://mp.weixin.qq.com/*`，不请求 cookies/proxy/webRequest，不读取账号；正文 readback 只能定位本次 nonce 标记的自有子树并在页面内生成摘要。任何 insert 都必须按“宿主可能自动保存”建模，不能承诺无持久化副作用。

## 7. 只读基线与一次性写入闭环

### 7.1 只读基线

在打开 MD、返回排版、打开 SVG、返回热门的过程中，对三处 `contenteditable=true` 的序列化 DOM 做了三次会话内采样；采样时未观察到变化。仓库只记录 `serialized_dom_unchanged=true`、采样范围和限制，见 `yiban-editor-runtime-receipt.json`。这不能证明 selection、editor history、dirty/autosave 或其他模型状态未变化。

### 7.2 任务自有草稿的 applied/save/readback

用户随后明确允许新建一次性测试草稿。测试只使用 `yiban-test-corpus.md`，标题唯一标记“临时验证/请勿发布”；没有打开旧草稿，也没有调用微信草稿/发送到手机预览、发表或群发。期间打开过一次壹伴模板样例手机预览，但它不是测试正文、不是微信读回，也未被用作兼容证据。

| 阶段 | 正文结构摘要 | SHA-256 | 结论 |
|---|---|---|---|
| 导入前 / 仅启用 MD | 序列化 HTML 长度 `893`；`12 section`；无 `data-mpa-md-*` | `7005370a…fd898a` | 开关本身不改正文 |
| 文件导入后 | 与上行正文完全相同 | `7005370a…fd898a` | 导入替换标题，但正文仍是原始 Markdown 文本 |
| 一键排版应用稳定后 | 序列化 HTML 长度 `2767`；`13 section`；`1 ul / 2 li`；`md-root=1 / md-key=8` | `277af811…080ec` | 真正形成壹伴 Markdown 语义结构 |
| 显式保存后 | 与应用稳定态相同，页面出现“已保存” | `277af811…080ec` | 保存动作已完成，但仍只是当前编辑实例 |
| 重载读回 | 序列化 HTML 长度 `1642`；`6 section / 2 h1 / 1 ul / 2 li`；无 `data-mpa-md-*` | `eef1f38a…5a96` | 微信保存读回做了宿主归一化 |

重载后的可见结果并非全量保真：标题和无序列表仍有结构/样式；引用前缀 `>`、粗体 `**…**` 和行内代码反引号重新作为普通文本出现。也就是说，壹伴应用态看起来正确仍不足以证明保存后保真，InkForge 的验收必须把应用态与宿主读回拆开。

清理同样闭环：草稿列表中唯一匹配项为 `1`，从该卡片的垃圾桶入口触发唯一可见删除确认，删除后匹配项为 `0`，立即刷新及等待 `15s` 后再次刷新仍均为 `0`。完整脱敏计数见 `yiban-applied-draft-receipt.json`。

## 8. 对 InkForge 的收敛建议

### 当前 dirty source 已有；只有绑定到包含这些能力的 commit 后才可直接复用

- 单一 Markdown → WeChat renderer 与同源 canonical preview/native result；
- DOMPurify + Juice + 平台后处理 + 安全 SVG；
- 主题 preset、字号、字体、主题色与 SVG semantic slots；
- quality/preflight/style-proof/外部 gate 表达；
- 以 canonical result 为源、经 clipboard channel preparation 后写入的富复制、失败闭合与导出历史；
- 官方微信草稿创建，以及脱敏的 add/read/delete/absence 受限往返 receipt。

### 优先补证据，而不是先建新 channel

1. **P0：现有通道 exact-corpus 闭环**：用同一 repo-owned corpus 分别走富复制和官方草稿通道，采集 PC editor readback、手机/Dark Mode、封面缩略图与删除/absence 证据。companion 本身不能关闭手机或封面门禁。
2. **P1：公式视觉分叉实测**：对同一公式 corpus 比较当前 TeX fallback、可控 SVG/image fallback 在微信保存后与手机端的结果，证据不足不改默认输出。
3. **Conditional：可选 companion bridge**：仅在现有 channel 出现可复现失败，或用户明确需要“编辑器内插入”时进入设计。

若 conditional companion 被单独批准，首版契约必须同时满足：

- 只提供显式用户手势触发的 **selection insert**；不提供整篇 `replace`。任何写入都视为可能触发宿主 autosave。
- 插入节点带本次随机 nonce；readback 只能在 MAIN world 内定位 companion-owned 子树并计算 digest/节点计数/净化差异，禁止把原始 HTML、相邻正文或整篇正文带回 isolated world/InkForge。
- 私有 `__MP_Editor_JSAPI__` 需要受控 MAIN-world bridge；消息必须校验 schema、origin、source、nonce 与操作类型，宿主 API 缺失或 generation 不识别时 fail closed，不退化成散落的 `innerHTML` 写入。
- 分开记录三个合同：`canonical renderer result hash`、`channel payload hash`、`host readback canonical hash`；明确实体解码、属性排序、空白/浏览器规范化等 canonicalization，绝不把它们称为字节级同一产物。
- 权限仅 `mp.weixin.qq.com`，无账号托管、素材市场、远程模板、cookies/proxy/webRequest；不自动保存、预览、群发或发布。

### 不做

- 不建壹伴式运营 SaaS、账号中心、云笔记、素材采集、群发、粉丝数据或 AI 面板；
- 不复制壹伴模板 HTML、SVG、`data-mpa-*` class/attribute、CDN 资产或 H5 authoring 通道；
- 不把 `<all_urls>`、cookies、proxy、webRequest 权限带进 InkForge；
- 不增加第二 renderer、第二主题 DSL、第二 sanitizer 或重复 receipt/preflight；
- 不在现有通道尚未完成真实证据闭环前，把 companion 作为首批实现；
- 不把本轮 SVG 目录观察写成微信手机兼容结论。

## 9. 仍未验证

- 免费 SVG 的 authoring、插入和保存读回；当前 `50` 个素材卡均有可见 VIP 标记，唯一无可见 VIP 标记的生成器入口两次真实点击后均无可观察反应；
- 微信对 SVG 的 SMIL、`foreignObject`、外链图片和相关 inline style 的保存清洗；
- 手机预览、Dark Mode、封面缩略图与发布页；
- 壹伴云端 API 的数据范围、传输内容或账号行为；本轮刻意没有读取这些响应；
- 美编运行态；用户本轮要求先看壹伴，故保持 deferred。
