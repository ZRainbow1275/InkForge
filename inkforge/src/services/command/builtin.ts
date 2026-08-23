import type { Router } from 'vue-router'
import type { Article, CreateArticleDTO } from '@/types'
import { ARTICLE_STATUS } from '@/constants'
import { generateId } from '@/utils/uuid'
import {
  CommandContextTag,
  CommandGroup,
  CommandScope,
  type Command,
  type WorkstationCommandBridge,
} from '@/types/command-palette'

interface ArticleCommandStore {
  selectedArticleId: string | null
  addArticle: (data: CreateArticleDTO) => Promise<Article>
  selectArticle: (id: string) => void
}

export interface BuiltinCommandDependencies {
  router: Router
  articleStore: ArticleCommandStore
  getWorkstationBridge: () => WorkstationCommandBridge | null
  toggleDevPanel?: () => boolean
  checkForUpdates?: () => Promise<void>
}

async function createBlankDraft(deps: BuiltinCommandDependencies): Promise<void> {
  const draft = await deps.articleStore.addArticle({
    title: '未命名文章',
    sourceUrl: `inkforge://blank/${generateId()}`,
    sourceName: 'InkForge 本地新建',
    rawContent: '',
    description: '',
    status: ARTICLE_STATUS.DRAFT,
  })

  deps.articleStore.selectArticle(draft.id)
  await deps.router.push({ path: '/workstation', query: { id: draft.id } })
}

function requireWorkstationBridge(deps: BuiltinCommandDependencies): WorkstationCommandBridge {
  const bridge = deps.getWorkstationBridge()
  if (!bridge) {
    throw new Error('This command is only available inside the Workstation.')
  }
  return bridge
}

async function openSettings(deps: BuiltinCommandDependencies, tab: string, section?: string): Promise<void> {
  await deps.router.push({
    name: 'Settings',
    query: section ? { tab, section } : { tab },
  })
}

