import { execFile, type ExecFileException } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface ApplicationAcceptanceCliResult {
  exitCode: number
  stdout: string
  stderr: string
}

interface PackageJsonScripts {
  scripts?: Record<string, string>
}

interface ApplicationAcceptanceJsonReport {
  notProof: true
  scope: 'application-acceptance'
  status: 'application-acceptance-ready' | 'application-acceptance-blocked'
  canClaimApplicationReady: boolean
  canClaimReleaseComplete: boolean
  currentRoundTarget: {
    scope: 'application-svg-style-wechat-local'
    status: 'current-round-ready' | 'current-round-blocked'
    canClaimCurrentRoundTarget: boolean
    releaseProofNotClaimed: boolean
    strictReleaseBlockedByExternal: boolean
    xhsZhihuPublishAutomationDeferred: true
    remainingExternalProofOwnedByOperator: boolean
  }
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
  checks: Array<{
    id: string
    passed: boolean
    exitCode: number
    status: string
    command: string
  }>
  issues: string[]
  boundary: {
    xhsZhihuPublishAutomationDeferred: true
    requiresManualWeChatProof: boolean
  }
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const workspaceRoot = resolve(projectRoot, '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const acceptanceScriptPath = resolve(projectRoot, 'scripts', 'style-proof-application-acceptance.ts')
const packageJsonPath = resolve(projectRoot, 'package.json')
const rootPackageJsonPath = resolve(workspaceRoot, 'package.json')

function readPackageJsonScripts(path = packageJsonPath): Record<string, string> {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as PackageJsonScripts
  return parsed.scripts ?? {}
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

function runAcceptanceCli(args: readonly string[]): Promise<ApplicationAcceptanceCliResult> {
  return new Promise(resolveResult => {
    execFile(
      process.execPath,
      [tsxCliPath, acceptanceScriptPath, ...args],
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasNumberKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every(key => typeof value[key] === 'number')
}

function isApplicationAcceptanceJsonReport(value: unknown): value is ApplicationAcceptanceJsonReport {
  return isRecord(value) &&
    value.notProof === true &&
    value.scope === 'application-acceptance' &&
    (value.status === 'application-acceptance-ready' || value.status === 'application-acceptance-blocked') &&
    typeof value.canClaimApplicationReady === 'boolean' &&
    typeof value.canClaimReleaseComplete === 'boolean' &&
    isRecord(value.currentRoundTarget) &&
    value.currentRoundTarget.scope === 'application-svg-style-wechat-local' &&
    (value.currentRoundTarget.status === 'current-round-ready' ||
      value.currentRoundTarget.status === 'current-round-blocked') &&
    typeof value.currentRoundTarget.canClaimCurrentRoundTarget === 'boolean' &&
    typeof value.currentRoundTarget.releaseProofNotClaimed === 'boolean' &&
    typeof value.currentRoundTarget.strictReleaseBlockedByExternal === 'boolean' &&
    value.currentRoundTarget.xhsZhihuPublishAutomationDeferred === true &&
    typeof value.currentRoundTarget.remainingExternalProofOwnedByOperator === 'boolean' &&
    isRecord(value.summary) &&
    hasNumberKeys(value.summary, [
      'applicationPreflightExitCode',
      'applicationGalleryExitCode',
      'wechatStyleSamplesExitCode',
      'wechatManualChecklistExitCode',
      'wechatManualTemplateExitCode',
      'wechatManualManifestDraftsExitCode',
      'strictReleaseExitCode',
      'svgModuleCount',
      'renderedModulePersonaPairs',
      'applicationGalleryRenderedModulePersonaPairs',
      'applicationIssueCount',
      'galleryIssueCount',
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
      'wechatRenderedStyleChoiceCount',
      'wechatStyleSampleIssueCount',
      'wechatStyleSampleSvgBearingChoiceCount',
      'wechatStyleSampleTotalSvgModuleCount',
      'usableButUnselectableWechatChoices',
      'actionableLocalRows',
    ]) &&
    typeof value.summary.strictReleaseBoundaryPreserved === 'boolean' &&
    Array.isArray(value.checks) &&
    value.checks.every(check =>
      isRecord(check) &&
      typeof check.id === 'string' &&
      typeof check.passed === 'boolean' &&
      typeof check.exitCode === 'number' &&
      typeof check.status === 'string' &&
      typeof check.command === 'string'
    ) &&
    Array.isArray(value.issues) &&
    value.issues.every(issue => typeof issue === 'string') &&
    isRecord(value.boundary) &&
    value.boundary.xhsZhihuPublishAutomationDeferred === true &&
    typeof value.boundary.requiresManualWeChatProof === 'boolean'
}

function parseAcceptanceJson(stdout: string): ApplicationAcceptanceJsonReport {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isApplicationAcceptanceJsonReport(parsed)) {
    throw new Error('style-proof application acceptance JSON shape is invalid')
  }

  return parsed
}

describe('style-proof application acceptance CLI', { timeout: 90_000 }, () => {
  it('aggregates the current local application acceptance gates without claiming release success', async () => {
    const result = await runAcceptanceCli(['--json'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')

    const report = parseAcceptanceJson(result.stdout)
    expect(report).toMatchObject({
      notProof: true,
      scope: 'application-acceptance',
      status: 'application-acceptance-ready',
      canClaimApplicationReady: true,
      canClaimReleaseComplete: false,
      currentRoundTarget: {
        scope: 'application-svg-style-wechat-local',
        status: 'current-round-ready',
        canClaimCurrentRoundTarget: true,
        releaseProofNotClaimed: true,
        strictReleaseBlockedByExternal: true,
        xhsZhihuPublishAutomationDeferred: true,
        remainingExternalProofOwnedByOperator: true,
      },
      summary: {
        applicationPreflightExitCode: 0,
        applicationGalleryExitCode: 0,
        wechatStyleSamplesExitCode: 0,
        wechatManualChecklistExitCode: 0,
        wechatManualTemplateExitCode: 0,
        wechatManualManifestDraftsExitCode: 0,
        svgModuleCount: 27,
        renderedModulePersonaPairs: 108,
        applicationGalleryRenderedModulePersonaPairs: 108,
        applicationIssueCount: 0,
        galleryIssueCount: 0,
        wechatApplicationSvgSlotCount: 5,
        wechatApplicationSvgSlotFailureCount: 0,
        wechatApplicationSurfaceCount: 2,
        wechatApplicationSurfaceFailureCount: 0,
        wechatExportPipelineContractCount: 3,
        wechatExportPipelineFailureCount: 0,
        wechatOptionInjectedModuleCount: 27,
        wechatOptionInjectionFailureCount: 0,
        wechatStyleChoiceCount: 17,
        wechatUsableChoiceCount: 8,
        wechatSelectableChoiceCount: 13,
        wechatRenderedStyleChoiceCount: 13,
        wechatStyleSampleIssueCount: 0,
        wechatStyleSampleSvgBearingChoiceCount: 13,
        wechatStyleSampleTotalSvgModuleCount: 45,
        usableButUnselectableWechatChoices: 0,
        actionableLocalRows: 0,
        strictReleaseBoundaryPreserved: true,
      },
      issues: [],
      boundary: {
        xhsZhihuPublishAutomationDeferred: true,
        requiresManualWeChatProof: true,
      },
    })
    expect(report.summary.strictReleaseExitCode).not.toBe(0)
    expect(report.summary.wechatStyleSampleTotalSvgModuleCount).toBeGreaterThanOrEqual(
      report.summary.wechatRenderedStyleChoiceCount,
    )
    expect(report.summary.wechatSelectableChoiceCount).toBeGreaterThan(report.summary.wechatUsableChoiceCount)
    expect(report.summary.wechatSelectableChoiceCount).toBeLessThan(report.summary.wechatStyleChoiceCount)
    expect(report.summary.usableButUnselectableWechatChoices).toBe(0)
    expect(report.checks.map(check => check.id)).toEqual([
      'application-preflight',
      'wechat-style-readiness',
      'wechat-style-export-samples',
      'application-gallery',
      'wechat-manual-checklist',
      'wechat-manual-template',
      'wechat-manual-manifest-drafts',
      'strict-release-boundary',
    ])
    expect(report.checks.every(check => check.passed)).toBe(true)
    expect(report.checks.find(check => check.id === 'wechat-style-readiness')).toMatchObject({
      status: 'wechat-style-ready',
      command: 'style-proof:application-preflight --json',
    })
    expect(report.checks.find(check => check.id === 'wechat-style-export-samples')).toMatchObject({
      status: 'wechat-style-samples-ready',
      command: 'style-proof:wechat-style-samples --json',
    })
    expect(report.checks.find(check => check.id === 'strict-release-boundary')).toMatchObject({
      status: 'blocked-by-external',
      command: 'style-proof:release-preflight --json',
    })
    expect(report.checks.find(check => check.id === 'wechat-manual-checklist')).toMatchObject({
      status: 'manual-checklist-ready',
      command: 'style-proof:wechat-manual-checklist',
    })
    expect(report.checks.find(check => check.id === 'wechat-manual-template')).toMatchObject({
      status: 'manual-template-ready',
      command: 'style-proof:wechat-manual-handoff',
    })
    expect(report.checks.find(check => check.id === 'wechat-manual-manifest-drafts')).toMatchObject({
      status: 'manual-manifest-drafts-ready',
      command: 'style-proof:wechat-manual-manifest-drafts',
    })
  })

  it('exposes a package-level current-round acceptance entrypoint', async () => {
    const scripts = readPackageJsonScripts()
    const rootScripts = readPackageJsonScripts(rootPackageJsonPath)

    expect(scripts['style-proof:current-round']).toBe('tsx scripts/style-proof-application-acceptance.ts --json')
    expect(rootScripts['style-proof:current-round']).toBe('pnpm --silent -C inkforge style-proof:current-round')

    const result = await runAcceptanceCli(['--json'])
    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')

    const report = parseAcceptanceJson(result.stdout)
    expect(report).toMatchObject({
      status: 'application-acceptance-ready',
      canClaimApplicationReady: true,
      canClaimReleaseComplete: false,
      currentRoundTarget: {
        scope: 'application-svg-style-wechat-local',
        status: 'current-round-ready',
        canClaimCurrentRoundTarget: true,
        releaseProofNotClaimed: true,
        strictReleaseBlockedByExternal: true,
        xhsZhihuPublishAutomationDeferred: true,
        remainingExternalProofOwnedByOperator: true,
      },
    })
  })

  it('prints help and rejects unknown options before running acceptance checks', async () => {
    const help = await runAcceptanceCli(['--help'])
    expect(help.exitCode).toBe(0)
    expect(help.stderr.trim()).toBe('')
    expect(help.stdout).toContain('Usage: pnpm style-proof:application-acceptance [--json]')
    expect(help.stdout).toContain('WeChat manual proof checklist readiness')
    expect(help.stdout).toContain('current-round target readiness')
    expect(help.stdout).toContain('does not open a browser')

    const invalid = await runAcceptanceCli(['--unknown-acceptance-flag'])
    expect(invalid.exitCode).toBe(2)
    expect(invalid.stderr).toContain('Unknown option: --unknown-acceptance-flag')
    expect(invalid.stdout).toContain('Usage: pnpm style-proof:application-acceptance')
  })
})
