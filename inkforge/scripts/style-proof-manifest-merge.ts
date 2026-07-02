#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import {
  getStyleProofManifestIntakeReport,
  getStyleProofManifestJsonIntakeReport,
  type StyleProofManifest,
  type StyleProofManifestIntakeReport,
  type StyleProofManifestIntakeStatus,
} from '../src/services/export/style-catalog.ts'

type StyleProofManifestMergeOutputMode = 'text' | 'json'
type StyleProofManifestMergeStatus = 'merge-ready' | 'merge-blocked' | 'written'
type StyleProofManifestMergeBlocker =
  | 'input-schema-error'
  | 'input-schema-warning'
  | 'merged-schema-error'
  | 'merged-schema-warning'
  | 'semantic-issue'
  | 'empty-pack'
  | 'output-exists'

interface StyleProofManifestMergeCliOptions {
  filePaths: readonly string[]
  outputPath: string | null
  force: boolean
  outputMode: StyleProofManifestMergeOutputMode
}

interface StyleProofManifestMergeIssueCount {
  id: string
  count: number
}

interface StyleProofManifestMergeSourceSummary {
  index: number
  status: StyleProofManifestIntakeStatus
  acceptedManifestCount: number
  rejectedManifestCount: number
  schemaIssueCount: number
  schemaErrorCount: number
  schemaWarningCount: number
  semanticIssueCount: number
  artifactCount: number
  canClaimComplete: boolean
}

interface StyleProofManifestMergeCliReport {
  source: 'files'
  status: StyleProofManifestMergeStatus
  exitCode: number
  sourceFileCount: number
  outputRequested: boolean
  outputWritten: boolean
  canWritePack: boolean
  canClaimComplete: boolean
  blockers: readonly StyleProofManifestMergeBlocker[]
  summary: {
    inputManifestCount: number
    acceptedManifestCount: number
    rejectedManifestCount: number
    schemaIssueCount: number
    schemaErrorCount: number
    schemaWarningCount: number
    semanticIssueCount: number
    artifactCount: number
    duplicateArtifactIdCount: number
    cannotClaimRequirements: number
    cannotClaimSteps: number
    safeToAutomateOpenSteps: number
    externalDependencyOpenSteps: number
    phoneOpenSteps: number
    mutatingOpenSteps: number
    unsafeToAutomateOpenSteps: number
  }
  issueIds: {
    schema: readonly StyleProofManifestMergeIssueCount[]
    semantic: readonly StyleProofManifestMergeIssueCount[]
  }
  sources: readonly StyleProofManifestMergeSourceSummary[]
}

interface StyleProofManifestMergeBuildInput {
  sourceReports: readonly StyleProofManifestIntakeReport[]
  mergedReport: StyleProofManifestIntakeReport
  outputRequested: boolean
  outputExists: boolean
  outputWritten: boolean
}

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:manifest-merge --file <redacted-manifest.json> [--file <...>] [--out <merged-pack.json>] [--force] [--text|--json]',
    '',
    'Reads multiple caller-supplied redacted StyleProofManifest JSON packs,',
    'merges their accepted manifest rows, and runs the local intake, acceptance',
    'audit, and execution runbook checks on the merged pack.',
    '',
    'This command never opens a browser, uploads content, syncs drafts, schedules',
    'sends, publishes articles, or claims external proof completion. It prints',
    'only sanitized counts and issue ids; it does not print input paths, output',
    'paths, raw artifact references, or account/runtime material.',
    '',
    'Exit codes:',
    '  0  Merged pack is schema-clean and semantic-clean; --out write succeeded if requested.',
    '  1  JSON parsed, but merge/write is blocked by schema, semantic, hygiene, empty-pack, or output-exists issues.',
    '  2  CLI usage, unreadable input file, or write failure.',
    '',
    'Options:',
    '  --file <path>  Read one local UTF-8 JSON manifest pack. Repeat for multiple packs.',
    '  --out <path>   Write the merged redacted { manifests: [...] } pack only when it is clean.',
    '  --force        Allow --out to overwrite an existing file.',
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

