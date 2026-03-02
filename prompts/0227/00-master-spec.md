# InkForge v5.1 - 全面重构 Master Spec

> **日期**: 2026-02-27
> **版本**: v5.1 Major Overhaul
> **目标**: 将 InkForge 从原型级提升至企业级可用产品

---

## 一、项目现状评估

### 1.1 已有基础（保留不动）
- Vue 3 + Pinia + TypeScript 严格模式
- Tiptap 编辑器引擎
- Dexie.js IndexedDB 存储
- Zod Schema 运行时验证
- FSM 编辑器状态机
- Repository 模式数据访问
- 三平台导出引擎（微信/小红书/知乎）基础管线
- 结构化错误处理（AppError + ErrorCode）

### 1.2 核心问题清单

| # | 问题 | 严重度 | 模块 |
|---|------|--------|------|
| 1 | 编辑器渲染丑陋（大黑框 border-left: 2px solid #2c3e50） | P0 | Editor UI |
| 2 | 预览渲染与平台不一致，CSS 未正确应用 | P0 | Rendering |
| 3 | 素材库功能是 Mock 模拟 | P0 | Asset Management |
| 4 | AI 功能未真实驱动 | P0 | AI Integration |
| 5 | 大纲功能不存在 | P1 | Outline |
| 6 | 版本功能是 Mock | P0 | Version Management |
| 7 | 文件管理器是 Mock | P0 | File Manager |
| 8 | 首页创作流是静态 Mock 数据 | P1 | Hub |
| 9 | 分类不可自定义 | P1 | Category |
| 10 | 阅读量等指标完全虚假 | P1 | Stats |
| 11 | 每日灵感是锁死的静态数据 | P2 | Inspiration |
| 12 | 设置页面功能不完整 | P1 | Settings |
| 13 | 排版风格和预设使用不当 | P0 | Theme System |
| 14 | 预览面板顶部多余的平台说明文字 | P1 | Preview |

---

## 二、开发模块矩阵

### 2.1 模块清单与优先级

| 模块 | Spec 文件 | 优先级 | 预估复杂度 | 依赖模块 |
|------|-----------|--------|------------|----------|
| 编辑器 UI 全面改造 | 01-editor-ui-overhaul.md | P0 | 高 | - |
| 三平台渲染引擎优化 | 02-rendering-engine.md | P0 | 极高 | Editor UI |
| 素材库真实化 | 03-asset-management.md | P0 | 高 | DB Schema |
| AI 功能集成 | 04-ai-integration.md | P0 | 极高 | Settings |
| 大纲功能设计 | 05-outline-feature.md | P1 | 中 | Editor |
| 版本管理完善 | 06-version-management.md | P0 | 中 | Editor |
| 文件管理器真实化 | 07-file-manager.md | P0 | 高 | DB Schema, Assets |
| 首页功能增强 | 08-hub-enhancement.md | P1 | 高 | Stats, Category |
| 设置页面完善 | 09-settings-complete.md | P1 | 中 | - |
| 写作辅助功能 | 10-writing-assistant.md | P2 | 中 | Editor, AI |

### 2.2 执行批次

**批次一：视觉与基础**（并行）
- 01-editor-ui-overhaul
- 09-settings-complete
- 08-hub-enhancement（数据层）

**批次二：核心功能**（依赖批次一）
- 02-rendering-engine
- 03-asset-management
- 06-version-management
- 07-file-manager

**批次三：智能功能**（依赖批次二）
- 04-ai-integration
- 05-outline-feature
- 10-writing-assistant

---

## 三、技术架构决策

### 3.1 AI 集成方案
- **统一 AI Service 层**：抽象接口，支持多 Provider
- **支持的 Provider**：OpenAI (GPT-4o/4), Anthropic (Claude Opus 4.6/Sonnet), DeepSeek, Ollama (本地)
- **调用方式**：前端直接通过 fetch 调用 API（Tauri 环境无 CORS 限制）
- **功能矩阵**：
  - 大纲生成、文章润色、标题建议、摘要生成 → Claude/GPT-4
  - SVG 生成 → Gemini/Claude
  - 翻译 → DeepSeek/GPT-4
  - 本地 LLM → Ollama（已有 Tauri 命令支持）

### 3.2 素材管理方案
- **存储**：IndexedDB (Dexie.js) Blob 存储
- **DB Schema 扩展**：新增 `assets` 表
- **操作**：拖拽上传、从文件系统选择、剪贴板粘贴
- **预览**：缩略图生成（Canvas API）
- **与编辑器集成**：从素材库拖拽插入

