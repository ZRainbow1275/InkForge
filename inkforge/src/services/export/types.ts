/**
 * 导出服务类型定义
 *
 * 统一的类型系统，支持微信公众号、知乎、小红书三个平台的导出渲染
 */

import type { ExportPreset } from '@/types'

// ═══════════════════════════════════════════════════════════════════
// 代码高亮主题
// ═══════════════════════════════════════════════════════════════════

/**
 * 代码高亮主题标识
 * - atom-one-dark: Atom 暗色主题（默认）
 * - atom-one-light: Atom 亮色主题
 * - github-dark: GitHub 暗色主题
 * - github-light: GitHub 亮色主题
 * - monokai: Monokai 经典主题
 * - vs2015: VS2015 暗色主题
 * - dracula: Dracula 紫色主题
 */
export type CodeTheme =
  | 'atom-one-dark'
  | 'atom-one-light'
  | 'github-dark'
  | 'github-light'
  | 'monokai'
  | 'vs2015'
  | 'dracula'

/**
 * 代码高亮主题颜色配置
 */
export interface CodeThemeColors {
  /** 背景色 */
  background: string
  /** 前景色（默认文本） */
  foreground: string
  /** 注释色 */
  comment: string
  /** 关键字色 */
  keyword: string
  /** 字符串色 */
  string: string
  /** 数字/常量色 */
  number: string
  /** 函数名色 */
  function: string
  /** 类型/类名色 */
  type: string
  /** 变量/属性色 */
  variable: string
  /** 标签/HTML标签色 */
  tag: string
  /** 属性名色 */
  attribute: string
  /** 操作符色 */
  operator: string
  /** 行号色 */
  lineNumber: string
  /** 行号边框色 */
  lineNumberBorder: string
  /** Mac 头部背景色 */
  macHeaderBg: string
}

// ═══════════════════════════════════════════════════════════════════
// GitHub 风格 Alert 块
// ═══════════════════════════════════════════════════════════════════

/**
 * GitHub 风格 Alert 类型
 * 对应 Markdown: `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!CAUTION]`, `> [!IMPORTANT]`
 */
export type AlertType = 'note' | 'tip' | 'warning' | 'caution' | 'important'

/**
 * Alert 块配色方案
 */
export interface AlertTheme {
  /** 图标（Unicode/SVG） */
  icon: string
  /** 标题文本 */
  title: string
  /** 主色调 */
  color: string
  /** 背景色 */
  backgroundColor: string
  /** 边框色 */
  borderColor: string
}

// ═══════════════════════════════════════════════════════════════════
// 导出选项
// ═══════════════════════════════════════════════════════════════════

/**
 * 导出选项接口
 * 统一配置三平台渲染行为
 */
export interface ExportOptions {
  /** 启用外链转脚注 (默认true) */
  enableCiteStatus?: boolean
  /** 启用代码行号 (默认false) */
  enableLineNumbers?: boolean
  /** 启用阅读时间显示 (默认true) */
  enableReadingTime?: boolean
  /** 自定义阅读速度 (字/分钟, 默认300) */
  readingSpeed?: number
  /** 启用代码高亮 (默认true) */
  enableCodeHighlight?: boolean
  /** 启用 Mac 风格代码块 - 三色圆点头部 (默认false) */
  enableMacCodeBlock?: boolean
  /** 启用段落首行缩进 (默认undefined，跟随预设) */
  enableTextIndent?: boolean
  /** 代码主题 (默认atom-one-dark) */
  codeTheme?: CodeTheme
  /** 启用 GitHub 风格 Alert 块渲染 (默认true) */
  enableAlertBlocks?: boolean
  /** 启用表格增强样式 — 条纹行/圆角/hover效果 (默认true) */
  enableEnhancedTable?: boolean
  /** 启用代码块语言标签显示 (默认true) */
  enableCodeLanguageLabel?: boolean
}

/**
 * 导出结果接口
 */
export interface ExportResult {
  /** 处理后的HTML */
  html: string
  /** 文章统计信息 */
  stats: ExportStats
}

/**
 * 文章统计信息
 */
export interface ExportStats {
  /** 字数 */
  wordCount: number
  /** 阅读时间(分钟) */
  readingTime: number
  /** 代码块数量 */
  codeBlockCount: number
  /** 外链数量 */
  linkCount: number
  /** 图片数量 */
  imageCount: number
  /** 标题数量 */
  headingCount: number
  /** 表格数量 */
  tableCount: number
}

/**
 * 脚注数据结构
 * 用于外链转脚注功能
 */
export interface Footnote {
  /** 链接显示文本 */
  title: string
  /** 链接地址 */
  href: string
}

// ═══════════════════════════════════════════════════════════════════
// 平台类型
// ═══════════════════════════════════════════════════════════════════

/**
 * 平台类型
 */
export type Platform = 'wechat' | 'xiaohongshu' | 'zhihu'

// ═══════════════════════════════════════════════════════════════════
// 小红书预设
// ═══════════════════════════════════════════════════════════════════

/**
 * 小红书预设类型
 */
export interface XiaohongshuPreset {
  id: string
  name: string
  icon: string
  primaryColor: string
  accentColor: string
  /** 二级背景色 */
  secondaryBg?: string
  /** 列表标记 emoji */
  listMarker?: string
  /** 分割线装饰文案 */
  dividerText?: string
  customCSS?: string
}

// ═══════════════════════════════════════════════════════════════════
// 知乎预设
// ═══════════════════════════════════════════════════════════════════

