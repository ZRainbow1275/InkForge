#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type CommittedStyleProofExternalProofArtifactTemplate,
  DEFAULT_STYLE_EVIDENCE_BY_PLATFORM,
  getCommittedStyleProofEvidenceReleaseGateReport,
  getCommittedStyleProofExternalHandoffPacket,
  getCommittedStyleProofLocalActionabilityReport,
  getPlatformStyleApplicationReport,
  type CommittedStyleProofExternalHandoffNextRowKind,
  type CommittedStyleProofReleaseGateBlockerKind,
  type CommittedStyleProofReleaseGateStatus,
  type StyleProofManifestIssueId,
  type StyleProofCollectionGate,
  type StyleProofExecutionBoundary,
  type StyleProofRequirementId,
} from '../src/services/export/style-catalog.ts'
import {
  buildThemeContext,
  checkWechatSafe,
  SVG_MODULES,
} from '../src/services/export/svg-modules/index.ts'
import type { Platform } from '../src/services/export/types.ts'
import {
  createApplicationSvgGallerySnapshot,
  type ApplicationSvgGalleryIssue,
  type ApplicationSvgGalleryStatus,
} from '../src/services/export/application-svg-gallery.ts'
import {
  createWechatStyleExportSamplesReport,
  type WechatStyleExportSampleIssue,
  type WechatStyleExportSamplesStatus,
} from '../src/services/export/wechat-style-export-samples.ts'
import { WECHAT_SVG_APPLICATION_SLOTS } from '../src/services/export/wechat-svg-application.ts'
import { applyWechatOptionSvgModules } from '../src/services/export/wechat-svg-options.ts'

type StyleProofApplicationPreflightStatus = 'application-ready' | 'application-blocked'

type DomRuntimeGlobal = typeof globalThis & {
  window?: unknown
  document?: unknown
  Node?: unknown
  Element?: unknown
  HTMLElement?: unknown
  SVGElement?: unknown
  DOMParser?: unknown
  XMLSerializer?: unknown
  navigator?: unknown
}

const APPLICATION_PREVIEW_PERSONAS = ['academic', 'business', 'lifestyle', 'creative'] as const
const APPLICATION_PREVIEW_PERSONA_COLORS = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
} as const satisfies Record<(typeof APPLICATION_PREVIEW_PERSONAS)[number], string>
const APPLICATION_MODULE_SENTINEL_ISSUES = new Set([
  'missing-data-ink-svg-sentinel',
  'missing-inline-svg',
  'missing-viewBox',
  'missing-responsive-width',
])
const APPLICATION_WECHAT_OPTION_HTML = [
  '<h1>InkForge SVG option preflight</h1>',
  '<h2>Section title</h2>',
  '<p>Body text before divider.</p>',
  '<hr>',
  '<blockquote>Quote text for SVG replacement.</blockquote>',
  '<p>Final paragraph.</p>',
].join('')
const APPLICATION_WECHAT_OPTION_PRESET = {
  primaryColor: '#004080',
  persona: 'business',
} as const
const CURRENT_SCRIPT_PATH = fileURLToPath(import.meta.url)
const PROJECT_ROOT = resolve(dirname(CURRENT_SCRIPT_PATH), '..')

async function ensureDomRuntime(): Promise<void> {
  const runtimeGlobal = globalThis as DomRuntimeGlobal
  if (runtimeGlobal.window && runtimeGlobal.document) {
    return
  }

  const { Window } = await import('happy-dom')
  const window = new Window({ url: 'http://127.0.0.1/style-proof-release-preflight' })
  const windowRecord = window as unknown as Record<string, unknown>

  const defineRuntimeValue = (key: keyof DomRuntimeGlobal, value: unknown): void => {
    Object.defineProperty(runtimeGlobal, key, {
      configurable: true,
      enumerable: false,
      value,
      writable: true,
    })
  }

  defineRuntimeValue('window', window)
  defineRuntimeValue('document', window.document)
  defineRuntimeValue('Node', windowRecord.Node)
  defineRuntimeValue('Element', windowRecord.Element)
  defineRuntimeValue('HTMLElement', windowRecord.HTMLElement)
  defineRuntimeValue('SVGElement', windowRecord.SVGElement)
  defineRuntimeValue('DOMParser', windowRecord.DOMParser)
  defineRuntimeValue('XMLSerializer', windowRecord.XMLSerializer)
  defineRuntimeValue('navigator', window.navigator)
}

interface StyleProofApplicationWechatSurfaceContract {
  id: string
  relativePath: string
  requiredFragments: readonly string[]
}

interface StyleProofApplicationWechatExportPipelineContract {
  id: string
  relativePath: string
  requiredFragments: readonly string[]
}

const APPLICATION_WECHAT_SURFACE_CONTRACTS = [
  {
    id: 'export-modal',
    relativePath: 'src/components/export/ExportModal.vue',
    requiredFragments: [
      'WECHAT_SVG_APPLICATION_SLOTS',
      'SVG_MODULES',
      'handleWechatSvgModulesToggle',
      'handleWechatSvgSlotChange',
      'wechat-svg-options',
      'wechat-svg-slot-grid',
      'getWechatSvgSlotModuleId(slot.id)',
      'exportOptions.enableSvgModules === true',
      'svgInjectionPlan: setWechatSvgApplicationSlot',
      'const renderExportOptions = effectiveExportOptions.value',
      'markdownToWechatWithStats(props.content, preset, renderExportOptions)',
    ],
  },
  {
    id: 'publish-view',
    relativePath: 'src/views/PublishView.vue',
    requiredFragments: [
      'WECHAT_SVG_APPLICATION_SLOTS',
      'SVG_MODULES',
      'handlePublishWechatSvgModulesToggle',
      'handlePublishWechatSvgSlotChange',
      'publish-svg-options',
      'publish-svg-slot-grid',
      'getPublishWechatSvgSlotModuleId(slot.id)',
      'handlePublishWechatSvgSlotChange(slot.id, $event)',
      'enableSvgModules: false',
      'enableSvgModules: selectedOptions.enableSvgModules',
      'svgInjectionPlan: selectedOptions.svgInjectionPlan',
      'markdownToWechatWithStats(content, preset, {',
    ],
  },
] as const satisfies readonly StyleProofApplicationWechatSurfaceContract[]

const APPLICATION_WECHAT_EXPORT_PIPELINE_CONTRACTS = [
  {
    id: 'wechat-export-svg-option-order',
    relativePath: 'src/services/export/wechat.ts',
    requiredFragments: [
      'maxContentWidth = 677',
      '<section id="nice">${finalContent}</section>',
      'decoratedHtml = applyWechatOptionSvgModules(decoratedHtml, effectivePreset, options)',
      'enhanceTableStyles(decoratedHtml, effectivePreset.primaryColor)',
      'postProcessForWechat(tableEnhancedHtml, effectivePreset.primaryColor)',
      "enforcePlatformCSS(wechatProcessedHtml, 'wechat')",
      'wechatComplianceTransform(cssCompliantHtml, complianceOpts)',
      'html: finalHtml',
    ],
  },
  {
    id: 'wechat-compliance-width-clamp',
    relativePath: 'src/services/export/platform-rules/wechat.ts',
    requiredFragments: [
      'const DEFAULT_MAX_WIDTH = 677',
      'const CLAMP_MARKER = \'data-wechat-clamp="1"\'',
      'style="max-width:${maxWidth}px;margin:0 auto;"',
      'result = clampContentWidth(result, maxContentWidth)',
      "const OPAQUE_TAGS = new Set(['code', 'pre', 'style', 'script', 'svg'])",
    ],
  },
  {
    id: 'wechat-persona-line-width-lock',
    relativePath: 'src/services/export/preset-fonts.ts',
    requiredFragments: [
      'max-width: min(22em, calc(100vw - 32px));',
      'font-size: 17px;',
      'line-break: strict;',
    ],
  },
] as const satisfies readonly StyleProofApplicationWechatExportPipelineContract[]

