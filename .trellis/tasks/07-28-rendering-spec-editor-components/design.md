# Technical Design — 恢复渲染规范、检查器归位与写作组件插入

## 1. Scope

- 本设计只处理本任务 PRD 的四个可见缺陷：检查器归位、完整排版基线、编辑器中文化、写作态组件插入。
- 复用已经通过真实 Tauri/WebView2 验收的主题加载、CSP、平台转换、16 个预设、SVG 模块、`delivery-adornments`、`html-blocks`、TipTap 和 Markdown 扩展链。
- 旧任务 `07-28-rendering-empty-output-fix` 中已完成的 CSP/主题可见性修复不重复实现；其尚未完成的组件注册、原子节点和组件库切片并入本任务，不建立第二套渲染器。
- 外部平台发布、同步、定时发送、手机预览以及知乎/小红书账号实测不属于本轮自动验收。

## 2. Invariants

1. Markdown/当前文稿是权威数据，Stage、分栏、全屏、复制、导出和发布中心消费同一派生渲染结果。
2. 共享基线负责移动正文几何和完整语义元素；16 个预设在其上提供不同 token、结构装饰和视觉签名。
3. 检查器本体始终是最右侧独立栏，不以覆盖正文的方式模拟“展开”；可摘出的卡片继续支持应用内浮动和原生桌面小窗。
4. 组件只保存声明式、Schema 校验后的数据，不保存或执行函数、脚本、事件、`iframe` 或任意未净化 HTML。
5. 结构可以自动生成，内容不得编造。阅读时间可从真实正文计算；歌曲、类别、作者、来源、图片、数字和平台信息必须来自真实文稿或用户输入。
6. 既有文稿、主题 ID、文章、分类、素材、设置、历史和组件均不得删除或清空。

## 3. Inspector layout

### 3.1 Canonical geometry

```text
manager | editor/stage workspace | inspector rail
```

- `WorkstationView.vue` 继续拥有检查器状态和现有内容组件。
- 桌面宽度下，检查器是工作台根布局中的最后一个 flex/grid sibling：
  - 收起：仅保留原设计的窄轨和展开入口；
  - 展开：占用持久化后的独立栏宽；
  - 不使用 `position: absolute` 覆盖编辑器、Stage、平台预览或预设选择。
- `pinned`/磁吸只控制停靠交互和视觉状态，不再决定检查器是否占用布局宽度。
- 该决策明确取代旧设计文档中“未固定检查器作为正文覆盖层”的几何约定，以用户本轮确认的原始最右独立栏为准。

### 3.2 Detached cards

- 平台预览、引用链接、文稿统计等现有卡片仍使用同一数据源，可从右栏摘出为应用内浮动或 Tauri utility window。
- 关闭、重新打开、停靠、摘出和软件重启只改变 presentation state，不复制或丢失业务状态。
- 复用现有动画、宽度持久化、拖动边界、焦点管理和 `prefers-reduced-motion` 分支；不引入布局或拖拽依赖。

## 4. Rendering baseline

### 4.1 One shared typography root

- 以 `generatePersonaBaseCSS()` 和现有主题生成链为唯一共享基线，不在 16 个预设或各预览表面分别打补丁。
- 375px 微信画布以真实 WebView2 computed style 和逐行文本测量为验收标准：
  - 默认正文约 22–24 个 CJK 字/行，22 字为下限；
  - 正文字号保持微信安全、可读的约 16px 基线；
  - 通过正文可用宽度、内边距、字距、行高和段间距协同调整，不用负缩放或横向裁切凑数；
  - 320–586px 画布不得横向溢出。
- 每个预设仍可覆盖字体、字号、字距、行高和节奏，但必须通过同一几何回归。

### 4.2 Complete semantic element contract

共享基线为下列语义提供安全、完整、可继承的默认规则，预设再按自身视觉语言覆盖：

- H1–H6、首段、普通段落；
- `strong`、`em`、`del`、行内代码、代码块；
- KaTeX 行内/块公式、Mermaid/图表降级；
- 引用、提示、金句、脚注、来源；
- 无序、有序、嵌套和任务列表；
- 表格、图片、图集、题注、链接、分隔线；
- 目录、阅读条、首字下沉、数据卡和文末信息。

`themes.ts` 中已有的 persona/flagship 规则保持为上层覆盖。每个预设至少在标题、正文节奏、引用/卡片、列表/表格、代码/公式、图片/分隔、首尾结构中的三个维度具有可测试差异，禁止复制同一结构只换强调色。

### 4.3 Article masthead

在既有幂等装饰链中增加一个文章抬头组合，而非在预览组件手写：

```text
[可选真实歌曲]
[装裱图标或标题母题]                    [文章值得您享受]
[真实阅读时间]                           [真实文章类别]
[正文]
```

- “文章值得您享受”是固定产品引导文案。
- 阅读时间使用当前真实正文统计结果。
- 类别读取当前文章真实分类；缺失时省略，不输出虚构分类。
- 歌曲仅在用户绑定完整真实字段后出现；未绑定时不伪造微信原生媒体标签。
- 抬头带稳定哨兵并幂等执行，切换预设、重复预览或导出不能重复注入。
- 每个预设通过现有 token/装饰配方改变装裱、分隔、对齐和强调方式，同时保持上述信息层级。

