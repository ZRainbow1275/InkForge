#!/usr/bin/env node

import { readFile } from 'node:fs/promises'

import {
  getStyleProofManifestJsonIntakeReport,
  type StyleProofAcceptanceAuditStatus,
  type StyleProofCollectionGate,
  type StyleProofManifestIntakeReport,
  type StyleProofManifestIntakeStatus,
  type StyleProofManifestIssueId,
  type StyleProofRequirementId,
} from '../src/services/export/style-catalog.ts'
import type { Platform } from '../src/services/export/types.ts'

const STYLE_PROOF_MANIFEST_INTAKE_PLATFORMS = [
  'wechat',
  'xiaohongshu',
  'zhihu',
] as const satisfies readonly Platform[]

type StyleProofManifestIntakeOutputMode = 'text' | 'json'

interface StyleProofManifestIntakeCliOptions {
  filePath: string
  outputMode: StyleProofManifestIntakeOutputMode
}

interface StyleProofManifestIntakeIssueCount {
  id: string
  count: number
}

interface StyleProofManifestIntakePlatformSummary {
  platform: Platform
  completedRequirements: number
  cannotClaimRequirements: number
  blockedByExternalRequirements: number
  unsafeToAutomateRequirements: number
  safeToAutomateOpenRequirements: number
  nextLocalSafeGate: StyleProofCollectionGate | null
  nextPhoneGate: StyleProofCollectionGate | null
  nextExternalAccountGate: StyleProofCollectionGate | null
  nextUnsafeToAutomateGate: StyleProofCollectionGate | null
}

interface StyleProofManifestIntakeCannotClaimRow {
  platform: Platform
  requirementId: StyleProofRequirementId
  gate: StyleProofCollectionGate
  status: StyleProofAcceptanceAuditStatus
  issueIds: readonly StyleProofManifestIssueId[]
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
}

interface StyleProofManifestIntakeCliReport {
  source: 'file'
  status: StyleProofManifestIntakeStatus
  canClaimComplete: boolean
  exitCode: number
  summary: StyleProofManifestIntakeReport['summary'] & {
    completedRequirements: number
    openGates: number
    duplicateArtifactIdCount: number
  }
  issueIds: {
    schema: readonly StyleProofManifestIntakeIssueCount[]
    semantic: readonly StyleProofManifestIntakeIssueCount[]
  }
  platforms: readonly StyleProofManifestIntakePlatformSummary[]
  cannotClaimRows: readonly StyleProofManifestIntakeCannotClaimRow[]
}

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:manifest-intake --file <redacted-manifest.json> [--text|--json]',
    '',
    'Reads a caller-supplied redacted StyleProofManifest JSON pack and runs the',
    'local style-proof intake, acceptance audit, and execution runbook checks.',
    '',
    'This command is read-only. It does not create artifacts, import proof,',
    'mutate committed manifests, open a browser, sync drafts, upload content,',
    'schedule sends, or publish articles. It also does not print the input path',
    'or raw artifact references.',
    '',
    'Exit codes:',
    '  0  Supplied manifest pack can claim complete.',
    '  1  JSON parsed, but proof is still incomplete or cannot be claimed.',
    '  2  CLI usage, file-read, or schema/JSON intake error.',
    '',
    'Options:',
    '  --file <path>  Read a local UTF-8 JSON manifest pack.',
    '  --text         Print a sanitized human summary. This is the default.',
    '  --json         Print a sanitized JSON summary.',
    '  --help         Print this help.',
  ].join('\n'))
}

function failUsage(message: string): never {
  console.error(message)
  printHelp()
  process.exit(2)
}

