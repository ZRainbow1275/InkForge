<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import {
  X, Copy, Download, CheckCircle,
  Hash, Link2, AlertCircle, Loader2, Lightbulb, Palette, Type, ArrowUpRight
} from 'lucide-vue-next'
import {
  convertToPlatform, getPlatformPresets,
  convertToNativeFormat, copyTextToClipboard,
  copyToClipboard, copyWechatHtmlToClipboard, getDefaultPreset, isClipboardWriteAvailable,
  detectQuality, themePresets, describeWechatPublishStatus, getWechatPublishStatus,
  getPlatformStyleApplicationReport, getPlatformStyleAvailabilityReport,
  getPlatformStyleProofAcceptanceAuditReport,
  getPlatformStyleProofCollectionPlan, getPlatformStyleProofCollectionQueue,
  getPlatformStyleProofExecutionRunbook,
  WECHAT_DRAFT_TITLE_MAX_CHARS,
  markdownToWechatWithStats, publishWechatDraft
} from '@/services/export'
import { resolveExportIcon } from '@/utils/iconography'
import type {
  Platform, ExportOptions, ExportStats,
  NativeExportResult, QualityReport, QualityIssueSeverity, CodeTheme,
  WechatPublishStatus, WechatDraftPublishResult,
  ExportFontFamily, ExportFontSize,
  StyleArtifactType, StyleChoiceApplication, StyleChoiceApplicationAvailability,
  StyleChoiceAvailability, StyleChoiceStatus, StyleEvidenceLabel,
  StyleMotionLevel, StyleProofAcceptanceAuditStatus,
  StyleProofAcceptanceRequirementAudit, StyleProofCollectionGate, StyleProofCollectionStep,
  StyleProofExecutionRunbookStep, StyleProofRequirementId, StyleRuleGroup, StyleVisualStrength
} from '@/services/export'
import type { ExportPreset } from '@/types'
import type { Component } from 'vue'

// ─── Constants ───────────────────────────────────────────
const FEEDBACK_DURATION = 2000

const CODE_THEMES: { id: CodeTheme; label: string }[] = [
  { id: 'github-light', label: 'GitHub' },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'monokai', label: 'Monokai' },
  { id: 'atom-one-light', label: 'Atom One Light' },
  { id: 'atom-one-dark', label: 'Atom One Dark' },
  { id: 'vs2015', label: 'VS2015' },
  { id: 'dracula', label: 'Dracula' },
]

const STYLE_FONT_OPTIONS: { id: ExportFontFamily; label: string }[] = [
  { id: 'sans-serif', label: '无衬线' },
  { id: 'serif', label: '衬线' },
  { id: 'monospace', label: '等宽' },
]

const STYLE_SIZE_OPTIONS: { id: ExportFontSize; label: string }[] = [
  { id: '14px', label: '14' },
  { id: '15px', label: '15' },
  { id: '16px', label: '16' },
  { id: '17px', label: '17' },
  { id: '18px', label: '18' },
]

const STYLE_COLOR_OPTIONS: { id: string; label: string; color: string }[] = [
  { id: 'classic-blue', label: '经典蓝', color: '#1565C0' },
  { id: 'emerald', label: '翡翠绿', color: '#0F766E' },
  { id: 'orange', label: '活力橘', color: '#EA580C' },
  { id: 'lavender', label: '薰衣紫', color: '#7C3AED' },
  { id: 'graphite', label: '石墨黑', color: '#263238' },
  { id: 'rose', label: '玫瑰红', color: '#BE3455' },
]

const PLATFORMS = [
  { id: 'wechat' as Platform, name: '微信公众号', icon: 'wechat', copyLabel: '复制到微信' },
  { id: 'xiaohongshu' as Platform, name: '小红书', icon: 'xiaohongshu', copyLabel: '复制到小红书' },
  { id: 'zhihu' as Platform, name: '知乎', icon: 'zhihu', copyLabel: '复制到知乎' },
] as const

const NATIVE_FORMAT_LABELS: Record<NativeExportResult['format'], string> = {
  html: 'HTML',
  text: '纯文本',
  markdown: 'Markdown',
}

const NATIVE_FILE_EXTENSIONS: Record<NativeExportResult['format'], string> = {
  html: 'html',
  text: 'txt',
  markdown: 'md',
}

const NATIVE_MIME_TYPES: Record<NativeExportResult['format'], string> = {
  html: 'text/html;charset=utf-8',
  text: 'text/plain;charset=utf-8',
  markdown: 'text/markdown;charset=utf-8',
}

type FeedbackKind = 'success' | 'error' | 'info'

interface OperationFeedback {
  kind: FeedbackKind
  message: string
}

interface PreflightRow {
  key: string
  label: string
  state: 'ready' | 'blocked' | 'warning'
  detail: string
}

interface PublishIntegrationStatus {
  configured: boolean
  state: PreflightRow['state']
  detail: string
}

interface StyleChoiceDisplay {
  availability: StyleChoiceAvailability
  application: StyleChoiceApplication | null
  selectable: boolean
  selected: boolean
  statusClass: string
  statusLabel: string
  outputLabel: string
  strengthLabel: string
  motionLabel: string
  ruleGroupLabel: string
  evidenceLabel: string
  detail: string
  proofSummary: string
  proofGateLabels: string[]
  acceptanceSummary: string
  cannotClaimLabels: string[]
  executionSummary: string
  executionLabels: string[]
  actionLabel: string
}

// ─── Props / Emits ───────────────────────────────────────
const props = defineProps<{
  visible: boolean
  content: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// ─── Platform ────────────────────────────────────────────
const selectedPlatform = ref<Platform>('wechat')
const platformInfo = computed(() => PLATFORMS.find(p => p.id === selectedPlatform.value)!)

// ─── Presets (per-platform memory) ───────────────────────
interface PresetDisplay {
  id: string
  name: string
  icon: string
  description?: string
  primaryColor: string
}

const platformPresetIds = ref<Record<Platform, string>>({
  wechat: getDefaultPreset().id,
  xiaohongshu: 'xhs-fresh',
  zhihu: 'zhihu-academic',
})

const selectedPresetId = computed(() => platformPresetIds.value[selectedPlatform.value])

const selectedStyleChoiceIds = ref<Record<Platform, string | null>>({
  wechat: null,
  xiaohongshu: null,
  zhihu: null,
})

const currentPresets = computed((): PresetDisplay[] => {
  const presets = getPlatformPresets(selectedPlatform.value)
  return presets.map(p => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    primaryColor: p.primaryColor,
    description: 'description' in p ? (p as ExportPreset).description : undefined,
  }))
})

const styleAvailabilityReport = computed(() => getPlatformStyleAvailabilityReport(selectedPlatform.value))
const styleApplicationReport = computed(() => getPlatformStyleApplicationReport(selectedPlatform.value))
const styleProofCollectionPlan = computed(() => getPlatformStyleProofCollectionPlan(selectedPlatform.value))
const styleProofCollectionQueue = computed(() => getPlatformStyleProofCollectionQueue(selectedPlatform.value))
const styleProofAcceptanceAudit = computed(() => getPlatformStyleProofAcceptanceAuditReport(selectedPlatform.value))
const styleProofExecutionRunbook = computed(() => getPlatformStyleProofExecutionRunbook(selectedPlatform.value))
const styleProofStepsByChoice = computed(() => {
  const grouped = new Map<string, StyleProofCollectionStep[]>()
  for (const step of styleProofCollectionPlan.value.steps) {
    const steps = grouped.get(step.choice.id) ?? []
    steps.push(step)
    grouped.set(step.choice.id, steps)
  }
  return grouped
})
const styleProofCannotClaimByChoice = computed(() => {
  const grouped = new Map<string, StyleProofAcceptanceRequirementAudit[]>()
  for (const requirement of styleProofAcceptanceAudit.value.cannotClaim) {
    for (const choiceId of requirement.choiceIds) {
      const requirements = grouped.get(choiceId) ?? []
      requirements.push(requirement)
      grouped.set(choiceId, requirements)
    }
  }
  return grouped
})
const styleProofExecutionOpenByChoice = computed(() => {
  const grouped = new Map<string, StyleProofExecutionRunbookStep[]>()
  for (const step of styleProofExecutionRunbook.value.openSteps) {
    for (const choiceId of step.choiceIds) {
      const steps = grouped.get(choiceId) ?? []
      steps.push(step)
      grouped.set(choiceId, steps)
    }
  }
  return grouped
})
const styleProofNextGateLabel = computed(() => {
  const gate = styleProofCollectionQueue.value.nextSafeGate ?? styleProofCollectionQueue.value.nextGate
  return gate ? styleProofGateLabel(gate) : '无待补门禁'
})
const styleProofNextRunbookLabel = computed(() => {
  const runbook = styleProofExecutionRunbook.value
  const step = runbook.nextLocalSafeStep
    ?? runbook.nextPhoneStep
    ?? runbook.nextExternalDependencyStep
    ?? runbook.nextUnsafeToAutomateStep

  return step ? `${styleProofGateLabel(step.gate)} · ${styleProofRequirementLabel(step.requirement.id)}` : '无待执行步骤'
})
const styleProofAcceptanceSummary = computed(() => {
  const audit = styleProofAcceptanceAudit.value
  const external = audit.summary.externalAccountOpenRequirements + audit.summary.phoneOpenRequirements
  return `不可宣称 ${audit.summary.cannotClaimRequirements}；外部/手机 ${external}；安全本地待补 ${audit.summary.safeToAutomateOpenRequirements}`
})
const selectedStyleChoiceApplication = computed(() =>
  styleApplicationReport.value.find(item =>
    item.availability.choice.id === selectedStyleChoiceIds.value[selectedPlatform.value],
  ) ?? null,
)

