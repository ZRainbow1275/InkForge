# InkForge

> **Tauri 唯一交付目标 / Web 仅供开发**
>
> InkForge 仅以 Tauri 桌面端形态对外发布。`pnpm dev` 启动的 Web 模式仅用于开发调试，不视为正式产品形态；任何在浏览器中观察到的体验差异、布局问题或样式回归，均以 Tauri webview 表现为准。

InkForge 是一款面向中文创作者的 Markdown 桌面写作 APP。

## 开发模式

| 用途 | 命令 | 说明 |
|------|------|------|
| 桌面端（默认/发布态） | `pnpm tauri dev` | 完整桌面体验，发布形态一致 |
| Web 调试 | `pnpm dev` | 仅供本地开发调试，**非交付目标** |
| 类型检查 | `pnpm typecheck` | 提交前必跑 |
| 单元测试 | `pnpm test` | 提交前必跑 |
| 构建 | `pnpm tauri build` | 产出 Tauri 安装包 |

## 技术栈

- **运行时**：Tauri 2 + Rust 后端
- **前端**：Vue 3 + Vite + TypeScript（strict）
- **编辑器**：TipTap + CodeMirror 6
- **状态**：Pinia
- **样式**：原生 CSS（无 UI 库依赖）

## 目录结构

```
inkforge/
├── src/                # Vue 前端源码
│   ├── views/          # 路由级页面（Hub / Workstation / Settings ...）
│   ├── components/     # 复用组件
│   ├── stores/         # Pinia stores
│   ├── services/       # 业务服务层
│   └── ...
├── src-tauri/          # Tauri Rust 后端
└── ...
```

## 设计原则

- **桌面 APP 而非 SPA**：交互语言、键盘快捷键、状态指示均按桌面应用习惯设计
- **第一天可见**：所有功能在主 UI 内可达，不依赖引导
- **Markdown 权威**：内容来源始终是磁盘上的 `.md` 文件

更多决策出处与开发约定见仓库根 `CLAUDE.md` 与 `prompts/`。
