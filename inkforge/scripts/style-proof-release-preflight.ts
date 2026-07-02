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
    nextRows: handoffPacket.nextRowRefs.map(ref => ({
      id: ref.row.id,
      kind: ref.kind,
      platform: ref.row.platform,
      choiceIds: ref.row.choiceIds,
      requirementId: ref.row.requirementId,
      requirementLabel: ref.row.requirementLabel,
      gate: ref.row.gate,
      boundary: ref.row.boundary,
      status: ref.row.status,
      blockerKinds: ref.row.blockerKinds,
      issueIds: ref.row.issueIds,
      freshnessIssueIds: ref.row.freshnessIssueIds,
      required: ref.row.required,
      satisfied: ref.row.satisfied,
      missing: ref.row.missing,
      invalid: ref.row.invalid,
      artifactCount: ref.row.artifactCount,
      acceptedArtifactCount: ref.row.acceptedArtifactCount,
      mutatesPlatform: ref.row.mutatesPlatform,
      requiresExternalAccount: ref.row.requiresExternalAccount,
      requiresPhone: ref.row.requiresPhone,
      safeToAutomate: ref.row.safeToAutomate,
      cannotClaim: ref.row.cannotClaim,
      cannotClaimReason: ref.row.cannotClaimReason,
      nextOperatorAction: ref.row.nextOperatorAction,
    })),
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
    'next operator rows:',
    ...result.nextRows.map(row =>
      `- ${row.kind}: ${row.platform}/${row.requirementId}/${row.boundary} ` +
      `status=${row.status} phone=${row.requiresPhone ? 'yes' : 'no'} ` +
      `account=${row.requiresExternalAccount ? 'yes' : 'no'} ` +
      `mutates=${row.mutatesPlatform ? 'yes' : 'no'} safe=${row.safeToAutomate ? 'yes' : 'no'} ` +
      `cannotClaim=${row.cannotClaim ? 'yes' : 'no'} ` +
      `issues=${row.issueIds.length > 0 ? row.issueIds.join('|') : 'none'} ` +
      `reason=${row.cannotClaimReason ?? 'none'} ` +
      `next=${row.nextOperatorAction}`
    ),
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