interface StyleProofApplicationPreflightModuleIssue {
  moduleId: string
  family: string
  persona: string
  issue: string
}

interface StyleProofApplicationPreflightWechatOptionIssue {
  moduleId: string
  family: string
  issue: string
}

interface StyleProofApplicationPreflightWechatApplicationIssue {
  slotId: string
  issue: string
}

interface StyleProofApplicationPreflightWechatSurfaceIssue {
  surfaceId: string
  relativePath: string
  issue: string
  fragment: string
}

interface StyleProofApplicationPreflightWechatExportPipelineIssue {
  contractId: string
  relativePath: string
  issue: string
  fragment: string
}

interface StyleProofApplicationPreflightChoiceIssue {
  choiceId: string
  availabilityStatus: string
  reason: string
}

interface StyleProofApplicationPreflightExternalBoundary {
  notProof: true
  releaseCanClaimComplete: boolean
  releaseStatus: CommittedStyleProofReleaseGateStatus
  releaseBlockingOpenSteps: number
  releaseBlockingPhoneOpenSteps: number
  releaseBlockingExternalDependencyOpenSteps: number
  releaseBlockingUnsafeToAutomateOpenSteps: number
  releaseBlockingMutatingOpenSteps: number
  externalHandoffRows: number
  nextExternalRows: number
  requiresManualWeChatProof: boolean
  xhsZhihuPublishAutomationDeferred: true
}

interface StyleProofApplicationPreflightResult {
  scope: 'application'
  status: StyleProofApplicationPreflightStatus
  applicationGalleryStatus: ApplicationSvgGalleryStatus
  wechatStyleSamplesStatus: WechatStyleExportSamplesStatus
  canClaimApplicationReady: boolean
  canClaimReleaseComplete: boolean
  summary: {
    svgModuleCount: number
    svgFamilyCount: number
    personaCount: number
    renderedModulePersonaPairs: number
    applicationGalleryRenderedModulePersonaPairs: number
    applicationGalleryWechatSafeViolationCount: number
    applicationGalleryModuleSentinelFailureCount: number
    applicationGalleryIssueCount: number
    wechatApplicationSvgSlotCount: number
    wechatApplicationSvgShowcaseModuleCount: number
    wechatApplicationSvgSlotFailureCount: number
    wechatApplicationSurfaceCount: number
    wechatApplicationSurfaceFailureCount: number
    wechatExportPipelineContractCount: number
    wechatExportPipelineFailureCount: number
    wechatOptionInjectedModuleCount: number
    wechatOptionInjectionFailureCount: number
    wechatSafeViolationCount: number
    moduleSentinelFailureCount: number
    wechatStyleChoiceCount: number
    wechatUsableChoiceCount: number
    wechatSelectableChoiceCount: number
    wechatRenderedStyleChoiceCount: number
    wechatStyleSampleIssueCount: number
    wechatStyleSampleSvgBearingChoiceCount: number
    wechatStyleSampleTotalSvgModuleCount: number
    usableButUnselectableWechatChoices: number
    actionableLocalRows: number
    catalogBlockedLocalRows: number
    manualDeferredOpenSteps: number
    releaseBlockingOpenSteps: number
    externalHandoffRows: number
    nextExternalRows: number
  }
  moduleIssues: readonly StyleProofApplicationPreflightModuleIssue[]
  applicationGalleryIssues: readonly ApplicationSvgGalleryIssue[]
  wechatApplicationSlotIssues: readonly StyleProofApplicationPreflightWechatApplicationIssue[]
  wechatApplicationSurfaceIssues: readonly StyleProofApplicationPreflightWechatSurfaceIssue[]
  wechatExportPipelineIssues: readonly StyleProofApplicationPreflightWechatExportPipelineIssue[]
  wechatOptionIssues: readonly StyleProofApplicationPreflightWechatOptionIssue[]
  wechatStyleSampleIssues: readonly WechatStyleExportSampleIssue[]
  choiceIssues: readonly StyleProofApplicationPreflightChoiceIssue[]
  externalProof: StyleProofApplicationPreflightExternalBoundary
}

interface StyleProofReleasePreflightNextRow {
  id: string
  kind: CommittedStyleProofExternalHandoffNextRowKind
  refKinds: readonly CommittedStyleProofExternalHandoffNextRowKind[]
  commands: StyleProofReleasePreflightNextRowCommands
  artifactGuidance: StyleProofReleasePreflightArtifactGuidance
  allMatchingSummary: StyleProofReleasePreflightAllMatchingSummary
  platform: Platform
  choiceIds: readonly string[]
  requirementId: StyleProofRequirementId
  requirementLabel: string
  gate: StyleProofCollectionGate
  boundary: StyleProofExecutionBoundary
  status: string
  blockerKinds: readonly CommittedStyleProofReleaseGateBlockerKind[]
  issueIds: readonly StyleProofManifestIssueId[]
  freshnessIssueIds: readonly StyleProofManifestIssueId[]
  required: number
  satisfied: number
  missing: number
  invalid: number
  artifactCount: number
  acceptedArtifactCount: number
  mutatesPlatform: boolean
  requiresExternalAccount: boolean
  requiresPhone: boolean
  safeToAutomate: boolean
  cannotClaim: boolean
  cannotClaimReason: string | null
  nextOperatorAction: string
}

interface StyleProofReleasePreflightAllMatchingSummary {
  notProof: true
  rowCount: number
  requirementIds: readonly StyleProofRequirementId[]
  boundaries: readonly StyleProofExecutionBoundary[]
  statuses: readonly string[]
  issueIds: readonly StyleProofManifestIssueId[]
  freshnessIssueIds: readonly StyleProofManifestIssueId[]
  choiceCount: number
  requiresPhoneCount: number
  requiresExternalAccountCount: number
  mutatingPlatformCount: number
  unsafeToAutomateCount: number
}

interface StyleProofReleasePreflightArtifactGuidance {
  notProof: true
  appendOnlyAfterExternalProof: true
  requiredChannels: CommittedStyleProofExternalProofArtifactTemplate['requiredChannels']
  requiredActions: CommittedStyleProofExternalProofArtifactTemplate['requiredActions']
  requiredReadbacks: CommittedStyleProofExternalProofArtifactTemplate['requiredReadbacks']
  requiredFields: CommittedStyleProofExternalProofArtifactTemplate['requiredFields']
  forbiddenFields: CommittedStyleProofExternalProofArtifactTemplate['forbiddenFields']
  acceptedHostStatuses: CommittedStyleProofExternalProofArtifactTemplate['acceptedHostStatuses']
  maxFreshnessDays: CommittedStyleProofExternalProofArtifactTemplate['maxFreshnessDays']
  templateCommand: string
  manifestDraftsCommand: string
  allMatchingTemplateCommand: string
  allMatchingManifestDraftsCommand: string
}

