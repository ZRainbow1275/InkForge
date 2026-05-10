import type { Component } from 'vue'
import {
  BarChart3,
  BookOpen,
  Bot,
  Code2,
  Feather,
  FileText,
  Flame,
  Folder,
  GraduationCap,
  LayoutTemplate,
  Lightbulb,
  MapPin,
  MessageSquare,
  Newspaper,
  PenLine,
  Rocket,
  Scale,
  Sparkles,
  Star,
  Target,
} from 'lucide-vue-next'

type IconComponent = Component

const exportIconMap: Record<string, IconComponent> = {
  thesis: FileText,
  legal: Scale,
  report: BarChart3,
  commentary: MessageSquare,
  aigc: Bot,
  code: Code2,
  notes: BookOpen,
  news: Newspaper,
  meme: Sparkles,
  life: PenLine,
  elegant: Feather,
  tech: Rocket,
  wechat: MessageSquare,
  xiaohongshu: BookOpen,
  zhihu: GraduationCap,
  'xhs-fresh': Sparkles,
  'xhs-simple': LayoutTemplate,
  'xhs-warm': PenLine,
  'xhs-tech': Code2,
  'xhs-nature': Feather,
  'zhihu-academic': GraduationCap,
  'zhihu-tech': Code2,
  'zhihu-insight': PenLine,
}

const exportIconAliases: Record<string, string> = {
  '📜': 'thesis',
  '⚖️': 'legal',
  '📊': 'report',
  '💬': 'commentary',
  '🤖': 'aigc',
  '💻': 'code',
  '📚': 'notes',
  '📰': 'news',
  '🎭': 'meme',
  '💭': 'life',
  '🪶': 'elegant',
  '🚀': 'tech',
  '📕': 'xiaohongshu',
  '🔵': 'zhihu',
  '🌸': 'xhs-fresh',
  '✨': 'xhs-simple',
  '🧸': 'xhs-warm',
  '🔮': 'xhs-tech',
  '🌿': 'xhs-nature',
  '🎓': 'zhihu-academic',
  '📝': 'zhihu-insight',
}

export function resolveExportIcon(iconOrKey?: string, fallback: string = 'thesis'): IconComponent {
  const resolvedKey = exportIconAliases[iconOrKey ?? ''] ?? iconOrKey ?? fallback
  return exportIconMap[resolvedKey] ?? exportIconMap[fallback] ?? FileText
}

const categoryIconMap: Record<string, IconComponent> = {
  uncategorized: FileText,
  folder: Folder,
  ai: Bot,
  writing: FileText,
  analytics: BarChart3,
  idea: Lightbulb,
  news: Newspaper,
  code: Code2,
  target: Target,
  pin: MapPin,
  favorite: Star,
  hot: Flame,
  chat: MessageSquare,
}

const categoryIconAliases: Record<string, string> = {
  '📄': 'uncategorized',
  '📁': 'folder',
  '🤖': 'ai',
  '📜': 'writing',
  '📊': 'analytics',
  '💡': 'idea',
  '📰': 'news',
  '💻': 'code',
  '🎯': 'target',
  '📌': 'pin',
  '⭐': 'favorite',
  '🔥': 'hot',
  '💬': 'chat',
}

export const CATEGORY_ICON_OPTIONS = [
  { key: 'folder', label: '通用', component: Folder },
  { key: 'ai', label: 'AI', component: Bot },
  { key: 'writing', label: '写作', component: FileText },
  { key: 'analytics', label: '分析', component: BarChart3 },
  { key: 'idea', label: '灵感', component: Lightbulb },
  { key: 'news', label: '新闻', component: Newspaper },
  { key: 'code', label: '开发', component: Code2 },
  { key: 'target', label: '目标', component: Target },
  { key: 'pin', label: '重点', component: MapPin },
  { key: 'favorite', label: '收藏', component: Star },
  { key: 'hot', label: '热点', component: Flame },
  { key: 'chat', label: '讨论', component: MessageSquare },
] as const

export function normalizeCategoryIcon(icon?: string, fallback: string = 'folder'): string {
  return categoryIconAliases[icon ?? ''] ?? icon ?? fallback
}

export function resolveCategoryIcon(icon?: string, fallback: string = 'folder'): IconComponent {
  const resolvedKey = normalizeCategoryIcon(icon, fallback)
  return categoryIconMap[resolvedKey] ?? categoryIconMap[fallback] ?? Folder
}
