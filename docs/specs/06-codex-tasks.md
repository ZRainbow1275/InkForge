# InkForge v2.1 — Codex CLI 任务清单

> 2026-03-28 执行说明：本文中的任务拆解条目属于阶段性工作分解，不再单独代表当前完成状态。与 0327 任务线直接相关的实现完成度请以 `prompts/0327/*.md` 和 `.trellis/tasks/03-27-03-27-editor-hub-settings-full-upgrade/prd.md` 为准。

**日期**: 2026-03-21
**用途**: 驱动 Codex CLI 按顺序执行开发任务
**Spec 参考**: `docs/specs/00-master-plan.md` 至 `05-sync-architecture.md`

---

## 执行规则

1. 每个 Task 对应一个独立的 Codex CLI 执行单元
2. 同一 Phase 内的 Task 可并行执行（无依赖冲突时）
3. 每个 Task 必须在完成后通过 `pnpm typecheck` 验证
4. 所有新增代码必须使用 TypeScript Strict Mode
5. 图标只允许使用 `lucide-vue-next`，绝对禁止 Emoji
6. 数据只允许来自 Dexie IndexedDB，绝对禁止 Mock
7. 不允许删除或修改 TipTap 编辑器核心配置

---

## Phase 0: 数据模型前置（必须首先完成）

### Task 0.1: IndexedDB v4 升级

**Spec 参考**: `04-data-model-evolution.md` 第 2-3 章

**操作**:
```
文件: inkforge/src/utils/db.ts

1. Document 接口新增字段:
   - syncStatus?: 'local' | 'synced' | 'modified' | 'conflict'
   - syncedAt?: Date | null
   - remoteVersion?: number
   - accountId?: string

2. 新增接口定义:
   - Account { id, name, email, avatar: Blob|null, bio, createdAt, updatedAt }
   - SyncLog { id, action, documentId, timestamp, status, details }
   - SettingsProfile { id, name, settings: string, createdAt, isDefault }
   - ActivityLog { id, action, targetType, targetId, targetTitle, timestamp, metadata }

3. 新增 Dexie 表声明:
   - accounts!: Table<Account>
   - sync_logs!: Table<SyncLog>
   - settings_profiles!: Table<SettingsProfile>
   - activity_logs!: Table<ActivityLog>

4. 添加 this.version(4).stores({
     ...v3所有表不变,
     documents: 'id, categoryId, status, syncStatus, createdAt, updatedAt',
     accounts: 'id, email, createdAt',
     sync_logs: 'id, documentId, action, timestamp',
     settings_profiles: 'id, name, isDefault',
     activity_logs: 'id, action, targetType, targetId, timestamp'
   })

5. 新增 CRUD 函数:
   - createAccount, getAccount, updateAccount, deleteAccount
   - addSyncLog, getSyncLogs(documentId)
   - saveSettingsProfile, getSettingsProfiles, deleteSettingsProfile
   - logActivity(action, targetType, targetId, targetTitle, metadata?)
   - getActivityLogs(limit?: number)
   - getDatabaseSize(): Promise<{ tables: Record<string, number>, total: number }>
```

**验证**: `pnpm typecheck` 通过

---

### Task 0.2: 活动记录中间件

**Spec 参考**: `04-data-model-evolution.md` 第 4 章

**操作**:
```
新建文件: inkforge/src/utils/activity-logger.ts

导出函数:
- logDocumentCreate(documentId, title)
- logDocumentEdit(documentId, title)
- logDocumentDelete(documentId, title)
- logVersionCreate(documentId, versionLabel)
- logCategoryCreate(categoryId, name)
- logExport(documentId, platform)
- logSync(documentId, action: 'push'|'pull')
- logImport(count: number, source: string)

每个函数内部调用 db 的 logActivity()
```

**验证**: `pnpm typecheck` 通过

---

## Phase 1A: Hub 首页改造

### Task 1.1: Section Snap Scroll 容器

**Spec 参考**: `01-hub-redesign-spec.md` 第 3 章

**操作**:
```
新建: inkforge/src/components/hub/SectionScrollContainer.vue

功能:
- 外层容器 CSS: height: 100vh; overflow-y: auto; scroll-snap-type: y mandatory; scroll-behavior: smooth;
- 每个 section: min-height: 100vh; scroll-snap-align: start; display: flex; flex-direction: column; justify-content: center; padding: 48px;
- 右侧导航指示器(小圆点): fixed position, IntersectionObserver 检测当前section
- Props: sectionCount: number
- Emits: sectionChange(index: number)
- Slot: default (各section内容)

使用 Lucide 图标: Circle (当前section), CircleDot (非当前)
```

