/**
 * 导出服务统一入口
 *
 * 模块结构：
 * - types.ts: 类型定义
 * - themes.ts: 主题预设和 CSS 生成
 * - utils.ts: 工具函数
 * - platform-css.ts: 三平台 CSS 支持矩阵
 * - css-validator.ts: CSS 合规性验证器
 * - wechat.ts: 微信公众号导出引擎（HTML + 内联 CSS）
 * - xiaohongshu.ts: 小红书导出引擎（HTML 预览模式）
 * - xiaohongshu-text.ts: 小红书纯文本引擎（平台原生格式）
 * - zhihu.ts: 知乎导出引擎（HTML 预览模式）
 * - zhihu-markdown.ts: 知乎 Markdown 引擎（平台原生格式）
 * - quality-detector.ts: 三平台质量检测器
 */

import { marked } from 'marked'
import { renderMarkdownWithLazyOptionalEnhancements } from '@/services/rendering/lazy-optional-renderer'

// 统一配置 marked 选项（与 MarkdownPreview.vue 保持一致）
// 确保预览效果和导出结果完全匹配
marked.use({
  breaks: true,   // 单换行符生成 <br>
  gfm: true,      // GitHub Flavored Markdown
})

// 类型导出
export type {
  ExportOptions,
  ExportFontFamily,
  ExportFontSize,
  ExportResult,
  ExportStats,
  Footnote,
  Platform,
  XiaohongshuPreset,
  ZhihuPreset,
  CodeTheme,
  AlertType,
  CodeThemeColors,
  AlertTheme,
  PlatformPresetRegistry,
  ExportPreset,
  PresetPersona,
  ExportTarget,
  FontSpec,
  // 原生格式导出类型
  XiaohongshuTextResult,
  XiaohongshuTextOptions,
  ZhihuMarkdownResult,
  ZhihuMarkdownOptions,
  // 质量检测类型
  QualityIssueSeverity,
  QualityIssue,
  QualityReport,
  NativeExportResult,
} from './types'

export type {
  PlatformStyleChoice,
  StyleArtifactType,
  StyleChoiceApplication,
  StyleChoiceApplicationAvailability,
  StyleChoiceApplicationScope,
  StyleChoiceAvailability,
  StyleChoiceStatus,
  StyleEvidenceLabel,
  StyleMotionLevel,
  PlatformStyleAvailabilityReport,
  StyleProofAction,
  StyleProofArtifact,
  StyleProofArtifactKind,
  StyleProofArtifactReport,
  StyleProofArtifactReportStatus,
  StyleProofChannel,
  StyleProofHostStatus,
  StyleProofManifest,
  StyleProofManifestDraftOptions,
  StyleProofManifestIssueId,
  StyleProofManifestReport,
  StyleProofManifestScope,
  StyleProofReadback,
  StyleProofRequirement,
  StyleProofRequirementId,
  StyleProofRequirementReport,
  StyleProofRequirementReportStatus,
  StyleChoiceProofReadiness,
  StyleProofCollectionGate,
  StyleProofCollectionGateGroup,
  StyleProofCollectionStatus,
  StyleProofCollectionStep,
  StyleChoiceProofProgress,
  StyleProofGateProgress,
  StyleProofProgressStatus,
  PlatformStyleProofReadinessReport,
  PlatformStyleProofCollectionPlan,
  PlatformStyleProofCollectionQueue,
  PlatformStyleProofProgressReport,
  StyleRuleGroup,
  StyleVisualStrength,
} from './style-catalog'

export type {
  XhsImageArtifactFormat,
  XhsImageArtifactKind,
  XhsImageArtifactLimits,
  XhsImageArtifactManifest,
  XhsImageArtifactPage,
  XhsImageArtifactRatio,
  XhsImageCropStatus,
  ZhihuImageArtifact,
  ZhihuImageArtifactFormat,
  ZhihuImageArtifactKind,
  ZhihuImageArtifactManifest,
  ZhihuImageHostStatus,
} from './image-pipeline'

