#!/usr/bin/env node

import {
  getCommittedStyleProofEvidenceReleaseGateReport,
  getCommittedStyleProofExternalHandoffPacket,
  type CommittedStyleProofExternalHandoffNextRowKind,
  type CommittedStyleProofReleaseGateBlockerKind,
  type CommittedStyleProofReleaseGateStatus,
  type StyleProofManifestIssueId,
  type StyleProofCollectionGate,
  type StyleProofExecutionBoundary,
  type StyleProofRequirementId,
} from '../src/services/export/style-catalog.ts'
import type { Platform } from '../src/services/export/types.ts'

interface StyleProofReleasePreflightNextRow {
  id: string
  kind: CommittedStyleProofExternalHandoffNextRowKind
  refKinds: readonly CommittedStyleProofExternalHandoffNextRowKind[]
  commands: StyleProofReleasePreflightNextRowCommands
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

interface StyleProofReleasePreflightNextRowCommands {
  template: string
  manifestDrafts: string
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
}, kind: CommittedStyleProofExternalHandoffNextRowKind): readonly string[] {
  const issueId = getPrimaryIssueFilter(row)
  const args = [
    `--platform=${row.platform}`,
    `--kind=${kind}`,
    `--status=${row.status}`,
  ]

  if (issueId) {
    args.push(`--issue=${issueId}`)
  }

  args.push('--next-only')
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
): string {
  return [
    'pnpm --silent -C inkforge style-proof:external-handoff',
    mode,
    ...getExternalHandoffFilterArgs(row, kind),
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
    template: buildExternalHandoffCommand('--template', row, kind),
    manifestDrafts: buildExternalHandoffCommand('--manifest-drafts', row, kind),
    intake: 'pnpm --silent -C inkforge style-proof:manifest-intake --file REDACTED_MANIFEST.json --json',
    merge: 'pnpm --silent -C inkforge style-proof:manifest-merge --file REDACTED_MANIFEST.json --json',
  }
}

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:release-preflight [--json]',
    '',
    'Reads the committed InkForge style-proof release gate and exits non-zero',
    'unless every local, phone, account, public-host, sync, scheduled-send,',
    'upload, preview, and publish proof gate is complete.',
    '',
    'Options:',
    '  --json   Print a compact JSON report.',
    '  --help   Print this help.',
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
      externalHandoffRows: handoffPacket.summary.externalHandoffRows,
      safeExternalRows: handoffPacket.summary.safeExternalRows,
      actionableLocalRows: handoffPacket.summary.actionableLocalRows,
      nextRowRefs: handoffPacket.nextRowRefs.length,
      uniqueNextRows: handoffPacket.nextRows.length,
    },
    nextRows: handoffPacket.nextRows.map(row => {
      const refKinds = getPreflightNextRowRefKinds(row.id, handoffPacket.nextRowRefs)
      const kind = refKinds[0] ?? 'external-account'

      return {
        id: row.id,
        kind,
        refKinds,
        commands: buildPreflightNextRowCommands(row, kind),
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
    'operator commands (copy-safe placeholders):',
    ...result.nextRows.flatMap(row => [
      `- ${row.platform}/${row.requirementId}/${row.boundary}`,
      `  template: ${row.commands.template}`,
      `  manifestDrafts: ${row.commands.manifestDrafts}`,
      `  intake: ${row.commands.intake}`,
      `  merge: ${row.commands.merge}`,
    ]),
  ]

  if (!result.canClaimComplete) {
    lines.push(
      '',
      'release claim blocked: external phone/account/public-host/platform proof gates remain open.',
      'Do not claim WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, platform preview, upload, public rendering, or publish success from local-only checks.',
    )
  }

  return lines.join('\n')
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const unknownArgs = args.filter(arg => arg !== '--json')
  if (unknownArgs.length > 0) {
    console.error(`Unknown option: ${unknownArgs.join(', ')}`)
    printHelp()
    process.exit(2)
  }

  const result = buildPreflightResult()
  if (args.includes('--json')) {
    console.log(JSON.stringify(result))
  } else {
    console.log(formatPreflightResult(result))
  }

  process.exit(result.canClaimComplete ? 0 : 1)
}

main()
