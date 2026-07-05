#!/usr/bin/env node

import { execFile, type ExecFileException } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type ApplicationAcceptanceStatus =
  | 'application-acceptance-ready'
  | 'application-acceptance-blocked'

interface CliRunResult {
  exitCode: number
  stdout: string
  stderr: string
}

interface ApplicationPreflightJsonReport {
  scope: 'application'
  status: 'application-ready' | 'application-blocked'
  applicationGalleryStatus: 'application-gallery-ready' | 'application-gallery-blocked'
  canClaimApplicationReady: boolean
  canClaimReleaseComplete: boolean
  summary: {
    svgModuleCount: number
    renderedModulePersonaPairs: number
    applicationGalleryRenderedModulePersonaPairs: number
    applicationIssueCount?: number
    applicationGalleryIssueCount: number
    wechatApplicationSvgSlotFailureCount: number
    wechatApplicationSurfaceFailureCount: number
    wechatExportPipelineFailureCount: number
    wechatOptionInjectionFailureCount: number
    usableButUnselectableWechatChoices: number
    actionableLocalRows: number
  }
  moduleIssues: readonly unknown[]
  applicationGalleryIssues: readonly unknown[]
  wechatApplicationSlotIssues: readonly unknown[]
  wechatApplicationSurfaceIssues: readonly unknown[]
  wechatExportPipelineIssues: readonly unknown[]
  wechatOptionIssues: readonly unknown[]
  choiceIssues: readonly unknown[]
  externalProof: {
    requiresManualWeChatProof: boolean
    xhsZhihuPublishAutomationDeferred: true
  }
}

interface ApplicationGalleryJsonReport {
  notProof: true
  scope: 'application-gallery'
  status: 'application-gallery-ready' | 'application-gallery-blocked'
  summary: {
    svgModuleCount: number
    renderedModulePersonaPairs: number
    wechatSafeViolationCount: number
    moduleSentinelFailureCount: number
  }
  issues: readonly unknown[]
}

interface StrictReleaseJsonReport {
  canClaimComplete: boolean
  status: string
  summary: {
    releaseBlockingOpenSteps: number
    nextRowRefs: number
    uniqueNextRows: number
  }
}

interface ApplicationAcceptanceCheck {
  id: 'application-preflight' | 'application-gallery' | 'wechat-manual-checklist' | 'strict-release-boundary'
  passed: boolean
  exitCode: number
  status: string
  command: string
}

interface ApplicationAcceptanceReport {
  notProof: true
  scope: 'application-acceptance'
  status: ApplicationAcceptanceStatus
  canClaimApplicationReady: boolean
  canClaimReleaseComplete: boolean
  summary: {
    applicationPreflightExitCode: number
    applicationGalleryExitCode: number
    wechatManualChecklistExitCode: number
    strictReleaseExitCode: number
    svgModuleCount: number
    renderedModulePersonaPairs: number
    applicationGalleryRenderedModulePersonaPairs: number
    applicationIssueCount: number
    galleryIssueCount: number
    strictReleaseBoundaryPreserved: boolean
  }
  checks: readonly ApplicationAcceptanceCheck[]
  issues: readonly string[]
  boundary: {
    xhsZhihuPublishAutomationDeferred: true
    requiresManualWeChatProof: boolean
  }
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const releasePreflightScriptPath = resolve(projectRoot, 'scripts', 'style-proof-release-preflight.ts')
const galleryScriptPath = resolve(projectRoot, 'scripts', 'style-proof-application-gallery.ts')
const externalHandoffScriptPath = resolve(projectRoot, 'scripts', 'style-proof-external-handoff.ts')

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:application-acceptance [--json]',
    '',
    'Runs the current local InkForge application acceptance gate:',
    '- application preflight;',
    '- application SVG gallery readiness;',
    '- WeChat manual proof checklist readiness;',
    '- strict release boundary preservation.',
    '',
    'This command is read-only except for a temporary gallery file that is removed before exit.',
    'It does not open a browser, paste into WeChat, upload, sync, schedule, publish,',
    'or create phone/account proof.',
    '',
    'Options:',
    '  --json        Print a compact JSON report.',
    '  --help        Print this help.',
  ].join('\n'))
}

function getCliEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      environment[key] = value
    }
  }

  environment.FORCE_COLOR = '0'
  environment.NO_COLOR = '1'

  return environment
}

