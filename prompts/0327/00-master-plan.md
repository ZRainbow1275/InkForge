# InkForge v2.1 -- 渐进式改善总体规划

> 文档类型: Master Plan
> 创建日期: 2026-03-27
> 目标: 在现有 v2.0 基础上进行渐进式改善，不做大重构
> 设计语言: Ethereal Constructivism (延续现有风格)

---

## 一、核心约束 (ABSOLUTE CONSTRAINTS)

以下约束在任何改动中都不可违反:

1. **不改变现有编辑器核心风格** -- EditorPanel.vue 的纸张风格、颜色体系 (#D32F2F 构成红、#263238 墨色、#37474F 文字色) 不可更改
2. **不使用 Emoji** -- 所有图标必须使用 `lucide-vue-next` 图标库，零容忍 Emoji
3. **不使用 Mock 数据** -- 所有功能必须连接真实数据源 (Pinia Store / IndexedDB / API)
4. **不做大重构** -- 在现有文件结构、组件层次、Store 模式上增量迭代
5. **保持技术栈一致** -- Vue 3 Composition API + Pinia + TipTap + Dexie + Tailwind + shadcn-vue + Zod
6. **保持设计语言** -- Ethereal Constructivism: 圆角 (rounded-2xl/rounded-[20px])、毛玻璃 (backdrop-blur)、微阴影、slate 色阶
7. **TypeScript 严格模式** -- 所有代码必须通过 `vue-tsc --noEmit` (零错误)
8. **不创建 EditorToolbar.vue** -- 不引入固定顶部工具栏组件，工具栏能力通过 FloatingToolbar + SlashCommand + 右键菜单 + 快捷键覆盖

## 二、技术栈参考

| 层 | 技术 | 版本 |
|---|---|---|
| 框架 | Vue 3 | ^3.5.13 |
| 状态管理 | Pinia | ^2.2.8 |
| 编辑器引擎 | TipTap (ProseMirror) | ^2.27.2 |
| 数据库 | Dexie (IndexedDB) | ^4.0.10 |
| CSS | Tailwind CSS | ^3.4.17 |
| UI 组件库 | shadcn-vue (reka-ui) | 已安装 |
| 图标 | lucide-vue-next | ^0.468.0 |
| 验证 | Zod | ^4.2.1 |
| 路由 | vue-router | ^4.6.4 |
| 代码高亮 | lowlight (highlight.js) | ^3.3.0 |
| Markdown | marked | ^15.0.12 |
| CSS 内联 | juice | ^11.0.0 |
| 安全 | DOMPurify | ^3.3.1 |
| 桌面端 | Tauri | ^1.6.0 |
| 后端 | Hono.js + better-sqlite3 | server/ |
| 认证 | JWT (jose) + bcryptjs | server/ |

## 三、现有文件结构 (核心路径)

```
inkforge/src/
  views/
    HubView.vue            # 首页仪表盘
    WorkstationView.vue    # 编辑工作台 (四栏布局)
    SettingsView.vue       # 设置中心 (10 Tab)
    PublishView.vue        # 发布页
    ThemesView.vue         # 主题市场
    NotFoundView.vue       # 404
    AccountWelcome.vue     # 账户管理页 (新增)
  components/
    editor/
      EditorPanel.vue      # TipTap 编辑器主体 (纸张风格)
      FloatingToolbar.vue  # 浮动格式工具栏
      SlashCommandMenu.vue # 斜杠命令菜单
      EditorStatusBar.vue  # 编辑器状态栏
      EditorEmptyState.vue # 空状态
      TabBar.vue           # 多标签
      MarkdownEditor.vue   # Markdown 源码编辑器
      MarkdownPreview.vue  # Markdown 预览
      WritingGoal.vue      # 写作目标
      ThemePanel.vue       # 主题面板
      EditorContextMenu.vue # 右键上下文菜单 (新增)
      FindReplace.vue      # 查找替换面板 (新增)
    hub/                   # Hub 首页组件
      HubHeader.vue
      StatsDashboard.vue
      WritingFlowCard.vue
      InspirationCard.vue
      ContributionHeatmap.vue
      WordCountTrend.vue
      CategoryDistribution.vue
      ArticleWaterfall.vue
      TemplateMarketCard.vue
      QuickActionFab.vue
      SectionNav.vue
    layout/
      AppLayout.vue        # 全局布局
      ResizablePanel.vue   # 可调整大小面板
    file/
      FileManager.vue      # 文件管理器
      AssetPreview.vue     # 素材预览
      DraftBox.vue         # 草稿箱
    sync/
      SyncStatusIcon.vue   # 同步状态图标
    ...
  stores/
    settings.ts            # 设置 (Zod Schema + localStorage)
    editor.ts              # 编辑器状态
    article.ts             # 文章管理
    category.ts            # 分类管理
    asset.ts               # 素材管理
    sync.ts                # 同步状态
    account.ts             # 账户管理
  extensions/
    SlashCommands.ts       # 斜杠命令 TipTap 扩展
    MarkdownHints.ts       # Markdown 语法提示
    SmartPunctuation.ts    # 智能标点
    TypewriterMode.ts      # 打字机模式
    BracketMatching.ts     # 括号匹配
    TyporaMode.ts          # Typora 光标感知渲染 (新增)
    KeyboardShortcuts.ts   # 33 快捷键 TipTap 扩展 (新增)
  services/
    export/                # 导出引擎 (wechat/zhihu/xiaohongshu/themes)
    sync/                  # 同步引擎
    security/              # 安全层
  utils/
    db.ts                  # Dexie 数据库
    lucide-icons.ts        # 图标解析工具
    activity-logger.ts     # 活动日志
    diff.ts                # 差异对比
    events.ts              # 事件系统
```

## 四、Settings Store Schema 参考

已有的完整 Zod Schema 定义 (settings.ts):

| 分类 | 字段 | 类型 | 默认值 |
|---|---|---|---|
| appearance.theme | enum | light/dark/system | light |
| appearance.fontFamily | enum | serif/sans/kai/mono | serif |
| appearance.fontSize | number | 12-24 | 16 |
| appearance.lineHeight | number | 1.4-2.4 | 1.8 |
| appearance.accentColor | string | hex | #D32F2F |
| appearance.sidebarWidth | number | 180-400 | 240 |
| appearance.reducedMotion | boolean | - | false |
| appearance.typography.* | object | 排版细节 | - |
| editor.autoSave | boolean | - | true |
| editor.autoSaveInterval | number | 10-300s | 30 |
| editor.spellCheck | boolean | - | false |
| editor.typewriterMode | boolean | - | false |
| editor.smartPunctuation | boolean | - | true |
| editor.markdownHints | boolean | - | true |
| editor.wordWrap | boolean | - | true |
| editor.tabSize | number | 2-8 | 4 |
| editor.showLineNumbers | boolean | - | false |
| editor.highlightActiveLine | boolean | - | true |
| editor.bracketMatching | boolean | - | true |
| editor.editorMode | enum | typora/source | typora |
| editor.editorWidth | enum | narrow/medium/wide/full | medium |
| editor.writingGoal.* | object | 写作目标 | - |
| export.* | object | 导出设置 | - |
| ai.* | object | AI Provider 设置 | - |
| sync.* | object | 同步设置 | - |
| advanced.* | object | 高级设置 | - |
| shortcuts | Record<string,string> | 快捷键映射 | DEFAULT_SHORTCUTS |

## 五、改动任务清单 (按优先级排序)

### P0 -- 关键修复 (必须首先完成)

| # | 任务 | 规范文档 | 影响范围 |
|---|---|---|---|
| 1 | Typora 模式编辑器 + 双模式切换 | 01-editor-ui-spec.md | EditorPanel + extensions + WorkstationView |
| 2 | Hub 首页布局修复 (Hero=创作流) | 02-hub-layout-spec.md | HubView + hub/ |
| 3 | 键盘快捷键体系 (33 快捷键) | 03-keyboard-shortcuts-spec.md | extensions + settings |
| 4 | 渲染引擎 + 写作增强 | 04-rendering-engine-spec.md | EditorPanel + services/export |

### P1 -- 功能补全

| # | 任务 | 规范文档 | 影响范围 |
|---|---|---|---|
| 5 | 浮动工具栏 + 上下文菜单 + 斜杠命令 | 05-toolbar-complete-spec.md | FloatingToolbar + 新增组件 |
| 6 | 本地账户管理 | 06-account-auth-spec.md | AccountWelcome + stores/account |
| 7 | Settings 全量实装 | 07-settings-full-spec.md | SettingsView |
| 8 | 数据洞察丰富 (9 图表) | 08-data-insights-spec.md | hub/ 组件 |

### P2 -- 视觉打磨

| # | 任务 | 规范文档 | 影响范围 |
|---|---|---|---|
| 9 | UI 打磨与溢出修复 | 09-ui-polish-spec.md | 全局 |

## 六、实施顺序

```
Phase 1: P0 关键修复
  01 Typora 模式编辑器 → 02 Hub 布局修复 → 03 键盘快捷键 → 04 渲染引擎
  ↓
Phase 2: P1 功能补全
  05 浮动工具栏+上下文菜单 → 06 本地账户管理 → 07 Settings 全量实装 → 08 数据洞察
  ↓
Phase 3: P2 视觉打磨
  09 UI 打磨与溢出修复
  ↓
验证: pnpm build && vue-tsc --noEmit → 全通过
```

每个 Phase 完成后必须运行:
```bash
cd inkforge && pnpm build
cd inkforge && pnpm typecheck
```

## 七、通用开发规范

### 7.1 组件规范
- 使用 `<script setup lang="ts">` 语法
- Props 使用 `defineProps<T>()` 泛型定义
- Emits 使用 `defineEmits<T>()` 泛型定义
- Store 通过 `storeToRefs()` 解构响应式属性
- 使用 `computed()` 派生数据，避免在 template 中写复杂表达式

### 7.2 样式规范
- 使用 `<style scoped>` 作用域样式
- 结合 Tailwind utility classes 和 scoped CSS
- 颜色使用 CSS 变量 (--bg-surface, --bg-rice-paper 等) 或 Tailwind 色阶
- 间距: 4/8/12/16/20/24/32px (Tailwind 对应 1/2/3/4/5/6/8)
- 圆角: rounded-lg / rounded-xl / rounded-2xl / rounded-[20px]

### 7.3 图标规范
- 所有图标从 `lucide-vue-next` 导入
- 统一大小: 按钮内 :size="16"，装饰性 :size="20"，大图标 :size="24"
- 使用 `resolveIconComponent()` 工具动态解析图标

### 7.4 Store 规范
- 使用 `defineStore('name', () => { ... })` setup 语法
- 状态用 `ref()`，派生用 `computed()`
- 异步操作返回 `Promise`
- 错误统一用 `logger` 记录

### 7.5 数据验证
- 使用 Zod Schema 验证所有外部输入
- Settings 子 Schema 的 `.default()` 确保回退安全
- API 响应使用 `.safeParse()` 避免抛异常

### 7.6 安全规范
- 链接仅允许 http/https/mailto 协议
- HTML 输出使用 DOMPurify 清理
- CSS 注入使用安全沙箱
- 密码符合 PASSWORD_POLICY

## 八、验证检查表

每个改动完成后，确认以下项目:

- [ ] `pnpm build` 通过 (零错误)
- [ ] `vue-tsc --noEmit` 通过 (零 TS 错误)
- [ ] 编辑器核心功能正常 (创建文章、编辑、保存、预览)
- [ ] Hub 首页正常渲染 (无溢出、无错位)
- [ ] Settings 全部 Tab 可切换
- [ ] 暗色/亮色主题均正常
- [ ] 无 Console 错误
- [ ] 所有图标使用 Lucide (无 Emoji)
- [ ] 无 Mock 数据