export function createBuiltinCommands(deps: BuiltinCommandDependencies): Command[] {
  return [
    {
      id: 'document.create',
      title: 'New document',
      subtitle: 'Create a real blank draft and open it in Workstation',
      keywords: ['new', 'draft', 'article', 'document', 'create', 'blank', '新建', '文档', '草稿'],
      icon: 'FilePlus',
      scope: CommandScope.Global,
      group: CommandGroup.Document,
      contexts: [CommandContextTag.Global],
      shortcut: 'Ctrl+N',
      featured: true,
      requiredPermissions: ['document.write'],
      handler: () => createBlankDraft(deps),
    },
    {
      id: 'hub.goToHub',
      title: 'Go to Hub',
      subtitle: 'Return to the document hub',
      keywords: ['hub', 'home', 'dashboard', '首页', '返回'],
      icon: 'Home',
      scope: CommandScope.Global,
      group: CommandGroup.Hub,
      contexts: [CommandContextTag.Global],
      shortcut: 'Ctrl+Shift+H',
      featured: true,
      handler: async () => {
        await deps.router.push({ name: 'Hub' })
      },
    },
    {
      id: 'hub.openDrafts',
      title: 'Open drafts',
      subtitle: 'Review unfinished local drafts',
      keywords: ['drafts', 'writing', 'unfinished', '草稿', '未完成'],
      icon: 'FolderOpen',
      scope: CommandScope.Global,
      group: CommandGroup.Hub,
      contexts: [CommandContextTag.Global],
      handler: async () => {
        await deps.router.push({ name: 'Drafts' })
      },
    },
    {
      id: 'settings.open',
      title: 'Open settings',
      subtitle: 'Open the Settings center',
      keywords: ['settings', 'preferences', 'config', '设置', '配置'],
      icon: 'Settings',
      scope: CommandScope.Global,
      group: CommandGroup.Settings,
      contexts: [CommandContextTag.Global],
      shortcut: 'Ctrl+,',
      featured: true,
      requiredPermissions: ['settings.read'],
      handler: () => openSettings(deps, 'appearance'),
    },
    {
      id: 'settings.openAppearance',
      title: 'Appearance settings',
      subtitle: 'Theme, typography, and visual system tokens',
      keywords: ['appearance', 'theme', 'font', 'typography', '外观', '主题', '字体'],
      icon: 'Palette',
      scope: CommandScope.Global,
      group: CommandGroup.Settings,
      contexts: [CommandContextTag.Global],
      requiredPermissions: ['settings.read'],
      handler: () => openSettings(deps, 'appearance'),
    },
    {
      id: 'settings.openEditor',
      title: 'Editor settings',
      subtitle: 'Editor mode, paper width, autosave, and writing goals',
      keywords: ['editor', 'mode', 'paper', 'goal', '编辑器', '写作目标'],
      icon: 'FileEdit',
      scope: CommandScope.Global,
      group: CommandGroup.Settings,
      contexts: [CommandContextTag.Global],
      requiredPermissions: ['settings.read'],
      handler: () => openSettings(deps, 'editor'),
    },
    {
      id: 'settings.openWritingGoals',
      title: 'Writing goal settings',
      subtitle: 'Jump to document, daily, and weekly writing targets',
      keywords: ['writing', 'goal', 'target', '字数', '目标'],
      icon: 'Target',
      scope: CommandScope.Global,
      group: CommandGroup.Settings,
      contexts: [CommandContextTag.Global],
      requiredPermissions: ['settings.read'],
      handler: () => openSettings(deps, 'editor', 'writing-goal'),
    },
    {
      id: 'settings.openShortcuts',
      title: 'Keyboard shortcuts',
      subtitle: 'Review and adjust shortcut bindings',
      keywords: ['keyboard', 'shortcut', 'hotkey', '快捷键'],
      icon: 'Keyboard',
      scope: CommandScope.Global,
      group: CommandGroup.Settings,
      contexts: [CommandContextTag.Global],
      requiredPermissions: ['settings.read'],
      handler: () => openSettings(deps, 'shortcuts'),
    },
    {
      id: 'settings.openExport',
      title: 'Export settings',
      subtitle: 'Default platform, CSS, and export history',
      keywords: ['export', 'html', 'wechat', '导出', '发布'],
      icon: 'FileText',
      scope: CommandScope.Global,
      group: CommandGroup.Settings,
      contexts: [CommandContextTag.Global],
      requiredPermissions: ['settings.read'],
      handler: () => openSettings(deps, 'export'),
    },
    {
      id: 'updater.checkUpdates',
      title: 'Updater: Check for Updates',
      subtitle: 'Run a manual check and open Settings > About updater status',
      keywords: ['updater', 'update', 'release', 'version', 'tauri', '更新', '版本'],
      icon: 'RefreshCw',
      scope: CommandScope.Global,
      group: CommandGroup.Settings,
      contexts: [CommandContextTag.Global],
      requiredPermissions: ['settings.read'],
      handler: async () => {
        await deps.checkForUpdates?.()
        await openSettings(deps, 'about', 'updater')
      },
    },
    {
      id: 'dev.togglePanel',
      title: 'Developer: Toggle Panel',
      subtitle: 'Open the production-retained InkForge diagnostics drawer when Developer Mode is enabled',
      keywords: ['developer', 'devpanel', 'diagnostics', 'debug', '开发者', '诊断', '调试'],
      icon: 'Activity',
      scope: CommandScope.Global,
      group: CommandGroup.Settings,
      contexts: [CommandContextTag.Global],
      shortcut: 'Ctrl+Shift+D',
      requiredPermissions: ['settings.read'],
      handler: async () => {
        const toggled = deps.toggleDevPanel?.() ?? false
        if (!toggled) {
          await openSettings(deps, 'advanced', 'dev-panel')
          throw new Error('Developer Mode is disabled. Enable it in Settings > Advanced > Developer Mode first.')
        }
      },
    },    {
      id: 'publish.open',
      title: 'Open publish workspace',
      subtitle: 'Review publishing destinations and preflight state',
      keywords: ['publish', 'wechat', 'zhihu', 'xiaohongshu', '发布', '公众号', '知乎'],
      icon: 'Send',
      scope: CommandScope.Global,
      group: CommandGroup.Publish,
      contexts: [CommandContextTag.Global, CommandContextTag.Document],
      handler: async () => {
        await deps.router.push({ name: 'Publish' })
      },
    },
    {
      id: 'view.toggleFocusMode',
      title: 'Toggle Focus Mode',
      subtitle: 'Enter or leave the existing Workstation focus layout',
      keywords: ['focus', 'zen', 'writing', '专注', '沉浸'],
      icon: 'Focus',
      scope: CommandScope.Editor,
      group: CommandGroup.View,
      contexts: [CommandContextTag.Editor],
      shortcut: 'F11',
      featured: true,
      handler: () => requireWorkstationBridge(deps).actions.toggleFocusMode(),
    },
    {
      id: 'view.toggleTypewriterMode',
      title: 'Toggle Typewriter Mode',
      subtitle: 'Use the existing editor typewriter preference',
      keywords: ['typewriter', 'writing', 'cursor', '打字机'],
      icon: 'TextCursorInput',
      scope: CommandScope.Editor,
      group: CommandGroup.View,
      contexts: [CommandContextTag.Editor],
      shortcut: 'F9',
      handler: () => requireWorkstationBridge(deps).actions.toggleTypewriterMode(),
    },
    {
      id: 'view.switchToTyporaMode',
      title: 'Switch to Typora mode',
      subtitle: 'Use the rich writing editor',
      keywords: ['typora', 'rich', 'editor', '所见即所得', '排版'],
      icon: 'Type',
      scope: CommandScope.Editor,
      group: CommandGroup.View,
      contexts: [CommandContextTag.Editor],
      shortcut: 'Ctrl+Alt+T',
      handler: () => requireWorkstationBridge(deps).actions.switchEditorMode('typora'),
    },
    {
      id: 'view.switchToSourceMode',
      title: 'Switch to Source mode',
      subtitle: 'Edit the Markdown source directly',
      keywords: ['source', 'markdown', 'code', '源码'],
      icon: 'Code2',
      scope: CommandScope.Editor,
      group: CommandGroup.View,
      contexts: [CommandContextTag.Editor],
      shortcut: 'Ctrl+Alt+S',
      handler: () => requireWorkstationBridge(deps).actions.switchEditorMode('source'),
    },
    {
      id: 'view.switchToPreviewMode',
      title: 'Switch to Preview mode',
      subtitle: 'Open the read-only rendered preview',
      keywords: ['preview', 'render', 'reading', '预览'],
      icon: 'Eye',
      scope: CommandScope.Editor,
      group: CommandGroup.View,
      contexts: [CommandContextTag.Editor],
      shortcut: 'Ctrl+Alt+P',
      handler: () => requireWorkstationBridge(deps).actions.switchEditorMode('preview'),
    },
    {
      id: 'view.toggleSplitView',
      title: 'Toggle Split View',
      subtitle: 'Open or close the Workstation split preview pane',
      keywords: ['split', 'columns', 'preview', '分栏', '双栏', '并排'],
      icon: 'Columns2',
      scope: CommandScope.Editor,
      group: CommandGroup.View,
      contexts: [CommandContextTag.Editor],
      shortcut: 'Ctrl+Shift+E',
      handler: () => requireWorkstationBridge(deps).actions.toggleSplitView(),
    },
    {
      id: 'view.toggleSidebar',
      title: 'Toggle manager sidebar',
      subtitle: 'Show or hide the Workstation manager panel',
      keywords: ['sidebar', 'manager', 'outline', '侧边栏', '管理'],
      icon: 'PanelLeft',
      scope: CommandScope.Editor,
      group: CommandGroup.View,
      contexts: [CommandContextTag.Editor],
      shortcut: 'Ctrl+Shift+B',
      handler: () => requireWorkstationBridge(deps).actions.toggleManagerPanel(),
    },
    {
      id: 'export.openExportModal',
      title: 'Open export modal',
      subtitle: 'Export the active document using the existing export modal',
      keywords: ['export', 'html', 'markdown', 'copy', '导出', '复制'],
      icon: 'FileCode',
      scope: CommandScope.Editor,
      group: CommandGroup.Export,
      contexts: [CommandContextTag.Editor],
      featured: true,
      requiredPermissions: ['export.execute'],
      handler: () => {
        const bridge = requireWorkstationBridge(deps)
        if (!bridge.canExport) {
          throw new Error('The active document is not ready for export yet.')
        }
        bridge.actions.openExportModal()
      },
    },
  ]
}