function toCliText(value: string | Buffer): string {
  return Buffer.isBuffer(value) ? value.toString('utf8') : value
}

function getExitCode(error: ExecFileException | null): number {
  if (!error) {
    return 0
  }

  if (typeof error.code === 'number') {
    return error.code
  }

  if (typeof error.code === 'string') {
    const parsedCode = Number.parseInt(error.code, 10)
    if (Number.isFinite(parsedCode)) {
      return parsedCode
    }
  }

  return 1
}

function runTsxScript(scriptPath: string, args: readonly string[]): Promise<CliRunResult> {
  return new Promise(resolveResult => {
    execFile(
      process.execPath,
      [tsxCliPath, scriptPath, ...args],
      {
        cwd: projectRoot,
        env: getCliEnvironment(),
        maxBuffer: 1024 * 1024 * 16,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        resolveResult({
          exitCode: getExitCode(error),
          stdout: toCliText(stdout),
          stderr: toCliText(stderr),
        })
      },
    )
  })
}

function parseJsonOutput<T>(result: CliRunResult): T | null {
  try {
    return JSON.parse(result.stdout.replace(/^\uFEFF+/, '')) as T
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasNumberKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every(key => typeof value[key] === 'number')
}

function hasArrayKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every(key => Array.isArray(value[key]))
}

function isApplicationPreflightSummary(value: unknown): value is ApplicationPreflightJsonReport['summary'] {
  return isRecord(value) &&
    hasNumberKeys(value, [
      'svgModuleCount',
      'renderedModulePersonaPairs',
      'applicationGalleryRenderedModulePersonaPairs',
      'applicationGalleryIssueCount',
      'wechatApplicationSvgSlotFailureCount',
      'wechatApplicationSurfaceFailureCount',
      'wechatExportPipelineFailureCount',
      'wechatOptionInjectionFailureCount',
      'usableButUnselectableWechatChoices',
      'actionableLocalRows',
    ]) &&
    (value.applicationIssueCount === undefined || typeof value.applicationIssueCount === 'number')
}

function isApplicationPreflightExternalProof(value: unknown): value is ApplicationPreflightJsonReport['externalProof'] {
  return isRecord(value) &&
    typeof value.requiresManualWeChatProof === 'boolean' &&
    value.xhsZhihuPublishAutomationDeferred === true
}

function isApplicationGallerySummary(value: unknown): value is ApplicationGalleryJsonReport['summary'] {
  return isRecord(value) &&
    hasNumberKeys(value, [
      'svgModuleCount',
      'renderedModulePersonaPairs',
      'wechatSafeViolationCount',
      'moduleSentinelFailureCount',
    ])
}

function isApplicationPreflightReport(value: unknown): value is ApplicationPreflightJsonReport {
  return isRecord(value) &&
    value.scope === 'application' &&
    (value.status === 'application-ready' || value.status === 'application-blocked') &&
    (value.applicationGalleryStatus === 'application-gallery-ready' ||
      value.applicationGalleryStatus === 'application-gallery-blocked') &&
    typeof value.canClaimApplicationReady === 'boolean' &&
    typeof value.canClaimReleaseComplete === 'boolean' &&
    isApplicationPreflightSummary(value.summary) &&
    hasArrayKeys(value, [
      'moduleIssues',
      'applicationGalleryIssues',
      'wechatApplicationSlotIssues',
      'wechatApplicationSurfaceIssues',
      'wechatExportPipelineIssues',
      'wechatOptionIssues',
      'choiceIssues',
    ]) &&
    isApplicationPreflightExternalProof(value.externalProof)
}

function isApplicationGalleryReport(value: unknown): value is ApplicationGalleryJsonReport {
  return isRecord(value) &&
    value.notProof === true &&
    value.scope === 'application-gallery' &&
    (value.status === 'application-gallery-ready' || value.status === 'application-gallery-blocked') &&
    isApplicationGallerySummary(value.summary) &&
    Array.isArray(value.issues)
}

function isStrictReleaseReport(value: unknown): value is StrictReleaseJsonReport {
  return isRecord(value) &&
    typeof value.canClaimComplete === 'boolean' &&
    typeof value.status === 'string' &&
    isRecord(value.summary) &&
    hasNumberKeys(value.summary, ['releaseBlockingOpenSteps', 'nextRowRefs', 'uniqueNextRows'])
}

