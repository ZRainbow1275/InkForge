#!/usr/bin/env node

import {
  type CommittedStyleProofExternalHandoffNextRowKind,
  type CommittedStyleProofExternalHandoffNextRowRef,
  type CommittedStyleProofExternalHandoffPacket,
  type CommittedStyleProofExternalProofChecklistBlockerKind,
  type CommittedStyleProofExternalProofChecklistGroup,
  type CommittedStyleProofExternalProofChecklistRow,
  type StyleProofAcceptanceAuditStatus,
  type StyleProofManifest,
  createStyleProofManifestDraft,
  formatCommittedStyleProofExternalHandoffPacketMarkdown,
  getCommittedStyleProofExternalHandoffPacket,
} from '../src/services/export/style-catalog.ts'
import type { Platform } from '../src/services/export/types.ts'

type ExternalHandoffOutputMode = 'markdown' | 'json' | 'template' | 'manifest-drafts' | 'checklist'
type ExternalHandoffIssueFilter = CommittedStyleProofExternalProofChecklistRow['issueIds'][number]
type ExternalHandoffArtifactTemplate =
  CommittedStyleProofExternalProofChecklistRow['artifactTemplate']
type ExternalHandoffArtifactVerificationField =
  ExternalHandoffArtifactTemplate['requiredFields'][number]

interface ExternalHandoffCliFilters {
  platform: Platform | null
  kind: CommittedStyleProofExternalHandoffNextRowKind | null
  status: StyleProofAcceptanceAuditStatus | null
  issueId: ExternalHandoffIssueFilter | null
  nextOnly: boolean
  freshnessOnly: boolean
}

interface ExternalHandoffCliArgs {
  outputMode: ExternalHandoffOutputMode
  filters: ExternalHandoffCliFilters
  handoffOkExitZero: boolean
}

interface ExternalHandoffFilteredSummary {
  committedExternalHandoffRows: number
  filteredRows: number
  filteredNextRowRefs: number
  filteredNextRows: number
  phoneRows: number
  externalAccountRows: number
  publicHostRows: number
  unsafeToAutomateRows: number
  mutatingRows: number
  safeExternalRows: number
  cannotClaimRows: number
  freshnessIssueRows: number
  platforms: readonly Platform[]
  kinds: readonly CommittedStyleProofExternalHandoffNextRowKind[]
  statuses: readonly StyleProofAcceptanceAuditStatus[]
  issueIds: readonly ExternalHandoffIssueFilter[]
}

interface ExternalHandoffTemplateNextRowRef {
  kind: CommittedStyleProofExternalHandoffNextRowKind
  rowId: string
}

interface ExternalHandoffArtifactDraftFieldChecklistItem {
  field: ExternalHandoffArtifactVerificationField
  value: null
  required: boolean
  forbidden: boolean
}

interface ExternalHandoffArtifactDraftTemplate {
  draftOnly: true
  notProof: true
  appendOnlyAfterExternalProof: true
  keepOutOfManifestUntilCollected: true
  requirementId: CommittedStyleProofExternalProofChecklistRow['requirementId']
  platform: Platform
  choiceId: null
  baseFields: {
    id: null
    requirementId: CommittedStyleProofExternalProofChecklistRow['requirementId']
    kind: null
    label: null
    platform: Platform
    choiceId: null
    channel: null
    action: null
    readback: null
    artifactFingerprint: null
    artifactRef: null
    exactArtifact: null
    collectedAt: null
    safeForCommit: null
    committed: null
    sensitive: null
    hostStatus: null
  }
  requiredVerificationFields: readonly ExternalHandoffArtifactDraftFieldChecklistItem[]
  forbiddenVerificationFields: readonly ExternalHandoffArtifactDraftFieldChecklistItem[]
  acceptedValues: {
    channels: ExternalHandoffArtifactTemplate['requiredChannels']
    actions: ExternalHandoffArtifactTemplate['requiredActions']
    readbacks: ExternalHandoffArtifactTemplate['requiredReadbacks']
    hostStatuses: ExternalHandoffArtifactTemplate['acceptedHostStatuses']
  }
  redactionBoundary: string
  successCriteria: ExternalHandoffArtifactTemplate['successCriteria']
  failureSignals: ExternalHandoffArtifactTemplate['failureSignals']
  doNotInclude: readonly string[]
}

interface ExternalHandoffTemplateInstructions {
  requiredChannels: ExternalHandoffArtifactTemplate['requiredChannels']
  requiredActions: ExternalHandoffArtifactTemplate['requiredActions']
  requiredReadbacks: ExternalHandoffArtifactTemplate['requiredReadbacks']
  requiredFields: ExternalHandoffArtifactTemplate['requiredFields']
  forbiddenFields: ExternalHandoffArtifactTemplate['forbiddenFields']
  acceptedHostStatuses: ExternalHandoffArtifactTemplate['acceptedHostStatuses']
  maxFreshnessDays: number | null
  fillOnlyAfterExternalProof: true
  doNotInclude: readonly string[]
  blankFields: {
    collectedAt: null
    channel: null
    action: null
    readback: null
    artifactRef: null
    notes: readonly []
  }
  artifactDraftTemplate: ExternalHandoffArtifactDraftTemplate
}

interface ExternalHandoffManifestDraftTemplate {
  draftOnly: true
  notProof: true
  format: 'StyleProofManifest'
  canClaimComplete: false
  platform: Platform
  targetRequirementId: CommittedStyleProofExternalProofChecklistRow['requirementId']
  choiceIds: readonly string[]
  drafts: readonly StyleProofManifest[]
  intakeCommand: string
  artifactGuidance: {
    appendArtifactsOnlyAfterExternalProof: true
    keepArtifactsEmptyUntilCollected: true
    requiredFields: ExternalHandoffArtifactTemplate['requiredFields']
    forbiddenFields: ExternalHandoffArtifactTemplate['forbiddenFields']
    acceptedHostStatuses: ExternalHandoffArtifactTemplate['acceptedHostStatuses']
    maxFreshnessDays: number | null
    artifactDraftTemplate: ExternalHandoffArtifactDraftTemplate
  }
}