// 主题相关导出
export {
  themePresets,
  baseCSS,
  codeThemeCSS,
  generateThemeCSS,
  getPresetById,
  getDefaultPreset,
  applyHeadingDecorations
} from './themes'

// 空内容兜底 sample
export {
  DEFAULT_SAMPLE_MARKDOWN,
  resolveSampleContent,
} from './sample-content'

// Preset 字体基础设施（PR2）
export {
  PERSONA_FONTS,
  FONT_FACE_SPECS,
  generateFontFaceCSS,
  generatePersonaBaseCSS,
} from './preset-fonts'
export type { FontFaceSpec } from './preset-fonts'

// 工具函数导出
export {
  EDITOR_LINE_HEIGHT,
  SLASH_COMMAND_MAX_DISTANCE,
  decodeHtmlEntities,
  escapeHtml,
  convertTaskListCheckboxes,
  cleanEmptyParagraphs,
  limitConsecutiveBreaks,
  highlightCodeBlocks,
  renderAlertBlocks,
  enhanceTableStyles,
  convertLinksToFootnotes,
  buildFootnoteSection,
  calculateStats,
  buildReadingTimeHeader,
  copyTextToClipboard,
  copyToClipboard,
  isClipboardWriteAvailable
} from './utils'

// 微信导出
export {
  convertToWechat,
  convertToWechatWithStats,
  markdownToWechat,
  markdownToWechatWithStats,
  postProcessForWechat
} from './wechat'

// 小红书导出
export {
  xiaohongshuBaseCSS,
  xiaohongshuPresets,
  convertToXiaohongshu,
  markdownToXiaohongshu,
  getXiaohongshuPresets
} from './xiaohongshu'

// 知乎导出
export {
  zhihuBaseCSS,
  convertToZhihu,
  markdownToZhihu,
  getZhihuPresets
} from './zhihu'

// 小红书纯文本引擎（平台原生格式）
export {
  markdownToXiaohongshuText,
  getAvailableEmojiStyles,
  type EmojiStyleInfo,
} from './xiaohongshu-text'

// 知乎 Markdown 引擎（平台原生格式）
export {
  markdownToZhihuClean,
} from './zhihu-markdown'

// 质量检测器
export {
  detectQuality,
  detectQualityAll,
  quickCheck,
  filterIssues,
  validateXhsImageArtifactManifest,
  validateZhihuImageArtifactManifest,
} from './quality-detector'

export {
  PLATFORM_STYLE_CHOICES,
  DEFAULT_STYLE_EVIDENCE_BY_PLATFORM,
  STYLE_PROOF_REQUIREMENTS,
  createStyleProofManifestDraft,
  evaluateStyleChoiceApplication,
  evaluateStyleChoiceAvailability,
  getBestEvidence,
  getDefaultStyleEvidence,
  getEvidenceProofRequirements,
  getPlatformStyleApplicationReport,
  getPlatformStyleAvailabilityReport,
  getPlatformStyleChoices,
  getPlatformStyleProofCollectionPlan,
  getPlatformStyleProofCollectionQueue,
  getPlatformStyleProofProgressReport,
  getPlatformStyleProofReadinessReport,
  getStyleProofManifestReport,
  getStyleChoiceProofRequirements,
  getStyleChoiceApplication,
  getStyleChoiceById,
  getStyleChoiceCatalog,
  isEvidenceAtLeast,
  validateStyleProofManifest,
} from './style-catalog'

// 共享排版
export {
  typographyToCssVars,
  typographyToInlineCss,
  type TypographyConfig
} from './shared-typography'

// 平台 CSS 合规矩阵
export type { PlatformCSSSupport } from './platform-css'
export {
  WECHAT_SUPPORT,
  XIAOHONGSHU_SUPPORT,
  ZHIHU_SUPPORT,
  PLATFORM_CSS_REGISTRY,
  getPlatformSupport,
  isDisplaySupported,
  isPositionSupported
} from './platform-css'

