# Technical Design — 微信公众号真实粘贴渲染验收

## 1. Validation boundary

本任务验证唯一真实通道：

```text
real article in release InkForge.exe
  -> existing WeChat preset
  -> existing convert / inline / sanitize pipeline
  -> existing “复制微信富文本” action
  -> Windows system clipboard
  -> ordinary Ctrl+V
  -> authenticated WeChat PC editor
  -> visible inspection + redacted DOM readback
```

不增加测试专用渲染器、剪贴板桥或平台适配器。

## 2. Test article and preset matrix

使用同一篇无外部虚构事实的验收稿，覆盖长短标题、H1–H6、连续段落、strong/em/link、
列表、引用、表格、代码、图片/题注、代表写作组件及 CC/colophon。

矩阵是现有 16 个微信 preset。每轮只改变 preset，文章内容保持相同，使微信清洗后的
差异可归因于版式而非内容。

## 3. Operator flow

1. 在 release 软件选择预设并等待真实预览稳定。
2. 点击现有“复制微信富文本”，确认应用的复制反馈。
3. 聚焦微信正文编辑器，以普通 `Ctrl+A`、`Ctrl+V` 替换测试正文。
4. 等待微信编辑器完成清洗与重排。
5. 视觉检查首屏，并读回脱敏结构指标。
6. 对代表预设滚动检查中段、组件和文末。
7. 切换下一预设重复，不点击保存、预览、群发或发布。

`Ctrl+A` 只在用户明确提供的测试正文编辑区执行；操作前必须通过可见标题/正文边界确认
当前焦点，不能对页面或其他账号稿件做坐标式盲操作。

## 4. Readback contract

每套记录：

- preset ID / visible name；
- ordinary paste action 已发生；
-正文字符数、关键文本匹配；
- top-level block、inline style、SVG、`data-ink-block`、`data-ink-svg` 数；
- masthead/brand line/colophon 是否可见；
- fixed-size、overflow、overlap、contrast、empty-gap 和 plain-text fallback 结论。

指标只记录数量和布尔值，不保存正文全文、账号身份或浏览器运行时数据。

## 5. Defect triage

- InkForge 剪贴板前已坏：修 renderer / post-process / copy source。
- 剪贴板 HTML 正确但普通粘贴降级：修复制通道或把该 preset 明确降级为 paste-safe 输出。
- 微信只剥离非安全结构：修共享 WeChat compatibility transform，并保留可读 fallback。
- 仅单一视觉 preset 不协调：修现有 Variant/Profile/preset CSS 分支，不扩大架构。

任何代码改动前对目标符号运行 GitNexus upstream impact；修复后重新构建 release 软件并
重复相同普通粘贴路径。

## 6. Evidence and rollback

- 临时截图与 DOM 诊断只放系统临时目录。
- 持久证据只写脱敏文本结论到本任务 `research/` 或 `implement.md`。
- 不提交 profile、Cookie、Token、HAR、二维码、账号截图和临时软件截图。
- 如果某轮无法安全确认当前编辑区是测试稿，立即停止平台写入，不尝试坐标盲点。
- 所有修复可按精确 renderer/copy/compatibility 文件单独回退，不影响用户数据。