interface StyleProofReleasePreflightNextRowCommands {
  template: string
  manifestDrafts: string
  allMatchingTemplate: string
  allMatchingManifestDrafts: string
  intake: string
  merge: string
}

interface StyleProofReleasePreflightResult {
  canClaimComplete: boolean
  status: CommittedStyleProofReleaseGateStatus
  blockerKinds: readonly CommittedStyleProofReleaseGateBlockerKind[]
  summary: {
    blockerCount: number
    combinedIssueCount: number
    cannotClaimSteps: number
    phoneOpenSteps: number
    externalDependencyOpenSteps: number
    unsafeToAutomateOpenSteps: number
    mutatingOpenSteps: number
    manualDeferredOpenSteps: number
    releaseBlockingOpenSteps: number
    releaseBlockingPhoneOpenSteps: number
    releaseBlockingExternalDependencyOpenSteps: number
    releaseBlockingUnsafeToAutomateOpenSteps: number
    releaseBlockingMutatingOpenSteps: number
    externalHandoffRows: number
    safeExternalRows: number
    actionableLocalRows: number
    nextRowRefs: number
    uniqueNextRows: number
  }
  nextRows: readonly StyleProofReleasePreflightNextRow[]
}

function getPreflightNextRowRefKinds(
  rowId: string,
  refs: readonly { kind: CommittedStyleProofExternalHandoffNextRowKind; row: { id: string } }[],
): readonly CommittedStyleProofExternalHandoffNextRowKind[] {
  const kinds: CommittedStyleProofExternalHandoffNextRowKind[] = []
  for (const ref of refs) {
    if (ref.row.id === rowId && !kinds.includes(ref.kind)) {
      kinds.push(ref.kind)
    }
  }

  return kinds
}

function getPrimaryIssueFilter(
  row: {
    issueIds: readonly StyleProofManifestIssueId[]
    freshnessIssueIds: readonly StyleProofManifestIssueId[]
  },
): StyleProofManifestIssueId | null {
  return row.issueIds[0] ?? row.freshnessIssueIds[0] ?? null
}

function getExternalHandoffFilterArgs(row: {
  platform: Platform
  status: string
  issueIds: readonly StyleProofManifestIssueId[]
  freshnessIssueIds: readonly StyleProofManifestIssueId[]
}, kind: CommittedStyleProofExternalHandoffNextRowKind, nextOnly: boolean): readonly string[] {
  const issueId = getPrimaryIssueFilter(row)
  const args = [
    `--platform=${row.platform}`,
    `--kind=${kind}`,
    `--status=${row.status}`,
  ]

  if (issueId) {
    args.push(`--issue=${issueId}`)
  }

  if (nextOnly) {
    args.push('--next-only')
  }

  return args
}

function buildExternalHandoffCommand(
  mode: '--template' | '--manifest-drafts',
  row: {
    platform: Platform
    status: string
    issueIds: readonly StyleProofManifestIssueId[]
    freshnessIssueIds: readonly StyleProofManifestIssueId[]
  },
  kind: CommittedStyleProofExternalHandoffNextRowKind,
  nextOnly: boolean,
): string {
  return [
    'pnpm --silent -C inkforge style-proof:external-handoff',
    mode,
    ...getExternalHandoffFilterArgs(row, kind, nextOnly),
  ].join(' ')
}

function buildPreflightNextRowCommands(
  row: {
    platform: Platform
    status: string
    issueIds: readonly StyleProofManifestIssueId[]
    freshnessIssueIds: readonly StyleProofManifestIssueId[]
  },
  kind: CommittedStyleProofExternalHandoffNextRowKind,
): StyleProofReleasePreflightNextRowCommands {
  return {
    template: buildExternalHandoffCommand('--template', row, kind, true),
    manifestDrafts: buildExternalHandoffCommand('--manifest-drafts', row, kind, true),
    allMatchingTemplate: buildExternalHandoffCommand('--template', row, kind, false),
    allMatchingManifestDrafts: buildExternalHandoffCommand('--manifest-drafts', row, kind, false),
    intake: 'pnpm --silent -C inkforge style-proof:manifest-intake --file REDACTED_MANIFEST.json --json',
    merge: 'pnpm --silent -C inkforge style-proof:manifest-merge --file REDACTED_MANIFEST.json --json',
  }
}

function buildPreflightArtifactGuidance(
  artifactTemplate: CommittedStyleProofExternalProofArtifactTemplate,
  commands: StyleProofReleasePreflightNextRowCommands,
): StyleProofReleasePreflightArtifactGuidance {
  return {
    notProof: true,
    appendOnlyAfterExternalProof: true,
    requiredChannels: artifactTemplate.requiredChannels,
    requiredActions: artifactTemplate.requiredActions,
    requiredReadbacks: artifactTemplate.requiredReadbacks,
    requiredFields: artifactTemplate.requiredFields,
    forbiddenFields: artifactTemplate.forbiddenFields,
    acceptedHostStatuses: artifactTemplate.acceptedHostStatuses,
    maxFreshnessDays: artifactTemplate.maxFreshnessDays,
    templateCommand: commands.template,
    manifestDraftsCommand: commands.manifestDrafts,
    allMatchingTemplateCommand: commands.allMatchingTemplate,
    allMatchingManifestDraftsCommand: commands.allMatchingManifestDrafts,
  }
}

function getUniqueValues<T extends string>(values: readonly T[]): readonly T[] {
  return Array.from(new Set(values))
}

function getPreflightAllMatchingRows<T extends {
    platform: Platform
    status: string
    issueIds: readonly StyleProofManifestIssueId[]
    freshnessIssueIds: readonly StyleProofManifestIssueId[]
  }>(
  rows: readonly T[],
  referenceRow: {
    platform: Platform
    status: string
    issueIds: readonly StyleProofManifestIssueId[]
    freshnessIssueIds: readonly StyleProofManifestIssueId[]
  },
  kind: CommittedStyleProofExternalHandoffNextRowKind,
): readonly T[] {
  const filterArgs = getExternalHandoffFilterArgs(referenceRow, kind, false)

  return rows.filter(row =>
    getExternalHandoffFilterArgs(row, kind, false).join('\u0000') === filterArgs.join('\u0000')
  )
}