### Task 1.2: 创作流卡片修复

**Spec 参考**: `01-hub-redesign-spec.md` 第 4 章

**操作**:
```
修改: inkforge/src/views/HubView.vue

1. 柱状图对齐修复:
   - 将当前柱状图容器改为 CSS Grid: grid-template-columns: repeat(7, 1fr)
   - 每列内: bar 容器(flex-grow) + 星期标签(flex-shrink-0)
   - 确保 bar 和 label 在同一 grid cell 内垂直居中

2. 新建浮窗组件: inkforge/src/components/hub/DayDetailPopover.vue
   - Props: { visible: boolean, dayIndex: number, articles: Article[], anchorRect: DOMRect }
   - 内容: 日期标题 + 文章数 + 文章标题列表(可点击跳转workstation)
   - 定位: absolute, top/left 根据 anchorRect 计算
   - 动画: scale(0.95)->1, opacity 0->1, 150ms ease-out
   - 关闭: 点击外部 / Esc 键
```

### Task 1.3: 模板市场卡片

**Spec 参考**: `01-hub-redesign-spec.md` 第 5 章

**操作**:
```
新建: inkforge/src/components/hub/TemplateMarketCard.vue

1. 数据源: import { themePresets } from '@/services/export/themes'
2. 布局: 2列 grid (grid-template-columns: repeat(2, 1fr); gap: 16px)
3. 每个主题卡片:
   - 预览区: 160px 高, 显示 sampleTitle + sampleText
   - 信息区: 主题名 + 描述 + 标签(font/style/layout)
   - Hover: translateY(-4px) + shadow
   - 选中: border-color: #D32F2F + ring
4. Emoji -> Lucide 图标映射:
   - ScrollText, Scale, BarChart3, Newspaper, Cpu, Terminal, BookOpen, FileText, Palette, Feather
5. "应用"按钮: hover 显示, 点击 settingsStore.settings.export.defaultPresetId = id
6. 卡片标题区: "模板市场" + 右侧 "查看全部" 链接(router-link to="/themes")

注意: 完全匹配 prototype/inkforge_themes.html 的视觉风格
```

### Task 1.4: 创作热力图

**Spec 参考**: `01-hub-redesign-spec.md` 第 6 章

**操作**:
```
新建: inkforge/src/components/hub/ContributionHeatmap.vue

1. Props: { articles: Article[] }
2. 数据计算: 统计过去52周每天的文章创作数
   - Map<string(YYYY-MM-DD), number> 从 articles 的 createdAt/updatedAt 统计
3. SVG渲染: 52列 x 7行 rect grid
   - 每个 rect: 11x11, gap 3px, rx 2
   - 颜色5级: 0=#F5F5F5, 1=#FFCDD2, 2=#EF9A9A, 3=#E53935, 4=#B71C1C
4. 月份标签(Jan-Dec): SVG text, font-size 10px
5. 星期标签(Mon/Wed/Fri): SVG text, font-size 10px
6. Tooltip: mouseover 显示日期+创作数 (absolute div)
7. 卡片标题: "创作热力图" + 右侧年度总创作数
8. Lucide 图标: Flame (标题旁)
```

### Task 1.5: 字数趋势 + 分类分布

**Spec 参考**: `01-hub-redesign-spec.md` 第 7-8 章

**操作**:
```
新建: inkforge/src/components/hub/WordCountTrend.vue
- Props: { articles: Article[] }
- SVG 面积图: 最近30天每日字数
- X轴: 日期, Y轴: 字数
- 填充: accent color 10% opacity
- 线条: accent color 2px
- Lucide 图标: TrendingUp

新建: inkforge/src/components/hub/CategoryDistribution.vue
- Props: { articles: Article[], categories: Category[] }
- SVG 环形图(donut): 每个分类一个弧段
- 中心: 总文章数
- 右侧图例: 分类名 + 颜色块 + 数量
- Lucide 图标: PieChart
```

### Task 1.6: 文章瀑布流

**Spec 参考**: `01-hub-redesign-spec.md` 第 9 章

