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
  getPlatformStyleMarketCapabilityReport,
  getPlatformStyleProofAcceptanceAuditReport,
  getPlatformStyleProofCollectionPlan, getPlatformStyleProofCollectionQueue,
  getPlatformStyleProofExecutionRunbook,
  getCommittedStyleProofExternalHandoffReport,
  getCommittedStyleProofExternalHandoffPacket,
  formatCommittedStyleProofExternalHandoffPacketMarkdown,
  getCommittedStyleProofExternalProofChecklistReport,
  getCommittedStyleProofLocalActionabilityReport,
  getCommittedStyleProofEvidenceReleaseGateReport,
  getWechatSvgApplicationSlotModuleId,
  normalizeWechatSvgApplicationPlan,
  setWechatSvgApplicationSlot,
  SVG_MODULES,
  WECHAT_SVG_APPLICATION_SLOTS,
  WECHAT_DRAFT_TITLE_MAX_CHARS,
  markdownToWechatWithStats
} from '@/services/export'
import { resolveExportIcon } from '@/utils/iconography'
import type {
  Platform, ExportOptions, ExportStats,
  CommittedStyleProofReleaseGateBlocker,
  CommittedStyleProofExternalHandoffReport,
  CommittedStyleProofExternalProofChecklistGroup,
  CommittedStyleProofLocalActionabilityReport,
  NativeExportResult, QualityReport, QualityIssueSeverity, CodeTheme,
  WechatPublishStatus,
  ExportFontFamily, ExportFontSize,
  StyleArtifactType, StyleChoiceApplication, StyleChoiceApplicationAvailability,
  StyleChoiceAvailability, StyleChoiceStatus, StyleEvidenceLabel,
  StyleMarketCapability, StyleMarketCapabilityFamily, StyleMarketCapabilityStatus,
  StyleMarketTriggerMode, StyleMotionLevel, StyleProofAcceptanceAuditStatus,
  StyleProofAcceptanceRequirementAudit, StyleProofCollectionGate, StyleProofCollectionStep,
  StyleProofExecutionRunbookStep, StyleProofRequirementId, StyleRuleGroup, StyleVisualStrength,
  SvgModuleFamily, SvgInjectionPlan, WechatSvgApplicationSlotId
} from '@/services/export'
import type { ExportPreset } from '@/types'
import type { Component } from 'vue'
import { useSettingsStore } from '@/stores/settings'

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

interface ExternalProofChecklistDisplay {
  kind: CommittedStyleProofExternalProofChecklistGroup['kind']
  label: string
  statusLabel: string
  rowCount: number
  detail: string
}

interface LocalActionabilityDisplay {
  kind: 'actionable-local' | 'catalog-blocked'
  label: string
  rowCount: number
  detail: string
}