function parseCliOptions(args: readonly string[]): StyleProofManifestMergeCliOptions {
  const filePaths: string[] = []
  let outputPath: string | null = null
  let force = false
  let outputMode: StyleProofManifestMergeOutputMode = 'text'
  let sawText = false
  let sawJson = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--file') {
      const nextArg = args[index + 1]
      if (!nextArg || nextArg.startsWith('--')) failUsage('Missing value for --file.')
      filePaths.push(nextArg)
      index += 1
      continue
    }

    if (arg === '--out') {
      if (outputPath) failUsage('Choose only one --out value.')
      const nextArg = args[index + 1]
      if (!nextArg || nextArg.startsWith('--')) failUsage('Missing value for --out.')
      outputPath = nextArg
      index += 1
      continue
    }

    if (arg === '--force') {
      force = true
      continue
    }

    if (arg === '--text') {
      sawText = true
      outputMode = 'text'
      continue
    }

    if (arg === '--json') {
      sawJson = true
      outputMode = 'json'
      continue
    }

    failUsage(`Unknown option: ${arg}`)
  }

  if (filePaths.length === 0) failUsage('Missing required --file option.')
  if (sawText && sawJson) failUsage('Choose only one output mode: --text or --json.')
  if (force && !outputPath) failUsage('--force can only be used with --out.')

  return { filePaths, outputPath, force, outputMode }
}