interface ExternalHandoffManifestDraftSourceRow {
  id: string
  platform: Platform
  choiceIds: readonly string[]
  requirementId: CommittedStyleProofExternalProofChecklistRow['requirementId']
  requirementLabel: string
  gate: CommittedStyleProofExternalProofChecklistRow['gate']
  boundary: CommittedStyleProofExternalProofChecklistRow['boundary']
  status: StyleProofAcceptanceAuditStatus
  blockerKinds: readonly CommittedStyleProofExternalProofChecklistBlockerKind[]
  issueIds: readonly ExternalHandoffIssueFilter[]
  freshnessIssueIds: readonly ExternalHandoffIssueFilter[]
  cannotClaim: true
  cannotClaimReason: string | null
  nextOperatorAction: string
  artifactTemplate: ExternalHandoffArtifactTemplate
  artifactGuidance: ExternalHandoffManifestDraftTemplate['artifactGuidance']
}

interface ExternalHandoffTemplateRow {
  id: string
  templateOnly: true
  notProof: true
  platform: Platform
  choiceIds: readonly string[]
  requirementId: CommittedStyleProofExternalProofChecklistRow['requirementId']
  requirementLabel: string
  gate: CommittedStyleProofExternalProofChecklistRow['gate']
  boundary: CommittedStyleProofExternalProofChecklistRow['boundary']
  status: StyleProofAcceptanceAuditStatus
  blockerKinds: readonly CommittedStyleProofExternalProofChecklistBlockerKind[]
  issueIds: readonly ExternalHandoffIssueFilter[]
  freshnessIssueIds: readonly ExternalHandoffIssueFilter[]
  cannotClaim: true
  cannotClaimReason: string | null
  nextOperatorAction: string
  artifactTemplate: ExternalHandoffArtifactTemplate
  operatorWorksheet: ExternalHandoffTemplateInstructions
  manifestDraftTemplate: ExternalHandoffManifestDraftTemplate
}

interface ExternalHandoffTemplatePacket {
  templateOnly: true
  notProof: true
  status: CommittedStyleProofExternalHandoffPacket['status']
  canClaimComplete: false
  committedCanClaimComplete: boolean
  filters: ExternalHandoffCliFilters
  committedSummary: CommittedStyleProofExternalHandoffPacket['summary']
  filteredSummary: ExternalHandoffFilteredSummary
  recommendedNextAction: string | null
  rows: readonly ExternalHandoffTemplateRow[]
  nextRowRefs: readonly ExternalHandoffTemplateNextRowRef[]
  nextRows: readonly string[]
}

interface ExternalHandoffManifestDraftPack {
  draftOnly: true
  notProof: true
  format: 'StyleProofManifestPack'
  status: CommittedStyleProofExternalHandoffPacket['status']
  canClaimComplete: false
  committedCanClaimComplete: boolean
  filters: ExternalHandoffCliFilters
  committedSummary: CommittedStyleProofExternalHandoffPacket['summary']
  filteredSummary: ExternalHandoffFilteredSummary
  recommendedNextAction: string | null
  sourceRowIds: readonly string[]
  sourceRows: readonly ExternalHandoffManifestDraftSourceRow[]
  manifestCount: number
  intakeCommand: string
  mergeCommand: string
  guidance: {
    appendArtifactsOnlyAfterExternalProof: true
    keepArtifactsEmptyUntilCollected: true
    doNotInclude: readonly string[]
  }
  manifests: readonly StyleProofManifest[]
}

const PLATFORM_FILTERS: readonly Platform[] = ['wechat', 'xiaohongshu', 'zhihu']

const KIND_FILTERS: readonly CommittedStyleProofExternalHandoffNextRowKind[] = [
  'phone-preview',
  'external-account',
  'public-host',
  'unsafe-to-automate',
  'mutating-platform',
]

const STATUS_FILTERS: readonly StyleProofAcceptanceAuditStatus[] = [
  'completed',
  'missing',
  'invalid',
  'blocked-by-external',
  'unsafe-to-automate',
]

