import {
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenText,
  Bot,
  Feather,
  FileText,
  Flame,
  GitCompareArrows,
  Library,
  Lightbulb,
  MessageSquare,
  Monitor,
  Newspaper,
  NotebookPen,
  Palette,
  PenLine,
  Pin,
  Rocket,
  Scale,
  ScrollText,
  Sparkles,
  Star,
  Target,
  Terminal,
  type LucideIcon,
  Folder,
} from 'lucide-vue-next'

const ICON_COMPONENTS = {
  Folder,
  Bot,
  ScrollText,
  BarChart3,
  Lightbulb,
  Newspaper,
  Monitor,
  Target,
  Pin,
  Star,
  Flame,
  MessageSquare,
  Library,
  BookOpen,
  BookOpenText,
  Scale,
  BookMarked,
  Terminal,
  GitCompareArrows,
  FileText,
  Sparkles,
  Palette,
  Feather,
  PenLine,
  Rocket,
  NotebookPen,
} as const satisfies Record<string, LucideIcon>

export type AppIconName = keyof typeof ICON_COMPONENTS

const LEGACY_ICON_ALIASES: Record<string, AppIconName> = {
  '\u{1F4C1}': 'Folder',
  '\u{1F916}': 'Bot',
  '\u{1F4DC}': 'ScrollText',
  '\u{1F4CA}': 'BarChart3',
  '\u{1F4A1}': 'Lightbulb',
  '\u{1F4F0}': 'Newspaper',
  '\u{1F4BB}': 'Terminal',
  '\u{1F3AF}': 'Target',
  '\u{1F4CC}': 'Pin',
  '\u{2B50}': 'Star',
  '\u{1F525}': 'Flame',
  '\u{1F4AC}': 'MessageSquare',
  '\u{1F4DA}': 'BookOpen',
  '\u{1F4D6}': 'BookOpenText',
  '\u2696\uFE0F': 'Scale',
  '\u{1F4D4}': 'NotebookPen',
  '\u{1F500}': 'GitCompareArrows',
  '\u{1F4DD}': 'FileText',
  '\u{1F3AD}': 'Palette',
  '\u{1F4AD}': 'Feather',
  '\u{1FAB6}': 'PenLine',
  '\u{1F680}': 'Rocket',
  '\u{1F338}': 'Sparkles',
  '\u2728': 'Sparkles',
  '\u{1F9F8}': 'BookMarked',
  '\u{1F52E}': 'Sparkles',
  '\u{1F33F}': 'Feather',
  '\u{1F393}': 'BookOpen',
}

export const CATEGORY_ICON_OPTIONS = [
  { value: 'Folder', label: '文件夹' },
  { value: 'Bot', label: 'AI' },
  { value: 'ScrollText', label: '文稿' },
  { value: 'BarChart3', label: '数据' },
  { value: 'Lightbulb', label: '灵感' },
  { value: 'Newspaper', label: '新闻' },
  { value: 'Monitor', label: '技术' },
  { value: 'Target', label: '目标' },
  { value: 'Pin', label: '重点' },
  { value: 'Star', label: '收藏' },
  { value: 'Flame', label: '热点' },
  { value: 'MessageSquare', label: '讨论' },
] as const satisfies ReadonlyArray<{ value: AppIconName; label: string }>

export function isKnownAppIconName(value: string): value is AppIconName {
  return value in ICON_COMPONENTS
}

export function normalizeIconName(
  value: string | null | undefined,
  fallback: AppIconName = 'FileText'
): AppIconName {
  if (!value) {
    return fallback
  }

  if (isKnownAppIconName(value)) {
    return value
  }

  return LEGACY_ICON_ALIASES[value] ?? fallback
}

export function resolveIconComponent(
  value: string | null | undefined,
  fallback: AppIconName = 'FileText'
): LucideIcon {
  return ICON_COMPONENTS[normalizeIconName(value, fallback)] ?? ICON_COMPONENTS[fallback]
}