function countIssueIds(issues: readonly { id: string }[]): readonly StyleProofManifestMergeIssueCount[] {
  const counts = new Map<string, number>()
  for (const issue of issues) {
    counts.set(issue.id, (counts.get(issue.id) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

function toSourceSummary(report: StyleProofManifestIntakeReport, index: number): StyleProofManifestMergeSourceSummary {
  return {
    index,
    status: report.status,
    acceptedManifestCount: report.summary.acceptedManifestCount,
    rejectedManifestCount: report.summary.rejectedManifestCount,
    schemaIssueCount: report.summary.schemaIssueCount,
    schemaErrorCount: report.summary.schemaErrorCount,
    schemaWarningCount: report.summary.schemaWarningCount,
    semanticIssueCount: report.summary.semanticIssueCount,
    artifactCount: report.summary.artifactCount,
    canClaimComplete: report.canClaimComplete,
  }
}

function hasSourceSchemaErrors(sourceReports: readonly StyleProofManifestIntakeReport[]): boolean {
  return sourceReports.some(report => report.summary.schemaErrorCount > 0 || report.summary.rejectedManifestCount > 0)
}

function hasSourceSchemaWarnings(sourceReports: readonly StyleProofManifestIntakeReport[]): boolean {
  return sourceReports.some(report => report.summary.schemaWarningCount > 0)
}

function getMergeBlockers(
  input: StyleProofManifestMergeBuildInput,
): readonly StyleProofManifestMergeBlocker[] {
  const blockers = new Set<StyleProofManifestMergeBlocker>()
  if (hasSourceSchemaErrors(input.sourceReports)) blockers.add('input-schema-error')
  if (hasSourceSchemaWarnings(input.sourceReports)) blockers.add('input-schema-warning')
  if (input.mergedReport.summary.schemaErrorCount > 0) blockers.add('merged-schema-error')
  if (input.mergedReport.summary.schemaWarningCount > 0) blockers.add('merged-schema-warning')
  if (input.mergedReport.summary.semanticIssueCount > 0) blockers.add('semantic-issue')
  if (input.mergedReport.summary.acceptedManifestCount === 0) blockers.add('empty-pack')
  if (input.outputRequested && input.outputExists && !input.outputWritten) blockers.add('output-exists')
  return Array.from(blockers)
}

function canWriteMergedPack(
  input: StyleProofManifestMergeBuildInput,
  blockers: readonly StyleProofManifestMergeBlocker[],
): boolean {
  return input.mergedReport.summary.acceptedManifestCount > 0 &&
    blockers.length === 0
}

function buildCliReport(input: StyleProofManifestMergeBuildInput): StyleProofManifestMergeCliReport {
  const blockers = getMergeBlockers(input)
  const canWritePack = canWriteMergedPack(input, blockers)
  const status: StyleProofManifestMergeStatus = input.outputWritten
    ? 'written'
    : canWritePack
      ? 'merge-ready'
      : 'merge-blocked'
  const exitCode = canWritePack || input.outputWritten ? 0 : 1

  return {
    source: 'files',
    status,
    exitCode,
    sourceFileCount: input.sourceReports.length,
    outputRequested: input.outputRequested,
    outputWritten: input.outputWritten,
    canWritePack,
    canClaimComplete: input.mergedReport.canClaimComplete,
    blockers,
    summary: {
      inputManifestCount: input.mergedReport.summary.inputManifestCount,
      acceptedManifestCount: input.mergedReport.summary.acceptedManifestCount,
      rejectedManifestCount: input.mergedReport.summary.rejectedManifestCount,
      schemaIssueCount: input.mergedReport.summary.schemaIssueCount,
      schemaErrorCount: input.mergedReport.summary.schemaErrorCount,
      schemaWarningCount: input.mergedReport.summary.schemaWarningCount,
      semanticIssueCount: input.mergedReport.summary.semanticIssueCount,
      artifactCount: input.mergedReport.summary.artifactCount,
      duplicateArtifactIdCount: input.mergedReport.packReport.summary.duplicateArtifactIdCount,
      cannotClaimRequirements: input.mergedReport.summary.cannotClaimRequirements,
      cannotClaimSteps: input.mergedReport.summary.cannotClaimSteps,
      safeToAutomateOpenSteps: input.mergedReport.summary.safeToAutomateOpenSteps,
      externalDependencyOpenSteps: input.mergedReport.summary.externalDependencyOpenSteps,
      phoneOpenSteps: input.mergedReport.summary.phoneOpenSteps,
      mutatingOpenSteps: input.mergedReport.summary.mutatingOpenSteps,
      unsafeToAutomateOpenSteps: input.mergedReport.summary.unsafeToAutomateOpenSteps,
    },
    issueIds: {
      schema: countIssueIds([
        ...input.sourceReports.flatMap(report => report.schemaIssues),
        ...input.mergedReport.schemaIssues,
      ]),
      semantic: countIssueIds(input.mergedReport.packReport.issues),
    },
    sources: input.sourceReports.map((report, index) => toSourceSummary(report, index)),
  }
}

function formatBoolean(value: boolean): 'true' | 'false' {
  return value ? 'true' : 'false'
}

function formatIssueCounts(issueCounts: readonly StyleProofManifestMergeIssueCount[]): readonly string[] {
  if (issueCounts.length === 0) return ['- none']
  return issueCounts.map(issue => `- ${issue.id}: ${issue.count}`)
}

function formatBlockers(blockers: readonly StyleProofManifestMergeBlocker[]): string {
  return blockers.length > 0 ? blockers.join(', ') : 'none'
}

function formatCliReportText(report: StyleProofManifestMergeCliReport): string {
  return [
    'InkForge style-proof manifest merge',
    `source: ${report.source}`,
    `status: ${report.status}`,
    `exitCode: ${report.exitCode}`,
    `sourceFileCount: ${report.sourceFileCount}`,
    `outputRequested: ${formatBoolean(report.outputRequested)}`,
    `outputWritten: ${formatBoolean(report.outputWritten)}`,
    `canWritePack: ${formatBoolean(report.canWritePack)}`,
    `canClaimComplete: ${formatBoolean(report.canClaimComplete)}`,
    `blockers: ${formatBlockers(report.blockers)}`,
    `inputManifestCount: ${report.summary.inputManifestCount}`,
    `acceptedManifestCount: ${report.summary.acceptedManifestCount}`,
    `rejectedManifestCount: ${report.summary.rejectedManifestCount}`,
    `schemaIssueCount: ${report.summary.schemaIssueCount}`,
    `schemaErrorCount: ${report.summary.schemaErrorCount}`,
    `schemaWarningCount: ${report.summary.schemaWarningCount}`,
    `semanticIssueCount: ${report.summary.semanticIssueCount}`,
    `artifactCount: ${report.summary.artifactCount}`,
    `duplicateArtifactIdCount: ${report.summary.duplicateArtifactIdCount}`,
    `cannotClaimRequirements: ${report.summary.cannotClaimRequirements}`,
    `cannotClaimSteps: ${report.summary.cannotClaimSteps}`,
    `safeToAutomateOpenSteps: ${report.summary.safeToAutomateOpenSteps}`,
    `externalDependencyOpenSteps: ${report.summary.externalDependencyOpenSteps}`,
    `phoneOpenSteps: ${report.summary.phoneOpenSteps}`,
    `mutatingOpenSteps: ${report.summary.mutatingOpenSteps}`,
    `unsafeToAutomateOpenSteps: ${report.summary.unsafeToAutomateOpenSteps}`,
    '',
    'sources:',
    ...report.sources.map(source =>
      `- #${source.index}: status=${source.status} accepted=${source.acceptedManifestCount} ` +
      `rejected=${source.rejectedManifestCount} schemaErrors=${source.schemaErrorCount} ` +
      `schemaWarnings=${source.schemaWarningCount} semanticIssues=${source.semanticIssueCount} ` +
      `artifacts=${source.artifactCount} canClaim=${formatBoolean(source.canClaimComplete)}`
    ),
    '',
    'schema issue ids:',
    ...formatIssueCounts(report.issueIds.schema),
    '',
    'semantic issue ids:',
    ...formatIssueCounts(report.issueIds.semantic),
    '',
    'boundary: sanitized local merge only; raw manifest paths, output paths, artifact references, browser profiles, cookies, tokens, HAR files, QR payloads, account screenshots, draft URLs, and publish URLs are not printed.',
  ].join('\n')
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readSourceReports(filePaths: readonly string[]): Promise<readonly StyleProofManifestIntakeReport[]> {
  const reports: StyleProofManifestIntakeReport[] = []
  for (const filePath of filePaths) {
    let jsonText = ''
    try {
      jsonText = await readFile(filePath, 'utf8')
    } catch {
      console.error('Unable to read one manifest JSON file. Check every --file value points to a local UTF-8 JSON document.')
      process.exit(2)
    }
    reports.push(getStyleProofManifestJsonIntakeReport(jsonText))
  }

  return reports
}

function mergeAcceptedManifests(sourceReports: readonly StyleProofManifestIntakeReport[]): readonly StyleProofManifest[] {
  return sourceReports.flatMap(report => report.manifests)
}

async function writeMergedPack(outputPath: string, manifests: readonly StyleProofManifest[]): Promise<void> {
  try {
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify({ manifests }, null, 2)}\n`, 'utf8')
  } catch {
    console.error('Unable to write merged manifest pack. Check the --out destination and permissions.')
    process.exit(2)
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const options = parseCliOptions(args)
  const sourceReports = await readSourceReports(options.filePaths)
  const manifests = mergeAcceptedManifests(sourceReports)
  const mergedReport = getStyleProofManifestIntakeReport({ manifests })
  const outputRequested = typeof options.outputPath === 'string'
  const outputExists = outputRequested ? await pathExists(options.outputPath as string) : false

  let outputWritten = false
  let cliReport = buildCliReport({
    sourceReports,
    mergedReport,
    outputRequested,
    outputExists: outputExists && !options.force,
    outputWritten,
  })

  if (outputRequested && cliReport.canWritePack) {
    await writeMergedPack(options.outputPath as string, manifests)
    outputWritten = true
    cliReport = buildCliReport({
      sourceReports,
      mergedReport,
      outputRequested,
      outputExists: false,
      outputWritten,
    })
  }

  if (options.outputMode === 'json') {
    console.log(JSON.stringify(cliReport))
  } else {
    console.log(formatCliReportText(cliReport))
  }

  process.exit(cliReport.exitCode)
}

void main()
