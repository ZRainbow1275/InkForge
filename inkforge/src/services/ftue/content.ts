import {
  SHORTCUT_DEFINITIONS,
  SHORTCUT_GROUPS,
  type ShortcutDefinition,
} from '@/stores/settings'
import type {
  HelpSearchResult,
  HelpTopic,
  MarkdownCheatsheetSection,
  ShortcutHelpGroup,
  ShortcutHelpItem,
} from './types'

export const MARKDOWN_CHEATSHEET_SECTIONS: readonly MarkdownCheatsheetSection[] = [
  {
    id: 'text-formatting',
    title: '文字格式',
    summary: '常用行内标记，不改变原始 Markdown-first 写作模型。',
    examples: [
      { label: '加粗', markdown: '**重要内容**', description: '使用双星号强调重点。' },
      { label: '斜体', markdown: '*补充说明*', description: '使用单星号表示语气或注释。' },
      { label: '行内代码', markdown: '`pnpm build`', description: '用于命令、变量和短代码。' },
    ],
  },
  {
    id: 'structure',
    title: '结构与段落',
    summary: '用标题、引用和列表建立文章层级。',
    examples: [
      { label: '标题', markdown: '## 二级标题', description: '标题层级应连续，避免跳级。' },
      { label: '引用', markdown: '> 引用或摘录', description: '适合外部资料、注释或强调块。' },
      { label: '任务列表', markdown: '- [ ] 待处理事项', description: '用于待办清单和审稿项。' },
    ],
  },
  {
    id: 'rich-content',
    title: '富内容',
    summary: '表格、代码块和分割线保持纯 Markdown 可移植性。',
    examples: [
      { label: '代码块', markdown: '```ts\nconst ready = true\n```', description: '使用语言标识提升渲染质量。' },
      { label: '表格', markdown: '| 项 | 值 |\n| --- | --- |', description: '适合短矩阵，不适合大数据表。' },
      { label: '分割线', markdown: '---', description: '用于长文中的语义分区。' },
    ],
  },
]

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: 'hub-welcome',
    title: 'Hub 与工作台入口',
    summary: '所有功能从第一天起可见，FTUE 不做渐进解锁。',
    body: [
      'Hub 用于进入文章、文件、设置和发布链路。',
      '首次欢迎不会自动创建示例文章；空状态只展示真实的新建或导入入口。',
      '如果你跳过欢迎流程，帮助中心仍可随时打开。',
    ],
    tags: ['hub', 'welcome', 'first-run', '入口'],
  },
  {
    id: 'workstation-modes',
    title: '写作模式',
    summary: 'Typora、Source、Preview 视图服务于不同写作阶段。',
    body: [
      'Typora 模式适合专注写作。',
      'Source 模式适合精确编辑 Markdown 源码。',
      'Preview 模式用于只读检查最终渲染效果。',
    ],
    tags: ['editor', 'typora', 'source', 'preview', '工作台'],
  },
  {
    id: 'markdown-cheatsheet',
    title: 'Markdown 速查',
    summary: '常用语法以静态文档呈现，不写入用户文档。',
    body: [
      '速查内容只在帮助中心展示。',
      '示例片段不会被插入当前文章，避免污染真实数据。',
      '如果需要插入结构，请在编辑器中主动输入或使用已有命令。',
    ],
    tags: ['markdown', 'cheatsheet', '语法'],
  },
  {
    id: 'keyboard-shortcuts',
    title: '快捷键',
    summary: '快捷键卡片读取当前 Settings 中的真实绑定。',
    body: [
      '如果你在 Settings 中改过快捷键，帮助中心会显示修改后的绑定。',
      '未设置的快捷键会回退显示默认绑定。',
      '快捷键说明复用 Settings 的单一配置来源。',
    ],
    tags: ['shortcut', 'keyboard', 'settings', '快捷键'],
  },
  {
    id: 'export-preflight',
    title: '导出与发布预检',
    summary: '导出前先检查目标平台、样式和素材状态。',
    body: [
      '导出配置来自 Settings > Export。',
      '发布链路需要真实账户和平台预检，不使用模拟成功状态。',
      '如果目标平台不可用，应返回明确的降级说明。',
    ],
    tags: ['export', 'publish', 'preflight', '导出'],
  },
  {
    id: 'settings-reset',
    title: '重置首次使用状态',
    summary: '重置只清空 FTUE 与帮助已读状态，不删除业务数据。',
    body: [
      '你可以在 Settings > About 中重新显示欢迎流程。',
      '该操作不会删除文章、素材、账户、导出记录或设置项。',
      '重置后下一次进入应用会再次显示轻量欢迎。',
    ],
    tags: ['settings', 'reset', 'ftue', '帮助'],
  },
]

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function shortcutToHelpItem(definition: ShortcutDefinition, shortcuts: Record<string, string>): ShortcutHelpItem {
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    binding: shortcuts[definition.id] || definition.defaultBinding,
  }
}

export function buildShortcutHelpGroups(shortcuts: Record<string, string>): ShortcutHelpGroup[] {
  return SHORTCUT_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    description: group.description,
    shortcuts: SHORTCUT_DEFINITIONS
      .filter(definition => definition.group === group.id)
      .map(definition => shortcutToHelpItem(definition, shortcuts)),
  })).filter(group => group.shortcuts.length > 0)
}

export function searchHelpContent(query: string, shortcuts: Record<string, string>): HelpSearchResult[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) {
    return []
  }

  const results: HelpSearchResult[] = []

  for (const section of MARKDOWN_CHEATSHEET_SECTIONS) {
    const sectionHaystack = normalize([
      section.title,
      section.summary,
      ...section.examples.flatMap(example => [example.label, example.markdown, example.description]),
    ].join(' '))

    if (sectionHaystack.includes(normalizedQuery)) {
      results.push({
        id: `markdown:${section.id}`,
        source: 'markdown',
        title: section.title,
        description: section.summary,
      })
    }
  }

  for (const topic of HELP_TOPICS) {
    const topicHaystack = normalize([
      topic.title,
      topic.summary,
      ...topic.body,
      ...topic.tags,
    ].join(' '))

    if (topicHaystack.includes(normalizedQuery)) {
      results.push({
        id: `topic:${topic.id}`,
        source: 'topic',
        title: topic.title,
        description: topic.summary,
      })
    }
  }

  for (const group of buildShortcutHelpGroups(shortcuts)) {
    for (const shortcut of group.shortcuts) {
      const shortcutHaystack = normalize([
        group.label,
        shortcut.label,
        shortcut.description,
        shortcut.binding,
      ].join(' '))

      if (shortcutHaystack.includes(normalizedQuery)) {
        results.push({
          id: `shortcut:${shortcut.id}`,
          source: 'shortcut',
          title: shortcut.label,
          description: shortcut.description,
          binding: shortcut.binding,
        })
      }
    }
  }

  return results.slice(0, 24)
}