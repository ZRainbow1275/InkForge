import {
  checkWechatSafe,
} from './svg-modules'
import { getPlatformStyleApplicationReport } from './style-catalog'
import type {
  StyleChoiceApplicationAvailability,
  StyleChoiceApplicationScope,
} from './style-catalog'
import { getPresetById } from './themes'
import type { ExportStats, WechatExportOptions } from './types'
import { convertToWechatWithStats } from './wechat'
import { createDefaultWechatSvgInjectionPlan } from './wechat-svg-application'

export type WechatStyleExportSamplesStatus =
  | 'wechat-style-samples-ready'
  | 'wechat-style-samples-blocked'

export type WechatStyleExportSampleIssueId =
  | 'missing-preset'
  | 'render-error'
  | 'empty-html'
  | 'missing-nice-root'
  | 'missing-wechat-clamp'
  | 'missing-responsive-max-width'
  | 'forbidden-script'
  | 'forbidden-style'
  | 'forbidden-foreign-object'
  | 'missing-svg-application-module'
  | 'svg-section-missing-responsive-width'
  | 'svg-section-missing-viewbox'
  | 'wechat-safe-violation'

export interface WechatStyleExportSampleStats {
  wordCount: number
  readingTime: number
  codeBlockCount: number
  linkCount: number
  imageCount: number
  headingCount: number
  tableCount: number
}

export interface WechatStyleExportSample {
  choiceId: string
  choiceLabel: string
  choiceStatus: string
  usable: boolean
  applicationScope: StyleChoiceApplicationScope
  presetId: string
  presetLabel: string
  selectableReason: string
  htmlLength: number
  htmlSha256: string
  svgModuleCount: number
  svgModuleIds: readonly string[]
  stats: WechatStyleExportSampleStats
}

export interface WechatStyleExportSampleIssue {
  choiceId: string
  presetId: string | null
  issue: WechatStyleExportSampleIssueId
  detail: string
}

export interface WechatStyleExportSamplesSummary {
  wechatStyleChoiceCount: number
  selectableStyleChoiceCount: number
  renderedStyleChoiceCount: number
  uniquePresetCount: number
  svgBearingStyleChoiceCount: number
  totalSvgModuleCount: number
  issueCount: number
}

export interface WechatStyleExportSamplesReport {
  notProof: true
  scope: 'wechat-style-export-samples'
  status: WechatStyleExportSamplesStatus
  summary: WechatStyleExportSamplesSummary
  issues: readonly WechatStyleExportSampleIssue[]
  samples: readonly WechatStyleExportSample[]
  boundary: {
    xhsZhihuPublishAutomationDeferred: true
    requiresManualWeChatProof: true
    doesNotClaimReleaseComplete: true
  }
}

const WECHAT_STYLE_EXPORT_SAMPLE_HTML = [
  '<h1>InkForge 微信样式导出样本</h1>',
  '<p>这一份样本用于验证当前应用内可选的微信公众号样式能否经过真实导出管线生成 HTML 与 SVG 排版结构。</p>',
  '<h2>结构化标题</h2>',
  '<p>正文需要保持二十到二十二字一行的移动端阅读节奏，同时允许 SVG 标题、分隔线、引用卡片和文末标记叠加。</p>',
  '<hr>',
  '<blockquote><p>这是一段引用，用于触发引用卡片和静谧刊印的块级排版规则。</p></blockquote>',
  '<table><thead><tr><th>指标</th><th>当前目标</th></tr></thead><tbody><tr><td>SVG 模块</td><td>应用内可选且微信安全</td></tr><tr><td>样式输出</td><td>真实导出 HTML</td></tr></tbody></table>',
  '<pre><code class="language-ts">const target = "wechat-style-export-sample"\nconsole.log(target)</code></pre>',
  '<p>结尾段落用于确认文末 SVG 标记可以与样式预设共同存在。</p>',
].join('\n')

const WECHAT_STYLE_EXPORT_SAMPLE_OPTIONS: WechatExportOptions = {
  enableReadingTime: false,
  enableSvgModules: true,
  svgInjectionPlan: createDefaultWechatSvgInjectionPlan(),
}

function toSampleStats(stats: ExportStats): WechatStyleExportSampleStats {
  return {
    wordCount: stats.wordCount,
    readingTime: stats.readingTime,
    codeBlockCount: stats.codeBlockCount,
    linkCount: stats.linkCount,
    imageCount: stats.imageCount,
    headingCount: stats.headingCount,
    tableCount: stats.tableCount,
  }
}

async function getHtmlSha256(html: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(html),
  )

  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