**操作**:
```
新建: inkforge/src/components/hub/ArticleWaterfall.vue
- Props: { articles: Article[], categories: Category[] }
- CSS columns: column-count 3(桌面)/2(平板)/1(手机)
- break-inside: avoid

新建: inkforge/src/components/hub/ArticleCard.vue
- Props: { article: Article, categoryName?: string }
- 可变高度: 标题 + 内容预览(前200字) + 分类标签 + 更新时间 + 字数
- Hover: translateY(-2px) + shadow
- 点击: router.push('/workstation?id=' + article.id)
- Lucide 图标: FileText(默认), Clock(时间), Hash(字数)
```

### Task 1.7: HubView 总装配

**操作**:
```
修改: inkforge/src/views/HubView.vue

1. 引入 SectionScrollContainer 包裹整个页面
2. Section 1: 原有 Hero + Stats Bento Grid
3. Section 2: 创作流卡片(修复后) + 模板市场卡片
4. Section 3: 创作热力图 + 字数趋势 + 分类分布
5. Section 4: 文章瀑布流
6. 替换所有内联SVG和Emoji为Lucide组件
7. 保留所有现有computed属性和store绑定
```

---

## Phase 1B: Workstation 改造（可与 1A 并行）

### Task 2.1: 移除 Stage 冗余元素

**Spec 参考**: `02-workstation-spec.md` 第 3 章

**操作**:
```
修改: inkforge/src/views/WorkstationView.vue

1. 删除 Stage 预设快速选择区域 (template 中 .stage-presets 相关 HTML)
2. 删除 Stage 操作按钮组 (template 中 .stage-actions 相关 HTML)
3. 删除关联 CSS (.stage-presets, .stage-actions 及子选择器)
4. 保留: 平台Tab切换 + iPhone设备框预览
5. 保留 script 中的 topPresets/applyPreset (Inspector 仍使用)
```

### Task 2.2: 面板标题统一

**Spec 参考**: `02-workstation-spec.md` 第 4 章

**操作**:
```
统一规格: font-size: 13px; font-weight: 600; color: #607D8B; letter-spacing: 0.02em; text-transform: none;

修改文件:
1. inkforge/src/components/version/VersionPanel.vue - .header-title
2. inkforge/src/components/outline/OutlinePanel.vue - .outline-header-text
3. inkforge/src/views/WorkstationView.vue - .inspector-label
```

### Task 2.3: 文件管理增强

**Spec 参考**: `02-workstation-spec.md` 第 5 章

**操作**:
```
新建: inkforge/src/components/file/DraftBox.vue
- 查询: db.documents.where('status').equals('draft')
- 显示: 标题 + 相对时间
- 操作: 点击打开, 右键(重命名/删除/移至分类)
- 图标: FileEdit (Lucide)

新建: inkforge/src/components/file/AssetPreview.vue
- 数据: assetStore.assets.slice(0, 9)
- Grid: repeat(3, 1fr), gap 6px, 缩略图 48x48
- 拖拽: @dragstart 设置 dataTransfer

修改: inkforge/src/components/file/FileManager.vue
- 集成 DraftBox (文件树上方)
- 集成 AssetPreview (文件树下方)
- 添加排序控制 (name/updated/words)
- 添加拖拽文档到分类
- 添加 inline 重命名
- 添加"复制文档"右键菜单项
```

### Task 2.4: 版本对比重写

**Spec 参考**: `02-workstation-spec.md` 第 6 章

**操作**:
```
新建: inkforge/src/utils/diff.ts
- DiffChunk 接口
- DiffStats 接口
- computeChunkedDiff(oldText, newText): DiffChunk[]
- computeDiffStats(chunks): DiffStats

新建: inkforge/src/components/version/DiffViewer.vue
- Props: { chunks, stats, mode: 'unified'|'side-by-side', oldLabel, newLabel }
- 颜色: 新增=green, 删除=red, 修改=yellow
- Side-by-side 滚动同步
- 统计摘要栏

重写: inkforge/src/components/version/VersionDiffModal.vue
- Props: { baseVersion, compareVersion } (不再从外部传入 diffLines)
- 内部调用 computeChunkedDiff
- 模式切换 UI

修改: inkforge/src/components/version/VersionPanel.vue
- 添加"与上一版本对比"快捷按钮
- 添加"与初始版本对比"快捷按钮
- 图标: GitCompareArrows, History (Lucide)
```

