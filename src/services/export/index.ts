/**
 * 导出服务统一入口
 *
 * 模块结构：
 * - types.ts: 类型定义
 * - themes.ts: 主题预设和 CSS 生成
 * - utils.ts: 工具函数
 * - wechat.ts: 微信公众号导出引擎
 * - xiaohongshu.ts: 小红书导出引擎
 * - zhihu.ts: 知乎导出引擎
 */

import { marked } from 'marked'

// 类型导出
export type {
  ExportOptions,
  ExportResult,
  Footnote,
  Platform,
  XiaohongshuPreset,
  ExportPreset
} from './types'

// 主题相关导出
export {
  themePresets,
  baseCSS,
  codeThemeCSS,
  generateThemeCSS,
  getPresetById,
  getDefaultPreset
} from './themes'

// 工具函数导出
export {
  EDITOR_LINE_HEIGHT,
  SLASH_COMMAND_MAX_DISTANCE,
  decodeHtmlEntities,
  escapeHtml,
  highlightCodeBlocks,
  convertLinksToFootnotes,
  buildFootnoteSection,
  calculateStats,
  buildReadingTimeHeader,
  copyToClipboard
} from './utils'

// 微信导出
export {
  convertToWechat,
  convertToWechatWithStats,
  markdownToWechat,
  postProcessForWechat
} from './wechat'

// 小红书导出
export {
  xiaohongshuBaseCSS,
  xiaohongshuPresets,
  convertToXiaohongshu,
  markdownToXiaohongshu
} from './xiaohongshu'

// 知乎导出
export {
  zhihuBaseCSS,
  convertToZhihu,
  markdownToZhihu
} from './zhihu'

// ═══════════════════════════════════════════════════════════════════
// 统一导出接口
// ═══════════════════════════════════════════════════════════════════

import type { Platform, ExportOptions } from './types'
import { getPresetById, getDefaultPreset } from './themes'
import { DEFAULT_PRESET_ID } from '@/constants'
import { convertToWechat } from './wechat'
import { convertToXiaohongshu } from './xiaohongshu'
import { convertToZhihu } from './zhihu'

/**
 * 多平台统一转换接口
 */
export async function convertToPlatform(
  markdown: string,
  platform: Platform,
  options?: {
    presetId?: string
    exportOptions?: ExportOptions
  }
): Promise<string> {
  const html = await marked.parse(markdown)

  switch (platform) {
    case 'wechat': {
      const preset = getPresetById(options?.presetId || DEFAULT_PRESET_ID) || getDefaultPreset()
      return convertToWechat(html, preset, options?.exportOptions)
    }
    case 'xiaohongshu':
      return convertToXiaohongshu(html, options?.presetId || 'xhs-fresh')
    case 'zhihu':
      return convertToZhihu(html)
    default:
      return html
  }
}