function extractWechatStyleSvgSections(html: string): readonly { moduleId: string; html: string }[] {
  const sections: { moduleId: string; html: string }[] = []
  const sectionPattern = /<section\b(?=[^>]*\bdata-ink-svg="([^"]+)")[\s\S]*?<\/section>/gi
  let match: RegExpExecArray | null

  while ((match = sectionPattern.exec(html)) !== null) {
    sections.push({
      moduleId: match[1],
      html: match[0],
    })
  }

  return sections
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)]
}

function createHtmlIssue(
  row: StyleChoiceApplicationAvailability,
  presetId: string | null,
  issue: WechatStyleExportSampleIssueId,
  detail: string,
): WechatStyleExportSampleIssue {
  return {
    choiceId: row.availability.choice.id,
    presetId,
    issue,
    detail,
  }
}

function getWechatStyleExportHtmlIssues(
  row: StyleChoiceApplicationAvailability,
  presetId: string,
  html: string,
): readonly WechatStyleExportSampleIssue[] {
  const issues: WechatStyleExportSampleIssue[] = []

  if (html.trim().length === 0) {
    issues.push(createHtmlIssue(row, presetId, 'empty-html', 'WeChat export HTML is empty.'))
  }
  if (!/<section\b[^>]*\bid="nice"/i.test(html)) {
    issues.push(createHtmlIssue(row, presetId, 'missing-nice-root', 'WeChat export root #nice is missing.'))
  }
  if (!/data-wechat-clamp="1"/i.test(html)) {
    issues.push(createHtmlIssue(row, presetId, 'missing-wechat-clamp', 'WeChat 677px clamp marker is missing.'))
  }
  if (!/max-width:\s*677px/i.test(html)) {
    issues.push(createHtmlIssue(row, presetId, 'missing-responsive-max-width', 'WeChat 677px max-width is missing.'))
  }
  if (/<script\b/i.test(html)) {
    issues.push(createHtmlIssue(row, presetId, 'forbidden-script', 'Script tags must never appear in WeChat export.'))
  }
  if (/<style\b/i.test(html)) {
    issues.push(createHtmlIssue(row, presetId, 'forbidden-style', 'Style tags must be inlined before WeChat output.'))
  }
  if (/foreignObject/i.test(html)) {
    issues.push(createHtmlIssue(row, presetId, 'forbidden-foreign-object', 'foreignObject is not WeChat-safe.'))
  }

  const svgSections = extractWechatStyleSvgSections(html)
  if (svgSections.length === 0) {
    issues.push(createHtmlIssue(
      row,
      presetId,
      'missing-svg-application-module',
      'The application SVG option plan did not inject any data-ink-svg section.',
    ))
  }

  for (const section of svgSections) {
    if (!section.html.includes('width="100%"')) {
      issues.push(createHtmlIssue(
        row,
        presetId,
        'svg-section-missing-responsive-width',
        `${section.moduleId} is missing width="100%".`,
      ))
    }
    if (!/viewBox="[^"]+"/i.test(section.html)) {
      issues.push(createHtmlIssue(
        row,
        presetId,
        'svg-section-missing-viewbox',
        `${section.moduleId} is missing viewBox.`,
      ))
    }
    for (const violation of checkWechatSafe(section.html)) {
      issues.push(createHtmlIssue(
        row,
        presetId,
        'wechat-safe-violation',
        `${section.moduleId}: ${violation.rule}: ${violation.detail}`,
      ))
    }
  }

  return issues
}

async function renderWechatStyleExportSample(
  row: StyleChoiceApplicationAvailability,
): Promise<{
  sample: WechatStyleExportSample | null
  issues: readonly WechatStyleExportSampleIssue[]
}> {
  const application = row.application
  if (!application) {
    return {
      sample: null,
      issues: [
        createHtmlIssue(row, null, 'missing-preset', 'Selectable WeChat style row has no application preset mapping.'),
      ],
    }
  }

  const preset = getPresetById(application.presetId)
  if (!preset) {
    return {
      sample: null,
      issues: [
        createHtmlIssue(row, application.presetId, 'missing-preset', 'Mapped WeChat preset does not exist.'),
      ],
    }
  }

  try {
    const result = convertToWechatWithStats(
      WECHAT_STYLE_EXPORT_SAMPLE_HTML,
      preset,
      WECHAT_STYLE_EXPORT_SAMPLE_OPTIONS,
    )
    const svgSections = extractWechatStyleSvgSections(result.html)
    const svgModuleIds = uniqueStrings(svgSections.map(section => section.moduleId))
    const issues = getWechatStyleExportHtmlIssues(row, application.presetId, result.html)

    return {
      sample: {
        choiceId: row.availability.choice.id,
        choiceLabel: row.availability.choice.label,
        choiceStatus: row.availability.status,
        usable: row.availability.usable,
        applicationScope: application.scope,
        presetId: application.presetId,
        presetLabel: application.presetLabel,
        selectableReason: row.reason,
        htmlLength: result.html.length,
        htmlSha256: await getHtmlSha256(result.html),
        svgModuleCount: svgSections.length,
        svgModuleIds,
        stats: toSampleStats(result.stats),
      },
      issues,
    }
  } catch (error) {
    return {
      sample: null,
      issues: [
        createHtmlIssue(
          row,
          application.presetId,
          'render-error',
          error instanceof Error ? error.message : String(error),
        ),
      ],
    }
  }
}