function parseCliOptions(args: readonly string[]): StyleProofManifestIntakeCliOptions {
  let filePath: string | null = null
  let outputMode: StyleProofManifestIntakeOutputMode = 'text'

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--file') {
      if (filePath) failUsage('Choose only one --file value.')
      const nextArg = args[index + 1]
      if (!nextArg || nextArg.startsWith('--')) {
        failUsage('Missing value for --file.')
      }
      filePath = nextArg
      index += 1
      continue
    }

    if (arg === '--text') {
      if (outputMode === 'json') failUsage('Choose only one output mode: --text or --json.')
      outputMode = 'text'
      continue
    }

    if (arg === '--json') {
      if (outputMode === 'text' && args.includes('--text')) {
        failUsage('Choose only one output mode: --text or --json.')
      }
      outputMode = 'json'
      continue
    }

    failUsage(`Unknown option: ${arg}`)
  }

  if (!filePath) failUsage('Missing required --file option.')

  return { filePath, outputMode }
}

function getCliExitCode(report: StyleProofManifestIntakeReport): number {
  if (report.status === 'schema-invalid') return 2
  return report.canClaimComplete ? 0 : 1
}

function countIssueIds(issues: readonly { id: string }[]): readonly StyleProofManifestIntakeIssueCount[] {
  const counts = new Map<string, number>()
  for (const issue of issues) {
    counts.set(issue.id, (counts.get(issue.id) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

function toPlatformSummary(
  report: StyleProofManifestIntakeReport,
  platform: Platform,
): StyleProofManifestIntakePlatformSummary {
  const platformReport = report.acceptanceAudit.platformReports[platform]

  return {
    platform,
    completedRequirements: platformReport.summary.completedRequirements,
    cannotClaimRequirements: platformReport.summary.cannotClaimRequirements,
    blockedByExternalRequirements: platformReport.summary.blockedByExternalRequirements,
    unsafeToAutomateRequirements: platformReport.summary.unsafeToAutomateRequirements,
    safeToAutomateOpenRequirements: platformReport.summary.safeToAutomateOpenRequirements,
    nextLocalSafeGate: platformReport.nextLocalSafeAction?.gate ?? null,
    nextPhoneGate: platformReport.nextPhoneAction?.gate ?? null,
    nextExternalAccountGate: platformReport.nextExternalAccountAction?.gate ?? null,
    nextUnsafeToAutomateGate: platformReport.nextUnsafeToAutomateAction?.gate ?? null,
  }
}

function toCannotClaimRows(report: StyleProofManifestIntakeReport): readonly StyleProofManifestIntakeCannotClaimRow[] {
  return STYLE_PROOF_MANIFEST_INTAKE_PLATFORMS.flatMap(platform =>
    report.acceptanceAudit.platformReports[platform].cannotClaim.map(row => ({
      platform,
      requirementId: row.requirement.id,
      gate: row.gate,
      status: row.status,
      issueIds: row.issueIds,
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
    })),
  )
}

function buildCliReport(report: StyleProofManifestIntakeReport): StyleProofManifestIntakeCliReport {
  return {
    source: 'file',
    status: report.status,
    canClaimComplete: report.canClaimComplete,
    exitCode: getCliExitCode(report),
    summary: {
      ...report.summary,
      completedRequirements: report.acceptanceAudit.summary.completedRequirements,
      openGates: report.acceptanceAudit.summary.openGates,
      duplicateArtifactIdCount: report.acceptanceAudit.summary.duplicateArtifactIdCount,
    },
    issueIds: {
      schema: countIssueIds(report.schemaIssues),
      semantic: countIssueIds(report.packReport.issues),
    },
    platforms: STYLE_PROOF_MANIFEST_INTAKE_PLATFORMS.map(platform => toPlatformSummary(report, platform)),
    cannotClaimRows: toCannotClaimRows(report),
  }
}

function formatBoolean(value: boolean): 'true' | 'false' {
  return value ? 'true' : 'false'
}

function formatIssueCounts(issueCounts: readonly StyleProofManifestIntakeIssueCount[]): readonly string[] {
  if (issueCounts.length === 0) return ['- none']
  return issueCounts.map(issue => `- ${issue.id}: ${issue.count}`)
}

function formatCannotClaimRows(rows: readonly StyleProofManifestIntakeCannotClaimRow[]): readonly string[] {
  if (rows.length === 0) return ['- none']
  return rows.map(row =>
    `- ${row.platform}/${row.requirementId}/${row.gate} ` +
    `status=${row.status} issues=${row.issueIds.length > 0 ? row.issueIds.join('|') : 'none'} ` +
    `required=${row.required} satisfied=${row.satisfied} missing=${row.missing} invalid=${row.invalid} ` +
    `artifacts=${row.artifactCount} accepted=${row.acceptedArtifactCount} ` +
    `phone=${row.requiresPhone ? 'yes' : 'no'} account=${row.requiresExternalAccount ? 'yes' : 'no'} ` +
    `mutates=${row.mutatesPlatform ? 'yes' : 'no'} safe=${row.safeToAutomate ? 'yes' : 'no'}`
  )
}

function formatCliReportText(report: StyleProofManifestIntakeCliReport): string {
  return [
    'InkForge style-proof manifest intake',
    `source: ${report.source}`,
    `status: ${report.status}`,
    `canClaimComplete: ${formatBoolean(report.canClaimComplete)}`,
    `exitCode: ${report.exitCode}`,
    `inputManifestCount: ${report.summary.inputManifestCount}`,
    `acceptedManifestCount: ${report.summary.acceptedManifestCount}`,
    `rejectedManifestCount: ${report.summary.rejectedManifestCount}`,
    `schemaIssueCount: ${report.summary.schemaIssueCount}`,
    `schemaErrorCount: ${report.summary.schemaErrorCount}`,
    `schemaWarningCount: ${report.summary.schemaWarningCount}`,
    `semanticIssueCount: ${report.summary.semanticIssueCount}`,
    `artifactCount: ${report.summary.artifactCount}`,
    `cannotClaimRequirements: ${report.summary.cannotClaimRequirements}`,
    `cannotClaimSteps: ${report.summary.cannotClaimSteps}`,
    `safeToAutomateOpenSteps: ${report.summary.safeToAutomateOpenSteps}`,
    `externalDependencyOpenSteps: ${report.summary.externalDependencyOpenSteps}`,
    `phoneOpenSteps: ${report.summary.phoneOpenSteps}`,
    `mutatingOpenSteps: ${report.summary.mutatingOpenSteps}`,
    `unsafeToAutomateOpenSteps: ${report.summary.unsafeToAutomateOpenSteps}`,
    '',
    'platforms:',
    ...report.platforms.map(platform =>
      `- ${platform.platform}: completed=${platform.completedRequirements} ` +
      `cannotClaim=${platform.cannotClaimRequirements} blockedExternal=${platform.blockedByExternalRequirements} ` +
      `unsafe=${platform.unsafeToAutomateRequirements} safeOpen=${platform.safeToAutomateOpenRequirements} ` +
      `nextLocal=${platform.nextLocalSafeGate ?? 'none'} nextPhone=${platform.nextPhoneGate ?? 'none'} ` +
      `nextExternal=${platform.nextExternalAccountGate ?? 'none'} nextUnsafe=${platform.nextUnsafeToAutomateGate ?? 'none'}`
    ),
    '',
    'schema issue ids:',
    ...formatIssueCounts(report.issueIds.schema),
    '',
    'semantic issue ids:',
    ...formatIssueCounts(report.issueIds.semantic),
    '',
    'cannot claim rows:',
    ...formatCannotClaimRows(report.cannotClaimRows),
    '',
    'boundary: sanitized local intake only; raw manifest paths, artifact references, browser profiles, cookies, tokens, HAR files, QR payloads, account screenshots, draft URLs, and publish URLs are not printed.',
  ].join('\n')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const options = parseCliOptions(args)
  let jsonText = ''
  try {
    jsonText = await readFile(options.filePath, 'utf8')
  } catch {
    console.error('Unable to read manifest JSON file. Check that --file points to a local UTF-8 JSON document.')
    process.exit(2)
  }

  const intakeReport = getStyleProofManifestJsonIntakeReport(jsonText)
  const cliReport = buildCliReport(intakeReport)

  if (options.outputMode === 'json') {
    console.log(JSON.stringify(cliReport))
  } else {
    console.log(formatCliReportText(cliReport))
  }

  process.exit(cliReport.exitCode)
}

void main()
