# 知乎渲染规则手册

> 2026-06 收口规则：知乎输出以 clean Markdown 为核心。InkForge 不把微信公众号 HTML/SVG 装饰带入知乎，也不为了视觉丰富度牺牲 Markdown 可编辑性。无法稳定保留的公式、图表、SVG、复杂卡片应降级为图片或文字说明，并在发布前预览确认。

## 一、输出合同

| 输出类型 | 用途 | 要求 |
| --- | --- | --- |
| Clean Markdown | 默认专栏/回答正文 | 保留标准 Markdown 结构，移除微信 HTML/SVG/CSS |
| 图片 fallback | Mermaid、复杂图表、复杂公式、微信卡片降级 | 图片可访问，alt 文本明确 |
| 发布前提示 | 公式、图片、表格、平台 HTML 支持不确定时 | 明确写入 quality report，不记为已发布成功 |

Executable choice source: `inkforge/src/services/export/style-catalog.ts` mirrors the user-facing
Zhihu style choices. UI/export-report code should read `getPlatformStyleChoices('zhihu')`
instead of duplicating this document's matrix.

### 1.1 图片 Host 依赖

- 可发布 Markdown 图片必须使用稳定、公开、HTTPS 的图片地址，或由真实知乎/目标发布入口上传后返回的平台图床地址。
- 禁止把本地路径、`blob:`、`data:`、私网/localhost 地址、临时预览 URL、微信专用 CDN 依赖直接写成最终成功产物。
- 如果图片上传、URL 重写或可访问性检查不可用，发布状态必须是 `blocked` / `unavailable`，不能报告为成功。
- 所有生成图片、fallback 图片、公式图片、表格图片、图表图片都必须有非空 alt 文本。
- 当图片替代公式、表格或图表时，图片附近必须保留 caption 或文本 fallback，确保语义不因 rasterization 丢失。

### 1.2 图片 Artifact Manifest 本地预检

2026-06-09 起，知乎图片 fallback 不再只靠文档约束。导出层提供
`ZhihuImageArtifactManifest` 与 `validateZhihuImageArtifactManifest()` 作为 runtime
preflight：

- 适用对象：正文图片、公式图片、图表图片、复杂表格图片、封面图片，以及微信 SVG/卡片降级后的图片 fallback。
- `convertToNativeFormat(markdown, 'zhihu', { zhihuImageArtifactManifest })` 可在
  `NativeExportResult.artifacts.zhihuImageArtifactManifest` 中回传 manifest，并把 manifest 问题合并进
  `qualityReport.issues`。
- 该字段只证明本地/平台 host preflight，不证明知乎账号上传、编辑器预览、同步或发布成功。
- `hostStatus='platform-hosted'` 时必须有 `uploaded:true` 作为真实上传证明；否则输出
  `zhihu-image-manifest-upload-missing`。
- `requirePlatformUpload:true` 会强制所有图片使用 `platform-hosted`，不能用普通 public HTTPS
  替代平台图床证明。
- 未上传到平台前，本地 fallback 必须证明 `exists:true` 与正数 `bytes`；缺失即阻断。
- `markdownReferences` 或 final Markdown 中出现的每个图片 URL 必须与 manifest 的 `finalSrc`
  对齐，`referencedByMarkdown` 不得与最终 Markdown 引用状态冲突。
- 允许格式默认是 JPG/JPEG/PNG/GIF；如平台规则变化，应通过 manifest `allowedFormats` 显式收窄或放宽，并同步测试。

Issue id：

| 条件 | Issue id | 严重级别 |
| --- | --- | --- |
| manifest 无任何 artifact | `zhihu-image-manifest-empty` | error |
| `finalSrc` 缺失，或 host 是本地、`blob:`、`data:`、http、私网、微信 CDN、临时预览，或 `requirePlatformUpload` 下不是平台图床 | `zhihu-image-manifest-host-blocked` | error |
| 标记平台图床但没有 `uploaded:true` | `zhihu-image-manifest-upload-missing` | error |
| 未上传且缺少本地文件存在性证明 | `zhihu-image-manifest-missing-file` | error |
| alt 为空 | `zhihu-image-manifest-alt-missing` | error |
| 公式/图表/表格等语义图片缺少 caption 或文字 fallback | `zhihu-image-manifest-caption-missing` | error |
| 格式缺失或不在允许列表 | `zhihu-image-manifest-format-unsupported` | error |
| width/height 写成 0 或负数 | `zhihu-image-manifest-dimension-invalid` | error |
| 未上传且 bytes 缺失或非正数 | `zhihu-image-manifest-bytes-invalid` | error |
| final Markdown 图片引用与 manifest 不一致 | `zhihu-image-manifest-reference-mismatch` | error |

## 二、Markdown 支持矩阵

