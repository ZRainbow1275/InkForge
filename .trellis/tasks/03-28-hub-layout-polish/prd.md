# Hub 首页布局精修

## 问题清单 (来自用户截图标注)

### P1: Header 搜索框不可交互 (红框)
- HubHeader 中的 `Ctrl/Cmd+N 新建` 和 `Ctrl/Cmd+F 搜索` 区域看起来像搜索框但无法点击
- 需要：让搜索快捷键提示区域可以点击 — 点击"搜索"部分应滚动到文章库 Section 并聚焦搜索框，点击"新建"部分应触发 handleNewArticle

### P2: 三个新建入口冲突 (蓝圈)
- Header 右上角 "新建" 按钮、card-recent 的 "空白草稿" 按钮、右下角 FAB "+" 按钮 — 三个视觉上太抢眼
- 需要：Header "新建" 按钮保留但视觉降级（改为 ghost 按钮，去掉红色实心背景），FAB 保持圆形但缩小为 48px，card-recent 按钮保持不变作为主入口

### P3: card-recent 底部空白 (黄框)
- Quick Create 下方有大片空白区域，视觉不和谐
- 需要：在空白区填充有用内容 — 添加"最近编辑快照"(显示最近3篇文章的标题列表)，或者让 card-recent 内容垂直居中填满

### P4: Bento Grid 组件溢出/显示不全
- 当视口高度不够时，卡片内容被裁切
- 需要：将 bento grid 的 `height: calc(100vh - 160px)` 改为 `min-height: calc(100vh - 160px); height: auto;`，同时 grid-template-rows 从 `repeat(3, minmax(0, 1fr))` 改为 `auto auto auto`

## 影响文件
- `inkforge/src/views/HubView.vue` — 主布局修改
- `inkforge/src/components/hub/HubHeader.vue` — 搜索框可点击

## 验收标准
- [ ] 点击 Header 搜索区域可触发搜索/新建
- [ ] 新建入口视觉层级分明，不冲突
- [ ] card-recent 无大片空白
- [ ] Bento Grid 在小屏不裁切
- [ ] TypeScript 零错误
