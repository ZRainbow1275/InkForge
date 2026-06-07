# Inkforge 当前微信渲染/发布链路速记

## 已确认的仓库事实

- 可运行前端主目录是 `inkforge/`。
- 公众号导出主入口集中在 `inkforge/src/services/export/`。
- 现有微信链路不是空壳：已包含主题 CSS、CSS 内联、DOMPurify 安全清理、外链脚注、代码高亮、表格增强、CSS 合规过滤、CJK/Latin 间距、内容宽度 clamp、暗色模式元数据选项、质量检测。
- `PublishView.vue` 和 `ExportModal.vue` 已经有微信公众号平台选择和复制/发布体验入口。
- 当前任务已补上最小真实发布链：`wechat-publish.ts` + Tauri `wechat.rs` 覆盖凭据状态探测、正文图片上传、封面永久素材上传、草稿创建；`WechatUploader` 已不再是 stub，但群发 publish 与后台专有组件仍未自动化。

## 关键代码路径

- `inkforge/src/services/export/wechat.ts`：微信 HTML 转换主流程。
- `inkforge/src/services/export/wechat-publish.ts`：微信公众号真实发布服务层，负责状态探测、图片上传、正文图片 rewrite、草稿创建。
- `inkforge/src/services/export/platform-css.ts`：三平台 CSS 支持矩阵。
- `inkforge/src/services/export/css-validator.ts`：基于平台矩阵的 CSS 合规过滤。
- `inkforge/src/services/export/platform-rules/wechat.ts`：CJK/Latin 间距、内容宽度限制、暗色模式元数据。
- `inkforge/src/services/export/quality-detector.ts`：导出质量/风险检测。
- `inkforge/src/services/export/image-pipeline/uploaders/wechat.ts`：微信 uploader 已委托真实发布服务，不再抛 `NotImplementedError`。
- `inkforge/src/components/export/ExportModal.vue`：导出弹窗中的真实发布状态探测与 preflight 展示。
- `inkforge/src-tauri/src/commands/wechat.rs`：Tauri 边界下的微信公众号命令实现。
- `docs/platform-rendering-rules/wechat-rules.md`：2025-2026 调研整理版规则。
- `docs/微信渲染规则.md`：v3.1 规则指南，部分结论需要用当前代码重审。

## 需要在 PRD 中固定的原则

- 研究任务不得改动其他 in_progress 任务的代码。
- 不伪造发布结果，不用 mock 素材 ID 或假上传证明。
- 自动化能力必须区分：复制到微信编辑器、创建草稿、上传图片、上传封面、后台组件人工插入。
- “精美”必须转化为可测试组件族，而不是只写审美形容词。
- 任何后续实现都应优先复用现有 `export/` 管线，不新开并行渲染器。