// CSS 合规性验证器
export type { CSSValidationResult } from './css-validator'
export {
  validateCSS,
  enforcePlatformCSS,
  auditPlatformCompliance
} from './css-validator'

// 微信真实发布能力
export type {
  WechatPublishStatus,
  WechatCredentialSource,
  WechatDraftArticleInput,
  WechatDraftCreateResult,
  WechatDraftPublishInput,
  WechatDraftPublishResult,
  WechatHtmlRewriteResult,
  WechatCoverUploadResult,
} from './wechat-publish'
export {
  WECHAT_CREDENTIAL_KEYS,
  WECHAT_DRAFT_TITLE_MAX_CHARS,
  getWechatPublishStatus,
  uploadWechatArticleImage,
  uploadWechatCoverImage,
  rewriteWechatArticleImages,
  createWechatDraft,
  publishWechatDraft,
  describeWechatPublishStatus,
  isWechatHostedContentImageUrl,
} from './wechat-publish'

// ═══════════════════════════════════════════════════════════════════
// 统一导出接口
// ═══════════════════════════════════════════════════════════════════

import type {
  Platform, ExportOptions, ExportPreset, XiaohongshuPreset, ZhihuPreset,
  NativeExportResult, XiaohongshuTextOptions, ZhihuMarkdownOptions,
  QualityIssue, QualityReport,
} from './types'
import type { XhsImageArtifactManifest, ZhihuImageArtifactManifest } from './image-pipeline/types'
import { getPresetById, getDefaultPreset, themePresets } from './themes'
import { DEFAULT_PRESET_ID } from '@/constants'
import { convertToWechat } from './wechat'
import { convertToXiaohongshu, getXiaohongshuPresets } from './xiaohongshu'
import { convertToZhihu, getZhihuPresets } from './zhihu'
import { markdownToXiaohongshuText } from './xiaohongshu-text'
import { markdownToZhihuClean } from './zhihu-markdown'
import { detectQuality, validateXhsImageArtifactManifest, validateZhihuImageArtifactManifest } from './quality-detector'

/**
 * Inspector / Settings 覆盖选项
 * 允许在不修改预设本身的情况下，动态覆盖渲染参数
 */
export interface RenderOverrides {
  /** 主色覆盖（来自 Inspector 排版风格色板） */
  primaryColor?: string
  /** 字体覆盖（来自 Inspector 字体选择器，仅影响 WeChat） */
  fontFamily?: string
}

/**
 * 将 Settings 字体键映射到导出预设的 fontFamily 格式
 * settings: 'serif' | 'sans' | 'kai' | 'mono'
 * preset:   'serif' | 'sans-serif' | 'monospace'
 */
function mapSettingsFontToPresetFont(settingsFont: string): string {
  switch (settingsFont) {
    case 'sans': return 'sans-serif'
    case 'mono': return 'monospace'
    case 'kai': return 'serif' // 楷体导出时 fallback 到衬线字体栈
    default: return settingsFont
  }
}

/**
 * 多平台统一转换接口（HTML 预览模式）
 *
 * 输出内联 CSS HTML，用于编辑器内预览和微信公众号复制。
 *
 * 支持传递平台特定选项：
 * - presetId: 预设主题 ID
 * - exportOptions: 包含 enableAlertBlocks, enableEnhancedTable, codeTheme 等
 * - overrides: Inspector/Settings 的颜色/字体动态覆盖
 */
