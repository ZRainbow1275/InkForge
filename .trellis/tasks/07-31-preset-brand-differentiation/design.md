# Technical Design — 同品牌多版式差异化渲染

## 1. Architecture boundary

继续使用唯一现有链：

```text
real article
  -> existing platform presetId
  -> resolveVisualVariant() / ArticleProfile
  -> buildReadingTimeHeader()
  -> generateThemeCSS() + getVisualVariantCSS()
  -> existing decorators / SVG / Juice / sanitizer
  -> preview + copied HTML
```

本任务不增加渲染层。`presetId` 已经是 16 套差异化所需的全部状态。

## 2. Brand invariants

共享层只拥有无法按版式分叉的产品合同：

- 品牌短句、InkForge colophon 和真实 metadata；
- 安全字体回退、正文可读宽度、图片响应式、表格/代码最低可读性；
- 真实 writing-component 字段和微信安全子集；
- 普通段落连续流 reset。

共享层不得拥有 masthead 几何、标题卡、通用左轨、统一圆角卡、统一 quote 或统一 footer。

## 3. Differentiation mechanism

### 3.1 Seven variant compositions

保留七个既有 Variant builder，并由其拥有领域级视觉语言：

| Variant | Primary composition |
|---|---|
| Critical Translation | 书脊、卷次、版本页、双轨校勘 |
| Jurisprudence Atlas | 坐标轴、法条层级、权威标尺 |
| Industry Section | 深色剖面、黄铜端点、数据口径 |
| Fact Wire | 版次通讯、事实状态、来源/观点关系 |
| Machine Foundry | 冷热铸场、版本/构建/模型轨 |
| Knowledge Weave | 问题—概念—证据—应用—回链网络 |
| Human Margins | 编辑拼贴、纪实信笺、典籍页 |

### 3.2 Preset/Profile modifiers

在 builder 已接收的 `presetId` 上分支，不增加新 store：

- V4：`commentary` 与 `news` 使用不同 identity DOM 和章节/引用节拍；
- V5：`aigc`、`code`、`tech` 使用不同 identity DOM、H2/H3 和组件轮廓；
- V7：`meme`、`life`、`elegant` 使用不同 identity DOM、正文节奏和引文系统；
- 四个旗舰继续通过现有 decorator/SVG 强度形成独立装帧。

所有分支仍在 normal flow 内；不依赖伪元素、定位、flex/grid、外链 CSS 或长文本 SVG。

### 3.3 Structural fingerprints

自动门禁使用两级指纹：

1. masthead composition/profile DOM：去除真实文章文案和颜色后比较标签/类/属性序列；
2. preset CSS：去除注释、空白、颜色值和固定品牌文案后比较选择器/声明结构。

16 套最终输出还需在现有 decorator 之后做成品指纹，避免旗舰只在 builder 层与基础 preset
重合。指纹测试只防止同构回归，不评价美感。

## 4. Visual acceptance

使用一篇通过真实 `articleStore.addArticle()` 创建的无外部事实验收稿，覆盖：

- 长短标题与连续正文；
- H1–H6、strong/em/link/inline-code；
- 引用、列表、表格、代码、分隔线；
- 代表 writing components 与文末 CC/colophon。

每个预设启动独立 release Tauri WebView2 会话，避免连续切换导致原生驱动断连。记录：

- 390px 预览宽度、18–24 字/行、横向溢出；
- 首屏 masthead、H1/H2 和第一段；
- 共享 Variant 的 preset 对照；
- 代表预设的中段/组件/文末。

截图只在系统临时目录用于人工目检。

## 5. Compatibility and rollback

- preset ID、公开函数签名、组件字段、平台 wrapper 和 store 不变；
- 缺少 metadata 时继续省略，不制造占位内容；
- 每个 Variant/Profile 分支可独立回退；
- 小红书、知乎仅经过现有 adapter 回归，不触发发布；
- 如果 native visual review 发现两套同构，只回滚/修正对应 CSS/masthead 分支，不扩大到
  编辑器或数据层。
