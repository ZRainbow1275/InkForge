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
    wechatApplicationSvgSlotCount: number
    wechatApplicationSvgSlotFailureCount: number
    wechatApplicationSurfaceCount: number
    wechatApplicationSurfaceFailureCount: number
    wechatExportPipelineContractCount: number
    wechatExportPipelineFailureCount: number
    wechatOptionInjectedModuleCount: number
    wechatOptionInjectionFailureCount: number
    wechatStyleChoiceCount: number
    wechatUsableChoiceCount: number
    wechatSelectableChoiceCount: number
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

interface WechatStyleSamplesJsonReport {
  notProof: true
  scope: 'wechat-style-export-samples'
  status: 'wechat-style-samples-ready' | 'wechat-style-samples-blocked'
  summary: {
    wechatStyleChoiceCount: number
    selectableStyleChoiceCount: number
    renderedStyleChoiceCount: number
    uniquePresetCount: number
    svgBearingStyleChoiceCount: number
    totalSvgModuleCount: number
    issueCount: number
  }
  issues: readonly unknown[]
  samples: readonly unknown[]
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
  id:
    | 'application-preflight'
    | 'wechat-style-readiness'
    | 'wechat-style-export-samples'
    | 'application-gallery'
    | 'wechat-manual-checklist'
    | 'wechat-manual-template'
    | 'wechat-manual-manifest-drafts'
    | 'strict-release-boundary'
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
    wechatStyleSamplesExitCode: number
    wechatManualChecklistExitCode: number
    wechatManualTemplateExitCode: number
    wechatManualManifestDraftsExitCode: number
    strictReleaseExitCode: number
    svgModuleCount: number
    renderedModulePersonaPairs: number
    applicationGalleryRenderedModulePersonaPairs: number
    applicationIssueCount: number
    galleryIssueCount: number
    wechatApplicationSvgSlotCount: number
    wechatApplicationSvgSlotFailureCount: number
    wechatApplicationSurfaceCount: number
    wechatApplicationSurfaceFailureCount: number
    wechatExportPipelineContractCount: number
    wechatExportPipelineFailureCount: number
    wechatOptionInjectedModuleCount: number
    wechatOptionInjectionFailureCount: number
    wechatStyleChoiceCount: number
    wechatUsableChoiceCount: number
    wechatSelectableChoiceCount: number
    wechatRenderedStyleChoiceCount: number
    wechatStyleSampleIssueCount: number
    wechatStyleSampleSvgBearingChoiceCount: number
    wechatStyleSampleTotalSvgModuleCount: number
    usableButUnselectableWechatChoices: number
    actionableLocalRows: number
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
const wechatStyleSamplesScriptPath = resolve(projectRoot, 'scripts', 'style-proof-wechat-style-samples.ts')
const externalHandoffScriptPath = resolve(projectRoot, 'scripts', 'style-proof-external-handoff.ts')

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:application-acceptance [--json]',
    '',
    'Runs the current local InkForge application acceptance gate:',
    '- application preflight;',
    '- selectable WeChat style export samples;',
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
      'wechatApplicationSvgSlotCount',
      'wechatApplicationSvgSlotFailureCount',
      'wechatApplicationSurfaceCount',
      'wechatApplicationSurfaceFailureCount',
      'wechatExportPipelineContractCount',
      'wechatExportPipelineFailureCount',
      'wechatOptionInjectedModuleCount',
      'wechatOptionInjectionFailureCount',
      'wechatStyleChoiceCount',
      'wechatUsableChoiceCount',
      'wechatSelectableChoiceCount',
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

function isWechatStyleSamplesSummary(value: unknown): value is WechatStyleSamplesJsonReport['summary'] {
  return isRecord(value) &&
    hasNumberKeys(value, [
      'wechatStyleChoiceCount',
      'selectableStyleChoiceCount',
      'renderedStyleChoiceCount',
      'uniquePresetCount',
      'svgBearingStyleChoiceCount',
      'totalSvgModuleCount',
      'issueCount',
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

function isWechatStyleSamplesReport(value: unknown): value is WechatStyleSamplesJsonReport {
  return isRecord(value) &&
    value.notProof === true &&
    value.scope === 'wechat-style-export-samples' &&
    (value.status === 'wechat-style-samples-ready' || value.status === 'wechat-style-samples-blocked') &&
    isWechatStyleSamplesSummary(value.summary) &&
    Array.isArray(value.issues) &&
    Array.isArray(value.samples)
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

function hasStringArrayKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every(key =>
    Array.isArray(value[key]) &&
    (value[key] as readonly unknown[]).every(item => typeof item === 'string')
  )
}

function hasCurrentWechatNextRows(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false
  }

  return value.some(row =>
    isRecord(row) &&
    row.platform === 'wechat' &&
    row.requirementId === 'cover-thumbnail-check' &&
    row.gate === 'phone-preview' &&
    row.status === 'blocked-by-external'
  ) &&
    value.some(row =>
      isRecord(row) &&
      row.platform === 'wechat' &&
      row.requirementId === 'credentialed-channel-response' &&
      row.gate === 'credentialed-channel' &&
      row.status === 'unsafe-to-automate'
    )
}

function isWechatManualTemplateReady(result: CliRunResult): boolean {
  const parsedOutput = parseJsonOutput<unknown>(result)

  if (
    result.exitCode !== 0 ||
    result.stderr.trim() !== '' ||
    !isRecord(parsedOutput) ||
    parsedOutput.templateOnly !== true ||
    parsedOutput.notProof !== true ||
    parsedOutput.status !== 'blocked-by-external' ||
    parsedOutput.canClaimComplete !== false ||
    !hasCurrentWechatNextRows(parsedOutput.rows)
  ) {
    return false
  }

  const rows = parsedOutput.rows as readonly unknown[]
  return rows.every(row => {
    if (!isRecord(row)) {
      return false
    }

    const artifactTemplate = row.artifactTemplate
    const manifestDraftTemplate = row.manifestDraftTemplate

    return row.templateOnly === true &&
      row.notProof === true &&
      row.platform === 'wechat' &&
      row.cannotClaim === true &&
      typeof row.requirementId === 'string' &&
      typeof row.gate === 'string' &&
      isRecord(artifactTemplate) &&
      artifactTemplate.requirementId === row.requirementId &&
      hasStringArrayKeys(artifactTemplate, [
        'requiredChannels',
        'requiredActions',
        'requiredReadbacks',
        'requiredFields',
        'forbiddenFields',
      ]) &&
      isRecord(manifestDraftTemplate) &&
      manifestDraftTemplate.draftOnly === true &&
      manifestDraftTemplate.notProof === true &&
      manifestDraftTemplate.canClaimComplete === false &&
      manifestDraftTemplate.platform === 'wechat' &&
      manifestDraftTemplate.targetRequirementId === row.requirementId &&
      Array.isArray(manifestDraftTemplate.drafts) &&
      manifestDraftTemplate.drafts.length > 0 &&
      manifestDraftTemplate.drafts.every(draft =>
        isRecord(draft) &&
        draft.platform === 'wechat' &&
        draft.scope === 'style-choice' &&
        typeof draft.choiceId === 'string' &&
        Array.isArray(draft.claimedEvidence) &&
        draft.claimedEvidence.length === 0 &&
        Array.isArray(draft.artifacts) &&
        draft.artifacts.length === 0
      )
  })
}

function isWechatManualManifestDraftsReady(result: CliRunResult): boolean {
  const parsedOutput = parseJsonOutput<unknown>(result)

  if (
    result.exitCode !== 0 ||
    result.stderr.trim() !== '' ||
    !isRecord(parsedOutput) ||
    parsedOutput.draftOnly !== true ||
    parsedOutput.notProof !== true ||
    parsedOutput.status !== 'blocked-by-external' ||
    parsedOutput.canClaimComplete !== false ||
    typeof parsedOutput.manifestCount !== 'number' ||
    parsedOutput.manifestCount <= 0 ||
    !hasCurrentWechatNextRows(parsedOutput.sourceRows) ||
    !Array.isArray(parsedOutput.manifests) ||
    parsedOutput.manifests.length !== parsedOutput.manifestCount
  ) {
    return false
  }

  return parsedOutput.manifests.every(manifest =>
    isRecord(manifest) &&
    manifest.platform === 'wechat' &&
    manifest.scope === 'style-choice' &&
    typeof manifest.choiceId === 'string' &&
    Array.isArray(manifest.claimedEvidence) &&
    manifest.claimedEvidence.length === 0 &&
    Array.isArray(manifest.artifacts) &&
    manifest.artifacts.length === 0
  )
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
    `wechatStyleSamplesExitCode: ${report.summary.wechatStyleSamplesExitCode}`,
    `wechatManualChecklistExitCode: ${report.summary.wechatManualChecklistExitCode}`,
    `wechatManualTemplateExitCode: ${report.summary.wechatManualTemplateExitCode}`,
    `wechatManualManifestDraftsExitCode: ${report.summary.wechatManualManifestDraftsExitCode}`,
    `strictReleaseExitCode: ${report.summary.strictReleaseExitCode}`,
    `svgModuleCount: ${report.summary.svgModuleCount}`,
    `renderedModulePersonaPairs: ${report.summary.renderedModulePersonaPairs}`,
    `applicationGalleryRenderedModulePersonaPairs: ${report.summary.applicationGalleryRenderedModulePersonaPairs}`,
    `applicationIssueCount: ${report.summary.applicationIssueCount}`,
    `galleryIssueCount: ${report.summary.galleryIssueCount}`,
    `wechatApplicationSvgSlotCount: ${report.summary.wechatApplicationSvgSlotCount}`,
    `wechatApplicationSvgSlotFailureCount: ${report.summary.wechatApplicationSvgSlotFailureCount}`,
    `wechatApplicationSurfaceCount: ${report.summary.wechatApplicationSurfaceCount}`,
    `wechatApplicationSurfaceFailureCount: ${report.summary.wechatApplicationSurfaceFailureCount}`,
    `wechatExportPipelineContractCount: ${report.summary.wechatExportPipelineContractCount}`,
    `wechatExportPipelineFailureCount: ${report.summary.wechatExportPipelineFailureCount}`,
    `wechatOptionInjectedModuleCount: ${report.summary.wechatOptionInjectedModuleCount}`,
    `wechatOptionInjectionFailureCount: ${report.summary.wechatOptionInjectionFailureCount}`,
    `wechatStyleChoiceCount: ${report.summary.wechatStyleChoiceCount}`,
    `wechatUsableChoiceCount: ${report.summary.wechatUsableChoiceCount}`,
    `wechatSelectableChoiceCount: ${report.summary.wechatSelectableChoiceCount}`,
    `wechatRenderedStyleChoiceCount: ${report.summary.wechatRenderedStyleChoiceCount}`,
    `wechatStyleSampleIssueCount: ${report.summary.wechatStyleSampleIssueCount}`,
    `wechatStyleSampleSvgBearingChoiceCount: ${report.summary.wechatStyleSampleSvgBearingChoiceCount}`,
    `wechatStyleSampleTotalSvgModuleCount: ${report.summary.wechatStyleSampleTotalSvgModuleCount}`,
    `usableButUnselectableWechatChoices: ${report.summary.usableButUnselectableWechatChoices}`,
    `actionableLocalRows: ${report.summary.actionableLocalRows}`,
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
    const wechatStyleSamplesResult = await runTsxScript(
      wechatStyleSamplesScriptPath,
      ['--json'],
    )
    const wechatManualChecklistResult = await runTsxScript(
      externalHandoffScriptPath,
      ['--checklist', '--platform=wechat', '--next-only', '--handoff-ok-exit-zero'],
    )
    const wechatManualTemplateResult = await runTsxScript(
      externalHandoffScriptPath,
      ['--template', '--platform=wechat', '--next-only', '--handoff-ok-exit-zero'],
    )
    const wechatManualManifestDraftsResult = await runTsxScript(
      externalHandoffScriptPath,
      ['--manifest-drafts', '--platform=wechat', '--next-only', '--handoff-ok-exit-zero'],
    )
    const strictReleaseResult = await runTsxScript(releasePreflightScriptPath, ['--json'])

    const applicationPreflightJson = parseJsonOutput<unknown>(applicationPreflightResult)
    const applicationGalleryJson = parseJsonOutput<unknown>(applicationGalleryResult)
    const wechatStyleSamplesJson = parseJsonOutput<unknown>(wechatStyleSamplesResult)
    const strictReleaseJson = parseJsonOutput<unknown>(strictReleaseResult)

    const applicationPreflight = isApplicationPreflightReport(applicationPreflightJson)
      ? applicationPreflightJson
      : null
    const applicationGallery = isApplicationGalleryReport(applicationGalleryJson)
      ? applicationGalleryJson
      : null
    const wechatStyleSamples = isWechatStyleSamplesReport(wechatStyleSamplesJson)
      ? wechatStyleSamplesJson
      : null
    const strictRelease = isStrictReleaseReport(strictReleaseJson)
      ? strictReleaseJson
      : null

    const applicationIssueCount = getApplicationIssueCount(applicationPreflight)
    const galleryIssueCount = applicationGallery?.issues.length ?? 1
    const wechatStyleSampleIssueCount = wechatStyleSamples?.summary.issueCount ?? 1
    const wechatManualChecklistReady = isWechatManualChecklistReady(wechatManualChecklistResult)
    const wechatManualTemplateReady = isWechatManualTemplateReady(wechatManualTemplateResult)
    const wechatManualManifestDraftsReady = isWechatManualManifestDraftsReady(
      wechatManualManifestDraftsResult,
    )
    const strictReleaseBoundaryPreserved = strictReleaseResult.exitCode !== 0 &&
      strictRelease?.canClaimComplete === false &&
      strictRelease.status === 'blocked-by-external'
    const wechatStyleApplicationReady = applicationPreflight !== null &&
      applicationPreflight.summary.wechatApplicationSvgSlotFailureCount === 0 &&
      applicationPreflight.summary.wechatApplicationSurfaceFailureCount === 0 &&
      applicationPreflight.summary.wechatExportPipelineFailureCount === 0 &&
      applicationPreflight.summary.wechatOptionInjectionFailureCount === 0 &&
      applicationPreflight.summary.wechatStyleChoiceCount > 0 &&
      applicationPreflight.summary.wechatSelectableChoiceCount > 0 &&
      applicationPreflight.summary.usableButUnselectableWechatChoices === 0 &&
      applicationPreflight.summary.actionableLocalRows === 0 &&
      applicationPreflight.externalProof.xhsZhihuPublishAutomationDeferred === true
    const wechatStyleSamplesReady = wechatStyleSamplesResult.exitCode === 0 &&
      wechatStyleSamples?.status === 'wechat-style-samples-ready' &&
      wechatStyleSamples.summary.issueCount === 0 &&
      wechatStyleSamples.summary.selectableStyleChoiceCount ===
        applicationPreflight?.summary.wechatSelectableChoiceCount &&
      wechatStyleSamples.summary.renderedStyleChoiceCount ===
        wechatStyleSamples.summary.selectableStyleChoiceCount &&
      wechatStyleSamples.summary.svgBearingStyleChoiceCount ===
        wechatStyleSamples.summary.selectableStyleChoiceCount

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
        id: 'wechat-style-readiness',
        passed: wechatStyleApplicationReady,
        exitCode: applicationPreflightResult.exitCode,
        status: wechatStyleApplicationReady ? 'wechat-style-ready' : 'wechat-style-blocked',
        command: 'style-proof:application-preflight --json',
      },
      {
        id: 'wechat-style-export-samples',
        passed: wechatStyleSamplesReady,
        exitCode: wechatStyleSamplesResult.exitCode,
        status: wechatStyleSamples?.status ?? 'invalid-json',
        command: 'style-proof:wechat-style-samples --json',
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
        id: 'wechat-manual-template',
        passed: wechatManualTemplateReady,
        exitCode: wechatManualTemplateResult.exitCode,
        status: wechatManualTemplateReady ? 'manual-template-ready' : 'manual-template-invalid',
        command: 'style-proof:wechat-manual-handoff',
      },
      {
        id: 'wechat-manual-manifest-drafts',
        passed: wechatManualManifestDraftsReady,
        exitCode: wechatManualManifestDraftsResult.exitCode,
        status: wechatManualManifestDraftsReady
          ? 'manual-manifest-drafts-ready'
          : 'manual-manifest-drafts-invalid',
        command: 'style-proof:wechat-manual-manifest-drafts',
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
        wechatStyleSamplesExitCode: wechatStyleSamplesResult.exitCode,
        wechatManualChecklistExitCode: wechatManualChecklistResult.exitCode,
        wechatManualTemplateExitCode: wechatManualTemplateResult.exitCode,
        wechatManualManifestDraftsExitCode: wechatManualManifestDraftsResult.exitCode,
        strictReleaseExitCode: strictReleaseResult.exitCode,
        svgModuleCount: applicationPreflight?.summary.svgModuleCount ?? applicationGallery?.summary.svgModuleCount ?? 0,
        renderedModulePersonaPairs: applicationPreflight?.summary.renderedModulePersonaPairs ?? 0,
        applicationGalleryRenderedModulePersonaPairs:
          applicationPreflight?.summary.applicationGalleryRenderedModulePersonaPairs ??
          applicationGallery?.summary.renderedModulePersonaPairs ??
          0,
        applicationIssueCount,
        galleryIssueCount,
        wechatApplicationSvgSlotCount: applicationPreflight?.summary.wechatApplicationSvgSlotCount ?? 0,
        wechatApplicationSvgSlotFailureCount:
          applicationPreflight?.summary.wechatApplicationSvgSlotFailureCount ?? 1,
        wechatApplicationSurfaceCount: applicationPreflight?.summary.wechatApplicationSurfaceCount ?? 0,
        wechatApplicationSurfaceFailureCount:
          applicationPreflight?.summary.wechatApplicationSurfaceFailureCount ?? 1,
        wechatExportPipelineContractCount: applicationPreflight?.summary.wechatExportPipelineContractCount ?? 0,
        wechatExportPipelineFailureCount: applicationPreflight?.summary.wechatExportPipelineFailureCount ?? 1,
        wechatOptionInjectedModuleCount: applicationPreflight?.summary.wechatOptionInjectedModuleCount ?? 0,
        wechatOptionInjectionFailureCount: applicationPreflight?.summary.wechatOptionInjectionFailureCount ?? 1,
        wechatStyleChoiceCount: applicationPreflight?.summary.wechatStyleChoiceCount ?? 0,
        wechatUsableChoiceCount: applicationPreflight?.summary.wechatUsableChoiceCount ?? 0,
        wechatSelectableChoiceCount: applicationPreflight?.summary.wechatSelectableChoiceCount ?? 0,
        wechatRenderedStyleChoiceCount: wechatStyleSamples?.summary.renderedStyleChoiceCount ?? 0,
        wechatStyleSampleIssueCount,
        wechatStyleSampleSvgBearingChoiceCount:
          wechatStyleSamples?.summary.svgBearingStyleChoiceCount ?? 0,
        wechatStyleSampleTotalSvgModuleCount:
          wechatStyleSamples?.summary.totalSvgModuleCount ?? 0,
        usableButUnselectableWechatChoices:
          applicationPreflight?.summary.usableButUnselectableWechatChoices ?? 1,
        actionableLocalRows: applicationPreflight?.summary.actionableLocalRows ?? 1,
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
