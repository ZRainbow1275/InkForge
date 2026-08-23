# Implementation Plan — 恢复渲染规范、检查器归位与写作组件插入

## 1. Start gate

- [x] 用户同意创建本任务。
- [x] 用户确认检查器恢复为最右独立栏。
- [x] 用户确认常驻组件入口放在 Stage，并保留 `/组件`。
- [x] 用户确认 375px 微信正文采用约 22–24 个 CJK 字/行，22 字为下限。
- [x] 用户确认 PRD 与技术设计已经形成共享理解，并允许进入实现。

2026-07-28：共享理解确认完成，任务已进入 `in_progress`。

## 2. Pre-edit protocol

- [x] 读取 `trellis-before-dev`、本任务 PRD/design、相关 frontend spec 和现有测试。
- [x] 检查 dirty tree，记录并保护用户已有修改；不广泛还原、删除或暂存。
- [x] 使用 GitNexus 查询真实调用链；修改每个函数、类或方法前运行 upstream impact，HIGH/CRITICAL 先报告。
- [x] 优先复用现有主题、装饰、Markdown 扩展、TipTap、组件和导出服务，不增加依赖或平行实现。
- [x] 每个切片先写可失败的最小回归，绿后再进入下一切片。
- [x] 只使用真实 Tauri 软件做最终 UI 验收，不使用浏览器页面冒充软件。

## 3. Ordered implementation slices

### Slice A — Inspector independent right rail

- [x] 为 desktop 工作台增加失败布局回归：展开检查器必须是根布局 sibling，不能 `position:absolute` 覆盖正文/Stage。
- [x] 移除造成覆盖的未 pinned 绝对定位分支；保留收起窄轨、宽度持久化、动画和 reduced-motion。
- [x] 验证停靠、摘出、应用内浮动、原生桌面小窗、关闭和重开共享现有内容状态。
- [x] 在标准、窄屏、最大化和恢复窗口中检查主写作区仍可用。

### Slice B — Editor Chinese copy

- [x] 为 `EditorContextMenu` 增加固定文案回归，覆盖本轮列出的全部英文标签。
- [x] 将用户界面文案和可访问名称改为中文，不改命令与快捷键执行。
- [x] 检查斜杠菜单及新增组件库不存在同类英文残留。

### Slice C — Shared typography and masthead

- [x] 为 `generatePersonaBaseCSS()` 建立 375px、22–24 字/行和 320–586px 无溢出回归。
- [x] 在共享基线补齐 H1–H6、强调/删除、列表/任务列表、表格、代码、KaTeX、Mermaid、引用、图片/题注、链接、来源/脚注和分隔线默认规则。
- [x] 以既有装饰链增加幂等抬头：可选真实歌曲、装裱/标题母题、“文章值得您享受”、真实阅读时间、真实类别。
- [x] 缺少歌曲或分类时省略对应真实数据槽，不输出示例或伪原生组件。
- [x] 使用一个全元素真实验收稿遍历 16 个预设，验证每个预设至少三个差异维度和完整样式覆盖。

### Slice D — Strict component registry and Markdown round-trip

- [x] 盘点并适配现有 `delivery-adornments`、`html-blocks`、SVG 模块与平台 fallback，建立单一 Zod 组件注册表。
- [x] 注册作者/公众号名片、二维码、提示、信息网格、表格、时间线、对比卡、数据统计卡、图集、引文来源、歌曲、图片、链接、关联文章、联系人/名片和真实支持的微信媒体描述。
- [x] 在 `markdown-ext` 增加仅识别已注册 PascalCase 自闭合语法的严格解析；跳过 fenced/inline code。
- [x] 在 `TyporaMode` 通用容器降级前增加组件稳定序列化。
- [x] 测试必填字段、危险属性、原型污染键、未知 ID、旧版本、原始语法恢复和平台安全降级。

### Slice E — TipTap atomic node and Stage component library

- [x] 增加最小 `inkComponent` 原子节点/NodeView，复用现有编辑器扩展注册方式和 `BlockBoundaryInsertion`。
- [x] `EditorPanel` 暴露保存 selection、打开组件库、在保存位置插入/更新组件和恢复焦点的窄接口。
- [x] Stage 工具栏增加明确的“组件”按钮；`/组件` 调用同一入口。
- [x] 复用现有对话框/表单构建组件库的内置/自定义、搜索、属性校验、真实即时预览、插入和重新编辑。
- [x] 自定义组件定义沿现有持久化路径实现受限新建/编辑/删除/导入/导出；不能覆盖内置 ID 或执行任意代码。
- [x] 验证 Typora/Source 切换、自动保存、关闭重开后的 ID、版本、字段、位置和顺序。

### Slice F — Cross-surface and native acceptance

- [x] 验证 Stage、分栏、全屏、微信复制和导出使用同一语义/主题结果。
- [x] 验证 XHS/Zhihu 本地安全降级；不执行或声称真实发布。
- [x] 运行目标测试、相关 export 串行套件、精确 ESLint、`vue-tsc --noEmit`、Vite 构建和 Tauri release 构建。
- [x] 重启真实 `InkForge.exe`，完成右栏、中文菜单、抬头、全元素稿、16 预设、375px 行长和组件光标插入视觉验收。
- [x] 更新对应 `.trellis/spec`、任务证据和完成报告；运行 GitNexus `detect_changes` 与最终 diff/敏感信息审查。

## 4. Test matrix

| Contract | Automated evidence | Native software evidence |
| --- | --- | --- |
| 检查器最右独立栏 | 布局/CSS 回归 | 展开、收起、摘出、关闭、重开均不覆盖 |
| 菜单中文化 | 文案与命令测试 | 右键菜单逐项检查 |
| 22–24 字移动行长 | 375px 几何回归 | WebView2 逐行测量 |
| 完整 Markdown 样式 | 全元素 fixture × 16 预设 | 微信 Stage/分栏/全屏视觉矩阵 |
| 抬头真实数据与幂等 | 装饰器/缺失字段回归 | 歌曲可选、阅读时间/类别正确 |
| 组件语法安全往返 | parser/serializer/Schema 测试 | Typora/Source、保存重开 |
| Stage 与 `/组件` 插入 | selection/command 测试 | 原光标插入并恢复焦点 |
| 平台输出安全 | WeChat/XHS/Zhihu 本地回归 | 微信复制源码审查；外部发布由用户完成 |

## 5. Stop rules

- 发现 GitNexus HIGH/CRITICAL 影响时，在编辑前报告风险和拟采用的共享根修复。
- 任一切片不能用真实输入跑通时保持 open，不以 mock、截图占位或文档声明冒充完成。
- 不删除已有功能、组件、模块、主题或用户数据；若兼容性要求迫使破坏性迁移，停止并重新征求决定。
- 只有自动检查、生产构建和真实 Tauri 视觉验收均通过，才交付用户进行最终微信平台实测。