| 元素 | 默认策略 | 说明 |
| --- | --- | --- |
| 标题 `#` 到 `######` | 保留 | 不注入微信标题卡 |
| 段落 | 保留 | 清理多余空行 |
| 加粗/斜体/删除线 | 保留 | 标准 Markdown |
| 有序/无序列表 | 保留 | 嵌套列表保持 Markdown 结构 |
| 引用 | 保留为 `>` | 微信引用卡降级为引用 |
| 链接 | 保留 Markdown link | 外链不转微信脚注 |
| 图片 | 保留 Markdown image 或转本地/远程图片 | 不保留 inline SVG |
| 水平线 | 保留 `---` | 微信 SVG 分隔符降级 |
| 代码块 | 保留 fenced code | 声明语言以利于高亮 |
| 行内代码 | 保留 | 不转 HTML |
| 表格 | 保留 Markdown 表格 | 表格单元格内复杂 Markdown 需简化 |
| LaTeX 行内公式 | 保留 `$...$`，发布前预览 | 不保证所有入口一致 |
| LaTeX 块级公式 | 保留 `$$...$$`，发布前预览 | 预览失败时转图片 |
| Mermaid/Graphviz/DOT/PlantUML/其他图表 fence | 转图片或说明 | 知乎不应接收 raw diagram block；检测不能只覆盖 `mermaid` |
| HTML 标签 | 默认清理 | 少量平台可接受 HTML 不作为默认依赖 |
| inline CSS | 清理 | 知乎输出不依赖 style |
| 微信 block/SVG | 清理或降级 | 不允许 `data-ink-block`、`data-ink-svg` 泄漏 |

### 2.1 知乎语义风格矩阵

| Choice id | 用途 | 样式来源 | 输出 | 默认证据 | 阻断条件 |
| --- | --- | --- | --- | --- | --- |
| `zhihu-clean-column` | 专栏长文 | 标题、段落、引用、列表、代码 | clean Markdown | `unit-tested` | 残留 HTML/CSS/微信 wrapper |
| `zhihu-academic-latex-column` | 学术/技术文章 | LaTeX、脚注、表格、代码语言 | Markdown + formula preview checklist | `unit-tested` | `$` 不匹配、公式无法预览且无图片 fallback |
| `zhihu-wechat-adapted` | 微信稿迁移知乎 | 语义降级 | Markdown semantic blocks | `unit-tested` | `data-ink-*`、inline SVG、style/class 依赖 |
| `zhihu-diagram-article` | 含流程图/架构图文章 | Mermaid/Graphviz/PlantUML/Vega 图片化 | Markdown image + alt/caption | `local-browser` after raster proof | raw diagram fence、图片 host 不可发布 |
| `zhihu-complex-table-fallback` | 宽表/复杂表格 | 图片化表格 + 题注 | Markdown image + clean fallback | `local-browser` | 无 raster artifact、public host、alt/caption |
| `zhihu-data-table` | 数据表、复杂表格 | Markdown 表格或图片 fallback | Markdown table / image | `unit-tested` | 复杂 HTML table、宽表格未简化、alt/caption 缺失 |
| `zhihu-public-image-upload-checklist` | 图片上传/图床重写 | 公开 HTTPS / 平台图床 | publish checklist | `credentialed-sync` | 无真实上传响应或公开 host 证明 |

实施要求：

- “样式丰富”优先表现为结构清晰、代码语言标注、公式/图表可解释、图片 alt/caption 完整，而不是导入微信 CSS。
- 图片 fallback 必须是 public HTTPS 或真实知乎上传后的平台图床；本地、`blob:`、`data:`、私网、微信 CDN 一律不能作为最终成功产物。
- 无真实知乎账号或上传权限时，图片/发布能力标记为 `blocked` / `unavailable`，不得把本地 Markdown 通过外推成发布成功。

## 三、微信装饰降级规则

| 微信元素 | 知乎输出 |
| --- | --- |
| `flagship-h2` / `flagship-h3` | `##` / `###` |
| 阅读条 | 删除或转普通说明 |
| 金句卡 | `>` 引用块 |
| 数据卡 | Markdown 表格或分组文本 |
| 图框 | Markdown 图片 + 题注文本 |
| 文末落款 | 普通段落 |
| SVG 封面/分隔符/印章 | 删除、图片化或转 `---` |
| 互动 SVG | 图片 fallback + 说明，不输出交互 |

## 四、公式、代码、表格

### 4.1 公式

- 默认保留 `$...$` 和 `$$...$$`。
- 发布前必须在知乎编辑器或导入入口预览。
- 如果预览无法渲染，转为 PNG/JPG 公式图片，并保留 alt 文本。
- 不把 WeChat-safe SVG 公式直接带入知乎正文。

### 4.2 代码

- 保留 fenced code block。
- 语言标签应使用常见标识，如 `typescript`、`python`、`bash`、`json`。当源文档、
  frontmatter、代码高亮元数据或文件扩展名能确定语言时，转换器必须补全或规范化标签；
  无法确定时保留空标签并在 quality report 里记录。
- 不内联 highlight.js 样式。
- 超长代码行给出可读性警告。

### 4.3 表格