/**
 * 知乎预设类型
 */
export interface ZhihuPreset {
  id: string
  name: string
  icon: string
  primaryColor: string
  accentColor: string
  /** 正文字号 */
  fontSize?: string
  /** 代码主题覆盖 */
  codeTheme?: CodeTheme
  customCSS?: string
}

// ═══════════════════════════════════════════════════════════════════
// 平台预设注册表
// ═══════════════════════════════════════════════════════════════════

/**
 * 平台预设集合（泛型）
 */
export interface PlatformPresetRegistry {
  wechat: ExportPreset[]
  xiaohongshu: XiaohongshuPreset[]
  zhihu: ZhihuPreset[]
}

// 重新导出 ExportPreset 类型
export type { ExportPreset }

// ═══════════════════════════════════════════════════════════════════
// 平台专用导出选项
// ═══════════════════════════════════════════════════════════════════

/** Inspector 颜色覆盖配置 */
export interface ColorOverrides {
  primaryColor?: string
}

/**
 * 小红书导出选项
 * 继承通用 ExportOptions 的代码块相关字段，添加平台特有的颜色覆盖
 */
export interface XiaohongshuExportOptions {
  enableLineNumbers?: boolean
  enableMacCodeBlock?: boolean
  /** Inspector 颜色覆盖 */
  colorOverrides?: ColorOverrides
}

/**
 * 知乎导出选项
 * 继承通用 ExportOptions 的大部分字段，添加平台特有的颜色覆盖
 */
export interface ZhihuExportOptions {
  enableCiteStatus?: boolean
  enableCodeHighlight?: boolean
  enableAlertBlocks?: boolean
  enableEnhancedTable?: boolean
  codeTheme?: CodeTheme
  /** Inspector 颜色覆盖 */
  colorOverrides?: ColorOverrides
}

// ═══════════════════════════════════════════════════════════════════
// 平台原生格式导出类型
// ═══════════════════════════════════════════════════════════════════

/** 小红书纯文本导出结果 */
export interface XiaohongshuTextResult {
  /** 纯文本内容（可直接粘贴到小红书） */
  text: string
  /** 字数统计（含标点、空格） */
  charCount: number
  /** 是否超过 1000 字限制 */
  overLimit: boolean
  /** 段落数 */
  paragraphCount: number
  /** emoji 数量 */
  emojiCount: number
  /** 生成的话题标签建议 */
  suggestedTags: string[]
}

/** 小红书纯文本导出选项 */
export interface XiaohongshuTextOptions {
  /** emoji 风格 (默认 'fresh') */
  emojiStyle?: 'fresh' | 'simple' | 'warm' | 'tech' | 'nature'
  /** 是否自动分段 (默认 true) */
  autoSplitParagraphs?: boolean
  /** 每段最大行数 (默认 5) */
  maxLinesPerParagraph?: number
  /** 是否注入 emoji (默认 true) */
  injectEmojis?: boolean
  /** 是否生成话题标签建议 (默认 true) */
  generateTags?: boolean
  /** 是否添加签名块 (默认 true) */
  addSignature?: boolean
  /** 自定义签名文本 */
  signatureText?: string
}

/** 知乎 Markdown 导出结果 */
export interface ZhihuMarkdownResult {
  /** 清洁的 Markdown 内容（可直接导入知乎） */
  markdown: string
  /** 检测到的 Mermaid 块数量（已转为提示） */
  mermaidCount: number
  /** 检测到并转换的任务列表数量 */
  taskListCount: number
  /** 清理掉的 HTML 标签列表 */
  cleanedHtmlTags: string[]
  /** LaTeX 公式数量（已保留） */
  latexCount: number
}

/** 知乎 Markdown 导出选项 */
export interface ZhihuMarkdownOptions {
  /** 是否保留 LaTeX 公式 (默认 true) */
  preserveLatex?: boolean
  /** 是否转换任务列表为 emoji (默认 true) */
  convertTaskLists?: boolean
  /** Mermaid 图表处理方式 (默认 'prompt') */
  mermaidHandling?: 'prompt' | 'remove'
  /** 是否清理 GFM 扩展语法 (默认 true) */
  cleanGfmExtensions?: boolean
}

// ═══════════════════════════════════════════════════════════════════
// 质量检测类型
// ═══════════════════════════════════════════════════════════════════

/** 质量问题严重度 */
export type QualityIssueSeverity = 'error' | 'warning' | 'suggestion'

/** 单个质量问题 */
export interface QualityIssue {
  /** 检测项 ID */
  id: string
  /** 严重度 */
  severity: QualityIssueSeverity
  /** 问题描述 */
  message: string
  /** 修复建议 */
  suggestion?: string
  /** 问题位置（行号或关键词） */
  location?: string
}

/** 质量检测报告 */
export interface QualityReport {
  /** 目标平台 */
  platform: Platform
  /** 检测时间戳 */
  timestamp: number
  /** 是否通过（无 error 级别问题） */
  passed: boolean
  /** 问题列表 */
  issues: QualityIssue[]
  /** 统计摘要 */
  stats: {
    errors: number
    warnings: number
    suggestions: number
  }
}

/** 原生格式导出结果（统一接口） */
export interface NativeExportResult {
  /** 输出格式 */
  format: 'html' | 'text' | 'markdown'
  /** 内容 */
  content: string
  /** 平台 */
  platform: Platform
  /** 质量报告 */
  qualityReport?: QualityReport
}
