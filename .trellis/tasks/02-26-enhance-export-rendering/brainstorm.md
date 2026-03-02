# Brainstorm 讨论记录：导出渲染增强 + 阻塞任务整合

> 日期：2026-03-01
> 参与者：ZRainbow1275 + AI Agent
> 决策结果：策略 A（先扫后建）+ 全量实现 + 边做边更新

---

## 一、决策记录

### Q1: 执行顺序 → 策略 A：先扫后建
- 先一次性修复全部 22 个 TS 错误
- 确保 `vue-tsc --noEmit` 通过后再开发新功能
- 理由：22 个 TS 错误会阻塞对新代码的类型检查验证

### Q2: 实现范围 → 全量实现
- 微信 CSS 内联 + 外链脚注 + 代码高亮 + 嵌套列表修复
- 小红书纯文本引擎 + emoji 注入 + 段落优化 + 字数检测
- 知乎 Markdown 保留 + LaTeX 保持 + HTML 清理
- 8+ 预制主题 + 色盘取色 + 自定义 CSS
- 三平台质量检测器

### Q3: 文档策略 → 边做边更新
- 修复 TS 错误时顺手更新对应 spec 文档规则
- 渲染增强时同步更新功能文档
- 一石二鸟，减少遗漏

---

## 二、执行计划

### Phase 1：清扫 TS 错误（Layer 0）
预计耗时：30-45 分钟

```
Sprint 1.1: fix-crypto-module (6 errors)
  → key-management.ts: 移除 3 个未使用 import
  → sensitive-fields.ts: 移除 2 个未使用 type + 修复 void 调用
  → 更新 spec: type-safety.md (未使用 import 规范)

Sprint 1.2: fix-security-module (7 errors)
  → html-sanitizer.ts: 修复 as const 转 string[] 类型
  → policy-manager.ts: 修复 SecurityAuditEvent 索引签名
  → security.ts: 修复 PASSWORD_POLICY as const 字面量类型
  → 更新 spec: type-safety.md (as const + 索引签名模式)

Sprint 1.3: fix-store-repo-parser (5 errors)
  → category.ts / editor.ts: 移除未使用 import
  → repository.ts: Dexie v4 UpdateSpec 类型 + logger 类型
  → parser/index.ts: 合并 import/export
  → 更新 spec: state-management.md (store 规范)

Sprint 1.4: fix-platform-editor (4 errors)
  → platform.ts: __TAURI__ 声明统一
  → EditorPanel.vue: Extension → AnyExtension 类型断言
  → MarkdownEditor.vue: vue-codemirror ready 事件签名
  → 更新 spec: component-guidelines.md (组件类型)

验收: vue-tsc --noEmit 零错误
```

### Phase 2：导出渲染增强（Layer 2）
预计耗时：3-5 小时

```
Sprint 2.1: 渲染管线基础架构
  → 建立 ExportPipeline 抽象接口
  → 定义 PlatformAdapter 统一协议
  → 搭建 ThemeEngine 主题引擎框架
  → 输出：pipeline 核心文件

Sprint 2.2: 微信公众号渲染（最复杂）
  → juice CSS 内联化
  → highlight.js 代码高亮 → 内联样式
  → 嵌套列表修复 (li > ul → 兄弟节点)
  → 外链自动转脚注
  → 图片样式处理 (attr → inline style)
  → CSS 变量替换 (--var → 实际值)
  → KaTeX → SVG 公式处理
  → 表格内联样式
  → ClipboardItem 富文本复制

Sprint 2.3: 小红书纯文本引擎
  → Markdown → 纯文本转换器
  → Emoji 注入引擎（标题/段首/序号/分隔）
  → 段落分割器（≤5 行/段）
  → 表格/代码块/链接替代方案
  → 字数统计 + 1000 字限制检测
  → 话题标签建议

Sprint 2.4: 知乎 Markdown 输出
  → HTML/CSS 清理
  → LaTeX 公式保留 ($/$$ 语法)
  → 代码块保留 (``` 语法)
  → Mermaid 图表转图片提示
  → 任务列表降级

Sprint 2.5: 主题系统
  → 8+ 预制主题 (Default/Grace/Simple/Dark/Academic/Vibrant/Elegant/Nature)
  → buildTheme / getStyles / styledContent 架构
  → 色盘取色器
  → 自定义 CSS 编辑器
  → 主题预览面板

Sprint 2.6: 质量检测器
  → 微信：CSS 属性白名单校验
  → 小红书：字数/段落/emoji 密度
  → 知乎：HTML/Mermaid/LaTeX 检测
  → 图片尺寸/比例建议
  → 平台警告面板

验收：三平台导出功能完整，vue-tsc 零错误
```

### Phase 3：文档同步
贯穿 Phase 1-2 执行

```
→ .trellis/spec/frontend/ 各文档更新
→ docs/ 功能文档更新
→ docs/platform-rendering-rules/ 已完成 ✅
→ 更新 docs/功能模块.md
→ 更新 docs/重构计划.md 进度
```

---

## 三、任务依赖图

```
Phase 1 (串行，快速扫清)
  fix-crypto ──→ fix-security ──→ fix-store-repo ──→ fix-platform
      │               │                │                  │
      └───────────────┴────────────────┴──────────────────┘
                              │
                    vue-tsc --noEmit = 0 errors
                              │
Phase 2 (可并行模块)          ▼
  渲染管线架构 ──→ ┌── 微信渲染 ──→ ┐
                   ├── 小红书引擎 ───┤──→ 质量检测器
                   ├── 知乎输出 ────┤
                   └── 主题系统 ────┘

Phase 3 (贯穿始终)
  文档同步更新
```

---

## 四、关键参考资料

| 资料 | 路径 |
|------|------|
| 全网调研报告 | `.trellis/tasks/02-26-enhance-export-rendering/research-report.md` |
| 微信渲染规则 | `docs/platform-rendering-rules/wechat-rules.md` |
| 小红书渲染规则 | `docs/platform-rendering-rules/xiaohongshu-rules.md` |
| 知乎渲染规则 | `docs/platform-rendering-rules/zhihu-rules.md` |
| doocs/md 架构 | DeepWiki 分析 + GitHub README |
| 现有渲染代码 | `inkforge/src/services/export/` |