function getApplicationIssueCount(report: ApplicationPreflightJsonReport | null): number {
  if (!report) {
    return 1
  }

  return report.moduleIssues.length +
    report.applicationGalleryIssues.length +
    report.wechatApplicationSlotIssues.length +
    report.wechatApplicationSurfaceIssues.length +
    report.wechatExportPipelineIssues.length +
    report.wechatOptionIssues.length +
    report.choiceIssues.length
}

function isWechatManualChecklistReady(result: CliRunResult): boolean {
  return result.exitCode === 0 &&
    result.stderr.trim() === '' &&
    result.stdout.includes('# WeChat Manual Style Proof Checklist') &&
    result.stdout.includes('- notProof: true') &&
    result.stdout.includes('- canClaimComplete: false') &&
    result.stdout.includes('cover-thumbnail-check') &&
    result.stdout.includes('credentialed-channel-response') &&
    !result.stdout.includes('"canClaimComplete":true') &&
    !result.stdout.includes('"artifacts":[{')
}

function formatApplicationAcceptanceReportText(report: ApplicationAcceptanceReport): string {
  const lines = [
    'InkForge style-proof application acceptance',
    `scope: ${report.scope}`,
    `status: ${report.status}`,
    `applicationReady: ${report.canClaimApplicationReady ? 'true' : 'false'}`,
    `canClaimReleaseComplete: ${report.canClaimReleaseComplete ? 'true' : 'false'}`,
    `applicationPreflightExitCode: ${report.summary.applicationPreflightExitCode}`,
    `applicationGalleryExitCode: ${report.summary.applicationGalleryExitCode}`,
    `wechatManualChecklistExitCode: ${report.summary.wechatManualChecklistExitCode}`,
    `strictReleaseExitCode: ${report.summary.strictReleaseExitCode}`,
    `svgModuleCount: ${report.summary.svgModuleCount}`,
    `renderedModulePersonaPairs: ${report.summary.renderedModulePersonaPairs}`,
    `applicationGalleryRenderedModulePersonaPairs: ${report.summary.applicationGalleryRenderedModulePersonaPairs}`,
    `applicationIssueCount: ${report.summary.applicationIssueCount}`,
    `galleryIssueCount: ${report.summary.galleryIssueCount}`,
    `strictReleaseBoundaryPreserved: ${report.summary.strictReleaseBoundaryPreserved ? 'true' : 'false'}`,
    '',
    'checks:',
    ...report.checks.map(check =>
      `- ${check.id}: ${check.passed ? 'pass' : 'fail'}; exit=${check.exitCode}; status=${check.status}; command=${check.command}`
    ),
    '',
    'issues:',
    ...(report.issues.length > 0 ? report.issues.map(issue => `- ${issue}`) : ['- none']),
    '',
    'boundary:',
    `- requiresManualWeChatProof: ${report.boundary.requiresManualWeChatProof ? 'true' : 'false'}`,
    `- xhsZhihuPublishAutomationDeferred: ${report.boundary.xhsZhihuPublishAutomationDeferred ? 'true' : 'false'}`,
    '- This is local application acceptance only; it does not prove platform paste, phone preview, sync, schedule, public rendering, or publish success.',
  ]

  return lines.join('\n')
}

