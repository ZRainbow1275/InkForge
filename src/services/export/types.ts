/**
 * 导出服务类型定义
 */

import type { ExportPreset } from '@/types'

/**
 * 导出选项接口 (P1/P2增强)
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
  /** 代码主题 (默认atom-one-dark) */
  codeTheme?: 'atom-one-dark' | 'github' | 'vs2015' | 'monokai'
}

/**
 * 导出结果接口
 */
export interface ExportResult {
  /** 处理后的HTML */
  html: string
  /** 文章统计信息 */
  stats: {
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
  }
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

/**
 * 平台类型
 */
export type Platform = 'wechat' | 'xiaohongshu' | 'zhihu'

/**
 * 小红书预设类型
 */
export interface XiaohongshuPreset {
  id: string
  name: string
  icon: string
  primaryColor: string
  accentColor: string
  customCSS?: string
}

// 重新导出 ExportPreset 类型
export type { ExportPreset }