function buildPreflightAllMatchingSummary(rows: readonly {
  requirementId: StyleProofRequirementId
  boundary: StyleProofExecutionBoundary
  status: string
  issueIds: readonly StyleProofManifestIssueId[]
  freshnessIssueIds: readonly StyleProofManifestIssueId[]
  choiceIds: readonly string[]
  requiresPhone: boolean
  requiresExternalAccount: boolean
  mutatesPlatform: boolean
  safeToAutomate: boolean
}[]): StyleProofReleasePreflightAllMatchingSummary {
  return {
    notProof: true,
    rowCount: rows.length,
    requirementIds: getUniqueValues(rows.map(row => row.requirementId)),
    boundaries: getUniqueValues(rows.map(row => row.boundary)),
    statuses: getUniqueValues(rows.map(row => row.status)),
    issueIds: getUniqueValues(rows.flatMap(row => row.issueIds)),
    freshnessIssueIds: getUniqueValues(rows.flatMap(row => row.freshnessIssueIds)),
    choiceCount: getUniqueValues(rows.flatMap(row => row.choiceIds)).length,
    requiresPhoneCount: rows.filter(row => row.requiresPhone).length,
    requiresExternalAccountCount: rows.filter(row => row.requiresExternalAccount).length,
    mutatingPlatformCount: rows.filter(row => row.mutatesPlatform).length,
    unsafeToAutomateCount: rows.filter(row => !row.safeToAutomate).length,
  }
}

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:release-preflight [--json] [--scope=release|application]',
    '',
    'Reads the committed InkForge style-proof release gate and exits non-zero',
    'unless every in-scope local, WeChat phone, account, sync, scheduled-send,',
    'preview, and publish proof gate is complete.',
    'Use --scope=application for the narrowed local application-level round gate:',
    'all registered SVG modules render WeChat-safe across personas, every usable',
    'WeChat style choice is selectable, and no local proof rows remain actionable.',
    'XHS/Zhihu publish-side checks are manual-deferred for this round.',
    '',
    'Options:',
    '  --json                 Print a compact JSON report.',
    '  --scope=release        Run the strict external-proof release gate (default).',
    '  --scope=application    Run the current local application-level round gate.',
    '  --application          Alias for --scope=application.',
    '  --help                 Print this help.',
    '',
    'Tip: use `pnpm --silent -C inkforge style-proof:release-preflight --json`',
    'when piping JSON from a command that may intentionally exit non-zero.',
  ].join('\n'))
}