async function buildApplicationAcceptanceReport(): Promise<ApplicationAcceptanceReport> {
  const tempDir = await mkdtemp(resolve(tmpdir(), 'inkforge-application-acceptance-'))
  const galleryOutputPath = resolve(tempDir, 'application-gallery.html')

  try {
    const applicationPreflightResult = await runTsxScript(
      releasePreflightScriptPath,
      ['--scope=application', '--json'],
    )
    const applicationGalleryResult = await runTsxScript(
      galleryScriptPath,
      ['--json', '--out', galleryOutputPath],
    )
    const wechatManualChecklistResult = await runTsxScript(
      externalHandoffScriptPath,
      ['--checklist', '--platform=wechat', '--next-only', '--handoff-ok-exit-zero'],
    )
    const strictReleaseResult = await runTsxScript(releasePreflightScriptPath, ['--json'])

    const applicationPreflightJson = parseJsonOutput<unknown>(applicationPreflightResult)
    const applicationGalleryJson = parseJsonOutput<unknown>(applicationGalleryResult)
    const strictReleaseJson = parseJsonOutput<unknown>(strictReleaseResult)

    const applicationPreflight = isApplicationPreflightReport(applicationPreflightJson)
      ? applicationPreflightJson
      : null
    const applicationGallery = isApplicationGalleryReport(applicationGalleryJson)
      ? applicationGalleryJson
      : null
    const strictRelease = isStrictReleaseReport(strictReleaseJson)
      ? strictReleaseJson
      : null

    const applicationIssueCount = getApplicationIssueCount(applicationPreflight)
    const galleryIssueCount = applicationGallery?.issues.length ?? 1
    const wechatManualChecklistReady = isWechatManualChecklistReady(wechatManualChecklistResult)
    const strictReleaseBoundaryPreserved = strictReleaseResult.exitCode !== 0 &&
      strictRelease?.canClaimComplete === false &&
      strictRelease.status === 'blocked-by-external'

    const checks: ApplicationAcceptanceCheck[] = [
      {
        id: 'application-preflight',
        passed: applicationPreflightResult.exitCode === 0 &&
          applicationPreflight?.status === 'application-ready' &&
          applicationPreflight.canClaimApplicationReady === true &&
          applicationIssueCount === 0,
        exitCode: applicationPreflightResult.exitCode,
        status: applicationPreflight?.status ?? 'invalid-json',
        command: 'style-proof:application-preflight --json',
      },
      {
        id: 'application-gallery',
        passed: applicationGalleryResult.exitCode === 0 &&
          applicationGallery?.status === 'application-gallery-ready' &&
          galleryIssueCount === 0,
        exitCode: applicationGalleryResult.exitCode,
        status: applicationGallery?.status ?? 'invalid-json',
        command: 'style-proof:application-gallery --json --out <temporary>',
      },
      {
        id: 'wechat-manual-checklist',
        passed: wechatManualChecklistReady,
        exitCode: wechatManualChecklistResult.exitCode,
        status: wechatManualChecklistReady ? 'manual-checklist-ready' : 'manual-checklist-invalid',
        command: 'style-proof:wechat-manual-checklist',
      },
      {
        id: 'strict-release-boundary',
        passed: strictReleaseBoundaryPreserved,
        exitCode: strictReleaseResult.exitCode,
        status: strictRelease?.status ?? 'invalid-json',
        command: 'style-proof:release-preflight --json',
      },
    ]

    const issues = checks
      .filter(check => !check.passed)
      .map(check => `${check.id}:${check.status}:exit-${check.exitCode}`)

    const canClaimApplicationReady = checks.every(check => check.passed) &&
      applicationPreflight?.canClaimApplicationReady === true

    return {
      notProof: true,
      scope: 'application-acceptance',
      status: canClaimApplicationReady ? 'application-acceptance-ready' : 'application-acceptance-blocked',
      canClaimApplicationReady,
      canClaimReleaseComplete: strictRelease?.canClaimComplete === true,
      summary: {
        applicationPreflightExitCode: applicationPreflightResult.exitCode,
        applicationGalleryExitCode: applicationGalleryResult.exitCode,
        wechatManualChecklistExitCode: wechatManualChecklistResult.exitCode,
        strictReleaseExitCode: strictReleaseResult.exitCode,
        svgModuleCount: applicationPreflight?.summary.svgModuleCount ?? applicationGallery?.summary.svgModuleCount ?? 0,
        renderedModulePersonaPairs: applicationPreflight?.summary.renderedModulePersonaPairs ?? 0,
        applicationGalleryRenderedModulePersonaPairs:
          applicationPreflight?.summary.applicationGalleryRenderedModulePersonaPairs ??
          applicationGallery?.summary.renderedModulePersonaPairs ??
          0,
        applicationIssueCount,
        galleryIssueCount,
        strictReleaseBoundaryPreserved,
      },
      checks,
      issues,
      boundary: {
        xhsZhihuPublishAutomationDeferred: true,
        requiresManualWeChatProof: applicationPreflight?.externalProof.requiresManualWeChatProof ?? true,
      },
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function main(): Promise<void> {
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

  const report = await buildApplicationAcceptanceReport()
  if (args.includes('--json')) {
    console.log(JSON.stringify(report))
  } else {
    console.log(formatApplicationAcceptanceReportText(report))
  }

  process.exit(report.status === 'application-acceptance-ready' ? 0 : 1)
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