const VALID_PLATFORM_FILTERS = new Set<string>(PLATFORM_FILTERS)
const VALID_KIND_FILTERS = new Set<string>(KIND_FILTERS)
const VALID_STATUS_FILTERS = new Set<string>(STATUS_FILTERS)
const ISSUE_ID_FILTER_PATTERN = /^[a-z0-9][a-z0-9-]*$/

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:external-handoff [--markdown|--json|--template|--manifest-drafts|--checklist] [--platform <platform>] [--kind <kind>] [--status <status>] [--issue <issue-id>] [--freshness-only] [--next-only] [--handoff-ok-exit-zero]',
    '',
    'Prints the committed InkForge style-proof external handoff packet for',
    'operator-run phone, account, public-host, sync, scheduled-send, upload,',
    'preview, and publish proof collection.',
    '',
    'This command is read-only. It does not open a browser, upload content,',
    'sync drafts, schedule sends, publish articles, or create proof artifacts.',
    'By default it exits non-zero while the packet cannot be claimed complete.',
    '',
    'Options:',
    '  --markdown   Print the human handoff packet. This is the default.',
    '  --json       Print the raw handoff packet JSON.',
    '  --template   Print a JSON operator worksheet for the visible rows.',
    '               This is not proof and contains no completed artifact rows.',
    '               It includes empty StyleProofManifest draft skeletons for intake.',
    '  --manifest-drafts',
    '               Print a redacted { manifests: [...] } draft pack for the visible rows.',
    '               The pack contains only empty drafts and exits non-zero unless',
    '               --handoff-ok-exit-zero is set.',
    '  --checklist',
    '               Print a human manual proof checklist for the visible rows.',
    '               This is not proof and exits non-zero unless --handoff-ok-exit-zero is set.',
    '  --platform   Limit rows to one platform: wechat, xiaohongshu, zhihu.',
    '  --kind       Limit rows to one gate kind: phone-preview, external-account,',
    '               public-host, unsafe-to-automate, mutating-platform.',
    '  --status     Limit rows to one proof status: completed, missing, invalid,',
    '               blocked-by-external, unsafe-to-automate.',
    '  --issue      Limit rows to one issue id, including freshness issue ids.',
    '  --freshness-only',
    '               Print only rows with freshness issues such as stale proof.',
    '  --next-only  Print only the deduplicated next operator rows.',
    '  --handoff-ok-exit-zero',
    '               Exit 0 when a template/draft packet is generated successfully, while',
    '               preserving notProof:true and canClaimComplete:false in the payload.',
    '  --help       Print this help.',
    '',
    'Tip: use `pnpm --silent -C inkforge style-proof:external-handoff --json`',
    'when piping JSON from a command that may intentionally exit non-zero.',
  ].join('\n'))
}

function exitWithUsageError(message: string): never {
  console.error(message)
  printHelp()
  process.exit(2)
}

function parsePlatformFilter(value: string): Platform {
  if (!VALID_PLATFORM_FILTERS.has(value)) {
    exitWithUsageError(`Invalid platform filter: ${value}`)
  }

  return value as Platform
}

function parseKindFilter(value: string): CommittedStyleProofExternalHandoffNextRowKind {
  if (!VALID_KIND_FILTERS.has(value)) {
    exitWithUsageError(`Invalid kind filter: ${value}`)
  }

  return value as CommittedStyleProofExternalHandoffNextRowKind
}

function parseStatusFilter(value: string): StyleProofAcceptanceAuditStatus {
  if (!VALID_STATUS_FILTERS.has(value)) {
    exitWithUsageError(`Invalid status filter: ${value}`)
  }

  return value as StyleProofAcceptanceAuditStatus
}

function parseIssueFilter(value: string): ExternalHandoffIssueFilter {
  if (!ISSUE_ID_FILTER_PATTERN.test(value)) {
    exitWithUsageError(`Invalid issue filter: ${value}`)
  }

  return value as ExternalHandoffIssueFilter
}

function readOptionValue(args: readonly string[], index: number, optionName: string): string {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    exitWithUsageError(`Missing value for ${optionName}`)
  }

  return value
}

function parseArgs(args: readonly string[]): ExternalHandoffCliArgs {
  let outputMode: ExternalHandoffOutputMode = 'markdown'
  let sawMarkdown = false
  let sawJson = false
  let sawTemplate = false
  let sawManifestDrafts = false
  let sawChecklist = false
  let platform: Platform | null = null
  let kind: CommittedStyleProofExternalHandoffNextRowKind | null = null
  let status: StyleProofAcceptanceAuditStatus | null = null
  let issueId: ExternalHandoffIssueFilter | null = null
  let nextOnly = false
  let freshnessOnly = false
  let handoffOkExitZero = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--markdown') {
      sawMarkdown = true
      outputMode = 'markdown'
    } else if (arg === '--json') {
      sawJson = true
      outputMode = 'json'
    } else if (arg === '--template') {
      sawTemplate = true
      outputMode = 'template'
    } else if (arg === '--manifest-drafts') {
      sawManifestDrafts = true
      outputMode = 'manifest-drafts'
    } else if (arg === '--checklist') {
      sawChecklist = true
      outputMode = 'checklist'
    } else if (arg === '--next-only') {
      nextOnly = true
    } else if (arg === '--freshness-only') {
      freshnessOnly = true
    } else if (arg === '--handoff-ok-exit-zero') {
      handoffOkExitZero = true
    } else if (arg === '--platform') {
      platform = parsePlatformFilter(readOptionValue(args, index, '--platform'))
      index += 1
    } else if (arg.startsWith('--platform=')) {
      platform = parsePlatformFilter(arg.slice('--platform='.length))
    } else if (arg === '--kind') {
      kind = parseKindFilter(readOptionValue(args, index, '--kind'))
      index += 1
    } else if (arg.startsWith('--kind=')) {
      kind = parseKindFilter(arg.slice('--kind='.length))
    } else if (arg === '--status') {
      status = parseStatusFilter(readOptionValue(args, index, '--status'))
      index += 1
    } else if (arg.startsWith('--status=')) {
      status = parseStatusFilter(arg.slice('--status='.length))
    } else if (arg === '--issue') {
      issueId = parseIssueFilter(readOptionValue(args, index, '--issue'))
      index += 1
    } else if (arg.startsWith('--issue=')) {
      issueId = parseIssueFilter(arg.slice('--issue='.length))
    } else {
      exitWithUsageError(`Unknown option: ${arg}`)
    }
  }

  const selectedOutputModeCount = [
    sawMarkdown,
    sawJson,
    sawTemplate,
    sawManifestDrafts,
    sawChecklist,
  ].filter(Boolean).length
  if (selectedOutputModeCount > 1) {
    exitWithUsageError(
      'Choose only one output mode: --markdown, --json, --template, --manifest-drafts, or --checklist',
    )
  }

  return {
    outputMode,
    handoffOkExitZero,
    filters: {
      platform,
      kind,
      status,
      issueId,
      nextOnly,
      freshnessOnly,
    },
  }
}

