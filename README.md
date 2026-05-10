# InkForge

> **InkForge 唯一的交付目标是 Tauri 桌面应用。** Web 路径（`pnpm dev`）仅供开发调试，不作为产品形态对外发布。生产构建请使用 `pnpm tauri:build` 输出原生桌面包。

InkForge 是一款面向中文创作者的 Markdown-first 深度写作工具，前端基于 Vue 3 + TipTap + CodeMirror 6，桌面壳层基于 Tauri。

## 目录结构

- `inkforge/` — 实际产品代码（Vue 3 应用 + Tauri 壳层），所有开发工作均在此目录进行
- `prompts/` — 历次产品决策与规划文档归档
- `prototype/` — 早期原型片段与设计探索
- `docs/` — 设计文档与对外说明
- `.trellis/` — 任务系统与协作流水线

> 项目根目录同名的 `src/` 是历史遗留，**不要在根 `src/` 下编辑代码**。所有当前代码以 `inkforge/` 为准。

## 开发

```bash
cd inkforge
pnpm install

# 开发态（仅供调试，不是产品形态）
pnpm dev

# 桌面 APP 开发
pnpm tauri:dev

# 类型检查
pnpm typecheck

# Lint
pnpm lint
```

## 生产构建

```bash
cd inkforge
pnpm tauri:build
```

构建产物为对应操作系统的原生安装包（Windows `.msi` / macOS `.dmg` / Linux `.AppImage`），是 InkForge 唯一的交付形态。

## 设计取向

- **Markdown 权威**：所有文档以 Markdown 为单一真值源，渲染层不污染原文
- **本地优先**：所有数据保存在用户本地，不引入云同步耦合
- **桌面 APP 操作语言**：Hub 滑动 + 阻尼、工作台磁吸式检查器、Typora 式所见即所得
- **拒绝引导**：所有功能从第一天起完整可见，欢迎弹窗仅在用户主动从设置触发时显示

详细产品决策见 `prompts/0506/` 与 `.trellis/tasks/`.