### Task 2.5: 同步功能

**Spec 参考**: `02-workstation-spec.md` 第 7 章

**操作**:
```
新建: inkforge/src/components/sync/SyncStatusIcon.vue
- Props: { status, pendingCount }
- 图标映射: idle+0=CheckCircle, idle+n=CloudUpload, syncing=RefreshCw(旋转), error=AlertTriangle, conflict=AlertOctagon, offline=CloudOff

新建: inkforge/src/components/sync/SyncMenu.vue
- Props: { visible, status, lastSyncAt, pendingCount }
- 菜单项: 保存到本地 / 同步到云端 / 最后同步时间 / 同步设置
- Lucide 图标: Save, Cloud, Clock, Settings

修改: inkforge/src/views/WorkstationView.vue
- Header 操作区: 替换导出按钮为 SyncStatusIcon + SyncMenu
```

### Task 2.6: 编辑器增强

**Spec 参考**: `02-workstation-spec.md` 第 8 章

**操作**:
```
新建: inkforge/src/extensions/MarkdownHints.ts
- TipTap Extension
- Decoration plugin: heading旁显示 ### , 列表旁显示 -
- enabled option 绑定 settings.editor.showMarkdownHints

新建: inkforge/src/components/editor/WritingGoal.vue
- Props: { currentWords, goalWords }
- 进度条 + 文字 "120 / 500"
- 达标: 颜色变绿 + confetti CSS 动画

修改: inkforge/src/stores/settings.ts
- EditorSchema 添加: showMarkdownHints: z.boolean().default(false)
- EditorSchema 添加: dailyWordGoal: z.number().min(0).max(50000).default(0)

修改: inkforge/src/components/editor/EditorPanel.vue
- extensions 数组添加 MarkdownHints

修改: inkforge/src/components/editor/EditorStatusBar.vue
- 集成 WritingGoal 组件
```

---

## Phase 2: Settings 企业级改造

### Task 3.1: Tab 结构扩展

**Spec 参考**: `03-settings-enterprise-spec.md` 第 2-3 章

**操作**:
```
修改: inkforge/src/views/SettingsView.vue

1. TabId 类型扩展: 添加 'account' | 'sync' | 'advanced'
2. tabs 数组: 10个Tab (Account在最前, About在最后)
3. 图标: User, Palette, PenTool, Upload, Cpu, Database, Cloud, Keyboard, Wrench, Info (Lucide)
```

### Task 3.2: Account Tab

**Spec 参考**: `03-settings-enterprise-spec.md` 第 4 章

**操作**:
```
修改: inkforge/src/views/SettingsView.vue - 新增 Account section

功能:
- 头像编辑 (本地图片上传, Blob存储)
- 默认头像: 基于名称首字母SVG生成
- 名称/邮箱/个人简介编辑
- 数据导出 (JSON格式)
- 账户删除 (二次确认)
- "即将推出" 占位: OAuth 登录, 多设备同步
```

### Task 3.3: 使所有设置生效

**Spec 参考**: `03-settings-enterprise-spec.md` 第 3 章

**操作**:
```
逐项确认并修复:

1. Appearance:
   - theme: document.documentElement.classList 切换
   - accentColor: CSS --accent-primary 动态更新
   - sidebarWidth: Manager面板宽度绑定
   - reducedMotion: 全局动画开关

2. Editor:
   - autoSave: setInterval 定时器
   - spellCheck: TipTap spellcheck 属性
   - showLineNumbers: 编辑器CSS
   - highlightActiveLine: CSS

3. AI:
   - provider切换: 重新初始化AI客户端
   - apiKey: 星号遮罩显示
   - 连接测试按钮

4. Data:
   - 存储使用量: navigator.storage.estimate()
   - 手动备份/恢复: IndexedDB 导出/导入
```

### Task 3.4: Sync Tab

**Spec 参考**: `03-settings-enterprise-spec.md` 第 5 章 + `05-sync-architecture.md`

**操作**:
```
修改: inkforge/src/views/SettingsView.vue - 新增 Sync section
修改: inkforge/src/stores/settings.ts - 添加 SyncSchema

功能:
- 同步目标配置 (WebDAV/S3/REST API)
- 同步策略 (自动/手动, 间隔, 冲突策略)
- 同步状态Dashboard
- 加密设置 (AES-GCM-256 状态展示, 主密钥初始化/解锁, 恢复密钥导出/导入)
- 明确把主密钥管理 UI 作为独立验收项，不能只停留在底层 API 可用
```