function buildPreflightResult(): StyleProofReleasePreflightResult {
  const releaseGate = getCommittedStyleProofEvidenceReleaseGateReport()
  const handoffPacket = getCommittedStyleProofExternalHandoffPacket()

  return {
    canClaimComplete: releaseGate.canClaimComplete,
    status: releaseGate.status,
    blockerKinds: releaseGate.blockers.map(blocker => blocker.kind),
    summary: {
      blockerCount: releaseGate.summary.blockerCount,
      combinedIssueCount: releaseGate.summary.combinedIssueCount,
      cannotClaimSteps: releaseGate.summary.cannotClaimSteps,
      phoneOpenSteps: releaseGate.summary.phoneOpenSteps,
      externalDependencyOpenSteps: releaseGate.summary.externalDependencyOpenSteps,
      unsafeToAutomateOpenSteps: releaseGate.summary.unsafeToAutomateOpenSteps,
      mutatingOpenSteps: releaseGate.summary.mutatingOpenSteps,
      manualDeferredOpenSteps: releaseGate.summary.manualDeferredOpenSteps,
      releaseBlockingOpenSteps: releaseGate.summary.releaseBlockingOpenSteps,
      releaseBlockingPhoneOpenSteps: releaseGate.summary.releaseBlockingPhoneOpenSteps,
      releaseBlockingExternalDependencyOpenSteps:
        releaseGate.summary.releaseBlockingExternalDependencyOpenSteps,
      releaseBlockingUnsafeToAutomateOpenSteps:
        releaseGate.summary.releaseBlockingUnsafeToAutomateOpenSteps,
      releaseBlockingMutatingOpenSteps: releaseGate.summary.releaseBlockingMutatingOpenSteps,
      externalHandoffRows: handoffPacket.summary.externalHandoffRows,
      safeExternalRows: handoffPacket.summary.safeExternalRows,
      actionableLocalRows: handoffPacket.summary.actionableLocalRows,
      nextRowRefs: handoffPacket.nextRowRefs.length,
      uniqueNextRows: handoffPacket.nextRows.length,
    },
    nextRows: handoffPacket.nextRows.map(row => {
      const refKinds = getPreflightNextRowRefKinds(row.id, handoffPacket.nextRowRefs)
      const kind = refKinds[0] ?? 'external-account'
      const commands = buildPreflightNextRowCommands(row, kind)
      const allMatchingRows = getPreflightAllMatchingRows(handoffPacket.rows, row, kind)

      return {
        id: row.id,
        kind,
        refKinds,
        commands,
        artifactGuidance: buildPreflightArtifactGuidance(row.artifactTemplate, commands),
        allMatchingSummary: buildPreflightAllMatchingSummary(allMatchingRows),
        platform: row.platform,
        choiceIds: row.choiceIds,
        requirementId: row.requirementId,
        requirementLabel: row.requirementLabel,
        gate: row.gate,
        boundary: row.boundary,
        status: row.status,
        blockerKinds: row.blockerKinds,
        issueIds: row.issueIds,
        freshnessIssueIds: row.freshnessIssueIds,
        required: row.required,
        satisfied: row.satisfied,
        missing: row.missing,
        invalid: row.invalid,
        artifactCount: row.artifactCount,
        acceptedArtifactCount: row.acceptedArtifactCount,
        mutatesPlatform: row.mutatesPlatform,
        requiresExternalAccount: row.requiresExternalAccount,
        requiresPhone: row.requiresPhone,
        safeToAutomate: row.safeToAutomate,
        cannotClaim: row.cannotClaim,
        cannotClaimReason: row.cannotClaimReason,
        nextOperatorAction: row.nextOperatorAction,
      }
    }),
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function getStyleProofApplicationModuleIssues(): readonly StyleProofApplicationPreflightModuleIssue[] {
  const issues: StyleProofApplicationPreflightModuleIssue[] = []

  for (const module of SVG_MODULES) {
    for (const persona of APPLICATION_PREVIEW_PERSONAS) {
      try {
        const theme = buildThemeContext({
          primaryColor: APPLICATION_PREVIEW_PERSONA_COLORS[persona],
          persona,
          target: 'wechat',
        })
        const rendered = module.render({
          theme,
          text: 'InkForge application preflight SVG coverage',
          subtitle: 'WeChat-safe style module',
          index: 2,
          items: [
            { title: 'Card One', body: 'First body' },
            { title: 'Card Two', body: 'Second body' },
          ],
        })
        const violations = checkWechatSafe(rendered)

        for (const violation of violations) {
          issues.push({
            moduleId: module.id,
            family: module.family,
            persona,
            issue: violation.rule,
          })
        }

        if (!rendered.includes(`data-ink-svg="${module.id}"`)) {
          issues.push({
            moduleId: module.id,
            family: module.family,
            persona,
            issue: 'missing-data-ink-svg-sentinel',
          })
        }
        if (!/<svg\b/i.test(rendered)) {
          issues.push({
            moduleId: module.id,
            family: module.family,
            persona,
            issue: 'missing-inline-svg',
          })
        }
        if (!/viewBox=/i.test(rendered)) {
          issues.push({
            moduleId: module.id,
            family: module.family,
            persona,
            issue: 'missing-viewBox',
          })
        }
        if (!rendered.includes('width="100%"')) {
          issues.push({
            moduleId: module.id,
            family: module.family,
            persona,
            issue: 'missing-responsive-width',
          })
        }
      } catch (error) {
        issues.push({
          moduleId: module.id,
          family: module.family,
          persona,
          issue: `render-error:${getErrorMessage(error)}`,
        })
      }
    }
  }

  return issues
}

function extractStyleProofApplicationSvgSection(html: string, moduleId: string): string {
  const pattern = new RegExp(
    `<section\\b(?=[^>]*\\bdata-ink-svg="${moduleId}")[\\s\\S]*?<\\/section>`,
    'i',
  )
  return pattern.exec(html)?.[0] ?? ''
}

function getStyleProofApplicationWechatOptionIssues(): readonly StyleProofApplicationPreflightWechatOptionIssue[] {
  const issues: StyleProofApplicationPreflightWechatOptionIssue[] = []

  for (const module of SVG_MODULES) {
    try {
      const rendered = applyWechatOptionSvgModules(
        APPLICATION_WECHAT_OPTION_HTML,
        APPLICATION_WECHAT_OPTION_PRESET,
        {
          enableReadingTime: false,
          enableSvgModules: true,
          svgInjectionPlan: { endmark: module.id },
        },
      )
      const section = extractStyleProofApplicationSvgSection(rendered, module.id)

      if (!section) {
        issues.push({
          moduleId: module.id,
          family: module.family,
          issue: 'missing-data-ink-svg-sentinel',
        })
        continue
      }

      for (const violation of checkWechatSafe(section)) {
        issues.push({
          moduleId: module.id,
          family: module.family,
          issue: violation.rule,
        })
      }

      if (!/<svg\b/i.test(section)) {
        issues.push({
          moduleId: module.id,
          family: module.family,
          issue: 'missing-inline-svg',
        })
      }
      if (!/viewBox=/i.test(section)) {
        issues.push({
          moduleId: module.id,
          family: module.family,
          issue: 'missing-viewBox',
        })
      }
      if (!section.includes('width="100%"')) {
        issues.push({
          moduleId: module.id,
          family: module.family,
          issue: 'missing-responsive-width',
        })
      }
    } catch (error) {
      issues.push({
        moduleId: module.id,
        family: module.family,
        issue: `wechat-option-render-error:${getErrorMessage(error)}`,
      })
    }
  }

  return issues
}

function getStyleProofApplicationChoiceIssues(): readonly StyleProofApplicationPreflightChoiceIssue[] {
  return getPlatformStyleApplicationReport(
    'wechat',
    DEFAULT_STYLE_EVIDENCE_BY_PLATFORM.wechat,
  )
    .filter(row => row.availability.usable && !row.selectable)
    .map(row => ({
      choiceId: row.availability.choice.id,
      availabilityStatus: row.availability.status,
      reason: row.reason,
    }))
}

function getStyleProofApplicationWechatSlotIssues(): readonly StyleProofApplicationPreflightWechatApplicationIssue[] {
  const issues: StyleProofApplicationPreflightWechatApplicationIssue[] = []
  const slotIds = WECHAT_SVG_APPLICATION_SLOTS.map(slot => slot.id)
  const requiredSlotIds = ['cover', 'heading', 'divider', 'blockquote', 'showcase'] as const

  for (const requiredSlotId of requiredSlotIds) {
    if (!slotIds.includes(requiredSlotId)) {
      issues.push({
        slotId: requiredSlotId,
        issue: 'missing-slot',
      })
    }
  }

  for (const slot of WECHAT_SVG_APPLICATION_SLOTS) {
    if (slot.modules.length === 0) {
      issues.push({
        slotId: slot.id,
        issue: 'empty-slot-modules',
      })
    }
  }

  const showcaseSlot = WECHAT_SVG_APPLICATION_SLOTS.find(slot => slot.id === 'showcase')
  const expectedModuleIds = SVG_MODULES.map(module => module.id)
  const actualModuleIds = showcaseSlot?.modules.map(module => module.id) ?? []

  if (!showcaseSlot) {
    issues.push({
      slotId: 'showcase',
      issue: 'missing-showcase-slot',
    })
  } else if (actualModuleIds.length !== expectedModuleIds.length) {
    issues.push({
      slotId: 'showcase',
      issue: 'showcase-count-mismatch',
    })
  } else if (actualModuleIds.some((moduleId, index) => moduleId !== expectedModuleIds[index])) {
    issues.push({
      slotId: 'showcase',
      issue: 'showcase-catalog-mismatch',
    })
  }

  return issues
}

function getStyleProofApplicationWechatSurfaceIssues(): readonly StyleProofApplicationPreflightWechatSurfaceIssue[] {
  const issues: StyleProofApplicationPreflightWechatSurfaceIssue[] = []

  for (const contract of APPLICATION_WECHAT_SURFACE_CONTRACTS) {
    let source: string
    try {
      source = readFileSync(resolve(PROJECT_ROOT, contract.relativePath), 'utf8')
    } catch (error) {
      issues.push({
        surfaceId: contract.id,
        relativePath: contract.relativePath,
        issue: `read-error:${getErrorMessage(error)}`,
        fragment: '',
      })
      continue
    }

    for (const fragment of contract.requiredFragments) {
      if (!source.includes(fragment)) {
        issues.push({
          surfaceId: contract.id,
          relativePath: contract.relativePath,
          issue: 'missing-fragment',
          fragment,
        })
      }
    }
  }

  return issues
}

function getStyleProofApplicationWechatExportPipelineIssues(): readonly StyleProofApplicationPreflightWechatExportPipelineIssue[] {
  const issues: StyleProofApplicationPreflightWechatExportPipelineIssue[] = []

  for (const contract of APPLICATION_WECHAT_EXPORT_PIPELINE_CONTRACTS) {
    let source: string
    try {
      source = readFileSync(resolve(PROJECT_ROOT, contract.relativePath), 'utf8')
    } catch (error) {
      issues.push({
        contractId: contract.id,
        relativePath: contract.relativePath,
        issue: `read-error:${getErrorMessage(error)}`,
        fragment: '',
      })
      continue
    }

    for (const fragment of contract.requiredFragments) {
      if (!source.includes(fragment)) {
        issues.push({
          contractId: contract.id,
          relativePath: contract.relativePath,
          issue: 'missing-fragment',
          fragment,
        })
      }
    }
  }

  return issues
}

async function buildApplicationPreflightResult(): Promise<StyleProofApplicationPreflightResult> {
  await ensureDomRuntime()

  const releaseGate = getCommittedStyleProofEvidenceReleaseGateReport()
  const handoffPacket = getCommittedStyleProofExternalHandoffPacket()
  const localActionability = getCommittedStyleProofLocalActionabilityReport()
  const applicationGallerySnapshot = createApplicationSvgGallerySnapshot()
  const wechatStyleSamples = await createWechatStyleExportSamplesReport()
  const wechatApplicationRows = getPlatformStyleApplicationReport(
    'wechat',
    DEFAULT_STYLE_EVIDENCE_BY_PLATFORM.wechat,
  )
  const moduleIssues = getStyleProofApplicationModuleIssues()
  const wechatOptionIssues = getStyleProofApplicationWechatOptionIssues()
  const wechatApplicationSlotIssues = getStyleProofApplicationWechatSlotIssues()
  const wechatApplicationSurfaceIssues = getStyleProofApplicationWechatSurfaceIssues()
  const wechatExportPipelineIssues = getStyleProofApplicationWechatExportPipelineIssues()
  const choiceIssues = getStyleProofApplicationChoiceIssues()
  const moduleSentinelFailureCount = moduleIssues.filter(issue =>
    APPLICATION_MODULE_SENTINEL_ISSUES.has(issue.issue)
  ).length
  const wechatOptionIssueModuleIds = new Set(wechatOptionIssues.map(issue => issue.moduleId))
  const showcaseSlot = WECHAT_SVG_APPLICATION_SLOTS.find(slot => slot.id === 'showcase')
  const hasLocalConflict = releaseGate.blockers.some(blocker => blocker.kind === 'local-conflict')
  const canClaimApplicationReady = moduleIssues.length === 0 &&
    applicationGallerySnapshot.status === 'application-gallery-ready' &&
    applicationGallerySnapshot.issues.length === 0 &&
    wechatApplicationSlotIssues.length === 0 &&
    wechatApplicationSurfaceIssues.length === 0 &&
    wechatExportPipelineIssues.length === 0 &&
    wechatOptionIssues.length === 0 &&
    wechatStyleSamples.status === 'wechat-style-samples-ready' &&
    wechatStyleSamples.summary.issueCount === 0 &&
    wechatStyleSamples.summary.selectableStyleChoiceCount ===
      wechatApplicationRows.filter(row => row.selectable).length &&
    wechatStyleSamples.summary.renderedStyleChoiceCount ===
      wechatStyleSamples.summary.selectableStyleChoiceCount &&
    wechatStyleSamples.summary.svgBearingStyleChoiceCount ===
      wechatStyleSamples.summary.selectableStyleChoiceCount &&
    choiceIssues.length === 0 &&
    localActionability.summary.actionableLocalRows === 0 &&
    !hasLocalConflict

  return {
    scope: 'application',
    status: canClaimApplicationReady ? 'application-ready' : 'application-blocked',
    applicationGalleryStatus: applicationGallerySnapshot.status,
    wechatStyleSamplesStatus: wechatStyleSamples.status,
    canClaimApplicationReady,
    canClaimReleaseComplete: releaseGate.canClaimComplete,
    summary: {
      svgModuleCount: SVG_MODULES.length,
      svgFamilyCount: new Set(SVG_MODULES.map(module => module.family)).size,
      personaCount: APPLICATION_PREVIEW_PERSONAS.length,
      renderedModulePersonaPairs: SVG_MODULES.length * APPLICATION_PREVIEW_PERSONAS.length,
      applicationGalleryRenderedModulePersonaPairs:
        applicationGallerySnapshot.summary.renderedModulePersonaPairs,
      applicationGalleryWechatSafeViolationCount:
        applicationGallerySnapshot.summary.wechatSafeViolationCount,
      applicationGalleryModuleSentinelFailureCount:
        applicationGallerySnapshot.summary.moduleSentinelFailureCount,
      applicationGalleryIssueCount: applicationGallerySnapshot.issues.length,
      wechatApplicationSvgSlotCount: WECHAT_SVG_APPLICATION_SLOTS.length,
      wechatApplicationSvgShowcaseModuleCount: showcaseSlot?.modules.length ?? 0,
      wechatApplicationSvgSlotFailureCount: wechatApplicationSlotIssues.length,
      wechatApplicationSurfaceCount: APPLICATION_WECHAT_SURFACE_CONTRACTS.length,
      wechatApplicationSurfaceFailureCount: wechatApplicationSurfaceIssues.length,
      wechatExportPipelineContractCount: APPLICATION_WECHAT_EXPORT_PIPELINE_CONTRACTS.length,
      wechatExportPipelineFailureCount: wechatExportPipelineIssues.length,
      wechatOptionInjectedModuleCount: SVG_MODULES.length - wechatOptionIssueModuleIds.size,
      wechatOptionInjectionFailureCount: wechatOptionIssueModuleIds.size,
      wechatSafeViolationCount: moduleIssues.length - moduleSentinelFailureCount,
      moduleSentinelFailureCount,
      wechatStyleChoiceCount: wechatApplicationRows.length,
      wechatUsableChoiceCount: wechatApplicationRows.filter(row => row.availability.usable).length,
      wechatSelectableChoiceCount: wechatApplicationRows.filter(row => row.selectable).length,
      wechatRenderedStyleChoiceCount: wechatStyleSamples.summary.renderedStyleChoiceCount,
      wechatStyleSampleIssueCount: wechatStyleSamples.summary.issueCount,
      wechatStyleSampleSvgBearingChoiceCount: wechatStyleSamples.summary.svgBearingStyleChoiceCount,
      wechatStyleSampleTotalSvgModuleCount: wechatStyleSamples.summary.totalSvgModuleCount,
      usableButUnselectableWechatChoices: choiceIssues.length,
      actionableLocalRows: localActionability.summary.actionableLocalRows,
      catalogBlockedLocalRows: localActionability.summary.catalogBlockedLocalRows,
      manualDeferredOpenSteps: releaseGate.summary.manualDeferredOpenSteps,
      releaseBlockingOpenSteps: releaseGate.summary.releaseBlockingOpenSteps,
      externalHandoffRows: handoffPacket.summary.externalHandoffRows,
      nextExternalRows: handoffPacket.nextRows.length,
    },
    moduleIssues,
    applicationGalleryIssues: applicationGallerySnapshot.issues,
    wechatApplicationSlotIssues,
    wechatApplicationSurfaceIssues,
    wechatExportPipelineIssues,
    wechatOptionIssues,
    wechatStyleSampleIssues: wechatStyleSamples.issues,
    choiceIssues,
    externalProof: {
      notProof: true,
      releaseCanClaimComplete: releaseGate.canClaimComplete,
      releaseStatus: releaseGate.status,
      releaseBlockingOpenSteps: releaseGate.summary.releaseBlockingOpenSteps,
      releaseBlockingPhoneOpenSteps: releaseGate.summary.releaseBlockingPhoneOpenSteps,
      releaseBlockingExternalDependencyOpenSteps:
        releaseGate.summary.releaseBlockingExternalDependencyOpenSteps,
      releaseBlockingUnsafeToAutomateOpenSteps:
        releaseGate.summary.releaseBlockingUnsafeToAutomateOpenSteps,
      releaseBlockingMutatingOpenSteps: releaseGate.summary.releaseBlockingMutatingOpenSteps,
      externalHandoffRows: handoffPacket.summary.externalHandoffRows,
      nextExternalRows: handoffPacket.nextRows.length,
      requiresManualWeChatProof: releaseGate.summary.releaseBlockingOpenSteps > 0,
      xhsZhihuPublishAutomationDeferred: true,
    },
  }
}

function formatPreflightList(values: readonly string[]): string {
  return values.length > 0 ? values.join('|') : 'none'
}

function formatApplicationPreflightResult(result: StyleProofApplicationPreflightResult): string {
  const lines = [
    'InkForge style-proof application preflight',
    `scope: ${result.scope}`,
    `status: ${result.status}`,
    `applicationReady: ${result.canClaimApplicationReady ? 'true' : 'false'}`,
    `canClaimReleaseComplete: ${result.canClaimReleaseComplete ? 'true' : 'false'}`,
    `svgModuleCount: ${result.summary.svgModuleCount}`,
    `svgFamilyCount: ${result.summary.svgFamilyCount}`,
    `personaCount: ${result.summary.personaCount}`,
    `renderedModulePersonaPairs: ${result.summary.renderedModulePersonaPairs}`,
    `applicationGalleryStatus: ${result.applicationGalleryStatus}`,
    `wechatStyleSamplesStatus: ${result.wechatStyleSamplesStatus}`,
    `applicationGalleryRenderedModulePersonaPairs: ${result.summary.applicationGalleryRenderedModulePersonaPairs}`,
    `applicationGalleryWechatSafeViolationCount: ${result.summary.applicationGalleryWechatSafeViolationCount}`,
    `applicationGalleryModuleSentinelFailureCount: ${result.summary.applicationGalleryModuleSentinelFailureCount}`,
    `applicationGalleryIssueCount: ${result.summary.applicationGalleryIssueCount}`,
    `wechatApplicationSvgSlotCount: ${result.summary.wechatApplicationSvgSlotCount}`,
    `wechatApplicationSvgShowcaseModuleCount: ${result.summary.wechatApplicationSvgShowcaseModuleCount}`,
    `wechatApplicationSvgSlotFailureCount: ${result.summary.wechatApplicationSvgSlotFailureCount}`,
    `wechatApplicationSurfaceCount: ${result.summary.wechatApplicationSurfaceCount}`,
    `wechatApplicationSurfaceFailureCount: ${result.summary.wechatApplicationSurfaceFailureCount}`,
    `wechatExportPipelineContractCount: ${result.summary.wechatExportPipelineContractCount}`,
    `wechatExportPipelineFailureCount: ${result.summary.wechatExportPipelineFailureCount}`,
    `wechatOptionInjectedModuleCount: ${result.summary.wechatOptionInjectedModuleCount}`,
    `wechatOptionInjectionFailureCount: ${result.summary.wechatOptionInjectionFailureCount}`,
    `wechatSafeViolationCount: ${result.summary.wechatSafeViolationCount}`,
    `moduleSentinelFailureCount: ${result.summary.moduleSentinelFailureCount}`,
    `wechatStyleChoiceCount: ${result.summary.wechatStyleChoiceCount}`,
    `wechatUsableChoiceCount: ${result.summary.wechatUsableChoiceCount}`,
    `wechatSelectableChoiceCount: ${result.summary.wechatSelectableChoiceCount}`,
    `wechatRenderedStyleChoiceCount: ${result.summary.wechatRenderedStyleChoiceCount}`,
    `wechatStyleSampleIssueCount: ${result.summary.wechatStyleSampleIssueCount}`,
    `wechatStyleSampleSvgBearingChoiceCount: ${result.summary.wechatStyleSampleSvgBearingChoiceCount}`,
    `wechatStyleSampleTotalSvgModuleCount: ${result.summary.wechatStyleSampleTotalSvgModuleCount}`,
    `usableButUnselectableWechatChoices: ${result.summary.usableButUnselectableWechatChoices}`,
    `actionableLocalRows: ${result.summary.actionableLocalRows}`,
    `catalogBlockedLocalRows: ${result.summary.catalogBlockedLocalRows}`,
    `manualDeferredOpenSteps: ${result.summary.manualDeferredOpenSteps}`,
    `releaseBlockingOpenSteps: ${result.summary.releaseBlockingOpenSteps}`,
    `externalHandoffRows: ${result.summary.externalHandoffRows}`,
    `nextExternalRows: ${result.summary.nextExternalRows}`,
    '',
    'application issues:',
    `- moduleIssues: ${result.moduleIssues.length}`,
    `- applicationGalleryIssues: ${result.applicationGalleryIssues.length}`,
    `- wechatApplicationSlotIssues: ${result.wechatApplicationSlotIssues.length}`,
    `- wechatApplicationSurfaceIssues: ${result.wechatApplicationSurfaceIssues.length}`,
    `- wechatExportPipelineIssues: ${result.wechatExportPipelineIssues.length}`,
    `- wechatOptionIssues: ${result.wechatOptionIssues.length}`,
    `- wechatStyleSampleIssues: ${result.wechatStyleSampleIssues.length}`,
    `- choiceIssues: ${result.choiceIssues.length}`,
    '',
    'external proof boundary (not proof):',
    `- releaseStatus: ${result.externalProof.releaseStatus}`,
    `- releaseCanClaimComplete: ${result.externalProof.releaseCanClaimComplete ? 'true' : 'false'}`,
    `- requiresManualWeChatProof: ${result.externalProof.requiresManualWeChatProof ? 'true' : 'false'}`,
    `- xhsZhihuPublishAutomationDeferred: ${result.externalProof.xhsZhihuPublishAutomationDeferred ? 'true' : 'false'}`,
    '',
    'scope note:',
    '- Application preflight proves only the local app-level SVG/style selector and WeChat-safe rendering surface.',
    '- It does not prove WeChat phone preview, Dark Mode, cover thumbnail, credentialed sync, scheduled send, platform preview, public rendering, or publish success.',
    '- XHS/Zhihu publish-side automation remains manually deferred for this round.',
  ]

  if (result.moduleIssues.length > 0) {
    lines.push(
      '',
      'module issue rows:',
      ...result.moduleIssues.map(issue =>
        `- ${issue.moduleId}/${issue.persona}/${issue.family}: ${issue.issue}`
      ),
    )
  }

  if (result.wechatApplicationSlotIssues.length > 0) {
    lines.push(
      '',
      'wechat application slot issue rows:',
      ...result.wechatApplicationSlotIssues.map(issue =>
        `- ${issue.slotId}: ${issue.issue}`
      ),
    )
  }

  if (result.applicationGalleryIssues.length > 0) {
    lines.push(
      '',
      'application gallery issue rows:',
      ...result.applicationGalleryIssues.map(issue =>
        `- ${issue.moduleId}/${issue.persona}/${issue.family}: ${issue.issue}`
      ),
    )
  }

  if (result.wechatOptionIssues.length > 0) {
    lines.push(
      '',
      'wechat option issue rows:',
      ...result.wechatOptionIssues.map(issue =>
        `- ${issue.moduleId}/${issue.family}: ${issue.issue}`
      ),
    )
  }

  if (result.wechatStyleSampleIssues.length > 0) {
    lines.push(
      '',
      'wechat style sample issue rows:',
      ...result.wechatStyleSampleIssues.map(issue =>
        `- ${issue.choiceId}/${issue.presetId ?? 'none'}: ${issue.issue}; ${issue.detail}`
      ),
    )
  }

  if (result.wechatExportPipelineIssues.length > 0) {
    lines.push(
      '',
      'wechat export pipeline issue rows:',
      ...result.wechatExportPipelineIssues.map(issue =>
        `- ${issue.contractId}/${issue.relativePath}: ${issue.issue}; ${issue.fragment}`
      ),
    )
  }

  if (result.wechatApplicationSurfaceIssues.length > 0) {
    lines.push(
      '',
      'wechat application surface issue rows:',
      ...result.wechatApplicationSurfaceIssues.map(issue =>
        `- ${issue.surfaceId}/${issue.relativePath}: ${issue.issue}; ${issue.fragment}`
      ),
    )
  }

  if (result.choiceIssues.length > 0) {
    lines.push(
      '',
      'choice issue rows:',
      ...result.choiceIssues.map(issue =>
        `- ${issue.choiceId}: ${issue.availabilityStatus}; ${issue.reason}`
      ),
    )
  }

  return lines.join('\n')
}

function formatPreflightResult(result: StyleProofReleasePreflightResult): string {
  const lines = [
    'InkForge style-proof release preflight',
    `status: ${result.status}`,
    `canClaimComplete: ${result.canClaimComplete ? 'true' : 'false'}`,
    `blockerKinds: ${result.blockerKinds.length > 0 ? result.blockerKinds.join(', ') : 'none'}`,
    `blockerCount: ${result.summary.blockerCount}`,
    `combinedIssueCount: ${result.summary.combinedIssueCount}`,
    `cannotClaimSteps: ${result.summary.cannotClaimSteps}`,
    `phoneOpenSteps: ${result.summary.phoneOpenSteps}`,
    `externalDependencyOpenSteps: ${result.summary.externalDependencyOpenSteps}`,
    `unsafeToAutomateOpenSteps: ${result.summary.unsafeToAutomateOpenSteps}`,
    `mutatingOpenSteps: ${result.summary.mutatingOpenSteps}`,
    `manualDeferredOpenSteps: ${result.summary.manualDeferredOpenSteps}`,
    `releaseBlockingOpenSteps: ${result.summary.releaseBlockingOpenSteps}`,
    `releaseBlockingPhoneOpenSteps: ${result.summary.releaseBlockingPhoneOpenSteps}`,
    `releaseBlockingExternalDependencyOpenSteps: ${result.summary.releaseBlockingExternalDependencyOpenSteps}`,
    `releaseBlockingUnsafeToAutomateOpenSteps: ${result.summary.releaseBlockingUnsafeToAutomateOpenSteps}`,
    `releaseBlockingMutatingOpenSteps: ${result.summary.releaseBlockingMutatingOpenSteps}`,
    `externalHandoffRows: ${result.summary.externalHandoffRows}`,
    `safeExternalRows: ${result.summary.safeExternalRows}`,
    `actionableLocalRows: ${result.summary.actionableLocalRows}`,
    `nextRowRefs: ${result.summary.nextRowRefs}`,
    `uniqueNextRows: ${result.summary.uniqueNextRows}`,
    '',
    'next operator rows (unique):',
    ...result.nextRows.map(row =>
      `- ${row.kind}: ${row.platform}/${row.requirementId}/${row.boundary} ` +
      `refKinds=${row.refKinds.length > 0 ? row.refKinds.join('|') : 'none'} ` +
      `status=${row.status} phone=${row.requiresPhone ? 'yes' : 'no'} ` +
      `account=${row.requiresExternalAccount ? 'yes' : 'no'} ` +
      `mutates=${row.mutatesPlatform ? 'yes' : 'no'} safe=${row.safeToAutomate ? 'yes' : 'no'} ` +
      `cannotClaim=${row.cannotClaim ? 'yes' : 'no'} ` +
      `issues=${row.issueIds.length > 0 ? row.issueIds.join('|') : 'none'} ` +
      `reason=${row.cannotClaimReason ?? 'none'} ` +
      `next=${row.nextOperatorAction}`
    ),
    '',
    'proof guidance (not proof):',
    ...result.nextRows.flatMap(row => [
      `- ${row.platform}/${row.requirementId}/${row.boundary}`,
      `  requiredChannels: ${formatPreflightList(row.artifactGuidance.requiredChannels)}`,
      `  requiredActions: ${formatPreflightList(row.artifactGuidance.requiredActions)}`,
      `  requiredReadbacks: ${formatPreflightList(row.artifactGuidance.requiredReadbacks)}`,
      `  requiredFields: ${formatPreflightList(row.artifactGuidance.requiredFields)}`,
      `  forbiddenFields: ${formatPreflightList(row.artifactGuidance.forbiddenFields)}`,
      `  acceptedHostStatuses: ${formatPreflightList(row.artifactGuidance.acceptedHostStatuses)}`,
      `  maxFreshnessDays: ${row.artifactGuidance.maxFreshnessDays ?? 'none'}`,
      `  appendOnlyAfterExternalProof: ${row.artifactGuidance.appendOnlyAfterExternalProof ? 'yes' : 'no'}`,
      `  allMatchingRowCount: ${row.allMatchingSummary.rowCount}`,
      `  allMatchingRequirementIds: ${formatPreflightList(row.allMatchingSummary.requirementIds)}`,
      `  allMatchingBoundaries: ${formatPreflightList(row.allMatchingSummary.boundaries)}`,
      `  allMatchingStatuses: ${formatPreflightList(row.allMatchingSummary.statuses)}`,
      `  allMatchingIssueIds: ${formatPreflightList(row.allMatchingSummary.issueIds)}`,
      `  allMatchingTemplate: ${row.artifactGuidance.allMatchingTemplateCommand}`,
      `  allMatchingManifestDrafts: ${row.artifactGuidance.allMatchingManifestDraftsCommand}`,
    ]),
    '',
    'operator commands (copy-safe placeholders):',
    ...result.nextRows.flatMap(row => [
      `- ${row.platform}/${row.requirementId}/${row.boundary}`,
      `  template: ${row.commands.template}`,
      `  manifestDrafts: ${row.commands.manifestDrafts}`,
      `  allMatchingTemplate: ${row.commands.allMatchingTemplate}`,
      `  allMatchingManifestDrafts: ${row.commands.allMatchingManifestDrafts}`,
      `  intake: ${row.commands.intake}`,
      `  merge: ${row.commands.merge}`,
    ]),
  ]

  if (!result.canClaimComplete) {
    lines.push(
      '',
      'release claim blocked: in-scope WeChat phone/account/platform proof gates remain open.',
      'XHS/Zhihu publish-side checks are manual-deferred for this round and are not release-preflight blockers.',
      'Do not claim WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, platform preview, public rendering, or publish success from local-only checks.',
    )
  }

  return lines.join('\n')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const hasApplicationAlias = args.includes('--application')
  const scopeArg = args.find(arg => arg.startsWith('--scope='))
  const scope = hasApplicationAlias
    ? 'application'
    : scopeArg === '--scope=application'
      ? 'application'
      : 'release'
  const unknownArgs = args.filter(arg =>
    arg !== '--json' &&
    arg !== '--application' &&
    arg !== '--scope=release' &&
    arg !== '--scope=application'
  )
  if (unknownArgs.length > 0) {
    console.error(`Unknown option: ${unknownArgs.join(', ')}`)
    printHelp()
    process.exit(2)
  }

  if (scopeArg && scopeArg !== '--scope=release' && scopeArg !== '--scope=application') {
    console.error(`Unknown option: ${scopeArg}`)
    printHelp()
    process.exit(2)
  }

  if (scope === 'application') {
    const result = await buildApplicationPreflightResult()
    if (args.includes('--json')) {
      console.log(JSON.stringify(result))
    } else {
      console.log(formatApplicationPreflightResult(result))
    }

    process.exit(result.canClaimApplicationReady ? 0 : 1)
  }

  const result = buildPreflightResult()
  if (args.includes('--json')) {
    console.log(JSON.stringify(result))
  } else {
    console.log(formatPreflightResult(result))
  }

  process.exit(result.canClaimComplete ? 0 : 1)
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