- 默认保留 Markdown 表格。
- 表格单元格内的列表、代码、多段落需要简化为单行文本。
- 宽表格、嵌套列表/代码/多段落单元格或跨平台预览失败的复杂表格必须简化为单行语义表格，
  或转图片 fallback 并保留 alt/caption；不得以残留 HTML table/CSS 依赖宣称成功。

### 4.4 图表与图片化内容

- `mermaid`、`graphviz`、`dot`、`plantuml`、`vega` 等 raw diagram fences 不应直接进入知乎 publishable Markdown。
- 默认策略是生成 PNG/JPG artifact，并用 alt/caption 说明原始图表含义。
- 如果缺少可运行渲染器、图片上传目标或文件访问权限，输出 `blocked` / `unavailable`，并保留原始代码块作为本地草稿证据，不声明平台通过。
- 图片 host 检测必须在 final Markdown 上执行，而不是只检查中间 artifact。

## 五、质量检测清单

| 检测项 | 规则 | 结果 |
| --- | --- | --- |
| 微信 HTML 泄漏 | 出现 `data-ink-block`、`data-ink-svg`、`mpvoice`、`mpvideo` | 阻断 |
| inline style 泄漏 | 出现 `style=` | 阻断或清理 |
| inline SVG 泄漏 | 出现 `<svg>` | 阻断；转图片 |
| HTML 依赖 | final publishable Markdown 仍出现 `<section>`、复杂 `<div>`、style/class 依赖或微信 wrapper | 阻断；清理/降级后再验收 |
| Mermaid | 出现 fenced `mermaid` | 警告；转图片 |
| Raw diagram fence | 出现 fenced `graphviz`、`dot`、`plantuml`、`vega` 等图表语言 | 警告；转图片或说明 |
| 图片 host | 出现本地路径、`blob:`、`data:`、私网/localhost、临时预览 URL 或微信专用 CDN 依赖 | 阻断/重写 |
| 图片 alt/caption | fallback 图片缺少 alt，或替代公式/表格/图表时缺少 caption/text fallback | 阻断/警告 |
| 图片 artifact manifest | host、上传证明、本地文件、bytes、格式、尺寸、引用状态不完整 | 阻断 |
| 公式括号 | `$` 数量不匹配 | 阻断 |
| 图片可访问 | 远程图片不可达或本地文件缺失 | 阻断/警告 |
| Markdown 表格 | 分隔线不合法 | 阻断 |
| 复杂表格 | 多段落/列表/代码单元格、过宽列、HTML table 依赖 | 阻断；简化或图片 fallback |
| 代码语言标签 | 源信息可推断语言但 fenced code 未标注 | 警告；自动补全/规范化 |
| 超长代码行 | 单行超过 120 字符 | 建议 |

### 5.1 InkForge 预览与发布边界

- InkForge 的本地 Zhihu preview-fidelity 可以使用 `data:image/svg+xml` 作为
  `section[data-ink-svg]` 的临时 image fallback，以便作者看到 SVG 装饰的大致视觉结果。
- 该预览 fallback 不是可发布证明。最终知乎 Markdown 仍必须阻断本地、`blob:`、`data:`、
  localhost/private、临时预览 URL、微信 CDN 或缺少 alt/caption 的图片，直到存在真实 public
  HTTPS / platform-host 上传或重写证据。
- 预览层不得透传 InkForge inline SVG；应转成 `<img data-ink-svg ...>` 或在无法生成图片时
  移除装饰并保留语义 Markdown。

## 六、市场实践映射

| 来源 | 规则 |
| --- | --- |
| doocs/md 多平台适配 | 复用 Markdown 核心，平台适配在输出层做 |
| md2zhihu / VSCode-Zhihu 类工具 | 公式、代码、表格以 Markdown/LaTeX 语义为主，必要时图片化 |
| InkForge 微信旗舰系统 | 不跨平台携带微信装饰，只携带语义 |

## 七、验收要求

- 运行 Zhihu Markdown 转换 focused tests。
- 覆盖微信装饰清理负例。
- 验证输出无 HTML/SVG/CSS 依赖。
- 覆盖 `validateZhihuImageArtifactManifest()` 的坏 manifest 与好 manifest，并验证
  `convertToNativeFormat(..., 'zhihu')` 会回传 `artifacts.zhihuImageArtifactManifest`。
- 没有真实知乎账号或发布权限时，只能报告本地 artifact 通过和平台发布 `blocked`。

## 八、Source Index

- VSCode-Zhihu marketplace reference: `https://marketplace.visualstudio.com/items?itemName=niudai.vscode-zhihu`
- VSCode-Zhihu source reference: `https://github.com/niudai/VSCode-Zhihu`
- md2zhihu source reference: `https://github.com/drmingdrmer/md2zhihu`
- WPL-s Zhihu markdown compatibility reference: `https://github.com/jks-liu/WPL-s`
- vscode-zhihu image-host changelog reference: `https://github.com/lvgithub/vscode-zhihu/blob/master/CHANGELOG.md`
- zhihu-md image/formula converter reference: `https://pypi.org/project/zhihu-md/`