### Task 3.5: Advanced Tab

**Spec 参考**: `03-settings-enterprise-spec.md` 第 6 章

**操作**:
```
修改: inkforge/src/views/SettingsView.vue - 新增 Advanced section

功能:
- 开发者选项 (日志级别, 性能指标)
- 实验性功能开关 (Feature Flags)
- 数据迁移 (导入 Notion/Obsidian/Typora .md 文件)
- 代理设置 (AI API 代理)
- 设置Profile系统 (保存/切换/删除)
```

### Task 3.6: Settings 搜索功能

**操作**:
```
修改: inkforge/src/views/SettingsView.vue

1. 顶部添加搜索栏 (Search icon + input)
2. 设置项索引: { tabId, settingId, label, description, keywords }[]
3. 实时过滤: 匹配项高亮, 自动切换到对应Tab
4. Lucide 图标: Search
```

---

## Phase 3: 同步架构

### Task 4.1: Transport Adapters

**Spec 参考**: `05-sync-architecture.md` 第 5 章

**操作**:
```
新建: inkforge/src/services/sync/adapters/webdav.ts
新建: inkforge/src/services/sync/adapters/s3.ts
新建: inkforge/src/services/sync/adapters/rest.ts
新建: inkforge/src/services/sync/adapters/types.ts

接口:
interface SyncAdapter {
  type: 'webdav' | 's3' | 'rest'
  testConnection(): Promise<SyncConnectionResult>
  listRemoteChanges(): Promise<RemoteManifestEntry[]>
  download(documentId: string): Promise<ArrayBuffer>
  upload(payload: SyncUploadPayload): Promise<RemoteManifestEntry>
  delete(payload: SyncDeletePayload): Promise<RemoteManifestEntry>
  resolveConflict(payload: SyncResolvePayload): Promise<RemoteManifestEntry | void>
}
```

### Task 4.2: Encryption Layer

**Spec 参考**: `05-sync-architecture.md` 第 4 章

**操作**:
```
复用现有: inkforge/src/utils/crypto/
复用现有: inkforge/src/services/sync/key-derivation.ts
复用现有: inkforge/src/services/sync/format.ts

功能:
- 复用已存在的主密钥包装/解锁/导出导入能力，不再新增 `deriveKeyFromPassword` 风格旧接口
- 同步运行时通过 `getMasterKey({ extractable: true })` 获取临时可导出主密钥
- `.inkforge` 格式的 metadata/payload 分段加密与解密
- 明确区分 PBKDF2 310,000（主密钥包装）与 PBKDF2 100,000（同步内容派生）

使用 Web Crypto API: AES-GCM-256
```

### Task 4.3: Sync Engine 增强

**Spec 参考**: `05-sync-architecture.md` 第 2-3 章

**操作**:
```
修改: inkforge/src/services/sync/engine.ts (如果存在)
或: inkforge/src/stores/sync.ts

增强:
- 集成 Transport Adapter 选择
- 集成 Encryption Layer
- 变更队列去重合并
- 冲突检测 + 自动/手动解决
- 同步日志记录
```

---

## 验证清单

每个 Phase 完成后执行:

```bash
cd inkforge
pnpm typecheck    # TypeScript 零错误
pnpm lint         # ESLint 零警告
pnpm dev          # 开发服务器启动正常
```

手动验证:
- [ ] Hub 页面四个 Section 可正常滚动切换
- [ ] 创作流柱状图 bar 与星期标签对齐
- [ ] 模板市场卡片显示且无 Emoji
- [ ] 热力图渲染真实数据
- [ ] 瀑布流文章展示正常
- [ ] Workstation Stage 无冗余按钮
- [ ] 面板标题大小一致
- [ ] 草稿箱显示 draft 文档
- [ ] 版本对比可选择两个版本并展示 diff
- [ ] 同步图标显示正确状态
- [ ] 设置页面 10 个 Tab 均可进入
- [ ] 所有设置项修改后实际生效

---

*本文档为 Codex CLI 的执行蓝图。每个 Task 包含精确的文件路径、操作内容和验证标准。*