## 5. Editor localization

- `EditorContextMenu.vue` 的固定用户文案改为中文，命令、快捷键、代码语言和 URL 保持技术原文。
- 斜杠菜单、组件库、校验和插入反馈使用同一中文产品词汇。
- 复用仓库现有文案方式；不为固定菜单新增依赖或第二套运行时 i18n 系统。
- 本轮只改文案和可访问名称，不改变 Cut/Copy/Paste、格式、链接、图片、表格、分隔线、查找或浮窗命令的真实执行链。

## 6. Writing-time component system

### 6.1 Canonical model and registry

```ts
type InkComponentNode = {
  componentId: string
  version: number
  props: Record<string, string | number | boolean | string[]>
}
```

- 建立一个组件定义注册表，描述稳定 ID、显示名、字段 Schema、默认空状态、预览/平台渲染函数和版本。
- 使用项目已安装的 Zod 做信任边界校验，不新增依赖。
- 内置定义直接适配现有 `delivery-adornments`、`html-blocks`、SVG 模块和平台导出函数，不复制其业务模型。
- 首批注册项覆盖：作者/公众号名片、二维码、提示、信息网格、表格、时间线、对比卡、数据统计卡、图集、引文来源、歌曲、图片、链接、关联文章、联系人/名片和当前真实支持的微信媒体描述。
- 自定义组件只保存声明式模板和允许字段；与内置组件进入同一只读合并视图，不能覆盖内置 ID。

### 6.2 Markdown and TipTap round-trip

```text
registered JSX-style Markdown
  -> strict markdown-ext parser outside code fences
  -> sanitized data-ink-component element
  -> atomic TipTap inkComponent node / NodeView
  -> stable JSX-style Markdown serialization
```

- Source 模式使用注册过的 PascalCase 自闭合语法；属性按 Schema 和稳定顺序序列化。
- 解析器跳过 fenced/inline code；未知或旧版本组件保留原始语法并显示可恢复错误态，不能静默丢字段。
- TipTap 节点保存组件 ID、版本、属性和必要的原始恢复数据；编辑器控制按钮不进入平台 HTML。
- 复用 `BlockBoundaryInsertion` 在块边界插入；Typora/Source 切换、自动保存、关闭重开后保持组件 ID、字段、位置和顺序。

### 6.3 Stage entry and saved selection

- Stage 工具栏增加一个明确可见、使用现有 Lucide 图标的“组件”按钮；`/组件` 打开同一组件库。
- 打开前由 `EditorPanel` 保存当前正文 selection；组件库关闭不插入时恢复原 selection，确认时在该位置插入并恢复正文焦点。
- 组件库沿用现有对话框、按钮、表单和 tab 视觉语言，提供：
  - 内置/自定义页签；
  - 搜索和分类；
  - 属性表单、必填校验和真实即时预览；
  - 插入、重新编辑、自定义定义的新建/编辑/删除/导入/导出。
- Stage 的文章预览继续显示当前真实文稿；组件预览只存在于组件库，不以示例文章替换当前文稿。

### 6.4 Platform output

- WeChat 输出既有安全 HTML/SVG 子集；微信原生媒体描述只有在字段完整且当前导出链真实支持时才生成。
- XHS/Zhihu 走既有文本、Markdown、卡片或图片 fallback，只验证本地产物，不声称账号发布成功。
- 未完成组件在编辑器中可见、可重新编辑；最终复制、导出或发布 payload 阻止带示例值、危险节点或内部控制属性的内容。

## 7. Compatibility, performance, and accessibility

- 无组件语法的既有文稿行为不变；未知语法可恢复，不做破坏性迁移。
- 主题切换只重新渲染当前结果；组件库搜索和表单不创建第二个文章渲染循环。
- 对话框、右栏、组件节点和新增按钮均可键盘操作，具有中文可访问名称、可见焦点和 reduced-motion 行为。
- 不使用 Emoji 图标；只复用 `lucide-vue-next` 和已有 SVG 资产。

## 8. Verification contract

1. 先建立会失败的聚焦回归：右栏不覆盖、菜单中文、22–24 字行长、抬头幂等、全元素 CSS、组件语法/光标往返。
2. 同一全元素真实验收稿遍历 16 个微信预设，验证样式存在、三个差异维度、无横向溢出、无危险节点。
3. 组件覆盖注册、字段校验、代码围栏、未知/旧版本恢复、TipTap/Source 往返、保存重开和三平台降级。
4. 运行目标 Vitest、相关 export 串行回归、精确 ESLint、`vue-tsc --noEmit`、Vite/Tauri 生产构建和 GitNexus `detect_changes`。
5. 重启真实 release Tauri 软件验收标准、窄屏、最大化和恢复窗口；检查右栏、Stage 组件入口、光标插入、16 预设、375px 微信画布、分栏和全屏。浏览器页面不能作为成品证据。