interface ExternalHandoffFlagDisplay {
  kind: 'phone' | 'account' | 'public-host' | 'unsafe' | 'mutating'
  label: string
  rowCount: number
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
  marketCapabilitySummary: string | null
  marketCapabilityLabels: string[]
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
  title?: string
  initialPlatform?: Platform
  exportCustomCss?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const settingsStore = useSettingsStore()

// ─── Platform ────────────────────────────────────────────
function normalizeInitialPlatform(platform: Platform | undefined): Platform {
  if (platform === 'wechat' || platform === 'xiaohongshu' || platform === 'zhihu') {
    return platform
  }
  return 'wechat'
}

const selectedPlatform = ref<Platform>(normalizeInitialPlatform(props.initialPlatform))
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
const styleMarketCapabilityReport = computed(() => getPlatformStyleMarketCapabilityReport(selectedPlatform.value))
const styleProofCollectionPlan = computed(() => getPlatformStyleProofCollectionPlan(selectedPlatform.value))
const styleProofCollectionQueue = computed(() => getPlatformStyleProofCollectionQueue(selectedPlatform.value))
const styleProofAcceptanceAudit = computed(() => getPlatformStyleProofAcceptanceAuditReport(selectedPlatform.value))
const styleProofExecutionRunbook = computed(() => getPlatformStyleProofExecutionRunbook(selectedPlatform.value))
const committedStyleProofExternalHandoff = computed(() => getCommittedStyleProofExternalHandoffReport())
const committedStyleProofExternalHandoffPacket = computed(() =>
  getCommittedStyleProofExternalHandoffPacket(committedStyleProofExternalHandoff.value),
)
const committedStyleProofExternalHandoffMarkdown = computed(() =>
  formatCommittedStyleProofExternalHandoffPacketMarkdown(committedStyleProofExternalHandoffPacket.value),
)
const committedStyleProofExternalChecklist = computed(() => getCommittedStyleProofExternalProofChecklistReport())
const committedStyleProofLocalActionability = computed(() => getCommittedStyleProofLocalActionabilityReport())
const committedStyleProofReleaseGate = computed(() => getCommittedStyleProofEvidenceReleaseGateReport())
const committedStyleProofReleaseConflictCount = computed(() =>
  committedStyleProofReleaseGate.value.blockers.reduce((total, blocker) =>
    total + (blocker.fingerprintConflicts?.length ?? 0), 0),
)
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
const styleMarketCapabilitiesByChoice = computed(() => {
  const grouped = new Map<string, readonly StyleMarketCapability[]>()
  for (const entry of styleMarketCapabilityReport.value.choices) {
    grouped.set(entry.choice.id, entry.capabilities)
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
const styleProofReleaseGateSummary = computed(() => {
  const gate = committedStyleProofReleaseGate.value
  return gate.canClaimComplete
    ? 'canClaimComplete=true；blockers 0；fingerprintConflicts 0'
    : `canClaimComplete=false；blockers ${gate.blockers.length}；fingerprintConflicts ${committedStyleProofReleaseConflictCount.value}`
})
const styleProofExternalChecklistSummary = computed(() => {
  const checklist = committedStyleProofExternalChecklist.value
  return `外部证明清单 ${checklist.summary.uniqueChecklistRowCount} 行；分组 ${checklist.summary.groupCount}；手机 ${checklist.summary.phoneRows}；账号 ${checklist.summary.externalAccountRows}；public host ${checklist.summary.publicHostRows}；需人工 ${checklist.summary.unsafeToAutomateRows}`
})
const styleProofLocalActionabilitySummary = computed(() => {
  const report = committedStyleProofLocalActionability.value
  return `本地可行动 ${report.summary.actionableLocalRows}；目录阻断 ${report.summary.catalogBlockedLocalRows}；安全本地 ${report.summary.safeLocalOpenRows}；外部清单 ${report.summary.externalChecklistRows}`
})
const styleProofExternalHandoffSummary = computed(() => {
  const report = committedStyleProofExternalHandoff.value
  return `外部交接 ${report.summary.externalHandoffRows} 行；分组 ${report.summary.externalHandoffGroups}；安全外部 ${report.summary.safeExternalRows}；本地可行动 ${report.summary.actionableLocalRows}`
})
const styleProofLocalActionabilityRows = computed<LocalActionabilityDisplay[]>(() => {
  const report = committedStyleProofLocalActionability.value
  return [
    {
      kind: 'actionable-local',
      label: '本地可做',
      rowCount: report.summary.actionableLocalRows,
      detail: styleProofLocalActionabilityDetail(report, 'actionable-local'),
    },
    {
      kind: 'catalog-blocked',
      label: '目录阻断',
      rowCount: report.summary.catalogBlockedLocalRows,
      detail: styleProofLocalActionabilityDetail(report, 'catalog-blocked'),
    },
  ]
})
const styleProofExternalHandoffFlags = computed<ExternalHandoffFlagDisplay[]>(() => {
  const report = committedStyleProofExternalHandoff.value
  return [
    {
      kind: 'phone',
      label: '手机',
      rowCount: report.summary.phoneRows,
      detail: report.requiresPhone ? '需要手机预览读回' : '无手机阻断',
    },
    {
      kind: 'account',
      label: '账号',
      rowCount: report.summary.externalAccountRows,
      detail: report.requiresExternalAccount ? '需要真实账号环境' : '无账号阻断',
    },
    {
      kind: 'public-host',
      label: '公网',
      rowCount: report.summary.publicHostRows,
      detail: report.requiresPublicHost ? '需要公开 host 读回' : '无公网阻断',
    },
    {
      kind: 'unsafe',
      label: '人工',
      rowCount: report.summary.unsafeToAutomateRows,
      detail: report.containsUnsafeToAutomateRows ? '不得本地自动执行' : '无人工阻断',
    },
    {
      kind: 'mutating',
      label: '平台变更',
      rowCount: report.summary.mutatingRows,
      detail: report.containsMutatingPlatformRows ? '涉及同步或发布' : '无平台变更',
    },
  ]
})
const styleProofExternalChecklistRows = computed<ExternalProofChecklistDisplay[]>(() =>
  committedStyleProofExternalChecklist.value.groups.map(group => ({
    kind: group.kind,
    label: styleProofExternalChecklistKindLabel(group.kind),
    statusLabel: group.status === 'issue' ? '待处理' : styleProofAcceptanceStatusLabel(group.status),
    rowCount: group.rowCount,
    detail: styleProofExternalChecklistGroupDetail(group),
  })),
)
const selectedStyleChoiceApplication = computed(() =>
  styleApplicationReport.value.find(item =>
    item.availability.choice.id === selectedStyleChoiceIds.value[selectedPlatform.value],
  ) ?? null,
)
const styleRenderableApplicationSummary = computed(() => {
  const renderableRows = styleApplicationReport.value.filter(isRenderableStyleApplication)
  return {
    total: renderableRows.length,
    selectable: renderableRows.filter(item => item.selectable && item.application).length,
  }
})

const styleCurrentRoundLocalTarget = computed(() => {
  const summary = styleRenderableApplicationSummary.value
  const ready = selectedPlatform.value === 'wechat' &&
    summary.total > 0 &&
    summary.selectable === summary.total &&
    committedStyleProofLocalActionability.value.summary.actionableLocalRows === 0 &&
    committedStyleProofReleaseGate.value.canClaimComplete === false

  return {
    ready,
    label: ready ? '当前轮本地目标已就绪' : '当前轮本地目标待检查',
    detail: ready
      ? 'SVG/style 可应用到微信公众号本地导出；不等同手机预览、同步或发布证明'
      : '需确认可渲染样式、外部证明边界和本地可行动行',
  }
})

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
      detail: `${selectedAction.availability.choice.label} 当前不可应用：${styleChoiceNoticeLabel(selectedAction.reason)}；${proofTail}`,
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

function platformLabel(platform: Platform): string {
  return PLATFORMS.find(item => item.id === platform)?.name ?? platform
}

function styleProofExternalChecklistKindLabel(
  kind: CommittedStyleProofExternalProofChecklistGroup['kind'],
): string {
  const labels: Record<CommittedStyleProofExternalProofChecklistGroup['kind'], string> = {
    'phone-preview': '手机预览',
    'external-dependency': '外部依赖',
    'unsafe-to-automate': '需人工',
    'mutating-platform': '平台变更',
  }
  return labels[kind]
}

function styleProofExternalChecklistGroupDetail(
  group: CommittedStyleProofExternalProofChecklistGroup,
): string {
  const platforms = group.platformStepCounts
    .slice(0, 3)
    .map(item => `${platformLabel(item.platform)} ${item.stepCount}`)
    .join('，')
  const requirements = group.requirementStepCounts
    .slice(0, 2)
    .map(item => `${styleProofRequirementLabel(item.requirementId)} ${item.stepCount}`)
    .join('，')
  const issueCounts = styleProofReleaseIssueCountsLabel(group)
  const parts = [
    platforms ? `平台 ${platforms}` : '',
    requirements ? `证明 ${requirements}` : '',
    issueCounts ? `问题 ${issueCounts}` : '',
  ].filter(Boolean)

  return parts.join('；') || '等待真实外部证明'
}

function styleProofLocalActionabilityDetail(
  report: CommittedStyleProofLocalActionabilityReport,
  kind: LocalActionabilityDisplay['kind'],
): string {
  if (kind === 'actionable-local') {
    const row = report.nextLocalActionableRow
    return row
      ? `${platformLabel(row.platform)} ${styleProofRequirementLabel(row.requirementId)}；${row.nextOperatorAction}`
      : '当前没有可直接本地补证行；先处理目录阻断或外部证明'
  }

  const row = report.nextCatalogBlockedRow
  return row
    ? `${platformLabel(row.platform)} ${styleProofRequirementLabel(row.requirementId)}；缺项 ${row.missing}/${row.blockedChoiceCount}；${row.choiceIds.slice(0, 2).join('、')}`
    : '当前没有目录阻断的本地安全行'
}

function styleProofExternalHandoffReason(report: CommittedStyleProofExternalHandoffReport): string {
  if (report.canClaimComplete) return '提交证明已满足，仍以平台证据文件为准'

  const blockers = [
    report.canContinueLocally ? '' : '本地可行动为 0',
    report.summary.safeExternalRows === 0 ? '安全外部自动化为 0' : '',
    report.requiresPhone ? '手机预览未证明' : '',
    report.requiresExternalAccount ? '账号平台未证明' : '',
    report.requiresPublicHost ? 'public host 未证明' : '',
    report.containsMutatingPlatformRows ? '同步或发布需人工' : '',
  ].filter(Boolean)

  return `没有可本地自动化的安全外部证明行；${blockers.join('；')}`
}

function styleProofExternalHandoffNextRowLabel(report: CommittedStyleProofExternalHandoffReport): string {
  const row = report.nextPhoneRow
    ?? report.nextExternalAccountRow
    ?? report.nextPublicHostRow
    ?? report.nextUnsafeToAutomateRow
    ?? report.nextMutatingPlatformRow
    ?? report.nextCatalogBlockedRow
    ?? report.nextLocalActionableRow

  return row
    ? `${platformLabel(row.platform)} ${styleProofRequirementLabel(row.requirementId)}；${styleProofExecutionBoundaryLabel(row.boundary)}`
    : '无外部交接行'
}

function styleProofReleaseIssueIdLabel(issueId: CommittedStyleProofReleaseGateBlocker['issueCounts'][number]['issueId']): string {
  const labels: Partial<Record<CommittedStyleProofReleaseGateBlocker['issueCounts'][number]['issueId'], string>> = {
    'style-proof-manifest-requirement-missing': '缺项',
    'style-proof-manifest-choice-blocked': '目录阻断',
    'style-proof-manifest-pack-fingerprint-mismatch': '指纹冲突',
  }
  return labels[issueId] ?? issueId
}

function styleProofReleaseIssueCountsLabel(blocker: CommittedStyleProofReleaseGateBlocker): string {
  if (blocker.issueCounts.length === 0) return ''

  return blocker.issueCounts
    .slice(0, 3)
    .map(item => `${styleProofReleaseIssueIdLabel(item.issueId)} ${item.count}`)
    .join('，')
}

function styleProofReleasePlatformCountsLabel(blocker: CommittedStyleProofReleaseGateBlocker): string {
  if (blocker.platformStepCounts.length === 0) return ''

  return blocker.platformStepCounts
    .map(item => `${platformLabel(item.platform)} ${item.stepCount}`)
    .join('，')
}

function styleProofReleaseRequirementCountsLabel(blocker: CommittedStyleProofReleaseGateBlocker): string {
  if (blocker.requirementStepCounts.length === 0) return ''

  return blocker.requirementStepCounts
    .slice(0, 3)
    .map(item => `${styleProofRequirementLabel(item.requirementId)} ${item.stepCount}`)
    .join('，')
}

function styleProofReleaseBlockerLabel(blocker: CommittedStyleProofReleaseGateBlocker): string {
  const issueCounts = styleProofReleaseIssueCountsLabel(blocker)
  const platformCounts = styleProofReleasePlatformCountsLabel(blocker)
  const suffix = [issueCounts, platformCounts].filter(Boolean).join('；')
  const withSuffix = (label: string) => suffix ? `${label}（${suffix}）` : label

  switch (blocker.kind) {
    case 'local-conflict':
      return withSuffix(`本地冲突 ${blocker.issueCount}`)
    case 'phone-preview':
      return withSuffix(`手机预览 ${blocker.stepCount}`)
    case 'external-dependency':
      return withSuffix(`外部依赖 ${blocker.stepCount}`)
    case 'unsafe-to-automate':
      return withSuffix(`需人工 ${blocker.stepCount}`)
    case 'mutating-platform':
      return withSuffix(`平台变更 ${blocker.stepCount}`)
    default:
      return blocker.kind
  }
}

function styleProofReleaseRequirementCounts(
  blockers: readonly CommittedStyleProofReleaseGateBlocker[],
): string {
  const labels = blockers
    .map(styleProofReleaseRequirementCountsLabel)
    .filter(Boolean)

  return labels.length ? labels.slice(0, 3).join('；') : '无'
}

function styleProofReleaseNextOperatorActionLabel(
  action: CommittedStyleProofReleaseGateBlocker['nextOperatorActions'][number],
): string {
  const requirement = action.requirementId ? styleProofRequirementLabel(action.requirementId) : '本地冲突'
  const boundary = action.boundary ? styleProofExecutionBoundaryLabel(action.boundary) : '本地'
  return `${requirement}/${boundary}：${styleProofReleaseNextOperatorActionSummary(action)}`
}

function styleProofReleaseNextOperatorActionSummary(
  action: CommittedStyleProofReleaseGateBlocker['nextOperatorActions'][number],
): string {
  switch (action.requirementId) {
    case 'phone-preview-readback':
      return '在目标手机预览中读取同一正文，PC DOM 不能替代手机最终呈现'
    case 'phone-screenshot':
      return '采集可脱敏的手机截图或读回证据，且正文必须可见'
    case 'dark-mode-check':
      return '在手机暗黑模式下检查同一正文，设置页或 PC 预览不算完成'
    case 'cover-thumbnail-check':
      return '在手机分享、预览入口或平台列表确认封面缩略图被接受'
    case 'credentialed-channel-response':
      return '用真实授权通道取得响应，并绑定同一导出产物'
    case 'sync-readback':
      return '同步后回读草稿或素材状态，确认不是其他产物'
    case 'scheduled-send-readback':
      return '读取真实定时或发送状态；仅同步、草稿或预览不算完成'
    case 'published-url-or-platform-preview':
      return '读取平台预览或发布 URL；请求成功本身不算完成'
    case 'public-image-host':
      return '确认 public host 可访问，并绑定同一导出产物'
    case 'xhs-artifact-manifest':
      return '运行小红书图片 manifest 校验并提交通过结果'
    case 'zhihu-artifact-manifest':
      return '运行知乎图片 manifest 校验并提交通过结果'
    case 'catalog-source':
      return '补齐目录来源证据；市场观察不能直接当作发布证明'
    case 'exact-artifact':
      return '绑定同一导出产物指纹，不能复用其他产物证据'
    case 'no-sensitive-artifact':
      return '确认提交证据不含账号、profile、令牌、QR、HAR 或本机凭据材料'
    default:
      break
  }

  if (action.boundary === 'phone-preview') return '完成目标手机预览读回，不能用 PC 或本机截图替代'
  if (action.boundary === 'public-host') return '完成 public host 可访问读回，并绑定同一导出产物'
  if (action.boundary === 'platform-publish') return '由人工完成平台预览、定时或发布后的精确读回'
  if (action.boundary === 'credentialed-channel') return '由人工完成授权通道动作和精确读回'
  if (!action.requirementId) {
    if (action.action.includes('fingerprint')) {
      return '先统一已提交 manifest 指纹；每个平台和样式只能保留同一脱敏产物指纹'
    }
    if (action.action.includes('missing local artifact requirements')) {
      return '先处理目录阻断样式和本地 artifact manifest 缺项；手机、授权、public host、同步、定时/发送和发布仍由后续门禁单独证明'
    }
    if (action.action.includes('catalog-blocked choices')) {
      return '先处理已提交证据中的目录阻断样式；手机、授权、public host、同步、定时/发送和发布仍由后续门禁单独证明'
    }
    return '补齐剩余本地已提交证据行；外部平台证明不得由现有 manifest 推断'
  }

  return '按执行手册补齐该证据行，并附加同一导出产物的脱敏读回'
}

function styleProofReleaseNextOperatorActions(
  blockers: readonly CommittedStyleProofReleaseGateBlocker[],
): string {
  const labels: string[] = []
  const seen = new Set<string>()

  for (const blocker of blockers) {
    for (const action of blocker.nextOperatorActions) {
      const label = styleProofReleaseNextOperatorActionLabel(action)
      if (seen.has(label)) continue
      seen.add(label)
      labels.push(label)
      if (labels.length >= 2) return labels.join('；')
    }
  }

  return labels.join('；') || '无'
}

const committedStyleProofReleasePreflightRow = computed<PreflightRow>(() => {
  const gate = committedStyleProofReleaseGate.value
  const blockerSummary = gate.blockers.map(styleProofReleaseBlockerLabel).join('；') || '无阻塞'
  const conflictCount = committedStyleProofReleaseConflictCount.value
  const nextOperatorActions = styleProofReleaseNextOperatorActions(gate.blockers)
  const requirementCounts = styleProofReleaseRequirementCounts(gate.blockers)
  const checklistSummary = styleProofExternalChecklistSummary.value
  const localActionabilitySummary = styleProofLocalActionabilitySummary.value

  if (gate.canClaimComplete) {
    return {
      key: 'committed-proof-release',
      label: '提交证据宣称门禁',
      state: 'ready',
      detail: `canClaimComplete=true；blockers 0；fingerprintConflicts ${conflictCount}；${localActionabilitySummary}；${checklistSummary}；最终仍以平台证据文件为准。`,
    }
  }

  return {
    key: 'committed-proof-release',
    label: '提交证据宣称门禁',
    state: 'blocked',
    detail: `canClaimComplete=false；status ${gate.status}；blockers ${gate.blockers.length}；fingerprintConflicts ${conflictCount}；${localActionabilitySummary}；${checklistSummary}；${blockerSummary}；requirementCounts ${requirementCounts}；operatorNext ${nextOperatorActions}；不得声明手机预览、同步、发布或 public host 已完成。`,
  }
})

const styleChoiceRows = computed<StyleChoiceDisplay[]>(() =>
  styleApplicationReport.value.map(item => {
    const proofSteps = styleProofStepsByChoice.value.get(item.availability.choice.id) ?? []
    const cannotClaim = styleProofCannotClaimByChoice.value.get(item.availability.choice.id) ?? []
    const executionSteps = styleProofExecutionOpenByChoice.value.get(item.availability.choice.id) ?? []
    const marketCapabilities = styleMarketCapabilitiesByChoice.value.get(item.availability.choice.id) ?? []
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
      marketCapabilitySummary: styleMarketCapabilitySummary(marketCapabilities),
      marketCapabilityLabels: styleMarketCapabilityLabels(marketCapabilities),
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

function styleMarketCapabilitySummary(capabilities: readonly StyleMarketCapability[]): string | null {
  if (capabilities.length === 0) return null

  const sourceOwned = capabilities.filter(capability => capability.status === 'source-owned').length
  const fallbackOnly = capabilities.filter(capability => capability.status === 'fallback-only').length
  const blocked = capabilities.filter(capability => capability.status === 'blocked-until-proof').length
  const handoff = capabilities.filter(capability => capability.status === 'external-handoff').length
  const parts = [
    sourceOwned > 0 ? `自有 ${sourceOwned}` : '',
    fallbackOnly > 0 ? `降级 ${fallbackOnly}` : '',
    blocked > 0 ? `待证明 ${blocked}` : '',
    handoff > 0 ? `外部交接 ${handoff}` : '',
  ].filter(Boolean)

  return `市场能力：${capabilities.length}${parts.length ? `；${parts.join('；')}` : ''}`
}

function styleMarketCapabilityLabels(capabilities: readonly StyleMarketCapability[]): string[] {
  return capabilities.slice(0, 5).map(capability =>
    `${styleMarketCapabilityFamilyLabel(capability.family)} · ${styleMarketTriggerLabel(capability.triggerMode)} · ${styleMarketCapabilityStatusLabel(capability.status)}`,
  )
}

function styleMarketCapabilityFamilyLabel(family: StyleMarketCapabilityFamily): string {
  const labels: Record<StyleMarketCapabilityFamily, string> = {
    'background-svg-shell': '背景 SVG',
    'image-carousel': '图集轮播',
    'click-expand': '点击展开',
    'click-show-hide': '点击显隐',
    'click-switch': '点击切换',
    'path-animation': '路径动画',
    'parallax-motion': '视差移动',
    'slide-trigger': '滑动触发',
    'long-press-switch': '长按切换',
    'region-trigger': '区域触发',
    'title-card-layout': '标题卡片',
    'ratio-image-layer': '比例图层',
    'h5-handoff': 'H5 交接',
    'static-raster-fallback': '静态栅格',
    'public-image-fallback': '公网图片',
    'text-marquee': '文字弹幕',
    'quiz-game': '测验游戏',
    'flip-zoom': '翻转缩放',
    'click-popup': '点击弹层',
    'click-print-jump-play': '打印跳转播放',
    'falling-motion': '落下动效',
    'click-plus-auto': '点击自动',
  }
  return labels[family]
}

function styleMarketCapabilityStatusLabel(status: StyleMarketCapabilityStatus): string {
  const labels: Record<StyleMarketCapabilityStatus, string> = {
    'source-owned': '自有',
    'fallback-only': '降级',
    'blocked-until-proof': '待证明',
    'external-handoff': '外部',
  }
  return labels[status]
}

function styleMarketTriggerLabel(trigger: StyleMarketTriggerMode): string {
  const labels: Record<StyleMarketTriggerMode, string> = {
    none: '静态',
    auto: '自动',
    click: '点击',
    slide: '滑动',
    'long-press': '长按',
    region: '区域',
    'mobile-touch': '触屏',
    'plugin-sync': '插件',
    'public-host': '公网',
  }
  return labels[trigger]
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
    'scheduled-send-readback': '定时/发送读回',
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

function isRenderableStyleApplication(item: StyleChoiceApplicationAvailability): boolean {
  const choice = item.availability.choice
  return choice.primaryOutput !== 'publish-checklist' && choice.fallbackOutput !== 'unavailable'
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

const STYLE_CHOICE_NOTICE_LABELS: Record<string, string> = {
  'mobile preview proof missing': '手机预览证明缺失',
  'Dark Mode phone proof missing': '暗黑模式手机证明缺失',
  'cover thumbnail not separately proven': '封面缩略图尚未单独证明',
  'platform preview or publish proof missing': '平台预览或发布证明缺失',
  'SMIL/click behavior must be proven on phone WeChat before availability': 'SMIL/click 行为必须先在微信手机端证明后才可开放',
  'market labels say the effect only triggers on mobile': '市场标注为仅手机端触发效果',
  'phone WeChat before/after evidence missing': '微信手机端前后对照证据缺失',
  'carousel/switch behavior must be read back on phone WeChat': '轮播/切换行为必须在微信手机端读回',
  'static or image fallback required before export success': '导出成功前必须提供静态或图片降级',
  '135/Xiumi SVG and H5 taxonomy must be rewritten as InkForge-owned modules, image manifests, or static/raster fallback': '135/秀米 SVG 与 H5 规则必须重写为 InkForge 自有模块、图片 manifest 或静态/栅格降级',
  'phone WeChat proof is missing for tap, swipe, long-press, and region-trigger behavior': '点击、滑动、长按和区域触发行为缺少微信手机端证明',
  'market authoring DOM, hosted media, and plugin/sync state cannot appear in publishable output': '市场编辑 DOM、托管媒体和插件/同步状态不得进入可发布输出',
  'requires real official-account permission or editor/API state': '需要真实公众号权限或编辑器/API 状态',
  'plugin transfer was observed as a market workflow only, not executed in InkForge': '插件传输仅作为市场流程观察，尚未在 InkForge 执行',
  'channel-specific DOM readback missing': '缺少通道专属 DOM 读回',
  'requires real account authorization and sync response': '需要真实账号授权和同步响应',
  'sync does not prove mobile preview or publish': '同步不等于手机预览或发布证明',
  'H5/design/media exports are separate artifact families, not WeChat article body rendering': 'H5/设计/媒体导出属于独立产物族，不等于微信公众号正文渲染',
  'H5/design/video/PDF artifacts must materialize as XHS image pages or plain text before export': 'H5/设计/视频/PDF 产物必须先落为小红书图片页或纯文本',
  'page crop, file format, page order, and body reference proof are missing for this fallback family': '该降级族缺少页面裁剪、文件格式、页序和正文引用证明',
  'unmatched formula delimiters': '公式分隔符未配对',
  'formula preview or image fallback missing': '缺少公式预览或图片降级证明',
  'complex table needs simplification or public image fallback with alt/caption': '复杂表格需要简化，或提供带 alt/caption 的公共图片降级',
  'requires real Zhihu or public-host upload response before image fallback can be publishable': '图片降级可发布前需要真实知乎或 public host 上传响应',
  '135/Xiumi rich layout must be rewritten as clean Markdown or public-host image fallback with alt and caption': '135/秀米复杂布局必须重写为干净 Markdown，或带 alt/caption 的 public host 图片降级',
}

function styleChoiceNoticeLabel(notice: string): string {
  return STYLE_CHOICE_NOTICE_LABELS[notice] ?? notice
}

function styleChoiceDetail(availability: StyleChoiceAvailability): string {
  const fallback = `降级：${styleArtifactLabel(availability.choice.fallbackOutput)}`
  if (availability.usable) {
    const evidence = availability.bestEvidence ? styleEvidenceLabel(availability.bestEvidence) : '无'
    return `当前证据 ${evidence}，${fallback}`
  }

  const evidenceGap = availability.choice.status === 'available'
    ? `当前证据 ${availability.bestEvidence ? styleEvidenceLabel(availability.bestEvidence) : '无'}，需 ${styleEvidenceLabel(availability.requiredEvidence)}`
    : ''
  const blockers = availability.choice.blockers.length > 0
    ? availability.choice.blockers.map(styleChoiceNoticeLabel).join('；')
    : ''
  const reason = availability.reason ? styleChoiceNoticeLabel(availability.reason) : ''
  const detail = [evidenceGap, blockers || reason].filter(Boolean).join('；')
  return `${detail}；${fallback}`
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

const effectiveExportOptions = computed<ExportOptions>(() => {
  const nextOptions: ExportOptions = { ...exportOptions.value }
  const exportCustomCss = props.exportCustomCss?.trim()
  if (exportCustomCss) {
    nextOptions.customCss = exportCustomCss
  } else {
    delete nextOptions.customCss
  }
  return nextOptions
})

function svgModuleFamilyLabel(family: SvgModuleFamily): string {
  const labels: Record<SvgModuleFamily, string> = {
    header: '标题',
    divider: '分割',
    quote: '引用',
    badge: '徽章',
    endmark: '结尾',
    cover: '封面',
    interactive: '交互',
  }
  return labels[family]
}

function getCurrentWechatSvgPlan(): SvgInjectionPlan {
  return normalizeWechatSvgApplicationPlan(exportOptions.value.svgInjectionPlan)
}

function getWechatSvgSlotModuleId(slotId: WechatSvgApplicationSlotId): string {
  return getWechatSvgApplicationSlotModuleId(exportOptions.value.svgInjectionPlan, slotId)
}

function handleWechatSvgModulesToggle(event: Event) {
  const target = event.target as { checked?: unknown } | null
  const enabled = target?.checked === true
  exportOptions.value = {
    ...exportOptions.value,
    enableSvgModules: enabled,
    svgInjectionPlan: enabled
      ? getCurrentWechatSvgPlan()
      : exportOptions.value.svgInjectionPlan,
  }
}

function handleWechatSvgSlotChange(slotId: WechatSvgApplicationSlotId, event: Event) {
  const target = event.target as { value?: unknown } | null
  const moduleId = typeof target?.value === 'string' ? target.value : ''
  if (!moduleId) return

  exportOptions.value = {
    ...exportOptions.value,
    enableSvgModules: true,
    svgInjectionPlan: setWechatSvgApplicationSlot(
      exportOptions.value.svgInjectionPlan,
      slotId,
      moduleId,
    ),
  }
}

const wechatSvgApplicationSummary = computed(() => {
  const totalFamilies = new Set(SVG_MODULES.map(module => module.family)).size
  if (exportOptions.value.enableSvgModules === true) {
    const plan = getCurrentWechatSvgPlan()
    const activeModules = [
      plan.cover,
      plan.headings?.find(heading => heading.level === 2)?.module,
      plan.replaceHr,
      plan.blockquote,
      plan.endmark,
    ].filter(Boolean)
    return `已启用 ${activeModules.length} 个注入位；全量试用位覆盖 ${SVG_MODULES.length} 个 SVG 模块 / ${totalFamilies} 个家族。`
  }

  return `默认关闭，不改变现有导出；开启后可在应用内选择 ${SVG_MODULES.length} 个 SVG 模块并输出到微信公众号 HTML。`
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
    committedStyleProofReleasePreflightRow.value,
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

  return rows
})

let renderVersion = 0

watch(
  () => props.visible,
  (visible, wasVisible) => {
    if (visible && !wasVisible) {
      selectedPlatform.value = normalizeInitialPlatform(props.initialPlatform)
    }
  },
)

watch(
  [() => props.content, () => props.visible, selectedPlatform, selectedPresetId, effectiveExportOptions],
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
      const renderExportOptions = effectiveExportOptions.value

      if (platform === 'wechat') {
        const preset = themePresets.find(p => p.id === presetId) || getDefaultPreset()
        const result = await markdownToWechatWithStats(props.content, preset, renderExportOptions)
        if (renderVersion !== thisVersion) return
        previewHtml.value = result.html
        wechatStats.value = result.stats
      } else {
        const html = await convertToPlatform(props.content, platform, {
          presetId,
          exportOptions: renderExportOptions,
        })
        if (renderVersion !== thisVersion) return
        previewHtml.value = html
        wechatStats.value = null
      }

      const native = await convertToNativeFormat(props.content, platform, {
        presetId,
        exportOptions: renderExportOptions,
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

// ─── Copy ────────────────────────────────────────────────
const copySuccess = ref(false)
const nativeCopySuccess = ref(false)
const externalHandoffCopySuccess = ref(false)
const operationFeedback = ref<OperationFeedback | null>(null)

let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined
let nativeCopyFeedbackTimer: ReturnType<typeof setTimeout> | undefined
let externalHandoffCopyFeedbackTimer: ReturnType<typeof setTimeout> | undefined
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

function recordExportArtifact(content: string, action: 'copy' | 'download', label: string): void {
  const title = (props.title?.trim() || inferWechatDraftTitle(props.content) || '未命名文章').slice(0, 120)
  settingsStore.recordExportHistory({
    platform: selectedPlatform.value,
    title: `${title} · ${label}`,
    bytes: new Blob([content]).size,
    action,
  })
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
    recordExportArtifact(content, 'copy', '样式版 HTML')
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
    recordExportArtifact(result.content, 'copy', `${NATIVE_FORMAT_LABELS[result.format]} 原生产物`)
    nativeCopySuccess.value = true
    showOperationFeedback('success', `已复制 ${platformInfo.value.name} ${NATIVE_FORMAT_LABELS[result.format]} 原生产物。`)
    clearTimeout(nativeCopyFeedbackTimer)
    nativeCopyFeedbackTimer = setTimeout(() => { nativeCopySuccess.value = false }, FEEDBACK_DURATION)
  } else {
    showOperationFeedback('error', '复制原生产物失败：当前浏览器或权限不允许写入剪贴板。')
  }
}

async function handleCopyExternalHandoff() {
  showOperationFeedback('info', '正在复制外部证明交接包。')
  const success = await copyTextToClipboard(committedStyleProofExternalHandoffMarkdown.value)

  if (success) {
    externalHandoffCopySuccess.value = true
    showOperationFeedback('success', '已复制外部证明交接包；它只用于人工验收，不代表平台证明完成。')
    clearTimeout(externalHandoffCopyFeedbackTimer)
    externalHandoffCopyFeedbackTimer = setTimeout(() => { externalHandoffCopySuccess.value = false }, FEEDBACK_DURATION)
  } else {
    showOperationFeedback('error', '复制外部证明交接包失败：当前浏览器或权限不允许写入剪贴板。')
  }
}

// ─── Download ────────────────────────────────────────────
function handleDownload() {
  const content = previewHtml.value
  if (!content || isRendering.value) return

  try {
    downloadArtifact(content, buildExportFilename('styled'), 'text/html;charset=utf-8')
    recordExportArtifact(content, 'download', '样式版 HTML')
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
    recordExportArtifact(result.content, 'download', `${NATIVE_FORMAT_LABELS[result.format]} 原生产物`)
    showOperationFeedback('success', `已生成 ${NATIVE_FORMAT_LABELS[result.format]} 原生下载文件。`)
  } catch {
    showOperationFeedback('error', '下载原生产物失败：浏览器未能创建本地文件，请稍后重试。')
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
  clearTimeout(externalHandoffCopyFeedbackTimer)
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
                  <span>{{ platformInfo.name }} 可应用渲染样式 {{ styleRenderableApplicationSummary.selectable }}/{{ styleRenderableApplicationSummary.total }}</span>
                  <span>{{ platformInfo.name }} 当前可用 {{ styleAvailabilityReport.stats.usable }}/{{ styleAvailabilityReport.stats.total }}</span>
                  <span
                    v-if="selectedPlatform === 'wechat'"
                    class="current-round-local-target"
                    :class="{ 'current-round-local-target--ready': styleCurrentRoundLocalTarget.ready }"
                  >
                    {{ styleCurrentRoundLocalTarget.label }}：{{ styleCurrentRoundLocalTarget.detail }}
                  </span>
                  <span>证据门禁由 runtime catalog 决定</span>
                  <span>下一步 {{ styleProofNextGateLabel }}，共 {{ styleProofCollectionQueue.summary.totalGates }} 类门禁</span>
                  <span>验收审计 {{ styleProofAcceptanceSummary }}</span>
                  <span>提交证据宣称 {{ styleProofReleaseGateSummary }}</span>
                  <span>外部交接 {{ styleProofExternalHandoffSummary }}</span>
                  <span>执行手册 开放 {{ styleProofExecutionRunbook.summary.openSteps }}；不可宣称 {{ styleProofExecutionRunbook.summary.cannotClaimSteps }}；下一手册 {{ styleProofNextRunbookLabel }}</span>
                </div>
                <div
                  class="style-proof-local-actionability"
                  aria-label="本地证明可行动性"
                >
                  <div class="style-proof-local-actionability__summary">
                    <span>{{ styleProofLocalActionabilitySummary }}</span>
                    <span>本地可做为 0 时不得把目录阻断或外部平台行当作本地补证完成</span>
                  </div>
                  <div class="style-proof-local-actionability__groups">
                    <div
                      v-for="row in styleProofLocalActionabilityRows"
                      :key="row.kind"
                      class="style-proof-local-actionability__group"
                    >
                      <div class="style-proof-local-actionability__head">
                        <span>{{ row.label }}</span>
                        <strong>{{ row.rowCount }}</strong>
                      </div>
                      <p>{{ row.detail }}</p>
                    </div>
                  </div>
                </div>
                <div
                  class="style-proof-external-handoff"
                  aria-label="外部证明交接"
                >
                  <div class="style-proof-external-handoff__summary">
                    <span>{{ styleProofExternalHandoffSummary }}</span>
                    <span>不能自动完成：{{ styleProofExternalHandoffReason(committedStyleProofExternalHandoff) }}</span>
                    <span>下一步：{{ styleProofExternalHandoffNextRowLabel(committedStyleProofExternalHandoff) }}</span>
                  </div>
                  <div class="style-proof-external-handoff__actions">
                    <button
                      type="button"
                      class="mini-action"
                      :class="{ success: externalHandoffCopySuccess }"
                      @click="handleCopyExternalHandoff"
                    >
                      <CheckCircle
                        v-if="externalHandoffCopySuccess"
                        :size="13"
                      />
                      <Copy
                        v-else
                        :size="13"
                      />
                      <span>{{ externalHandoffCopySuccess ? '已复制交接包' : '复制交接包' }}</span>
                    </button>
                  </div>
                  <div class="style-proof-external-handoff__flags">
                    <div
                      v-for="flag in styleProofExternalHandoffFlags"
                      :key="flag.kind"
                      class="style-proof-external-handoff__flag"
                    >
                      <span>{{ flag.label }}</span>
                      <strong>{{ flag.rowCount }}</strong>
                      <small>{{ flag.detail }}</small>
                    </div>
                  </div>
                </div>
                <div
                  class="style-proof-external-checklist"
                  aria-label="外部证明清单"
                >
                  <div class="style-proof-external-checklist__summary">
                    <span>{{ styleProofExternalChecklistSummary }}</span>
                    <span>当前不会启用发布、同步或平台成功宣称</span>
                  </div>
                  <div class="style-proof-external-checklist__groups">
                    <div
                      v-for="row in styleProofExternalChecklistRows"
                      :key="row.kind"
                      class="style-proof-external-checklist__group"
                    >
                      <div class="style-proof-external-checklist__head">
                        <span>{{ row.label }}</span>
                        <strong>{{ row.rowCount }}</strong>
                      </div>
                      <p>{{ row.statusLabel }}；{{ row.detail }}</p>
                    </div>
                  </div>
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
                    <p
                      v-if="row.marketCapabilitySummary"
                      class="style-choice-market-summary"
                    >
                      {{ row.marketCapabilitySummary }}
                    </p>
                    <div
                      v-if="row.marketCapabilityLabels.length"
                      class="style-choice-market-capabilities"
                      aria-label="市场能力"
                    >
                      <span
                        v-for="capabilityLabel in row.marketCapabilityLabels"
                        :key="capabilityLabel"
                      >
                        {{ capabilityLabel }}
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

                  <div
                    class="wechat-svg-options"
                    aria-label="微信公众号 SVG 高级排版模块"
                  >
                    <label class="toggle-item wechat-svg-toggle">
                      <input
                        :checked="exportOptions.enableSvgModules === true"
                        type="checkbox"
                        @change="handleWechatSvgModulesToggle"
                      >
                      <span class="toggle-text">SVG 高级排版模块</span>
                    </label>
                    <p class="wechat-svg-summary">
                      {{ wechatSvgApplicationSummary }}
                    </p>
                    <div
                      class="wechat-svg-slot-grid"
                      :class="{ 'wechat-svg-slot-grid-disabled': exportOptions.enableSvgModules !== true }"
                    >
                      <label
                        v-for="slot in WECHAT_SVG_APPLICATION_SLOTS"
                        :key="slot.id"
                        class="wechat-svg-slot"
                      >
                        <span class="wechat-svg-slot-label">{{ slot.label }}</span>
                        <small>{{ slot.description }}</small>
                        <select
                          class="wechat-svg-select"
                          :disabled="exportOptions.enableSvgModules !== true"
                          :value="getWechatSvgSlotModuleId(slot.id)"
                          @change="handleWechatSvgSlotChange(slot.id, $event)"
                        >
                          <option
                            v-for="module in slot.modules"
                            :key="module.id"
                            :value="module.id"
                          >
                            {{ module.id }} · {{ svgModuleFamilyLabel(module.family) }}
                          </option>
                        </select>
                      </label>
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

.style-catalog-summary .current-round-local-target {
  padding: 5px 7px;
  border: 1px solid rgba(217, 91, 63, 0.28);
  border-radius: 8px;
  background: rgba(217, 91, 63, 0.08);
  color: var(--text-primary);
}

.style-catalog-summary .current-round-local-target--ready {
  border-color: rgba(15, 118, 110, 0.24);
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
}

.style-proof-local-actionability,
.style-proof-external-handoff,
.style-proof-external-checklist {
  display: grid;
  min-width: 0;
  gap: 8px;
  margin: 0 0 10px;
  padding: 9px;
  border: 1px solid color-mix(in srgb, var(--warning) 26%, var(--hairline));
  border-radius: 8px;
  background: color-mix(in srgb, var(--warning-light) 34%, var(--bg-surface));
}

.style-proof-local-actionability {
  border-color: color-mix(in srgb, var(--accent-secondary) 24%, var(--hairline));
  background: color-mix(in srgb, var(--accent-secondary-light) 24%, var(--bg-surface));
}

.style-proof-external-handoff {
  border-color: color-mix(in srgb, var(--error) 20%, var(--hairline));
  background: color-mix(in srgb, var(--error-light) 18%, var(--bg-surface));
}

.style-proof-local-actionability__summary,
.style-proof-external-handoff__summary,
.style-proof-external-checklist__summary {
  display: grid;
  min-width: 0;
  gap: 3px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.45;
}

.style-proof-local-actionability__summary span,
.style-proof-external-handoff__summary span,
.style-proof-external-checklist__summary span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.style-proof-external-handoff__actions {
  display: flex;
  min-width: 0;
}

.style-proof-external-handoff__actions .mini-action {
  flex: 0 1 auto;
  min-width: 128px;
}

.style-proof-external-handoff__flags {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  min-width: 0;
  gap: 6px;
}

.style-proof-external-handoff__flag {
  display: grid;
  min-width: 0;
  gap: 2px;
  padding: 6px 7px;
  border: 1px solid var(--hairline);
  border-radius: 7px;
  background: var(--bg-rice-paper);
}

.style-proof-external-handoff__flag span,
.style-proof-external-handoff__flag small {
  min-width: 0;
  overflow-wrap: anywhere;
}

.style-proof-external-handoff__flag span {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.3;
}

.style-proof-external-handoff__flag strong {
  color: var(--error);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.1;
}

.style-proof-external-handoff__flag small {
  color: var(--text-tertiary);
  font-size: 9px;
  font-weight: 700;
  line-height: 1.35;
}

.style-proof-local-actionability__groups,
.style-proof-external-checklist__groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  min-width: 0;
  gap: 6px;
}

.style-proof-local-actionability__group,
.style-proof-external-checklist__group {
  min-width: 0;
  padding: 7px;
  border: 1px solid var(--hairline);
  border-radius: 7px;
  background: var(--bg-rice-paper);
}

.style-proof-local-actionability__head,
.style-proof-external-checklist__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 6px;
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 900;
  line-height: 1.35;
}

.style-proof-local-actionability__head span,
.style-proof-external-checklist__head span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.style-proof-local-actionability__head strong,
.style-proof-external-checklist__head strong {
  flex-shrink: 0;
  min-width: 22px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--warning-light);
  color: var(--warning);
  text-align: center;
  font-size: 10px;
  line-height: 1.4;
}

.style-proof-local-actionability__head strong {
  background: var(--accent-secondary-light);
  color: var(--accent-secondary);
}

.style-proof-local-actionability__group p,
.style-proof-external-checklist__group p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.45;
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

.style-choice-market-summary {
  margin: 5px 0 0;
  color: var(--accent-secondary);
  font-size: 10px;
  font-weight: 800;
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

.style-choice-market-capabilities {
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

.style-choice-market-capabilities span {
  min-width: 0;
  max-width: 100%;
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary) 32%, var(--hairline));
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-secondary-light) 34%, var(--bg-surface));
  color: var(--accent-secondary);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
  white-space: normal;
  word-break: break-word;
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

.wechat-svg-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--ember) 22%, var(--hairline));
  border-radius: 12px;
  background: color-mix(in srgb, var(--paper-warm) 56%, var(--bg-surface));
}

.wechat-svg-toggle {
  margin: 0;
  border-color: color-mix(in srgb, var(--ember) 30%, var(--hairline));
  background: var(--bg-surface);
}

.wechat-svg-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.wechat-svg-slot-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.wechat-svg-slot-grid-disabled {
  opacity: 0.62;
}

.wechat-svg-slot {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--bg-surface);
}

.wechat-svg-slot-label {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}

.wechat-svg-slot small {
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.wechat-svg-select {
  min-width: 0;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 11px;
  outline: none;
}

.wechat-svg-select:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.wechat-svg-select:focus {
  border-color: var(--ember);
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