function hasActiveFilters(filters: ExternalHandoffCliFilters): boolean {
  return Boolean(
    filters.platform ||
    filters.kind ||
    filters.status ||
    filters.issueId ||
    filters.nextOnly ||
    filters.freshnessOnly,
  )
}

function rowMatchesKind(
  row: CommittedStyleProofExternalProofChecklistRow,
  kind: CommittedStyleProofExternalHandoffNextRowKind,
): boolean {
  switch (kind) {
    case 'phone-preview':
      return row.requiresPhone || row.blockerKinds.includes('phone-preview')
    case 'external-account':
      return row.requiresExternalAccount
    case 'public-host':
      return row.boundary === 'public-host'
    case 'unsafe-to-automate':
      return row.status === 'unsafe-to-automate' || row.blockerKinds.includes('unsafe-to-automate')
    case 'mutating-platform':
      return row.mutatesPlatform || row.blockerKinds.includes('mutating-platform')
  }
}

function rowMatchesFilters(
  row: CommittedStyleProofExternalProofChecklistRow,
  filters: ExternalHandoffCliFilters,
): boolean {
  if (filters.platform && row.platform !== filters.platform) {
    return false
  }

  if (filters.kind && !rowMatchesKind(row, filters.kind)) {
    return false
  }

  if (filters.status && row.status !== filters.status) {
    return false
  }

  if (
    filters.issueId &&
    !row.issueIds.includes(filters.issueId) &&
    !row.freshnessIssueIds.includes(filters.issueId)
  ) {
    return false
  }

  if (filters.freshnessOnly && row.freshnessIssueIds.length === 0) {
    return false
  }

  return true
}

function nextRowRefMatchesFilters(
  ref: CommittedStyleProofExternalHandoffNextRowRef,
  filters: ExternalHandoffCliFilters,
): boolean {
  if (filters.kind && ref.kind !== filters.kind) {
    return false
  }

  return rowMatchesFilters(ref.row, {
    ...filters,
    kind: null,
  })
}