function createWechatStyleExportSamplesSummary(
  wechatStyleChoiceCount: number,
  selectableStyleChoiceCount: number,
  samples: readonly WechatStyleExportSample[],
  issues: readonly WechatStyleExportSampleIssue[],
): WechatStyleExportSamplesSummary {
  return {
    wechatStyleChoiceCount,
    selectableStyleChoiceCount,
    renderedStyleChoiceCount: samples.length,
    uniquePresetCount: new Set(samples.map(sample => sample.presetId)).size,
    svgBearingStyleChoiceCount: samples.filter(sample => sample.svgModuleCount > 0).length,
    totalSvgModuleCount: samples.reduce((sum, sample) => sum + sample.svgModuleCount, 0),
    issueCount: issues.length,
  }
}

export async function createWechatStyleExportSamplesReport(): Promise<WechatStyleExportSamplesReport> {
  const applicationRows = getPlatformStyleApplicationReport('wechat')
  const selectableRows = applicationRows.filter(row => row.selectable)
  const samples: WechatStyleExportSample[] = []
  const issues: WechatStyleExportSampleIssue[] = []

  for (const row of selectableRows) {
    const result = await renderWechatStyleExportSample(row)
    if (result.sample) {
      samples.push(result.sample)
    }
    issues.push(...result.issues)
  }

  const summary = createWechatStyleExportSamplesSummary(
    applicationRows.length,
    selectableRows.length,
    samples,
    issues,
  )
  const ready = summary.issueCount === 0 &&
    summary.selectableStyleChoiceCount > 0 &&
    summary.renderedStyleChoiceCount === summary.selectableStyleChoiceCount &&
    summary.svgBearingStyleChoiceCount === summary.selectableStyleChoiceCount

  return {
    notProof: true,
    scope: 'wechat-style-export-samples',
    status: ready ? 'wechat-style-samples-ready' : 'wechat-style-samples-blocked',
    summary,
    issues,
    samples,
    boundary: {
      xhsZhihuPublishAutomationDeferred: true,
      requiresManualWeChatProof: true,
      doesNotClaimReleaseComplete: true,
    },
  }
}

export function formatWechatStyleExportSamplesReportText(report: WechatStyleExportSamplesReport): string {
  return [
    'InkForge WeChat style export samples',
    `scope: ${report.scope}`,
    `status: ${report.status}`,
    `wechatStyleChoiceCount: ${report.summary.wechatStyleChoiceCount}`,
    `selectableStyleChoiceCount: ${report.summary.selectableStyleChoiceCount}`,
    `renderedStyleChoiceCount: ${report.summary.renderedStyleChoiceCount}`,
    `uniquePresetCount: ${report.summary.uniquePresetCount}`,
    `svgBearingStyleChoiceCount: ${report.summary.svgBearingStyleChoiceCount}`,
    `totalSvgModuleCount: ${report.summary.totalSvgModuleCount}`,
    `issueCount: ${report.summary.issueCount}`,
    '',
    'samples:',
    ...report.samples.map(sample =>
      `- ${sample.choiceId}: preset=${sample.presetId}; htmlLength=${sample.htmlLength}; svgModules=${sample.svgModuleCount}; sha256=${sample.htmlSha256}`
    ),
    '',
    'issues:',
    ...(report.issues.length > 0
      ? report.issues.map(issue => `- ${issue.choiceId}:${issue.issue}:${issue.detail}`)
      : ['- none']),
    '',
    'boundary:',
    '- This is local application export-sample evidence only.',
    '- It does not prove WeChat phone preview, credentialed sync, scheduled send, public rendering, or publish success.',
    '- Xiaohongshu and Zhihu publish-side automation remains manually deferred for this round.',
  ].join('\n')
}