const styleCatalogPreflightRow = computed<PreflightRow>(() => {
  const report = styleAvailabilityReport.value
  const proofPlan = styleProofCollectionPlan.value
  const proofQueue = styleProofCollectionQueue.value
  const runbook = styleProofExecutionRunbook.value
  const limitedCount = report.stats.blocked + report.stats.unavailable
  const selectedAction = selectedStyleChoiceApplication.value
  const proofTail = `待补证据 ${proofPlan.summary.total}；门禁 ${proofQueue.summary.totalGates}；下一步 ${styleProofNextGateLabel.value}；执行手册 ${runbook.summary.openSteps}；不可宣称 ${runbook.summary.cannotClaimSteps}；本地 ${proofPlan.summary.safeToAutomate}；手机 ${proofPlan.summary.phoneSteps}；账号/平台 ${proofPlan.summary.externalAccountSteps}`

  if (selectedAction?.selectable && selectedAction.application) {
    return {
      key: 'style-catalog',
      label: '样式能力目录',
      state: 'ready',
      detail: `已选择 ${selectedAction.availability.choice.label} → ${selectedAction.application.presetLabel}（${selectedAction.application.presetId}）；可用 ${report.stats.usable}/${report.stats.total}；${proofTail}`,
    }
  }

  if (selectedAction && !selectedAction.selectable) {
    return {
      key: 'style-catalog',
      label: '样式能力目录',
      state: 'blocked',
      detail: `${selectedAction.availability.choice.label} 当前不可应用：${selectedAction.reason}；${proofTail}`,
    }
  }

  return {
    key: 'style-catalog',
    label: '样式能力目录',
    state: report.stats.usable > 0 ? limitedCount > 0 ? 'warning' : 'ready' : 'blocked',
    detail: `可用 ${report.stats.usable}/${report.stats.total}；受限 ${report.stats.blocked}；不可用 ${report.stats.unavailable}；${proofTail}`,
  }
})

const styleAcceptancePreflightRow = computed<PreflightRow>(() => {
  const audit = styleProofAcceptanceAudit.value
  const runbook = styleProofExecutionRunbook.value
  const summary = audit.summary

  if (summary.cannotClaimRequirements === 0) {
    return {
      key: 'style-acceptance',
      label: '验收宣称审计',
      state: 'ready',
      detail: `当前 redacted proof 已覆盖全部宣称项；执行手册开放 ${runbook.summary.openSteps}；不可宣称步骤 ${runbook.summary.cannotClaimSteps}；下一手册 ${styleProofNextRunbookLabel.value}；最终仍以平台证据文件为准。`,
    }
  }

  const nextParts = [
    audit.nextLocalSafeAction ? `本地：${styleProofGateLabel(audit.nextLocalSafeAction.gate)}` : '',
    audit.nextPhoneAction ? `手机：${styleProofGateLabel(audit.nextPhoneAction.gate)}` : '',
    audit.nextExternalAccountAction ? `外部：${styleProofGateLabel(audit.nextExternalAccountAction.gate)}` : '',
    audit.nextUnsafeToAutomateAction ? `需人工：${styleProofGateLabel(audit.nextUnsafeToAutomateAction.gate)}` : '',
  ].filter(Boolean)

  return {
    key: 'style-acceptance',
    label: '验收宣称审计',
    state: 'warning',
    detail: `${styleProofAcceptanceSummary.value}；执行手册开放 ${runbook.summary.openSteps}；不可宣称步骤 ${runbook.summary.cannotClaimSteps}；下一手册 ${styleProofNextRunbookLabel.value}；不得声明手机预览、同步、发布或 public host 已完成。${nextParts.length ? ` 下一步 ${nextParts.join('；')}` : ''}`,
  }
})

const styleChoiceRows = computed<StyleChoiceDisplay[]>(() =>
  styleApplicationReport.value.map(item => {
    const proofSteps = styleProofStepsByChoice.value.get(item.availability.choice.id) ?? []
    const cannotClaim = styleProofCannotClaimByChoice.value.get(item.availability.choice.id) ?? []
    const executionSteps = styleProofExecutionOpenByChoice.value.get(item.availability.choice.id) ?? []
    return {
      availability: item.availability,
      application: item.application,
      selectable: item.selectable,
      selected: selectedStyleChoiceIds.value[selectedPlatform.value] === item.availability.choice.id,
      statusClass: `style-choice-${item.availability.status}`,
      statusLabel: styleStatusLabel(item.availability.status, item.availability.usable),
      outputLabel: styleArtifactLabel(item.availability.choice.primaryOutput),
      strengthLabel: styleStrengthLabel(item.availability.choice.visualStrength),
      motionLabel: styleMotionLabel(item.availability.choice.motion),
      ruleGroupLabel: styleRuleGroupLabel(item.availability.choice.ruleGroup),
      evidenceLabel: styleEvidenceLabel(item.availability.requiredEvidence),
      detail: styleChoiceDetail(item.availability),
      proofSummary: styleProofSummary(proofSteps),
      proofGateLabels: styleProofGateLabels(proofSteps),
      acceptanceSummary: styleProofAcceptanceSummaryForChoice(cannotClaim),
      cannotClaimLabels: styleProofCannotClaimLabels(cannotClaim),
      executionSummary: styleProofExecutionSummary(executionSteps),
      executionLabels: styleProofExecutionLabels(executionSteps),
      actionLabel: styleChoiceActionLabel(item),
    }
  }),
)

function styleProofSummary(steps: readonly StyleProofCollectionStep[]): string {
  if (steps.length === 0) return '证据门禁：当前无待采集项，仍以最终平台验收为准'

  const invalid = steps.filter(step => step.status === 'invalid').length
  const localSafe = steps.filter(step => step.safeToAutomate).length
  const phone = steps.filter(step => step.requiresPhone).length
  const external = steps.filter(step => step.requiresExternalAccount).length
  const invalidPart = invalid > 0 ? `，无效 ${invalid}` : ''
  return `证据门禁：待采集 ${steps.length}${invalidPart}；本地 ${localSafe}；手机 ${phone}；账号/平台 ${external}`
}

function styleProofGateLabels(steps: readonly StyleProofCollectionStep[]): string[] {
  const labels: string[] = []
  const seen = new Set<StyleProofCollectionGate>()
  for (const step of steps) {
    if (seen.has(step.gate)) continue
    seen.add(step.gate)
    labels.push(styleProofGateLabel(step.gate))
    if (labels.length >= 4) break
  }
  return labels
}

function styleProofGateLabel(gate: StyleProofCollectionGate): string {
  const labels: Record<StyleProofCollectionGate, string> = {
    'local-evidence': '本地证据',
    'market-editor': '市场编辑器',
    'authenticated-pc-editor': 'PC 编辑器',
    'phone-preview': '手机预览',
    'credentialed-channel': '授权通道',
    'public-host': '公开图床',
    'platform-publish': '平台发布',
    'sensitive-hygiene': '敏感清洁',
  }
  return labels[gate]
}

function styleProofAcceptanceSummaryForChoice(
  requirements: readonly StyleProofAcceptanceRequirementAudit[],
): string {
  if (requirements.length === 0) return '验收审计：当前无不可宣称项，最终仍以平台证据为准'

  const phone = requirements.filter(requirement => requirement.requiresPhone).length
  const external = requirements.filter(requirement => requirement.requiresExternalAccount).length
  const unsafe = requirements.filter(requirement => requirement.status === 'unsafe-to-automate').length
  const invalid = requirements.filter(requirement => requirement.status === 'invalid').length
  const invalidPart = invalid > 0 ? `；无效 ${invalid}` : ''
  return `验收审计：不可宣称 ${requirements.length}${invalidPart}；手机 ${phone}；账号/平台 ${external}；需人工 ${unsafe}`
}

function styleProofCannotClaimLabels(
  requirements: readonly StyleProofAcceptanceRequirementAudit[],
): string[] {
  return [...requirements]
    .sort((a, b) => styleProofCannotClaimRank(a) - styleProofCannotClaimRank(b))
    .slice(0, 4)
    .map(requirement => `${styleProofRequirementLabel(requirement.requirement.id)} · ${styleProofAcceptanceStatusLabel(requirement.status)}`)
}

function styleProofCannotClaimRank(requirement: StyleProofAcceptanceRequirementAudit): number {
  if (requirement.status === 'invalid') return 0
  if (requirement.requiresPhone) return 1
  if (requirement.requiresExternalAccount) return 2
  if (requirement.status === 'unsafe-to-automate') return 3
  if (requirement.status === 'blocked-by-external') return 4
  return 5
}

function styleProofExecutionSummary(steps: readonly StyleProofExecutionRunbookStep[]): string {
  if (steps.length === 0) return '执行手册：当前无开放步骤，仍以平台证据为准'

  const cannotClaim = steps.filter(step => step.cannotClaim).length
  const localSafe = steps.filter(step => step.safeToAutomate).length
  const phone = steps.filter(step => step.requiresPhone).length
  const external = steps.filter(step => step.requiresExternalAccount || step.gate === 'public-host').length
  const unsafe = steps.filter(step => step.status === 'unsafe-to-automate').length

  return `执行手册：开放 ${steps.length}；不可宣称 ${cannotClaim}；本地 ${localSafe}；手机 ${phone}；外部 ${external}；需人工 ${unsafe}`
}