function getUniqueRows(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalProofChecklistRow[] {
  return Array.from(
    rows.reduce((rowsById, row) => {
      rowsById.set(row.id, row)
      return rowsById
    }, new Map<string, CommittedStyleProofExternalProofChecklistRow>()).values(),
  )
}

function getRowKinds(
  row: CommittedStyleProofExternalProofChecklistRow,
): CommittedStyleProofExternalHandoffNextRowKind[] {
  return KIND_FILTERS.filter(kind => rowMatchesKind(row, kind))
}

function getUniquePlatforms(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): Platform[] {
  return Array.from(new Set(rows.map(row => row.platform))).sort()
}

function getUniqueKinds(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalHandoffNextRowKind[] {
  const kinds = new Set<CommittedStyleProofExternalHandoffNextRowKind>()
  for (const row of rows) {
    for (const kind of getRowKinds(row)) {
      kinds.add(kind)
    }
  }

  return KIND_FILTERS.filter(kind => kinds.has(kind))
}

function getUniqueStatuses(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): StyleProofAcceptanceAuditStatus[] {
  const statuses = new Set(rows.map(row => row.status))

  return STATUS_FILTERS.filter(status => statuses.has(status))
}

function getUniqueChecklistIssueIds(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): ExternalHandoffIssueFilter[] {
  return Array.from(new Set(rows.flatMap(row => [
    ...row.issueIds,
    ...row.freshnessIssueIds,
  ]))).sort()
}

function getUniqueRequirementIds(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalProofChecklistGroup['requirementIds'] {
  return Array.from(new Set(rows.map(row => row.requirementId))).sort()
}

function getUniqueIssueIds(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalProofChecklistGroup['issueIds'] {
  return Array.from(new Set(rows.flatMap(row => row.issueIds))).sort()
}

function getPlatformStepCounts(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalProofChecklistGroup['platformStepCounts'] {
  return getUniquePlatforms(rows).map(platform => ({
    platform,
    stepCount: rows.filter(row => row.platform === platform).length,
  }))
}

function getRequirementStepCounts(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalProofChecklistGroup['requirementStepCounts'] {
  return getUniqueRequirementIds(rows).map(requirementId => ({
    requirementId,
    stepCount: rows.filter(row => row.requirementId === requirementId).length,
  }))
}

function getIssueCounts(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalProofChecklistGroup['issueCounts'] {
  const issueCounts = new Map<CommittedStyleProofExternalProofChecklistRow['issueIds'][number], number>()
  for (const row of rows) {
    for (const issueId of row.issueIds) {
      issueCounts.set(issueId, (issueCounts.get(issueId) ?? 0) + 1)
    }
  }

  return Array.from(issueCounts.entries())
    .sort(([leftIssueId], [rightIssueId]) => leftIssueId.localeCompare(rightIssueId))
    .map(([issueId, count]) => ({
      issueId,
      count,
    }))
}

function getNextOperatorActions(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalProofChecklistGroup['nextOperatorActions'] {
  return rows.map(row => ({
    platforms: [row.platform],
    requirementId: row.requirementId,
    gate: row.gate,
    boundary: row.boundary,
    action: row.nextOperatorAction,
  }))
}

function buildFilteredGroups(
  packet: CommittedStyleProofExternalHandoffPacket,
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalProofChecklistGroup[] {
  const rowIds = new Set(rows.map(row => row.id))

  return packet.groups.flatMap(group => {
    const groupRows = group.rows.filter(row => rowIds.has(row.id))
    if (groupRows.length === 0) {
      return []
    }

    return [{
      ...group,
      platforms: getUniquePlatforms(groupRows),
      requirementIds: getUniqueRequirementIds(groupRows),
      issueIds: getUniqueIssueIds(groupRows),
      issueCount: groupRows.reduce((total, row) => total + row.issueIds.length, 0),
      stepCount: groupRows.length,
      rowCount: groupRows.length,
      platformStepCounts: getPlatformStepCounts(groupRows),
      requirementStepCounts: getRequirementStepCounts(groupRows),
      issueCounts: getIssueCounts(groupRows),
      nextOperatorActions: getNextOperatorActions(groupRows),
      rows: groupRows,
    }]
  })
}

function buildFilteredSummary(
  basePacket: CommittedStyleProofExternalHandoffPacket,
  filteredPacket: CommittedStyleProofExternalHandoffPacket,
): ExternalHandoffFilteredSummary {
  const rows = filteredPacket.rows

  return {
    committedExternalHandoffRows: basePacket.summary.externalHandoffRows,
    filteredRows: rows.length,
    filteredNextRowRefs: filteredPacket.nextRowRefs.length,
    filteredNextRows: filteredPacket.nextRows.length,
    phoneRows: rows.filter(row => row.requiresPhone).length,
    externalAccountRows: rows.filter(row => row.requiresExternalAccount).length,
    publicHostRows: rows.filter(row => row.boundary === 'public-host').length,
    unsafeToAutomateRows: rows.filter(row =>
      row.status === 'unsafe-to-automate' || row.blockerKinds.includes('unsafe-to-automate')
    ).length,
    mutatingRows: rows.filter(row => row.mutatesPlatform).length,
    safeExternalRows: rows.filter(row => row.safeToAutomate).length,
    cannotClaimRows: rows.filter(row => row.cannotClaim).length,
    freshnessIssueRows: rows.filter(row => row.freshnessIssueIds.length > 0).length,
    platforms: getUniquePlatforms(rows),
    kinds: getUniqueKinds(rows),
    statuses: getUniqueStatuses(rows),
    issueIds: getUniqueChecklistIssueIds(rows),
  }
}

function buildFilteredPacket(
  packet: CommittedStyleProofExternalHandoffPacket,
  filters: ExternalHandoffCliFilters,
): CommittedStyleProofExternalHandoffPacket {
  const filteredNextRowRefs = packet.nextRowRefs.filter(ref => nextRowRefMatchesFilters(ref, filters))
  const filteredNextRows = getUniqueRows(filteredNextRowRefs.map(ref => ref.row))
  const filteredRows = filters.nextOnly
    ? filteredNextRows
    : packet.rows.filter(row => rowMatchesFilters(row, filters))
  const filteredGroups = buildFilteredGroups(packet, filteredRows)

  return {
    ...packet,
    requiresOperator: filteredRows.length > 0,
    requiresPhone: filteredRows.some(row => row.requiresPhone),
    requiresExternalAccount: filteredRows.some(row => row.requiresExternalAccount),
    requiresPublicHost: filteredRows.some(row => row.boundary === 'public-host'),
    containsUnsafeToAutomateRows: filteredRows.some(row =>
      row.status === 'unsafe-to-automate' || row.blockerKinds.includes('unsafe-to-automate')
    ),
    containsMutatingPlatformRows: filteredRows.some(row => row.mutatesPlatform),
    recommendedNextAction: filteredNextRows[0]?.nextOperatorAction ?? null,
    summary: {
      ...packet.summary,
      externalHandoffRows: filteredRows.length,
      externalHandoffGroups: filteredGroups.length,
      phoneRows: filteredRows.filter(row => row.requiresPhone).length,
      externalAccountRows: filteredRows.filter(row => row.requiresExternalAccount).length,
      publicHostRows: filteredRows.filter(row => row.boundary === 'public-host').length,
      unsafeToAutomateRows: filteredRows.filter(row =>
        row.status === 'unsafe-to-automate' || row.blockerKinds.includes('unsafe-to-automate')
      ).length,
      mutatingRows: filteredRows.filter(row => row.mutatesPlatform).length,
      safeExternalRows: filteredRows.filter(row => row.safeToAutomate).length,
    },
    groups: filteredGroups,
    rows: filteredRows,
    nextRowRefs: filteredNextRowRefs,
    nextRows: filteredNextRows,
  }
}

function formatFilterValue(value: string | null): string {
  return value ?? 'all'
}

function formatBoolean(value: boolean): 'yes' | 'no' {
  return value ? 'yes' : 'no'
}

function formatFilteredPacketMarkdown(
  packet: CommittedStyleProofExternalHandoffPacket,
  filters: ExternalHandoffCliFilters,
  filteredSummary: ExternalHandoffFilteredSummary,
): string {
  const filterHeader = [
    '# Committed Style Proof External Handoff Filtered View',
    '',
    '## CLI Filters',
    `- Platform: ${formatFilterValue(filters.platform)}`,
    `- Kind: ${formatFilterValue(filters.kind)}`,
    `- Status: ${formatFilterValue(filters.status)}`,
    `- Issue id: ${formatFilterValue(filters.issueId)}`,
    `- Freshness only: ${formatBoolean(filters.freshnessOnly)}`,
    `- Next only: ${formatBoolean(filters.nextOnly)}`,
    `- Committed external handoff rows: ${filteredSummary.committedExternalHandoffRows}`,
    `- Filtered rows: ${filteredSummary.filteredRows}`,
    `- Filtered next row refs: ${filteredSummary.filteredNextRowRefs}`,
    `- Filtered next rows: ${filteredSummary.filteredNextRows}`,
    `- Filtered freshness issue rows: ${filteredSummary.freshnessIssueRows}`,
    '',
  ].join('\n')

  return `${filterHeader}${formatCommittedStyleProofExternalHandoffPacketMarkdown(packet)}`
}

const TEMPLATE_DO_NOT_INCLUDE: readonly string[] = [
  'raw account session material',
  'credential browser storage',
  'local browser-runtime directories',
  'network archive files',
  'QR payload contents',
  'third-party material URLs',
  'unredacted draft or publish URLs',
  'local capture file references',
]

function buildArtifactDraftFieldChecklist(
  fields: readonly ExternalHandoffArtifactVerificationField[],
  options: {
    required: boolean
    forbidden: boolean
  },
): readonly ExternalHandoffArtifactDraftFieldChecklistItem[] {
  return fields.map(field => ({
    field,
    value: null,
    required: options.required,
    forbidden: options.forbidden,
  }))
}

function buildArtifactDraftTemplate(
  row: CommittedStyleProofExternalProofChecklistRow,
): ExternalHandoffArtifactDraftTemplate {
  const template = row.artifactTemplate

  return {
    draftOnly: true,
    notProof: true,
    appendOnlyAfterExternalProof: true,
    keepOutOfManifestUntilCollected: true,
    requirementId: row.requirementId,
    platform: row.platform,
    choiceId: null,
    baseFields: {
      id: null,
      requirementId: row.requirementId,
      kind: null,
      label: null,
      platform: row.platform,
      choiceId: null,
      channel: null,
      action: null,
      readback: null,
      artifactFingerprint: null,
      artifactRef: null,
      exactArtifact: null,
      collectedAt: null,
      safeForCommit: null,
      committed: null,
      sensitive: null,
      hostStatus: null,
    },
    requiredVerificationFields: buildArtifactDraftFieldChecklist(template.requiredFields, {
      required: true,
      forbidden: false,
    }),
    forbiddenVerificationFields: buildArtifactDraftFieldChecklist(template.forbiddenFields, {
      required: false,
      forbidden: true,
    }),
    acceptedValues: {
      channels: template.requiredChannels,
      actions: template.requiredActions,
      readbacks: template.requiredReadbacks,
      hostStatuses: template.acceptedHostStatuses,
    },
    redactionBoundary: template.redactionBoundary,
    successCriteria: template.successCriteria,
    failureSignals: template.failureSignals,
    doNotInclude: TEMPLATE_DO_NOT_INCLUDE,
  }
}

function buildTemplateInstructions(
  row: CommittedStyleProofExternalProofChecklistRow,
): ExternalHandoffTemplateInstructions {
  const template = row.artifactTemplate
  const artifactDraftTemplate = buildArtifactDraftTemplate(row)

  return {
    requiredChannels: template.requiredChannels,
    requiredActions: template.requiredActions,
    requiredReadbacks: template.requiredReadbacks,
    requiredFields: template.requiredFields,
    forbiddenFields: template.forbiddenFields,
    acceptedHostStatuses: template.acceptedHostStatuses,
    maxFreshnessDays: template.maxFreshnessDays,
    fillOnlyAfterExternalProof: true,
    doNotInclude: TEMPLATE_DO_NOT_INCLUDE,
    blankFields: {
      collectedAt: null,
      channel: null,
      action: null,
      readback: null,
      artifactRef: null,
      notes: [],
    },
    artifactDraftTemplate,
  }
}

function buildManifestDraftTemplate(
  row: CommittedStyleProofExternalProofChecklistRow,
): ExternalHandoffManifestDraftTemplate {
  const choiceIds = row.choiceIds.length > 0 ? row.choiceIds : []
  const artifactDraftTemplate = buildArtifactDraftTemplate(row)
  const drafts = choiceIds.length > 0
    ? choiceIds.map(choiceId => createStyleProofManifestDraft({
        platform: row.platform,
        choiceId,
      }))
    : [createStyleProofManifestDraft({ platform: row.platform })]

  return {
    draftOnly: true,
    notProof: true,
    format: 'StyleProofManifest',
    canClaimComplete: false,
    platform: row.platform,
    targetRequirementId: row.requirementId,
    choiceIds,
    drafts,
    intakeCommand: 'pnpm --silent -C inkforge style-proof:manifest-intake --file <redacted-manifest.json> --json',
    artifactGuidance: {
      appendArtifactsOnlyAfterExternalProof: true,
      keepArtifactsEmptyUntilCollected: true,
      requiredFields: row.artifactTemplate.requiredFields,
      forbiddenFields: row.artifactTemplate.forbiddenFields,
      acceptedHostStatuses: row.artifactTemplate.acceptedHostStatuses,
      maxFreshnessDays: row.artifactTemplate.maxFreshnessDays,
      artifactDraftTemplate,
    },
  }
}

function buildTemplateRow(
  row: CommittedStyleProofExternalProofChecklistRow,
): ExternalHandoffTemplateRow {
  return {
    id: row.id,
    templateOnly: true,
    notProof: true,
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
    cannotClaim: true,
    cannotClaimReason: row.cannotClaimReason,
    nextOperatorAction: row.nextOperatorAction,
    artifactTemplate: row.artifactTemplate,
    operatorWorksheet: buildTemplateInstructions(row),
    manifestDraftTemplate: buildManifestDraftTemplate(row),
  }
}

function buildTemplatePacket(
  packet: CommittedStyleProofExternalHandoffPacket,
  filters: ExternalHandoffCliFilters,
): ExternalHandoffTemplatePacket {
  const visiblePacket = hasActiveFilters(filters) ? buildFilteredPacket(packet, filters) : packet
  const filteredSummary = buildFilteredSummary(packet, visiblePacket)

  return {
    templateOnly: true,
    notProof: true,
    status: packet.status,
    canClaimComplete: false,
    committedCanClaimComplete: packet.canClaimComplete,
    filters,
    committedSummary: packet.summary,
    filteredSummary,
    recommendedNextAction: visiblePacket.recommendedNextAction,
    rows: visiblePacket.rows.map(buildTemplateRow),
    nextRowRefs: visiblePacket.nextRowRefs.map(ref => ({
      kind: ref.kind,
      rowId: ref.row.id,
    })),
    nextRows: visiblePacket.nextRows.map(row => row.id),
  }
}

function getManifestDraftKey(manifest: StyleProofManifest): string {
  return JSON.stringify({
    platform: manifest.platform,
    scope: manifest.scope ?? null,
    choiceId: manifest.choiceId ?? null,
    artifactFingerprint: manifest.artifactFingerprint ?? null,
    claimedEvidence: manifest.claimedEvidence,
  })
}

function getUniqueManifestDrafts(rows: readonly ExternalHandoffTemplateRow[]): readonly StyleProofManifest[] {
  const draftByKey = new Map<string, StyleProofManifest>()
  for (const row of rows) {
    for (const draft of row.manifestDraftTemplate.drafts) {
      const key = getManifestDraftKey(draft)
      if (!draftByKey.has(key)) {
        draftByKey.set(key, draft)
      }
    }
  }

  return Array.from(draftByKey.values())
}

function buildManifestDraftSourceRow(
  row: ExternalHandoffTemplateRow,
): ExternalHandoffManifestDraftSourceRow {
  return {
    id: row.id,
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
    cannotClaim: row.cannotClaim,
    cannotClaimReason: row.cannotClaimReason,
    nextOperatorAction: row.nextOperatorAction,
    artifactTemplate: row.artifactTemplate,
    artifactGuidance: row.manifestDraftTemplate.artifactGuidance,
  }
}

function buildManifestDraftPack(
  packet: CommittedStyleProofExternalHandoffPacket,
  filters: ExternalHandoffCliFilters,
): ExternalHandoffManifestDraftPack {
  const templatePacket = buildTemplatePacket(packet, filters)
  const manifests = getUniqueManifestDrafts(templatePacket.rows)

  return {
    draftOnly: true,
    notProof: true,
    format: 'StyleProofManifestPack',
    status: packet.status,
    canClaimComplete: false,
    committedCanClaimComplete: packet.canClaimComplete,
    filters,
    committedSummary: packet.summary,
    filteredSummary: templatePacket.filteredSummary,
    recommendedNextAction: templatePacket.recommendedNextAction,
    sourceRowIds: templatePacket.rows.map(row => row.id),
    sourceRows: templatePacket.rows.map(buildManifestDraftSourceRow),
    manifestCount: manifests.length,
    intakeCommand: 'pnpm --silent -C inkforge style-proof:manifest-intake --file <redacted-manifest.json> --json',
    mergeCommand: 'pnpm --silent -C inkforge style-proof:manifest-merge --file <redacted-manifest.json> --json',
    guidance: {
      appendArtifactsOnlyAfterExternalProof: true,
      keepArtifactsEmptyUntilCollected: true,
      doNotInclude: TEMPLATE_DO_NOT_INCLUDE,
    },
    manifests,
  }
}

function formatChecklistList(values: readonly string[]): string {
  if (values.length === 0) {
    return 'none'
  }

  return values.join(', ')
}

function formatChecklistBoolean(value: boolean): 'true' | 'false' {
  return value ? 'true' : 'false'
}

function formatChecklistFilters(filters: ExternalHandoffCliFilters): string[] {
  return [
    `- platform: ${filters.platform ?? 'all'}`,
    `- kind: ${filters.kind ?? 'all'}`,
    `- status: ${filters.status ?? 'all'}`,
    `- issueId: ${filters.issueId ?? 'all'}`,
    `- nextOnly: ${formatChecklistBoolean(filters.nextOnly)}`,
    `- freshnessOnly: ${formatChecklistBoolean(filters.freshnessOnly)}`,
  ]
}

function formatLocalGatePreflightCommands(): string[] {
  return [
    '## Local Gates Before External Collection',
    '',
    '- Application preflight: pnpm --silent -C inkforge style-proof:application-preflight --json',
    '- Application acceptance: pnpm --silent -C inkforge style-proof:application-acceptance --json',
    '- WeChat style samples: pnpm --silent -C inkforge style-proof:wechat-style-samples --json',
    '- Strict release boundary: pnpm --silent -C inkforge style-proof:release-preflight --json',
    '',
    'Only collect external proof after application-ready, application-acceptance-ready, and wechat-style-samples-ready are all true.',
    'The strict release boundary must still report blocked-by-external with canClaimComplete=false until real phone/account proof is merged.',
  ]
}

function formatChecklistRow(row: ExternalHandoffTemplateRow, index: number): string[] {
  const artifactDraft = row.operatorWorksheet.artifactDraftTemplate

  return [
    `### ${index + 1}. ${row.platform} / ${row.requirementId}`,
    '',
    `- status: ${row.status}`,
    `- gate: ${row.gate}`,
    `- boundary: ${row.boundary}`,
    `- cannotClaim: ${formatChecklistBoolean(row.cannotClaim)}`,
    `- issueIds: ${formatChecklistList(row.issueIds)}`,
    `- blockerKinds: ${formatChecklistList(row.blockerKinds)}`,
    `- choiceIds: ${formatChecklistList(row.choiceIds)}`,
    `- nextOperatorAction: ${row.nextOperatorAction}`,
    '',
    'Required proof values:',
    `- channels: ${formatChecklistList(row.operatorWorksheet.requiredChannels)}`,
    `- actions: ${formatChecklistList(row.operatorWorksheet.requiredActions)}`,
    `- readbacks: ${formatChecklistList(row.operatorWorksheet.requiredReadbacks)}`,
    `- requiredFields: ${formatChecklistList(row.operatorWorksheet.requiredFields)}`,
    `- forbiddenFields: ${formatChecklistList(row.operatorWorksheet.forbiddenFields)}`,
    `- maxFreshnessDays: ${row.operatorWorksheet.maxFreshnessDays ?? 'none'}`,
    '',
    'Artifact draft fields to fill only after real external proof:',
    `- requirementId: ${artifactDraft.baseFields.requirementId}`,
    `- platform: ${artifactDraft.baseFields.platform}`,
    '- id: <redacted-stable-id>',
    '- kind: <proof-kind>',
    '- label: <redacted-label>',
    '- choiceId: <matching-style-choice-id-or-null>',
    '- channel: <one accepted channel above>',
    '- action: <one accepted action above>',
    '- readback: <one accepted readback above>',
    '- artifactFingerprint: <exact exported artifact fingerprint>',
    '- artifactRef: <redacted reference only>',
    '- exactArtifact: true',
    '- collectedAt: <ISO timestamp>',
    '- safeForCommit: true',
    '- committed: false until merged through manifest tooling',
    '- sensitive: false after redaction review',
    '',
    'Success criteria:',
    ...row.artifactTemplate.successCriteria.map(item => `- ${item}`),
    '',
    'Failure signals:',
    ...row.artifactTemplate.failureSignals.map(item => `- ${item}`),
    '',
    'Never include:',
    ...row.operatorWorksheet.doNotInclude.map(item => `- ${item}`),
    '',
  ]
}

function formatManualProofChecklist(packet: ExternalHandoffTemplatePacket): string {
  const rows = packet.rows.flatMap(formatChecklistRow)

  return [
    '# WeChat Manual Style Proof Checklist',
    '',
    'This checklist is not proof. It is a human worksheet for collecting external WeChat phone/account proof.',
    'Do not paste account secrets, QR payloads, cookies, auth secrets, HAR files, local browser-runtime directories, or unredacted platform URLs into committed evidence.',
    '',
    '## Claim Boundary',
    '',
    '- notProof: true',
    '- canClaimComplete: false',
    `- committedCanClaimComplete: ${formatChecklistBoolean(packet.committedCanClaimComplete)}`,
    `- status: ${packet.status}`,
    `- filteredRows: ${packet.filteredSummary.filteredRows}`,
    `- filteredNextRows: ${packet.filteredSummary.filteredNextRows}`,
    `- filteredNextRowRefs: ${packet.filteredSummary.filteredNextRowRefs}`,
    `- phoneRows: ${packet.filteredSummary.phoneRows}`,
    `- externalAccountRows: ${packet.filteredSummary.externalAccountRows}`,
    `- safeExternalRows: ${packet.filteredSummary.safeExternalRows}`,
    `- cannotClaimRows: ${packet.filteredSummary.cannotClaimRows}`,
    '',
    '## Filters',
    '',
    ...formatChecklistFilters(packet.filters),
    '',
    ...formatLocalGatePreflightCommands(),
    '',
    '## Intake Commands After Real Proof Exists',
    '',
    '- Draft pack: pnpm --silent -C inkforge style-proof:wechat-manual-manifest-drafts',
    '- Intake: pnpm --silent -C inkforge style-proof:manifest-intake --file REDACTED_MANIFEST.json --json',
    '- Merge preview: pnpm --silent -C inkforge style-proof:manifest-merge --file REDACTED_MANIFEST.json --json',
    '- Release check: pnpm --silent -C inkforge style-proof:release-preflight --json',
    '',
    '## Rows To Collect',
    '',
    ...(rows.length > 0 ? rows : ['No rows match the selected filters.', '']),
  ].join('\n')
}

function getExternalHandoffExitCode(
  packet: CommittedStyleProofExternalHandoffPacket,
  outputMode: ExternalHandoffOutputMode,
  handoffOkExitZero: boolean,
): number {
  if (packet.canClaimComplete) {
    return 0
  }

  if (
    handoffOkExitZero &&
    (outputMode === 'template' || outputMode === 'manifest-drafts' || outputMode === 'checklist')
  ) {
    return 0
  }

  return 1
}

function main(): void {
  const rawArgs = process.argv.slice(2)
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const { outputMode, filters, handoffOkExitZero } = parseArgs(rawArgs)
  const packet = getCommittedStyleProofExternalHandoffPacket()
  if (outputMode === 'template') {
    console.log(JSON.stringify(buildTemplatePacket(packet, filters)))
    process.exit(getExternalHandoffExitCode(packet, outputMode, handoffOkExitZero))
  }

  if (outputMode === 'manifest-drafts') {
    console.log(JSON.stringify(buildManifestDraftPack(packet, filters)))
    process.exit(getExternalHandoffExitCode(packet, outputMode, handoffOkExitZero))
  }

  if (outputMode === 'checklist') {
    console.log(formatManualProofChecklist(buildTemplatePacket(packet, filters)).trimEnd())
    process.exit(getExternalHandoffExitCode(packet, outputMode, handoffOkExitZero))
  }

  if (!hasActiveFilters(filters)) {
    if (outputMode === 'json') {
      console.log(JSON.stringify(packet))
    } else {
      console.log(formatCommittedStyleProofExternalHandoffPacketMarkdown(packet).trimEnd())
    }
    process.exit(getExternalHandoffExitCode(packet, outputMode, handoffOkExitZero))
  }

  const filteredPacket = buildFilteredPacket(packet, filters)
  const filteredSummary = buildFilteredSummary(packet, filteredPacket)
  if (outputMode === 'json') {
    console.log(JSON.stringify({
      ...filteredPacket,
      filters,
      committedSummary: packet.summary,
      filteredSummary,
    }))
  } else {
    console.log(formatFilteredPacketMarkdown(filteredPacket, filters, filteredSummary).trimEnd())
  }

  process.exit(getExternalHandoffExitCode(packet, outputMode, handoffOkExitZero))
}

main()
