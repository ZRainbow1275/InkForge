#!/usr/bin/env node

import {
  type CommittedStyleProofExternalHandoffNextRowKind,
  type CommittedStyleProofExternalHandoffNextRowRef,
  type CommittedStyleProofExternalHandoffPacket,
  type CommittedStyleProofExternalProofChecklistGroup,
  type CommittedStyleProofExternalProofChecklistRow,
  formatCommittedStyleProofExternalHandoffPacketMarkdown,
  getCommittedStyleProofExternalHandoffPacket,
} from '../src/services/export/style-catalog.ts'
import type { Platform } from '../src/services/export/types.ts'

type ExternalHandoffOutputMode = 'markdown' | 'json'

interface ExternalHandoffCliFilters {
  platform: Platform | null
  kind: CommittedStyleProofExternalHandoffNextRowKind | null
  nextOnly: boolean
}

interface ExternalHandoffCliArgs {
  outputMode: ExternalHandoffOutputMode
  filters: ExternalHandoffCliFilters
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
  platforms: readonly Platform[]
  kinds: readonly CommittedStyleProofExternalHandoffNextRowKind[]
}

const PLATFORM_FILTERS: readonly Platform[] = ['wechat', 'xiaohongshu', 'zhihu']

const KIND_FILTERS: readonly CommittedStyleProofExternalHandoffNextRowKind[] = [
  'phone-preview',
  'external-account',
  'public-host',
  'unsafe-to-automate',
  'mutating-platform',
]

const VALID_PLATFORM_FILTERS = new Set<string>(PLATFORM_FILTERS)
const VALID_KIND_FILTERS = new Set<string>(KIND_FILTERS)

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:external-handoff [--markdown|--json] [--platform <platform>] [--kind <kind>] [--next-only]',
    '',
    'Prints the committed InkForge style-proof external handoff packet for',
    'operator-run phone, account, public-host, sync, scheduled-send, upload,',
    'preview, and publish proof collection.',
    '',
    'This command is read-only. It does not open a browser, upload content,',
    'sync drafts, schedule sends, publish articles, or create proof artifacts.',
    'It exits non-zero while the packet cannot be claimed complete.',
    '',
    'Options:',
    '  --markdown   Print the human handoff packet. This is the default.',
    '  --json       Print the raw handoff packet JSON.',
    '  --platform   Limit rows to one platform: wechat, xiaohongshu, zhihu.',
    '  --kind       Limit rows to one gate kind: phone-preview, external-account,',
    '               public-host, unsafe-to-automate, mutating-platform.',
    '  --next-only  Print only the deduplicated next operator rows.',
    '  --help       Print this help.',
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
  let platform: Platform | null = null
  let kind: CommittedStyleProofExternalHandoffNextRowKind | null = null
  let nextOnly = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--markdown') {
      sawMarkdown = true
      outputMode = 'markdown'
    } else if (arg === '--json') {
      sawJson = true
      outputMode = 'json'
    } else if (arg === '--next-only') {
      nextOnly = true
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
    } else {
      exitWithUsageError(`Unknown option: ${arg}`)
    }
  }

  if (sawMarkdown && sawJson) {
    exitWithUsageError('Choose only one output mode: --markdown or --json')
  }

  return {
    outputMode,
    filters: {
      platform,
      kind,
      nextOnly,
    },
  }
}

function hasActiveFilters(filters: ExternalHandoffCliFilters): boolean {
  return Boolean(filters.platform || filters.kind || filters.nextOnly)
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
    platforms: getUniquePlatforms(rows),
    kinds: getUniqueKinds(rows),
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
    `- Next only: ${formatBoolean(filters.nextOnly)}`,
    `- Committed external handoff rows: ${filteredSummary.committedExternalHandoffRows}`,
    `- Filtered rows: ${filteredSummary.filteredRows}`,
    `- Filtered next row refs: ${filteredSummary.filteredNextRowRefs}`,
    `- Filtered next rows: ${filteredSummary.filteredNextRows}`,
    '',
  ].join('\n')

  return `${filterHeader}${formatCommittedStyleProofExternalHandoffPacketMarkdown(packet)}`
}

function main(): void {
  const rawArgs = process.argv.slice(2)
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const { outputMode, filters } = parseArgs(rawArgs)
  const packet = getCommittedStyleProofExternalHandoffPacket()
  if (!hasActiveFilters(filters)) {
    if (outputMode === 'json') {
      console.log(JSON.stringify(packet))
    } else {
      console.log(formatCommittedStyleProofExternalHandoffPacketMarkdown(packet).trimEnd())
    }
    process.exit(packet.canClaimComplete ? 0 : 1)
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

  process.exit(packet.canClaimComplete ? 0 : 1)
}

main()