function styleProofExecutionLabels(steps: readonly StyleProofExecutionRunbookStep[]): string[] {
  return [...steps]
    .sort((a, b) => styleProofExecutionStepRank(a) - styleProofExecutionStepRank(b))
    .slice(0, 4)
    .map(step => `${styleProofRequirementLabel(step.requirement.id)} · ${styleProofExecutionBoundaryLabel(step.boundary)} · ${styleProofExecutionContractLabel(step)}`)
}

function styleProofExecutionStepRank(step: StyleProofExecutionRunbookStep): number {
  if (step.status === 'invalid') return 0
  if (step.requiresPhone) return 1
  if (step.mutatesPlatform) return 2
  if (step.gate === 'public-host') return 3
  if (step.requiresExternalAccount) return 4
  if (step.safeToAutomate) return 5
  return 6
}

function styleProofExecutionBoundaryLabel(boundary: StyleProofExecutionRunbookStep['boundary']): string {
  const labels: Record<StyleProofExecutionRunbookStep['boundary'], string> = {
    'local-only': '本地',
    'market-editor-account': '市场账号',
    'authenticated-pc-editor': 'PC 账号',
    'phone-preview': '手机',
    'public-host': '公网',
    'credentialed-channel': '授权',
    'platform-publish': '发布',
  }
  return labels[boundary]
}

function styleProofExecutionContractLabel(step: StyleProofExecutionRunbookStep): string {
  switch (step.requirement.id) {
    case 'pc-editor-paste-event':
      return '字段 ordinaryClipboardPasteVerified / pasteInputEventVerified'
    case 'phone-preview-readback':
      return '字段 phonePreviewContentVerified'
    case 'dark-mode-check':
      return '字段 phonePreviewContentVerified / darkModeEnabledVerified'
    case 'cover-thumbnail-check':
      return '字段 coverThumbnailAccepted'
    case 'public-image-host':
      return step.requiredArtifact.acceptedHostStatuses
        ? `host ${step.requiredArtifact.acceptedHostStatuses.join('/')}`
        : 'host public-https'
    default: {
      const fields = step.requiredArtifact.requiredFields
      if (fields.length === 0) return styleProofGateLabel(step.gate)
      const tail = fields.length > 2 ? '/...' : ''
      return `字段 ${fields.slice(0, 2).join('/')}${tail}`
    }
  }
}

function styleProofRequirementLabel(requirementId: StyleProofRequirementId): string {
  const labels: Record<StyleProofRequirementId, string> = {
    'catalog-source': '目录来源',
    'market-applied-dom-readback': '市场元素读回',
    'no-proprietary-template-source': '无第三方模板源',
    'authenticated-editor-url': '登录编辑器 URL',
    'pc-editor-dom-readback': 'PC DOM 读回',
    'unit-test-coverage': '单测覆盖',
    'local-browser-rendering': '本地浏览器渲染',
    'exact-artifact': '同一导出产物',
    'safe-disposable-draft': '安全草稿',
    'pc-editor-paste-event': 'PC 粘贴事件',
    'phone-preview-readback': '手机预览读回',
    'phone-screenshot': '手机截图',
    'dark-mode-check': '暗黑模式',
    'cover-thumbnail-check': '封面缩略图',
    'credentialed-channel-response': '授权通道响应',
    'sync-readback': '同步读回',
    'published-url-or-platform-preview': '发布/平台预览',
    'public-image-host': '公开图片 host',
    'xhs-artifact-manifest': '小红书图片清单',
    'zhihu-artifact-manifest': '知乎图片清单',
    'no-sensitive-artifact': '敏感材料清洁',
  }
  return labels[requirementId]
}

function styleProofAcceptanceStatusLabel(status: StyleProofAcceptanceAuditStatus): string {
  const labels: Record<StyleProofAcceptanceAuditStatus, string> = {
    completed: '完成',
    missing: '缺失',
    invalid: '无效',
    'blocked-by-external': '外部阻断',
    'unsafe-to-automate': '需人工',
  }
  return labels[status]
}

function styleChoiceActionLabel(item: StyleChoiceApplicationAvailability): string {
  if (item.selectable && item.application) return `应用到 ${item.application.presetLabel}`
  if (!item.application) return item.availability.usable ? '仅说明能力' : '不可应用'
  if (item.availability.status === 'unavailable') return '不可用'
  return '受限'
}

function styleStatusLabel(status: StyleChoiceStatus, usable: boolean): string {
  if (usable) return '可用'
  if (status === 'unavailable') return '不可用'
  return '受限'
}

function styleEvidenceLabel(label: StyleEvidenceLabel): string {
  const labels: Record<StyleEvidenceLabel, string> = {
    'doc-only': '文档',
    'applied-editor-element': '已应用元素',
    'authenticated-editor-reachable': '已登录编辑器',
    'pc-editor-dom-readable': 'PC DOM 可读',
    'unit-tested': '单测',
    'local-browser': '本机浏览器',
    'pc-editor-paste': 'PC 编辑器',
    'mobile-preview': '手机预览',
    'credentialed-sync': '授权同步',
    published: '已发布',
  }
  return labels[label]
}

function styleArtifactLabel(type: StyleArtifactType): string {
  const labels: Record<StyleArtifactType, string> = {
    'inline-html': 'Inline HTML',
    'wechat-safe-svg': '安全 SVG',
    'plain-text': '纯文本',
    'image-page': '图片页',
    'long-image': '长图',
    'clean-markdown': 'Markdown',
    'image-fallback': '图片降级',
    'publish-checklist': '发布清单',
    'static-fallback': '静态降级',
    unavailable: '不可用',
  }
  return labels[type]
}

function styleStrengthLabel(strength: StyleVisualStrength): string {
  const labels: Record<StyleVisualStrength, string> = {
    low: '低',
    medium: '中',
    'medium-high': '中高',
    high: '高',
  }
  return labels[strength]
}

function styleMotionLabel(motion: StyleMotionLevel): string {
  const labels: Record<StyleMotionLevel, string> = {
    none: '无动效',
    static: '静态',
    'click-candidate': '点击候选',
    'mobile-only': '手机风险',
  }
  return labels[motion]
}

function styleRuleGroupLabel(group: StyleRuleGroup): string {
  const labels: Record<StyleRuleGroup, string> = {
    'headline-system': '标题体系',
    'body-system': '正文体系',
    'card-system': '卡片体系',
    'figure-system': '图像体系',
    'guide-system': '引导体系',
    'interactive-system': '交互体系',
    'fallback-system': '降级体系',
    'editor-workflow-system': '编辑工作流',
    'layout-and-layer-system': '图层布局',
  }
  return labels[group]
}

function styleChoiceDetail(availability: StyleChoiceAvailability): string {
  const fallback = `fallback：${styleArtifactLabel(availability.choice.fallbackOutput)}`
  if (availability.usable) {
    const evidence = availability.bestEvidence ? styleEvidenceLabel(availability.bestEvidence) : '无'
    return `当前证据 ${evidence}，${fallback}`
  }

  const blockers = availability.choice.blockers.length > 0
    ? availability.choice.blockers.join('；')
    : availability.reason
  return `${blockers}；${fallback}`
}

function selectPreset(id: string, source: 'preset' | 'style-choice' = 'preset') {
  platformPresetIds.value[selectedPlatform.value] = id
  if (source === 'preset') {
    selectedStyleChoiceIds.value[selectedPlatform.value] = null
  }
  if (selectedPlatform.value === 'wechat') {
    const preset = themePresets.find(item => item.id === id) || getDefaultPreset()
    exportOptions.value.primaryColor = preset.primaryColor
    exportOptions.value.fontFamily = normalizeExportFontFamily(preset.fontFamily)
    exportOptions.value.fontSize = normalizeExportFontSize(preset.fontSize)
  }
}

function selectStyleChoice(row: StyleChoiceDisplay) {
  if (!row.selectable || !row.application) {
    showOperationFeedback('error', `${row.availability.choice.label} 当前不能应用到真实导出 preset。`)
    return
  }

  selectedStyleChoiceIds.value[selectedPlatform.value] = row.availability.choice.id
  selectPreset(row.application.presetId, 'style-choice')
  showOperationFeedback('info', `已应用 ${row.availability.choice.label}，实际使用 ${row.application.presetLabel}。`)
}

function normalizeExportFontFamily(value: string): ExportFontFamily {
  if (value === 'serif' || value === 'monospace') return value
  return 'sans-serif'
}

function normalizeExportFontSize(value: string): ExportFontSize {
  return STYLE_SIZE_OPTIONS.some(option => option.id === value)
    ? value as ExportFontSize
    : '16px'
}

const defaultWechatPreset = getDefaultPreset()

// ─── Export Options ──────────────────────────────────────
const exportOptions = ref<ExportOptions>({
  enableCiteStatus: true,
  enableLineNumbers: false,
  enableReadingTime: true,
  enableCodeHighlight: true,
  enableAlertBlocks: true,
  enableEnhancedTable: true,
  enableMacCodeBlock: true,
  codeTheme: 'atom-one-dark',
  readingSpeed: 300,
  primaryColor: defaultWechatPreset.primaryColor,
  fontFamily: normalizeExportFontFamily(defaultWechatPreset.fontFamily),
  fontSize: normalizeExportFontSize(defaultWechatPreset.fontSize),
})

// ─── Render State ────────────────────────────────────────
const previewHtml = ref('')
const qualityReport = ref<QualityReport | null>(null)
const wechatStats = ref<ExportStats | null>(null)
const nativeResult = ref<NativeExportResult | null>(null)
const renderErrorMessage = ref('')
const isRendering = ref(false)