### 3.3 每日灵感方案
- **内置金句库**：500+ 条中英文名言 JSON 数据
- **每日轮换算法**：基于日期 hash 的确定性选择
- **可扩展**：支持用户添加自定义灵感
- **在线增强**：可选连接名言 API

### 3.4 统计数据真实化
- **文章总数**：从 IndexedDB 实时查询
- **总字数**：聚合所有文章的字符数
- **周创作数据**：按 createdAt 日期聚合
- **效率指数**：已发布/总数 比例
- **移除虚假指标**：阅读量等外部不可获取的数据用真实可计算的指标替代

---

## 四、设计规范（强制遵循）

### 4.1 视觉语言
- **Ethereal Constructivism（空灵构成主义）**
- 背景色：#FAFBFC（宣纸微灰白）
- 强调色：#D32F2F（构成主义红）
- 辅助色：#1565C0（瑞士蓝）
- 中性色系：Blue-Grey (#263238 - #B0BEC5)
- 面板：毛玻璃效果 `backdrop-filter: blur()`

### 4.2 排版标准
- UI 字体：Inter
- 正文字体：Noto Serif SC
- 代码字体：JetBrains Mono
- 基础网格：8px
- 行高黄金比：font-size * 1.618

### 4.3 交互原则
- 面板展开：cubic-bezier(0.16, 1, 0.3, 1) 300ms
- 悬浮菜单：cubic-bezier(0.34, 1.56, 0.64, 1) 200ms
- 所有动画支持 prefers-reduced-motion
- 零 console.log（使用 logger）

### 4.4 代码规范
- TypeScript strict mode
- Zod schema 验证所有边界输入
- Repository 模式访问 DB
- 不可变状态更新
- 命名约定遵循项目现有规范

---

## 五、验收标准

### 5.1 P0 必须通过
- [ ] 编辑器无黑框，视觉干净优雅
- [ ] 三平台预览渲染正确，CSS 内联完整
- [ ] 素材库可上传、预览、管理真实图片
- [ ] AI 功能可通过真实 API 调用生成内容
- [ ] 版本管理可创建、切换、对比版本
- [ ] 文件管理器显示真实文件和素材

### 5.2 P1 必须通过
- [ ] 首页统计数据全部来自真实计算
- [ ] 分类可自定义创建、编辑、删除
- [ ] 大纲窗口可实时显示和编辑
- [ ] 设置页面所有选项可持久化且生效
- [ ] 每日灵感每天自动更换

### 5.3 P2 应该通过
- [ ] 写作辅助功能（字数、阅读时间、可读性评分）
- [ ] 首页有丰富的写作辅助入口
- [ ] 动画和交互体验流畅

### 5.4 杜绝 Mock 检查清单
- [ ] 无硬编码假数据
- [ ] 无 `// TODO: 替换为真实数据` 注释遗留
- [ ] 所有功能按钮都有真实操作响应
- [ ] 所有列表都从 DB 加载
- [ ] 所有统计都从真实数据计算

---

## 六、文件修改清单（预估）

### 新增文件
- `src/services/ai/provider.ts` — AI Provider 抽象层
- `src/services/ai/openai.ts` — OpenAI 实现
- `src/services/ai/anthropic.ts` — Anthropic 实现
- `src/services/ai/deepseek.ts` — DeepSeek 实现
- `src/components/editor/OutlinePanel.vue` — 大纲面板
- `src/components/editor/FloatingToolbar.vue` — 悬浮工具栏
- `src/components/asset/AssetManager.vue` — 素材管理器
- `src/components/asset/AssetUploader.vue` — 上传组件
- `src/stores/settings.ts` — 设置 Store（替代 localStorage 直接操作）
- `src/data/quotes.ts` — 名言金句库

### 修改文件
- `src/views/WorkstationView.vue` — 全面 UI 重构
- `src/views/HubView.vue` — Mock 数据替换
- `src/views/SettingsView.vue` — 功能完善
- `src/components/editor/EditorPanel.vue` — UI 美化 + 大纲集成
- `src/stores/editor.ts` — 版本管理增强
- `src/stores/ai.ts` — 真实 AI 调用
- `src/stores/article.ts` — 统计功能
- `src/stores/category.ts` — 自定义分类
- `src/utils/db.ts` — Schema 扩展（assets 表）
- `src/services/export/*.ts` — 渲染优化
