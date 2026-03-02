# Enhance Export Rendering for WeChat, Xiaohongshu, Zhihu

## Goal
全面增强三大平台（微信公众号、小红书、知乎）的导出渲染服务，参考 doocs/md 等优秀开源项目的最佳实践，达到企业级渲染质量。

## Requirements

### 微信公众号渲染增强
- CSS 完全内联化（juice 库）
- CSS 变量替换为实际值
- 外链自动转脚注（非 mp.weixin.qq.com 链接）
- 嵌套列表修复（li > ul 移为兄弟元素）
- 代码块高亮（Highlight.js + inline styles）
- 数学公式 KaTeX → SVG
- 图片宽度限制 ≤640px
- 表格内联样式

### 小红书渲染增强
- 格式简化输出（移除所有 CSS，保留基础格式）
- 图片优化（3:4 比例）
- 段落优化（每段 ≤5 行）
- Emoji 密度检测（1-2个/100字）
- 标题限制 20 字符
- 表格替代方案（不支持表格）

### 知乎渲染增强
- Markdown 原生输出
- LaTeX 保留（$...$ 和 $$...$$）
- 代码块保留（``` 语法）

### 主题系统完善
- 5+ 主题色选择
- 主题预览
- 自定义主题支持

### 智能转换引擎
- 链接腐烂检测
- 图片合规性检查
- 移动端适配检测
- 脚注清洗
- 标题 SEO 检测
- 平台警告（不支持的元素）

## Acceptance Criteria
- [ ] 微信公众号导出 CSS 完全内联
- [ ] 微信公众号外链自动转脚注
- [ ] 小红书格式简化输出正确
- [ ] 知乎 Markdown 原生输出正确
- [ ] 主题系统支持 5+ 主题
- [ ] 导出零 TypeScript 错误
- [ ] 渲染管线完整：Markdown → Parse → Theme → Inline → Platform Adapt → Output

## Technical Notes
- 参考项目：doocs/md (GitHub)
- 核心文件：`inkforge/src/services/export/`
- 渲染管线：`wechat.ts`, `xiaohongshu.ts`, `zhihu.ts`, `themes.ts`, `utils.ts`
- 依赖：juice, marked, highlight.js, katex