const nativeFormatLabel = computed(() => {
  if (!nativeResult.value) return '平台原生格式'
  return NATIVE_FORMAT_LABELS[nativeResult.value.format]
})

const wechatPublishStatus = ref<WechatPublishStatus | null>(null)
const isWechatPublishStatusLoading = ref(false)
const wechatPublishStatusError = ref('')
let publishStatusVersion = 0

const wechatDraftTitle = ref('')
const wechatDraftThumbMediaId = ref('')
const wechatDraftShowCoverPic = ref(false)
const isWechatDraftCreating = ref(false)
const wechatDraftError = ref('')
const wechatDraftResult = ref<WechatDraftPublishResult | null>(null)
let draftSeedKey = ''

function cleanDraftTitle(title: string): string {
  return title
    .replace(/<[^>]+>/g, '')
    .replace(/[#*_`[\]()>~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, WECHAT_DRAFT_TITLE_MAX_CHARS)
}

function inferWechatDraftTitle(markdown: string): string {
  const heading = markdown.match(/^\s{0,3}#\s+(.+)$/m)?.[1]
  if (heading) {
    const title = cleanDraftTitle(heading)
    if (title) return title
  }

  const firstContentLine = markdown
    .split(/\r?\n/)
    .map(line => cleanDraftTitle(line))
    .find(line => line.length > 0)

  return firstContentLine || 'Inkforge 微信草稿'
}

async function refreshPublishIntegrationStatus() {
  if (!props.visible || selectedPlatform.value !== 'wechat') {
    publishStatusVersion += 1
    wechatPublishStatus.value = null
    wechatPublishStatusError.value = ''
    isWechatPublishStatusLoading.value = false
    return
  }

  const thisVersion = ++publishStatusVersion
  isWechatPublishStatusLoading.value = true
  wechatPublishStatusError.value = ''

  try {
    const status = await getWechatPublishStatus()
    if (publishStatusVersion !== thisVersion) return
    wechatPublishStatus.value = status
  } catch (error) {
    if (publishStatusVersion !== thisVersion) return
    wechatPublishStatus.value = null
    wechatPublishStatusError.value = error instanceof Error ? error.message : '未知错误'
  } finally {
    if (publishStatusVersion === thisVersion) {
      isWechatPublishStatusLoading.value = false
    }
  }
}

const publishIntegrationStatus = computed<PublishIntegrationStatus>(() => {
  if (selectedPlatform.value !== 'wechat') {
    return {
      configured: false,
      state: 'blocked',
      detail: `${platformInfo.value.name} 尚未接入真实 API 发布链；当前只提供可复制、可下载的真实导出产物。`,
    }
  }

  if (isWechatPublishStatusLoading.value) {
    return {
      configured: false,
      state: 'warning',
      detail: '正在检测微信公众号真实发布能力...',
    }
  }

  if (wechatPublishStatusError.value) {
    return {
      configured: false,
      state: 'blocked',
      detail: `微信公众号发布状态检测失败：${wechatPublishStatusError.value}`,
    }
  }

  if (wechatPublishStatus.value) {
    return {
      configured: wechatPublishStatus.value.configured,
      state: wechatPublishStatus.value.configured ? 'ready' : 'blocked',
      detail: describeWechatPublishStatus(wechatPublishStatus.value),
    }
  }

  return {
    configured: false,
    state: 'warning',
    detail: '等待检测微信公众号真实发布能力。',
  }
})

const canCreateWechatDraft = computed(() => {
  const native = nativeResult.value
  return (
    selectedPlatform.value === 'wechat'
    && publishIntegrationStatus.value.configured
    && !isRendering.value
    && !isWechatDraftCreating.value
    && native?.format === 'html'
    && Boolean(native.content.trim())
    && Boolean(wechatDraftTitle.value.trim())
    && Array.from(wechatDraftTitle.value.trim()).length <= WECHAT_DRAFT_TITLE_MAX_CHARS
    && Boolean(wechatDraftThumbMediaId.value.trim())
  )
})

const wechatDraftPreflightRow = computed<PreflightRow>(() => {
  if (selectedPlatform.value !== 'wechat') {
    return {
      key: 'wechat-draft',
      label: '微信草稿',
      state: 'blocked',
      detail: '仅微信公众号平台支持创建草稿。',
    }
  }

  if (!publishIntegrationStatus.value.configured) {
    return {
      key: 'wechat-draft',
      label: '微信草稿',
      state: 'blocked',
      detail: '需要先在 Tauri 桌面环境配置 WECHAT_APP_ID / WECHAT_APP_SECRET。',
    }
  }

  if (!nativeResult.value?.content.trim()) {
    return {
      key: 'wechat-draft',
      label: '微信草稿',
      state: 'warning',
      detail: '等待微信 HTML 原生产物生成后才能创建草稿。',
    }
  }

  if (!wechatDraftTitle.value.trim()) {
    return {
      key: 'wechat-draft',
      label: '微信草稿',
      state: 'blocked',
      detail: '需要填写草稿标题。',
    }
  }

  const titleLength = Array.from(wechatDraftTitle.value.trim()).length
  if (titleLength > WECHAT_DRAFT_TITLE_MAX_CHARS) {
    return {
      key: 'wechat-draft',
      label: '微信草稿',
      state: 'blocked',
      detail: `草稿标题不能超过 ${WECHAT_DRAFT_TITLE_MAX_CHARS} 字，当前为 ${titleLength} 字。`,
    }
  }

  if (!wechatDraftThumbMediaId.value.trim()) {
    return {
      key: 'wechat-draft',
      label: '微信草稿',
      state: 'blocked',
      detail: '需要填写真实永久封面素材 thumb_media_id；不会伪造封面素材。',
    }
  }

  return {
    key: 'wechat-draft',
    label: '微信草稿',
    state: 'ready',
    detail: '已具备创建微信公众号草稿的最小必要字段。',
  }
})

const preflightRows = computed<PreflightRow[]>(() => {
  const rows: PreflightRow[] = [
    {
      key: 'source',
      label: '权威 Markdown 输入',
      state: props.content?.trim() ? 'ready' : 'blocked',
      detail: props.content?.trim() ? '已从当前文稿读取真实内容' : '当前文稿为空，无法导出',
    },
    {
      key: 'render',
      label: '平台渲染产物',
      state: previewHtml.value && nativeResult.value ? 'ready' : renderErrorMessage.value ? 'blocked' : 'warning',
      detail: renderErrorMessage.value || (previewHtml.value && nativeResult.value ? '样式版与原生版均已生成' : '等待渲染完成'),
    },
    {
      key: 'quality',
      label: '发布质量检测',
      state: qualityReport.value?.passed ? 'ready' : qualityReport.value ? 'warning' : 'warning',
      detail: qualityReport.value
        ? `错误 ${qualityReport.value.stats.errors}，警告 ${qualityReport.value.stats.warnings}，建议 ${qualityReport.value.stats.suggestions}`
        : '等待质量检测结果',
    },
    styleCatalogPreflightRow.value,
    styleAcceptancePreflightRow.value,
    {
      key: 'clipboard',
      label: '剪贴板权限',
      state: isClipboardWriteAvailable() ? 'ready' : 'warning',
      detail: isClipboardWriteAvailable()
        ? '浏览器提供剪贴板写入能力，最终仍受用户手势与权限控制'
        : '当前环境未暴露剪贴板写入能力，可改用下载文件',
    },
    {
      key: 'publish',
      label: selectedPlatform.value === 'wechat' ? '微信 API 授权' : '直连发布',
      state: publishIntegrationStatus.value.state,
      detail: publishIntegrationStatus.value.detail,
    },
  ]

  if (selectedPlatform.value === 'wechat') {
    rows.push(wechatDraftPreflightRow.value)
  }

  return rows
})

let renderVersion = 0

watch(
  [() => props.content, () => props.visible, selectedPlatform, selectedPresetId, exportOptions],
  async () => {
    if (!props.visible || !props.content?.trim()) {
      previewHtml.value = ''
      qualityReport.value = null
      wechatStats.value = null
      nativeResult.value = null
      renderErrorMessage.value = ''
      isRendering.value = false
      return
    }

    const thisVersion = ++renderVersion
    const platform = selectedPlatform.value
    const presetId = selectedPresetId.value

    isRendering.value = true
    renderErrorMessage.value = ''

    // Quality detection (synchronous)
    qualityReport.value = detectQuality(props.content, platform)

    try {
      if (platform === 'wechat') {
        const preset = themePresets.find(p => p.id === presetId) || getDefaultPreset()
        const result = await markdownToWechatWithStats(props.content, preset, exportOptions.value)
        if (renderVersion !== thisVersion) return
        previewHtml.value = result.html
        wechatStats.value = result.stats
      } else {
        const html = await convertToPlatform(props.content, platform, {
          presetId,
          exportOptions: exportOptions.value,
        })
        if (renderVersion !== thisVersion) return
        previewHtml.value = html
        wechatStats.value = null
      }

      const native = await convertToNativeFormat(props.content, platform, {
        presetId,
        exportOptions: exportOptions.value,
      })
      if (renderVersion !== thisVersion) return
      nativeResult.value = native
    } catch (error) {
      if (renderVersion !== thisVersion) return
      previewHtml.value = ''
      nativeResult.value = null
      wechatStats.value = null
      renderErrorMessage.value = error instanceof Error ? error.message : '导出渲染失败'
      showOperationFeedback('error', `导出渲染失败：${renderErrorMessage.value}`)
    } finally {
      if (renderVersion === thisVersion) {
        isRendering.value = false
      }
    }
  },
  { immediate: true, deep: true }
)

watch(
  [() => props.visible, selectedPlatform],
  () => {
    void refreshPublishIntegrationStatus()
  },
  { immediate: true }
)

watch(
  [() => props.visible, () => props.content],
  ([visible, content]) => {
    const nextSeedKey = visible ? content : ''
    if (nextSeedKey === draftSeedKey) return
    draftSeedKey = nextSeedKey
    wechatDraftTitle.value = visible ? inferWechatDraftTitle(content) : ''
    wechatDraftError.value = ''
    wechatDraftResult.value = null
  },
  { immediate: true }
)

// ─── Copy ────────────────────────────────────────────────
const copySuccess = ref(false)
const nativeCopySuccess = ref(false)
const operationFeedback = ref<OperationFeedback | null>(null)

let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined
let nativeCopyFeedbackTimer: ReturnType<typeof setTimeout> | undefined
let operationFeedbackTimer: ReturnType<typeof setTimeout> | undefined

function showOperationFeedback(kind: FeedbackKind, message: string) {
  operationFeedback.value = { kind, message }
  clearTimeout(operationFeedbackTimer)
  operationFeedbackTimer = setTimeout(() => {
    operationFeedback.value = null
  }, FEEDBACK_DURATION + 1000)
}

function buildExportFilename(kind: 'styled' | 'native'): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')

  if (kind === 'native' && nativeResult.value) {
    const extension = NATIVE_FILE_EXTENSIONS[nativeResult.value.format]
    return `inkforge-${selectedPlatform.value}-native-${timestamp}.${extension}`
  }

  return `inkforge-${selectedPlatform.value}-styled-${timestamp}.html`
}

function downloadArtifact(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

async function copyHtmlToPlatformClipboard(content: string): Promise<boolean> {
  return selectedPlatform.value === 'wechat'
    ? copyWechatHtmlToClipboard(content)
    : copyToClipboard(content)
}

async function handleCopy() {
  const content = previewHtml.value
  if (!content || isRendering.value) return

  showOperationFeedback('info', '正在写入剪贴板，请等待浏览器权限返回。')
  const success = await copyHtmlToPlatformClipboard(content)

  if (success) {
    copySuccess.value = true
    showOperationFeedback('success', `已复制 ${platformInfo.value.name} 样式版 HTML，可粘贴到平台编辑器。`)
    clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => { copySuccess.value = false }, FEEDBACK_DURATION)
  } else {
    showOperationFeedback('error', '复制失败：浏览器拒绝剪贴板写入，请使用下载文件或检查剪贴板权限。')
  }
}

async function handleCopyNative() {
  const result = nativeResult.value
  if (!result?.content || isRendering.value) return

  showOperationFeedback('info', `正在复制 ${platformInfo.value.name} ${NATIVE_FORMAT_LABELS[result.format]} 原生产物。`)
  const success = result.format === 'html'
    ? await copyHtmlToPlatformClipboard(result.content)
    : await copyTextToClipboard(result.content)

  if (success) {
    nativeCopySuccess.value = true
    showOperationFeedback('success', `已复制 ${platformInfo.value.name} ${NATIVE_FORMAT_LABELS[result.format]} 原生产物。`)
    clearTimeout(nativeCopyFeedbackTimer)
    nativeCopyFeedbackTimer = setTimeout(() => { nativeCopySuccess.value = false }, FEEDBACK_DURATION)
  } else {
    showOperationFeedback('error', '复制原生产物失败：当前浏览器或权限不允许写入剪贴板。')
  }
}

// ─── Download ────────────────────────────────────────────
function handleDownload() {
  const content = previewHtml.value
  if (!content || isRendering.value) return

  try {
    downloadArtifact(content, buildExportFilename('styled'), 'text/html;charset=utf-8')
    showOperationFeedback('success', '已生成样式版 HTML 下载文件。')
  } catch {
    showOperationFeedback('error', '下载失败：浏览器未能创建本地文件，请稍后重试。')
  }
}

function handleDownloadNative() {
  const result = nativeResult.value
  if (!result?.content || isRendering.value) return

  try {
    downloadArtifact(result.content, buildExportFilename('native'), NATIVE_MIME_TYPES[result.format])
    showOperationFeedback('success', `已生成 ${NATIVE_FORMAT_LABELS[result.format]} 原生下载文件。`)
  } catch {
    showOperationFeedback('error', '下载原生产物失败：浏览器未能创建本地文件，请稍后重试。')
  }
}

async function handleCreateWechatDraft() {
  if (selectedPlatform.value !== 'wechat') return

  const native = nativeResult.value
  if (!canCreateWechatDraft.value || !native || native.format !== 'html') {
    showOperationFeedback('error', wechatDraftPreflightRow.value.detail)
    return
  }

  isWechatDraftCreating.value = true
  wechatDraftError.value = ''
  wechatDraftResult.value = null
  showOperationFeedback('info', '正在上传正文图片并创建微信公众号草稿。')

  try {
    const result = await publishWechatDraft({
      title: wechatDraftTitle.value.trim(),
      contentHtml: native.content,
      thumbMediaId: wechatDraftThumbMediaId.value.trim(),
      showCoverPic: wechatDraftShowCoverPic.value ? 1 : 0,
    })
    wechatDraftResult.value = result
    showOperationFeedback('success', `微信草稿已创建：${result.mediaId}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建微信草稿失败'
    wechatDraftError.value = message
    showOperationFeedback('error', `创建微信草稿失败：${message}`)
  } finally {
    isWechatDraftCreating.value = false
  }
}

// ─── Quality Helpers ─────────────────────────────────────
function severityIcon(severity: QualityIssueSeverity): Component {
  switch (severity) {
    case 'error': return X
    case 'warning': return AlertCircle
    case 'suggestion': return Lightbulb
    default: {
      const _exhaustiveCheck: never = severity
      return _exhaustiveCheck
    }
  }
}

// ─── Keyboard ────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(() => props.visible, (visible) => {
  if (visible) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  clearTimeout(copyFeedbackTimer)
  clearTimeout(nativeCopyFeedbackTimer)
  clearTimeout(operationFeedbackTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="export-overlay"
      @click.self="emit('close')"
    >
      <div
        class="export-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        <!-- ════ Header ════ -->
        <div class="export-header">
          <h2
            id="export-modal-title"
            class="export-title"
          >
            导出文章
          </h2>
          <button
            type="button"
            class="header-close"
            aria-label="关闭导出面板"
            title="关闭"
            @click="emit('close')"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- ════ Body: Two Columns ════ -->
        <div class="export-body">
          <!-- ── Left: Control Area ── -->
          <div class="control-column">
            <div class="control-scroll">
              <!-- Platform Selection -->
              <div class="ctrl-section">
                <div class="platform-pills">
                  <button
                    v-for="p in PLATFORMS"
                    :key="p.id"
                    type="button"
                    class="pill-btn"
                    :class="{ active: selectedPlatform === p.id }"
                    @click="selectedPlatform = p.id"
                  >
                    <component
                      :is="resolveExportIcon(p.icon, p.id)"
                      class="pill-icon"
                      :size="14"
                      :stroke-width="2"
                    />
                    <span class="pill-label">{{ p.name }}</span>
                  </button>
                </div>
              </div>

              <!-- Preset Theme Grid -->
              <div class="ctrl-section">
                <div class="section-label">
                  选择风格
                </div>
                <div class="preset-grid">
                  <button
                    v-for="preset in currentPresets"
                    :key="preset.id"
                    type="button"
                    class="preset-card"
                    :class="{ active: selectedPresetId === preset.id }"
                    @click="selectPreset(preset.id)"
                  >
                    <component
                      :is="resolveExportIcon(preset.id || preset.icon, preset.id)"
                      class="preset-icon"
                      :size="16"
                      :stroke-width="2"
                    />
                    <span class="preset-name">{{ preset.name }}</span>
                    <span
                      class="preset-color-bar"
                      :style="{ backgroundColor: preset.primaryColor }"
                    />
                  </button>
                </div>
              </div>

              <!-- Style Capability Catalog -->
              <div class="ctrl-section style-catalog-area">
                <div class="section-label">
                  样式能力
                </div>
                <div class="style-catalog-summary">
                  <span>{{ platformInfo.name }} 当前可用 {{ styleAvailabilityReport.stats.usable }}/{{ styleAvailabilityReport.stats.total }}</span>
                  <span>证据门禁由 runtime catalog 决定</span>
                  <span>下一步 {{ styleProofNextGateLabel }}，共 {{ styleProofCollectionQueue.summary.totalGates }} 类门禁</span>
                  <span>验收审计 {{ styleProofAcceptanceSummary }}</span>
                  <span>执行手册 开放 {{ styleProofExecutionRunbook.summary.openSteps }}；不可宣称 {{ styleProofExecutionRunbook.summary.cannotClaimSteps }}；下一手册 {{ styleProofNextRunbookLabel }}</span>
                </div>
                <div class="style-choice-list">
                  <button
                    v-for="row in styleChoiceRows"
                    :key="row.availability.choice.id"
                    type="button"
                    class="style-choice-card"
                    :class="[
                      row.statusClass,
                      {
                        'style-choice-selected': row.selected,
                        'style-choice-disabled': !row.selectable,
                      },
                    ]"
                    :disabled="!row.selectable"
                    :aria-pressed="row.selected"
                    @click="selectStyleChoice(row)"
                  >
                    <div class="style-choice-head">
                      <span class="style-choice-name">{{ row.availability.choice.label }}</span>
                      <span class="style-choice-status">{{ row.statusLabel }}</span>
                    </div>
                    <div class="style-choice-meta">
                      <span>{{ row.ruleGroupLabel }}</span>
                      <span>{{ row.outputLabel }}</span>
                      <span>{{ row.strengthLabel }}</span>
                      <span>{{ row.motionLabel }}</span>
                      <span>需 {{ row.evidenceLabel }}</span>
                    </div>
                    <p class="style-choice-detail">
                      {{ row.detail }}
                    </p>
                    <p class="style-choice-proof-summary">
                      {{ row.proofSummary }}
                    </p>
                    <div
                      v-if="row.proofGateLabels.length"
                      class="style-choice-proof-gates"
                      aria-label="待补证据门禁"
                    >
                      <span
                        v-for="gateLabel in row.proofGateLabels"
                        :key="gateLabel"
                      >
                        {{ gateLabel }}
                      </span>
                    </div>
                    <p class="style-choice-acceptance-summary">
                      {{ row.acceptanceSummary }}
                    </p>
                    <p class="style-choice-execution-summary">
                      {{ row.executionSummary }}
                    </p>
                    <div
                      v-if="row.cannotClaimLabels.length"
                      class="style-choice-cannot-claim"
                      aria-label="不可宣称项"
                    >
                      <span
                        v-for="claimLabel in row.cannotClaimLabels"
                        :key="claimLabel"
                      >
                        {{ claimLabel }}
                      </span>
                    </div>
                    <div
                      v-if="row.executionLabels.length"
                      class="style-choice-execution-contracts"
                      aria-label="执行手册契约"
                    >
                      <span
                        v-for="executionLabel in row.executionLabels"
                        :key="executionLabel"
                      >
                        {{ executionLabel }}
                      </span>
                    </div>
                    <div class="style-choice-action">
                      <span>{{ row.actionLabel }}</span>
                      <span
                        v-if="row.application"
                        class="style-choice-preset"
                      >
                        {{ row.application.presetId }}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Style Options -->
              <div class="ctrl-section">
                <div class="section-label">
                  样式
                </div>

                <div
                  v-if="selectedPlatform === 'wechat'"
                  class="style-control-group"
                >
                  <div class="style-control-row">
                    <span class="option-label">
                      <Type
                        :size="13"
                        class="inline-option-icon"
                      />
                      字体
                    </span>
                    <div class="segmented-control">
                      <button
                        v-for="font in STYLE_FONT_OPTIONS"
                        :key="font.id"
                        type="button"
                        class="segment-btn"
                        :class="{ active: exportOptions.fontFamily === font.id }"
                        @click="exportOptions.fontFamily = font.id"
                      >
                        {{ font.label }}
                      </button>
                    </div>
                  </div>

                  <div class="style-control-row">
                    <span class="option-label">字号</span>
                    <div class="segmented-control compact">
                      <button
                        v-for="size in STYLE_SIZE_OPTIONS"
                        :key="size.id"
                        type="button"
                        class="segment-btn"
                        :class="{ active: exportOptions.fontSize === size.id }"
                        @click="exportOptions.fontSize = size.id"
                      >
                        {{ size.label }}
                      </button>
                    </div>
                  </div>

                  <div class="style-control-row swatch-row">
                    <span class="option-label">
                      <Palette
                        :size="13"
                        class="inline-option-icon"
                      />
                      主题色
                    </span>
                    <div class="swatch-grid">
                      <button
                        v-for="swatch in STYLE_COLOR_OPTIONS"
                        :key="swatch.id"
                        type="button"
                        class="swatch-btn"
                        :class="{ active: exportOptions.primaryColor === swatch.color }"
                        :style="{ backgroundColor: swatch.color }"
                        :title="swatch.label"
                        :aria-label="swatch.label"
                        @click="exportOptions.primaryColor = swatch.color"
                      />
                    </div>
                  </div>
                </div>

                <div class="option-row">
                  <label
                    class="option-label"
                    for="code-theme-select"
                  >代码主题</label>
                  <select
                    id="code-theme-select"
                    v-model="exportOptions.codeTheme"
                    class="option-select"
                  >
                    <option
                      v-for="theme in CODE_THEMES"
                      :key="theme.id"
                      :value="theme.id"
                    >
                      {{ theme.label }}
                    </option>
                  </select>
                </div>

                <div class="toggle-list">
                  <label class="toggle-item">
                    <input
                      v-model="exportOptions.enableMacCodeBlock"
                      type="checkbox"
                    >
                    <span class="toggle-text">Mac 窗口风格代码块</span>
                  </label>
                </div>
              </div>

              <!-- Format Options -->
              <div class="ctrl-section">
                <div class="section-label">
                  格式
                </div>
                <div class="toggle-list">
                  <label
                    v-if="selectedPlatform === 'wechat'"
                    class="toggle-item"
                  >
                    <input
                      v-model="exportOptions.enableReadingTime"
                      type="checkbox"
                    >
                    <span class="toggle-text">阅读时间</span>
                  </label>
                  <label class="toggle-item">
                    <input
                      v-model="exportOptions.enableEnhancedTable"
                      type="checkbox"
                    >
                    <span class="toggle-text">增强表格</span>
                  </label>
                  <label
                    v-if="selectedPlatform === 'wechat'"
                    class="toggle-item"
                  >
                    <input
                      v-model="exportOptions.enableAlertBlocks"
                      type="checkbox"
                    >
                    <Lightbulb
                      :size="13"
                      class="toggle-icon"
                    />
                    <span class="toggle-text">Alert 块</span>
                  </label>
                  <label class="toggle-item">
                    <input
                      v-model="exportOptions.enableLineNumbers"
                      type="checkbox"
                    >
                    <Hash
                      :size="13"
                      class="toggle-icon"
                    />
                    <span class="toggle-text">显示行号</span>
                  </label>
                  <label
                    v-if="selectedPlatform !== 'xiaohongshu'"
                    class="toggle-item"
                  >
                    <input
                      v-model="exportOptions.enableCiteStatus"
                      type="checkbox"
                    >
                    <Link2
                      :size="13"
                      class="toggle-icon"
                    />
                    <span class="toggle-text">外链转脚注</span>
                  </label>
                </div>
              </div>

              <!-- Quality Detection -->
              <div
                v-if="qualityReport"
                class="ctrl-section quality-area"
              >
                <div class="section-label">
                  质量检测
                </div>
                <div
                  class="quality-banner"
                  :class="qualityReport.passed ? 'quality-passed' : 'quality-failed'"
                >
                  <span>{{ qualityReport.passed ? '检测通过' : '发现问题' }}</span>
                  <div class="quality-counts">
                    <span
                      v-if="qualityReport.stats.errors"
                      class="qc-badge qc-error"
                    >
                      {{ qualityReport.stats.errors }} 错误
                    </span>
                    <span
                      v-if="qualityReport.stats.warnings"
                      class="qc-badge qc-warning"
                    >
                      {{ qualityReport.stats.warnings }} 警告
                    </span>
                    <span
                      v-if="qualityReport.stats.suggestions"
                      class="qc-badge qc-info"
                    >
                      {{ qualityReport.stats.suggestions }} 建议
                    </span>
                  </div>
                </div>
                <div
                  v-if="qualityReport.issues.length"
                  class="quality-list"
                >
                  <div
                    v-for="issue in qualityReport.issues"
                    :key="issue.id"
                    class="quality-item"
                    :class="issue.severity"
                  >
                    <component
                      :is="severityIcon(issue.severity)"
                      class="qi-icon"
                      :size="14"
                    />
                    <div class="qi-body">
                      <p class="qi-message">
                        {{ issue.message }}
                      </p>
                      <p
                        v-if="issue.suggestion"
                        class="qi-tip"
                      >
                        {{ issue.suggestion }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Export Preflight -->
              <div class="ctrl-section preflight-area">
                <div class="section-label">
                  导出预检
                </div>
                <div class="preflight-list">
                  <div
                    v-for="row in preflightRows"
                    :key="row.key"
                    class="preflight-row"
                    :class="`preflight-${row.state}`"
                  >
                    <span
                      class="preflight-dot"
                      aria-hidden="true"
                    />
                    <div class="preflight-copy">
                      <span class="preflight-label">{{ row.label }}</span>
                      <span class="preflight-detail">{{ row.detail }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- WeChat Draft Creation -->
              <div
                v-if="selectedPlatform === 'wechat'"
                class="ctrl-section wechat-draft-area"
              >
                <div class="section-label">
                  微信草稿
                </div>
                <div class="wechat-draft-panel">
                  <label class="draft-field">
                    <span class="draft-label">草稿标题</span>
                    <input
                      v-model="wechatDraftTitle"
                      class="draft-input"
                      type="text"
                      :maxlength="WECHAT_DRAFT_TITLE_MAX_CHARS"
                      autocomplete="off"
                    >
                  </label>
                  <label class="draft-field">
                    <span class="draft-label">封面 thumb_media_id</span>
                    <input
                      v-model="wechatDraftThumbMediaId"
                      class="draft-input"
                      type="text"
                      autocomplete="off"
                      spellcheck="false"
                      placeholder="填写真实永久图片素材 media_id"
                    >
                  </label>
                  <label class="draft-checkbox">
                    <input
                      v-model="wechatDraftShowCoverPic"
                      type="checkbox"
                    >
                    <span>正文显示封面图</span>
                  </label>
                  <button
                    type="button"
                    class="draft-action"
                    :disabled="!canCreateWechatDraft"
                    @click="handleCreateWechatDraft"
                  >
                    <Loader2
                      v-if="isWechatDraftCreating"
                      :size="14"
                      class="spinner"
                    />
                    <span>{{ isWechatDraftCreating ? '创建中' : '创建草稿' }}</span>
                  </button>
                  <div
                    v-if="wechatDraftResult"
                    class="draft-result draft-result-success"
                  >
                    草稿 media_id：{{ wechatDraftResult.mediaId }}；已上传正文图片 {{ wechatDraftResult.uploadedImageCount }} 张。
                  </div>
                  <div
                    v-else-if="wechatDraftError"
                    class="draft-result draft-result-error"
                  >
                    {{ wechatDraftError }}
                  </div>
                  <div
                    v-else
                    class="draft-help"
                  >
                    这里只创建公众号草稿；群发、投票、小程序卡片等后台组件仍需在微信后台完成。
                  </div>
                </div>
              </div>

              <!-- Native Output -->
              <div class="ctrl-section native-area">
                <div class="section-label">
                  平台原生产物
                </div>
                <div
                  v-if="nativeResult"
                  class="native-card"
                >
                  <div class="native-card-main">
                    <span class="native-format">{{ nativeFormatLabel }}</span>
                    <span class="native-detail">
                      {{ platformInfo.name }} 推荐复制格式，{{ nativeResult.content.length }} 字符
                    </span>
                  </div>
                  <div class="native-actions">
                    <button
                      type="button"
                      class="mini-action"
                      :class="{ success: nativeCopySuccess }"
                      :disabled="isRendering || !nativeResult.content"
                      @click="handleCopyNative"
                    >
                      {{ nativeCopySuccess ? '已复制' : '复制原生' }}
                    </button>
                    <button
                      type="button"
                      class="mini-action"
                      :disabled="isRendering || !nativeResult.content"
                      @click="handleDownloadNative"
                    >
                      下载原生
                    </button>
                  </div>
                </div>
                <div
                  v-else
                  class="native-empty"
                >
                  原生产物会在真实渲染完成后生成。
                </div>
              </div>

              <div
                v-if="operationFeedback"
                class="ctrl-section feedback-area"
                :class="`feedback-${operationFeedback.kind}`"
                aria-live="polite"
              >
                {{ operationFeedback.message }}
              </div>

              <!-- WeChat Stats (when available) -->
              <div
                v-if="wechatStats && selectedPlatform === 'wechat'"
                class="ctrl-section"
              >
                <div class="section-label">
                  文章统计
                </div>
                <div class="stats-row">
                  <div class="stat-chip">
                    <span class="stat-num">{{ wechatStats.wordCount }}</span>
                    <span class="stat-unit">字数</span>
                  </div>
                  <div class="stat-chip">
                    <span class="stat-num">{{ wechatStats.readingTime }}</span>
                    <span class="stat-unit">分钟</span>
                  </div>
                  <div class="stat-chip">
                    <span class="stat-num">{{ wechatStats.codeBlockCount }}</span>
                    <span class="stat-unit">代码块</span>
                  </div>
                  <div class="stat-chip">
                    <span class="stat-num">{{ wechatStats.linkCount }}</span>
                    <span class="stat-unit">链接</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons (pinned to bottom) -->
            <div class="action-bar">
              <button
                type="button"
                class="act-btn act-secondary"
                :disabled="isRendering || !previewHtml"
                @click="handleDownload"
              >
                <Download :size="14" />
                <span>下载样式版</span>
              </button>
              <button
                type="button"
                class="act-btn act-primary"
                :class="{ 'act-success': copySuccess }"
                :disabled="isRendering || !previewHtml"
                @click="handleCopy"
              >
                <CheckCircle
                  v-if="copySuccess"
                  :size="14"
                />
                <Copy
                  v-else
                  :size="14"
                />
                <span>{{ copySuccess ? '已复制' : `${platformInfo.copyLabel}样式版` }}</span>
                <ArrowUpRight
                  v-if="!copySuccess"
                  class="act-nib"
                  :size="14"
                />
              </button>
            </div>
          </div>

          <!-- ── Right: Preview Area ── -->
          <div class="preview-column">
            <div class="preview-topbar">
              <span class="preview-topbar-label preview-topbar-title">
                <component
                  :is="resolveExportIcon(platformInfo.icon, platformInfo.id)"
                  class="preview-topbar-icon"
                  :size="14"
                  :stroke-width="2"
                />
                <span>{{ platformInfo.name }} 预览</span>
              </span>
              <span
                class="forge-line preview-topbar-line"
                aria-hidden="true"
              />
            </div>
            <div class="preview-viewport">
              <!-- Loading Spinner -->
              <div
                v-if="isRendering"
                class="preview-loading"
              >
                <Loader2
                  :size="28"
                  class="spinner"
                />
                <span class="loading-text">渲染中...</span>
              </div>
              <!-- Empty State -->
              <div
                v-else-if="!previewHtml"
                class="preview-empty"
              >
                <AlertCircle
                  :size="32"
                  class="empty-icon"
                />
                <span class="empty-text">暂无内容可预览</span>
              </div>
              <!-- v-html Preview -->
              <div
                v-else
                class="preview-render"
                v-html="previewHtml"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   Ethereal Constructivism Design Language
   ═══════════════════════════════════════════════════════════ */

/* ── Overlay ── */
.export-overlay {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* ── Panel ── */
.export-panel {
  width: 92vw;
  max-width: 900px;
  max-height: 80vh;
  background: var(--bg-surface);
  border-radius: var(--radius-xlarge);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--elev-3);
}

/* ── Header ── */
.export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--hairline);
  flex-shrink: 0;
}

.export-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.2px;
}

.header-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart);
  flex-shrink: 0;
}

.header-close:hover {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

/* Keyboard focus rings (canonical Kiln double-ring) for all
   keyboard-reachable controls in this overlay. */
.header-close:focus-visible,
.pill-btn:focus-visible,
.preset-card:focus-visible,
.style-choice-card:focus-visible,
.segment-btn:focus-visible,
.swatch-btn:focus-visible,
.draft-action:focus-visible,
.mini-action:focus-visible,
.act-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* ── Body (Two Columns) ── */
.export-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* ═══════════════════════════════════════════════════════════
   Left Column: Controls (400px)
   ═══════════════════════════════════════════════════════════ */
.control-column {
  width: 400px;
  max-width: 400px;
  min-width: 0;
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--hairline);
  background: var(--bg-surface);
}

.control-scroll {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
}

/* Section spacing */
.ctrl-section {
  min-width: 0;
  padding: 16px 20px;
  border-bottom: 1px solid var(--hairline);
}

.ctrl-section:last-child {
  border-bottom: none;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

/* ── Platform Pills ── */
.platform-pills {
  display: flex;
  gap: 6px;
  background: var(--bg-rice-paper);
  border-radius: 8px;
  padding: 3px;
}

.pill-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart);
  white-space: nowrap;
}

.pill-btn:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}

.pill-btn.active {
  background: var(--ember);
  color: #FFFFFF;
  box-shadow: var(--elev-1);
}

.pill-icon {
  font-size: 13px;
}

.pill-label {
  font-size: 12px;
}

/* ── Preset Grid (2 columns) ── */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px 0;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--bg-surface);
  cursor: pointer;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    background-color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart);
  text-align: center;
  overflow: hidden;
}

.preset-card:hover {
  border-color: var(--ember-border);
  background: var(--ember-soft);
}

.pill-icon {
  flex-shrink: 0;
}

.preset-card.active {
  border-color: var(--ember);
  background: var(--ember-soft);
  box-shadow: 0 0 0 1px var(--ember);
}

.preset-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.preset-card.active .preset-icon {
  color: var(--ember);
}

.preset-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-color-bar {
  display: block;
  width: 100%;
  height: 4px;
  border-radius: 0 0 11px 11px;
  margin-top: 4px;
}

/* ── Style capability catalog ── */
.style-catalog-summary {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.45;
}

.style-catalog-summary span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.style-choice-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 8px;
}

.style-choice-card {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: var(--bg-rice-paper);
  color: inherit;
  font: inherit;
  text-align: left;
  overflow: hidden;
  cursor: default;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    background-color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart);
}

.style-choice-card:not(:disabled) {
  cursor: pointer;
}

.style-choice-card:not(:disabled):hover {
  border-color: var(--ember-border);
  background: var(--ember-soft);
}

.style-choice-card.style-choice-selected {
  border-color: var(--ember);
  background: var(--ember-soft);
  box-shadow: 0 0 0 1px var(--ember);
}

.style-choice-card.style-choice-disabled {
  opacity: 0.82;
}

.style-choice-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.style-choice-name {
  min-width: 0;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.style-choice-status {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--success-light);
  color: var(--success);
  font-size: 11px;
  font-weight: 800;
}

.style-choice-blocked .style-choice-status {
  background: var(--warning-light);
  color: var(--warning);
}

.style-choice-unavailable .style-choice-status {
  background: var(--error-light);
  color: var(--error);
}

.style-choice-meta {
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
  gap: 5px;
  margin-top: 7px;
}

.style-choice-meta span {
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--bg-surface);
  border: 1px solid var(--hairline);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
}

.style-choice-detail {
  margin: 7px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.style-choice-proof-summary {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.style-choice-acceptance-summary {
  margin: 5px 0 0;
  color: var(--warning);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.style-choice-execution-summary {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.style-choice-proof-gates {
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
  gap: 4px;
  margin-top: 6px;
}

.style-choice-cannot-claim {
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
  gap: 4px;
  margin-top: 6px;
}

.style-choice-execution-contracts {
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
  gap: 4px;
  margin-top: 6px;
}

.style-choice-proof-gates span {
  padding: 2px 6px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: color-mix(in srgb, var(--warning-light) 62%, var(--bg-surface));
  color: var(--warning);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.35;
}

.style-choice-cannot-claim span {
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--warning) 42%, var(--hairline));
  border-radius: 999px;
  background: color-mix(in srgb, var(--warning-light) 72%, var(--bg-surface));
  color: var(--warning);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.style-choice-execution-contracts span {
  min-width: 0;
  max-width: 100%;
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--text-muted) 38%, var(--hairline));
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-surface) 84%, var(--warning-light));
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
  white-space: normal;
  word-break: break-word;
}

.style-choice-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.style-choice-card:not(:disabled) .style-choice-action {
  color: var(--ember);
}

.style-choice-preset {
  flex-shrink: 0;
  max-width: 46%;
  color: var(--text-secondary);
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Export Options ── */
.style-control-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.style-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.inline-option-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.option-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
}

.option-select {
  flex: 1;
  max-width: 180px;
  padding: 6px 10px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: var(--bg-surface);
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
  transition: border-color var(--motion-fast) var(--ease-out-quart);
  appearance: auto;
}

.option-select:hover {
  border-color: var(--text-muted);
}

.option-select:focus {
  border-color: var(--ember);
}

.segmented-control {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  min-width: 204px;
  padding: 3px;
  border-radius: 8px;
  background: var(--bg-rice-paper);
  border: 1px solid var(--hairline);
}

.segmented-control.compact {
  min-width: 204px;
}

.segment-btn {
  min-width: 0;
  height: 28px;
  padding: 0 7px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.segment-btn:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}

.segment-btn.active {
  color: var(--bg-surface);
  background: var(--text-primary);
}

.swatch-row {
  align-items: flex-start;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(6, 24px);
  gap: 7px;
}

.swatch-btn {
  width: 24px;
  height: 24px;
  border: 2px solid var(--bg-surface);
  border-radius: 999px;
  box-shadow: 0 0 0 1px var(--hairline);
  cursor: pointer;
}

.swatch-btn:hover,
.swatch-btn.active {
  box-shadow: 0 0 0 2px var(--text-primary);
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    background-color var(--motion-fast) var(--ease-out-quart);
  background: var(--bg-surface);
}

.toggle-item:hover {
  border-color: var(--text-muted);
  background: var(--bg-rice-paper);
}

.toggle-item input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--ember);
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.toggle-text {
  flex: 1;
  font-size: 13px;
}

/* ── Quality Detection ── */
.quality-area {
  /* no extra style needed */
}

.quality-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.quality-passed {
  background: var(--success-light);
  color: var(--success);
}

.quality-failed {
  background: var(--warning-light);
  color: var(--warning);
}

.quality-counts {
  display: flex;
  gap: 6px;
}

.qc-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.qc-error {
  background: var(--error-light);
  color: var(--error);
}

.qc-warning {
  background: var(--warning-light);
  color: var(--warning);
}

.qc-info {
  background: var(--accent-secondary-light);
  color: var(--accent-secondary);
}

.quality-list {
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quality-item {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.quality-item.error {
  background: var(--error-light);
}

.quality-item.warning {
  background: var(--warning-light);
}

.quality-item.suggestion {
  background: var(--accent-secondary-light);
}

.qi-icon {
  flex-shrink: 0;
  font-size: 13px;
}

.qi-body {
  flex: 1;
  min-width: 0;
}

.qi-message {
  margin: 0;
  color: var(--text-primary);
  font-size: 12px;
}

.qi-tip {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
}

/* ── Export preflight ── */
.preflight-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preflight-row {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid var(--hairline);
  border-radius: 9px;
  background: var(--bg-rice-paper);
}

.preflight-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}

.preflight-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.preflight-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.preflight-detail {
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-secondary);
}

.preflight-ready .preflight-dot {
  background: var(--success);
}

.preflight-warning .preflight-dot {
  background: var(--warning);
}

.preflight-blocked .preflight-dot {
  background: var(--error);
}

/* ── WeChat draft ── */
.wechat-draft-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--bg-rice-paper);
}

.draft-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.draft-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
}

.draft-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 9px;
  border: 1px solid var(--hairline);
  border-radius: 7px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.4;
  outline: none;
}

.draft-input:focus {
  border-color: var(--ember);
  box-shadow: 0 0 0 2px var(--ember-soft);
}

.draft-checkbox {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 12px;
}

.draft-checkbox input {
  width: 14px;
  height: 14px;
  accent-color: var(--ember);
}

.draft-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  border: none;
  border-radius: 7px;
  background: var(--ember);
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--elev-1);
  transition: box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart);
}

.draft-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.draft-action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--glow-ember);
}

.draft-help,
.draft-result {
  font-size: 11px;
  line-height: 1.5;
}

.draft-help {
  color: var(--text-secondary);
}

.draft-result-success {
  color: var(--success);
}

.draft-result-error {
  color: var(--error);
}

/* ── Native output ── */
.native-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--paper-warm);
}

.native-card-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.native-format {
  font-size: 13px;
  font-weight: 800;
  color: var(--ember);
}

.native-detail,
.native-empty {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.native-actions {
  display: flex;
  gap: 8px;
}

.mini-action {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--hairline);
  border-radius: 7px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart);
}

.mini-action:hover:not(:disabled) {
  border-color: var(--ember-border);
  color: var(--ember);
}

.mini-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini-action.success {
  border-color: var(--success);
  background: var(--success-light);
  color: var(--success);
}

.feedback-area {
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
}

.feedback-success {
  background: var(--success-light);
  color: var(--success);
}

.feedback-error {
  background: var(--error-light);
  color: var(--error);
}

.feedback-info {
  background: var(--accent-secondary-light);
  color: var(--accent-secondary);
}

/* ── Stats ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  background: var(--ember-soft);
  border-radius: 8px;
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--ember);
}

.stat-unit {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ── Action Bar (pinned bottom) ── */
.action-bar {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--hairline);
  background: var(--bg-surface);
}

.act-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    border-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart);
  border: none;
}

.act-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.act-secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--hairline);
}

.act-secondary:hover:not(:disabled) {
  border-color: var(--text-muted);
  background: var(--bg-rice-paper);
}

.act-primary {
  background: var(--ember);
  color: #FFFFFF;
  box-shadow: var(--elev-1);
}

.act-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--glow-ember);
}

.act-nib {
  flex-shrink: 0;
  transition: transform var(--motion-fast) var(--ease-out-quart);
}

.act-primary:hover:not(:disabled) .act-nib {
  transform: translate(2px, -2px);
}

.act-success {
  background: var(--success) !important;
}

.act-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--elev-2);
}

/* ═══════════════════════════════════════════════════════════
   Right Column: Preview
   ═══════════════════════════════════════════════════════════ */
.preview-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--paper-warm);
  min-width: 0;
}

.preview-topbar {
  flex-shrink: 0;
  padding: 10px 20px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--hairline);
}

.preview-topbar-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.preview-topbar-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.preview-topbar-icon {
  flex-shrink: 0;
}

.preview-topbar-line {
  margin-top: 8px;
}

.preview-viewport {
  flex: 1;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
}

/* Loading */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: var(--text-secondary);
}

.spinner {
  animation: spin 1s linear infinite;
  color: var(--ember);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Empty State */
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 200px;
}

.empty-icon {
  color: var(--text-muted);
}

.empty-text {
  font-size: 13px;
  color: var(--text-secondary);
}

/* v-html Preview Container */
.preview-render {
  background: var(--bg-surface);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
  min-height: 200px;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.7;
  font-size: 15px;
  color: var(--text-primary);
}

/* Ensure nested content respects container */
.preview-render :deep(img) {
  max-width: 100%;
  height: auto;
}

.preview-render :deep(pre) {
  overflow-x: auto;
  max-width: 100%;
}

.preview-render :deep(table) {
  max-width: 100%;
  overflow-x: auto;
  display: block;
}

/* ═══════════════════════════════════════════════════════════
   Scrollbar Styling — defers to the global 6px + theme-aware
   var(--scrollbar-thumb) rule (design-system.css). The previous
   bespoke 4px #CFD8DC track was not dark-aware.
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 980px) {
  .export-overlay {
    padding: 12px;
    align-items: stretch;
  }

  .export-panel {
    width: 100%;
    max-width: none;
    max-height: calc(100vh - 24px);
    border-radius: 12px;
  }

  .export-header {
    padding: 14px 16px;
  }

  .export-body {
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .control-column {
    width: 100%;
    max-width: none;
    min-width: 0;
    flex: 0 0 auto;
    border-right: none;
    border-bottom: 1px solid var(--hairline);
  }

  .control-scroll {
    overflow: visible;
  }

  .ctrl-section {
    padding: 14px 16px;
  }

  .preset-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .action-bar {
    padding: 14px 16px;
    gap: 8px;
  }

  .act-btn {
    min-width: 0;
    padding: 10px 12px;
    white-space: normal;
  }

  .preview-column {
    width: 100%;
    min-width: 0;
    min-height: 420px;
    flex: 0 0 auto;
  }

  .preview-topbar {
    padding: 10px 16px;
  }

  .preview-viewport {
    max-height: 520px;
    padding: 14px;
  }

  .preview-render {
    padding: 16px;
  }
}

@media (max-width: 420px) {
  .export-overlay {
    padding: 8px;
  }

  .export-panel {
    max-height: calc(100vh - 16px);
  }

  .platform-pills {
    gap: 4px;
  }

  .pill-btn {
    padding: 8px 4px;
  }

  .action-bar {
    flex-direction: column;
  }

  .preview-column {
    min-height: 360px;
  }

  .preview-viewport {
    max-height: 460px;
  }
}
</style>