export async function convertToPlatform(
  markdown: string,
  platform: Platform,
  options?: {
    presetId?: string
    exportOptions?: ExportOptions
    /** Inspector/Settings 动态覆盖 */
    overrides?: RenderOverrides
  }
): Promise<string> {
  // 空文档守卫：纯空白内容直接返回空字符串，避免生成带样式但无内容的 HTML
  if (!markdown || !markdown.trim()) {
    return ''
  }

  const html = await renderMarkdownWithLazyOptionalEnhancements(markdown)

  switch (platform) {
    case 'wechat': {
      let preset = getPresetById(options?.presetId || DEFAULT_PRESET_ID) || getDefaultPreset()
      // 应用 Inspector 覆盖（克隆预设，不修改原始对象）
      if (options?.overrides) {
        preset = { ...preset }
        if (options.overrides.primaryColor) {
          preset.primaryColor = options.overrides.primaryColor
        }
        if (options.overrides.fontFamily) {
          preset.fontFamily = mapSettingsFontToPresetFont(options.overrides.fontFamily)
        }
      }
      return convertToWechat(html, preset, options?.exportOptions)
    }
    case 'xiaohongshu':
      return convertToXiaohongshu(
        html,
        options?.presetId || 'xhs-fresh',
        {
          enableLineNumbers: options?.exportOptions?.enableLineNumbers,
          enableMacCodeBlock: options?.exportOptions?.enableMacCodeBlock,
          colorOverrides: options?.overrides ? {
            primaryColor: options.overrides.primaryColor,
          } : undefined,
        }
      )
    case 'zhihu':
      return convertToZhihu(
        html,
        options?.presetId || 'zhihu-academic',
        {
          enableCiteStatus: options?.exportOptions?.enableCiteStatus,
          enableCodeHighlight: options?.exportOptions?.enableCodeHighlight,
          enableAlertBlocks: options?.exportOptions?.enableAlertBlocks,
          enableEnhancedTable: options?.exportOptions?.enableEnhancedTable,
          codeTheme: options?.exportOptions?.codeTheme,
          colorOverrides: options?.overrides ? {
            primaryColor: options.overrides.primaryColor,
          } : undefined,
        }
      )
    default: {
      // 编译期穷举检查: 如果 Platform 新增值但此处未处理，TypeScript 会报错
      const _exhaustiveCheck: never = platform
      throw new Error(`未支持的导出平台: ${_exhaustiveCheck}`)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 平台原生格式导出
// ═══════════════════════════════════════════════════════════════════

/**
 * 多平台原生格式导出（推荐用于实际发布）
 *
 * 与 convertToPlatform() 的区别：
 * - convertToPlatform: 全部输出内联 CSS HTML（用于编辑器预览、微信复制）
 * - convertToNativeFormat: 按平台特性输出最优格式
 *   - 微信 → 内联 CSS HTML（微信仅支持这种格式）
 *   - 小红书 → 纯文本 + emoji（平台只支持纯文本）
 *   - 知乎 → 清洁 Markdown（平台原生支持 Markdown）
 *
 * @param markdown - 原始 Markdown 内容
 * @param platform - 目标平台
 * @param options - 平台特定选项
 * @returns 包含内容、格式、质量报告的结构化结果
 */
export async function convertToNativeFormat(
  markdown: string,
  platform: Platform,
  options?: {
    presetId?: string
    exportOptions?: ExportOptions
    overrides?: RenderOverrides
    /** 小红书纯文本选项 */
    xiaohongshuTextOptions?: XiaohongshuTextOptions
    /** 小红书图片页/长图本地 artifact manifest；只用于 preflight，不表示平台发布成功 */
    xiaohongshuImageManifest?: XhsImageArtifactManifest
    /** 知乎 Markdown 选项 */
    zhihuMarkdownOptions?: ZhihuMarkdownOptions
    /** 知乎图片 fallback 本地/平台 artifact manifest；只用于 preflight，不表示平台发布成功 */
    zhihuImageArtifactManifest?: ZhihuImageArtifactManifest
    /** 是否附加质量报告 (默认 true) */
    includeQualityReport?: boolean
  }
): Promise<NativeExportResult> {
  // 空文档守卫
  if (!markdown || !markdown.trim()) {
    return {
      format: 'text',
      content: '',
      platform,
    }
  }

  const includeReport = options?.includeQualityReport ?? true

  switch (platform) {
    case 'wechat': {
      // 微信：仍然走 HTML 管线（微信只支持内联 CSS HTML）
      const html = await convertToPlatform(markdown, 'wechat', {
        presetId: options?.presetId,
        exportOptions: options?.exportOptions,
        overrides: options?.overrides,
      })
      return {
        format: 'html',
        content: html,
        platform: 'wechat',
        qualityReport: includeReport ? detectQuality(markdown, 'wechat') : undefined,
      }
    }

    case 'xiaohongshu': {
      // 小红书：直接从 Markdown → 纯文本（跳过 HTML 管线）
      const emojiStyleMap: Record<string, XiaohongshuTextOptions['emojiStyle']> = {
        'xhs-fresh': 'fresh',
        'xhs-simple': 'simple',
        'xhs-warm': 'warm',
        'xhs-tech': 'tech',
        'xhs-nature': 'nature',
      }
      const textOptions: XiaohongshuTextOptions = {
        emojiStyle: emojiStyleMap[options?.presetId ?? ''] ?? 'fresh',
        ...options?.xiaohongshuTextOptions,
      }
      const result = markdownToXiaohongshuText(markdown, textOptions)
      const manifestIssues = options?.xiaohongshuImageManifest
        ? validateXhsImageArtifactManifest(options.xiaohongshuImageManifest)
        : []
      const qualityReport = includeReport
        ? withAdditionalQualityIssues(detectQuality(markdown, 'xiaohongshu'), manifestIssues)
        : undefined
      return {
        format: 'text',
        content: result.text,
        platform: 'xiaohongshu',
        qualityReport,
        artifacts: options?.xiaohongshuImageManifest
          ? { xiaohongshuImageManifest: options.xiaohongshuImageManifest }
          : undefined,
      }
    }

    case 'zhihu': {
      // 知乎：直接从 Markdown → 清洁 Markdown（跳过 HTML 管线）
      const result = markdownToZhihuClean(markdown, options?.zhihuMarkdownOptions)
      const manifestIssues = options?.zhihuImageArtifactManifest
        ? validateZhihuImageArtifactManifest(options.zhihuImageArtifactManifest, result.markdown)
        : []
      const qualityReport = includeReport
        ? withAdditionalQualityIssues(detectQuality(markdown, 'zhihu'), manifestIssues)
        : undefined
      return {
        format: 'markdown',
        content: result.markdown,
        platform: 'zhihu',
        qualityReport,
        artifacts: options?.zhihuImageArtifactManifest
          ? { zhihuImageArtifactManifest: options.zhihuImageArtifactManifest }
          : undefined,
      }
    }

    default: {
      const _exhaustiveCheck: never = platform
      throw new Error(`未支持的导出平台: ${_exhaustiveCheck}`)
    }
  }
}

function withAdditionalQualityIssues(report: QualityReport, extraIssues: QualityIssue[]): QualityReport {
  if (extraIssues.length === 0) return report

  const issues = [...report.issues, ...extraIssues]
  const errors = issues.filter(issue => issue.severity === 'error').length
  const warnings = issues.filter(issue => issue.severity === 'warning').length
  const suggestions = issues.filter(issue => issue.severity === 'suggestion').length

  return {
    ...report,
    passed: errors === 0,
    issues,
    stats: { errors, warnings, suggestions },
  }
}

// ═══════════════════════════════════════════════════════════════════
// 平台预设查询
// ═══════════════════════════════════════════════════════════════════

/**
 * 获取指定平台的预设列表
 *
 * @param platform - 平台类型
 * @returns 对应平台的预设数组
 */
export function getPlatformPresets(platform: Platform): ExportPreset[] | XiaohongshuPreset[] | ZhihuPreset[] {
  switch (platform) {
    case 'wechat':
      return themePresets
    case 'xiaohongshu':
      return getXiaohongshuPresets()
    case 'zhihu':
      return getZhihuPresets()
    default: {
      const _exhaustiveCheck: never = platform
      throw new Error(`未支持的平台: ${_exhaustiveCheck}`)
    }
  }
}
