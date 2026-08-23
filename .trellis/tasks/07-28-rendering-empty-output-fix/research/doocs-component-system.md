# doocs/md 组件系统源码研究

## 1. 研究范围与版本

- 权威输入：`doocs/md` 当前源码，而非 README 截图或搜索摘要。
- 本地只读研究副本：`C:\Users\HP\AppData\Local\Temp\doocs-md-source-20260728`。
- 审阅提交：`3198bb3d34d2dbcbef4cd15066f87a6915ec415d`。
- 研究目标：理解组件定义、属性填写、即时预览、插入、持久化和安全净化的真实实现，并转译为 InkForge 现有 TipTap + Markdown + 导出架构；不复制第三方模板、账号数据、资源或运行时代码。

## 2. 已核验源码

| 能力 | doocs/md 源码 |
| --- | --- |
| 组件类型 | `packages/shared/src/types/component.ts` |
| 内置组件、JSX 解析、模板渲染 | `packages/core/src/extensions/component.ts` |
| 组件库对话框 | `apps/web/src/components/editor/dialogs/CustomComponentDialog.vue` |
| 属性填写和即时预览 | `apps/web/src/components/editor/dialogs/ComponentPropFill.vue` |
| 自定义组件持久化 | `apps/web/src/stores/customComponent.ts` |
| 本地公众号名片预览 | `apps/web/src/lib/bootstrap/setup-components.ts` |
| HTML 净化 | `packages/core/src/utils/markdownHelpers.ts` |
| 微信名片字段获取说明 | `docs/mp-card.md` |

## 3. 可复用的设计事实

1. 组件定义是数据，不是任意代码：稳定 ID、PascalCase 名称、说明、HTML 模板、类型化属性、内置标记、示例和时间戳。
2. 属性类型至少覆盖 `string`、`number`、`boolean`、`array`；对话框按类型生成输入控件并使用同一渲染器即时预览。
3. 内置与用户组件汇入一个注册表。当前内置项包括 `MpProfile`、`QRCodeBlock`、`AuthorBlock`、`TipBlock`、`TableBlock`、`InfoGrid`、`BadgeGroup`。
4. Markdown 中使用 PascalCase JSX 风格标签，支持自闭合和成对标签；解析会跳过 fenced code block，未知组件输出显式错误而不是静默消失。
5. 插入动作只调用编辑器现有光标插入 API；组件库自身不维护第二份文稿。
6. `MpProfile` 的平台输出是 `<mp-common-profile>` 及其平台字段；本地预览通过自定义元素和 Shadow DOM 模拟卡片外观，但真实账号身份仍必须来自微信编辑器取得的 `fakeid`/元数据。
7. 最终 HTML 使用 DOMPurify，并只额外允许声明过的平台标签。脚本、事件处理器、iframe 和任意运行时代码不属于组件能力。
8. 当前提交没有歌曲组件。InkForge 的歌曲、文章、联系人、图片和其他交付组件应复用自身已有 `delivery-adornments` 契约，不虚构 doocs/md 已提供这些能力。

## 4. InkForge 转译结论

- 复用 InkForge 现有 Markdown 权威文稿、`markdown-ext` 预处理链、TipTap Vue NodeView、`BlockBoundaryInsertion`、主题预设、SVG 模块和导出净化器；不新增渲染引擎或依赖。
- 可视模式使用一个 `inkComponent` 原子块节点，节点仅保存 `componentId`、`version` 和经 Schema 校验的属性；编辑器控制 UI 不进入文稿 HTML。
- Markdown/source 模式使用 JSX 风格语法。Markdown → HTML 在现有 `renderInkforgeMarkdownExtensions()` 中识别；HTML → Markdown 在 `TyporaMode.nodeToMarkdown()` 的通用 `section/div` 分支之前序列化。
- 组件在预览/导出阶段由当前平台与预设渲染。微信原生标签只有字段完整且规则允许时才输出；其余场景生成安全、可编辑的降级卡片并标记待绑定。
- 自定义组件只允许声明式模板和受限属性，持久化复用当前真实设置/Dexie 路径；导入时进行版本化 Schema 校验，导出时不包含凭据或账号会话。

## 5. 不照搬的内容

- 不复制 doocs/md 的 UI 像素、CSS、第三方商标、模板、平台资源或账号字段。
- 不把本地名片视觉预览当作微信平台接受证据。
- 不使用正则把整份 Markdown 当 HTML 解析；只在代码围栏之外扫描受限组件语法，并对属性做严格解析。
- 不为尚未实现的平台原生歌曲/媒体能力生成伪原生节点或成功状态。
