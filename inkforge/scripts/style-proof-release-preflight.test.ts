import { execFile, type ExecFileException } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface ReleasePreflightCliResult {
  exitCode: number
  stdout: string
  stderr: string
}

interface PackageJsonScripts {
  scripts?: Record<string, string>
}

interface ReleasePreflightSummary {
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

interface ReleasePreflightNextRow {
  id: string
  kind: string
  refKinds: string[]
  commands: ReleasePreflightNextRowCommands
  artifactGuidance: ReleasePreflightArtifactGuidance
  allMatchingSummary: ReleasePreflightAllMatchingSummary
  platform: string
  choiceIds: string[]
  requirementId: string
  requirementLabel: string
  gate: string
  boundary: string
  status: string
  blockerKinds: string[]
  issueIds: string[]
  freshnessIssueIds: string[]
  required: number
  satisfied: number
  missing: number
  invalid: number
  artifactCount: number
  acceptedArtifactCount: number
  mutatesPlatform: boolean
  requiresExternalAccount: boolean
  requiresPhone: boolean
  cannotClaim: boolean
  safeToAutomate: boolean
  cannotClaimReason: string | null
  nextOperatorAction: string
}

interface ReleasePreflightAllMatchingSummary {
  notProof: true
  rowCount: number
  requirementIds: string[]
  boundaries: string[]
  statuses: string[]
  issueIds: string[]
  freshnessIssueIds: string[]
  choiceCount: number
  requiresPhoneCount: number
  requiresExternalAccountCount: number
  mutatingPlatformCount: number
  unsafeToAutomateCount: number
}

interface ReleasePreflightArtifactGuidance {
  notProof: true
  appendOnlyAfterExternalProof: true
  requiredChannels: string[]
  requiredActions: string[]
  requiredReadbacks: string[]
  requiredFields: string[]
  forbiddenFields: string[]
  acceptedHostStatuses: string[]
  maxFreshnessDays: number | null
  templateCommand: string
  manifestDraftsCommand: string
  allMatchingTemplateCommand: string
  allMatchingManifestDraftsCommand: string
}

interface ReleasePreflightNextRowCommands {
  template: string
  manifestDrafts: string
  allMatchingTemplate: string
  allMatchingManifestDrafts: string
  intake: string
  merge: string
}

interface ReleasePreflightJsonReport {
  canClaimComplete: boolean
  status: string
  blockerKinds: string[]
  summary: ReleasePreflightSummary
  nextRows: ReleasePreflightNextRow[]
}

interface ApplicationPreflightJsonReport {
  scope: 'application'
  status: 'application-ready' | 'application-blocked'
  applicationGalleryStatus: 'application-gallery-ready' | 'application-gallery-blocked'
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
    usableButUnselectableWechatChoices: number
    actionableLocalRows: number
    catalogBlockedLocalRows: number
    manualDeferredOpenSteps: number
    releaseBlockingOpenSteps: number
    externalHandoffRows: number
    nextExternalRows: number
  }
  moduleIssues: Array<{
    moduleId: string
    family: string
    persona: string
    issue: string
  }>
  applicationGalleryIssues: Array<{
    moduleId: string
    family: string
    persona: string
    issue: string
  }>
  wechatApplicationSlotIssues: Array<{
    slotId: string
    issue: string
  }>
  wechatApplicationSurfaceIssues: Array<{
    surfaceId: string
    relativePath: string
    issue: string
    fragment: string
  }>
  wechatExportPipelineIssues: Array<{
    contractId: string
    relativePath: string
    issue: string
    fragment: string
  }>
  wechatOptionIssues: Array<{
    moduleId: string
    family: string
    issue: string
  }>
  choiceIssues: Array<{
    choiceId: string
    availabilityStatus: string
    reason: string
  }>
  externalProof: {
    notProof: true
    releaseCanClaimComplete: boolean
    releaseStatus: string
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
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const releasePreflightScriptPath = resolve(projectRoot, 'scripts', 'style-proof-release-preflight.ts')
const packageJsonPath = resolve(projectRoot, 'package.json')

function readPackageJsonScripts(): Record<string, string> {
  const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJsonScripts
  return parsed.scripts ?? {}
}

const releasePreflightSensitiveFragments = [
  ['C:/Users', 'HP'].join('/'),
  ['C:', 'Users', 'HP'].join('\\'),
  ['profile', 'Dir'].join(''),
  ['session', 'id'].join(''),
  ['access', 'To', 'ken'].join(''),
  ['refresh', 'To', 'ken'].join(''),
  ['authorization', ':'].join(''),
  ['cookie', ':'].join(''),
  ['set', 'cookie'].join('-'),
  ['.', 'har'].join(''),
  ['qr', 'code'].join(''),
  ['scan', 'qr'].join('-'),
]

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

function runReleasePreflightCli(args: readonly string[]): Promise<ReleasePreflightCliResult> {
  return new Promise(resolveCliRun => {
    execFile(
      process.execPath,
      [tsxCliPath, releasePreflightScriptPath, ...args],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env: getCliEnvironment(),
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
      },
      (error, stdout, stderr) => {
        resolveCliRun({
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

function isReleasePreflightSummary(value: unknown): value is ReleasePreflightSummary {
  return isRecord(value) && hasNumberKeys(value, [
    'blockerCount',
    'combinedIssueCount',
    'cannotClaimSteps',
    'phoneOpenSteps',
    'externalDependencyOpenSteps',
    'unsafeToAutomateOpenSteps',
    'mutatingOpenSteps',
    'manualDeferredOpenSteps',
    'releaseBlockingOpenSteps',
    'releaseBlockingPhoneOpenSteps',
    'releaseBlockingExternalDependencyOpenSteps',
    'releaseBlockingUnsafeToAutomateOpenSteps',
    'releaseBlockingMutatingOpenSteps',
    'externalHandoffRows',
    'safeExternalRows',
    'actionableLocalRows',
    'nextRowRefs',
    'uniqueNextRows',
  ])
}

function isReleasePreflightNextRow(value: unknown): value is ReleasePreflightNextRow {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.kind === 'string' &&
    Array.isArray(value.refKinds) &&
    value.refKinds.every(kind => typeof kind === 'string') &&
    isRecord(value.commands) &&
    typeof value.commands.template === 'string' &&
    typeof value.commands.manifestDrafts === 'string' &&
    typeof value.commands.allMatchingTemplate === 'string' &&
    typeof value.commands.allMatchingManifestDrafts === 'string' &&
    typeof value.commands.intake === 'string' &&
    typeof value.commands.merge === 'string' &&
    isRecord(value.allMatchingSummary) &&
    value.allMatchingSummary.notProof === true &&
    typeof value.allMatchingSummary.rowCount === 'number' &&
    Array.isArray(value.allMatchingSummary.requirementIds) &&
    value.allMatchingSummary.requirementIds.every(requirementId => typeof requirementId === 'string') &&
    Array.isArray(value.allMatchingSummary.boundaries) &&
    value.allMatchingSummary.boundaries.every(boundary => typeof boundary === 'string') &&
    Array.isArray(value.allMatchingSummary.statuses) &&
    value.allMatchingSummary.statuses.every(status => typeof status === 'string') &&
    Array.isArray(value.allMatchingSummary.issueIds) &&
    value.allMatchingSummary.issueIds.every(issueId => typeof issueId === 'string') &&
    Array.isArray(value.allMatchingSummary.freshnessIssueIds) &&
    value.allMatchingSummary.freshnessIssueIds.every(issueId => typeof issueId === 'string') &&
    typeof value.allMatchingSummary.choiceCount === 'number' &&
    typeof value.allMatchingSummary.requiresPhoneCount === 'number' &&
    typeof value.allMatchingSummary.requiresExternalAccountCount === 'number' &&
    typeof value.allMatchingSummary.mutatingPlatformCount === 'number' &&
    typeof value.allMatchingSummary.unsafeToAutomateCount === 'number' &&
    isRecord(value.artifactGuidance) &&
    value.artifactGuidance.notProof === true &&
    value.artifactGuidance.appendOnlyAfterExternalProof === true &&
    Array.isArray(value.artifactGuidance.requiredChannels) &&
    value.artifactGuidance.requiredChannels.every(channel => typeof channel === 'string') &&
    Array.isArray(value.artifactGuidance.requiredActions) &&
    value.artifactGuidance.requiredActions.every(action => typeof action === 'string') &&
    Array.isArray(value.artifactGuidance.requiredReadbacks) &&
    value.artifactGuidance.requiredReadbacks.every(readback => typeof readback === 'string') &&
    Array.isArray(value.artifactGuidance.requiredFields) &&
    value.artifactGuidance.requiredFields.every(field => typeof field === 'string') &&
    Array.isArray(value.artifactGuidance.forbiddenFields) &&
    value.artifactGuidance.forbiddenFields.every(field => typeof field === 'string') &&
    Array.isArray(value.artifactGuidance.acceptedHostStatuses) &&
    value.artifactGuidance.acceptedHostStatuses.every(status => typeof status === 'string') &&
    (typeof value.artifactGuidance.maxFreshnessDays === 'number' ||
      value.artifactGuidance.maxFreshnessDays === null) &&
    typeof value.artifactGuidance.templateCommand === 'string' &&
    typeof value.artifactGuidance.manifestDraftsCommand === 'string' &&
    typeof value.artifactGuidance.allMatchingTemplateCommand === 'string' &&
    typeof value.artifactGuidance.allMatchingManifestDraftsCommand === 'string' &&
    typeof value.platform === 'string' &&
    Array.isArray(value.choiceIds) &&
    value.choiceIds.every(choiceId => typeof choiceId === 'string') &&
    typeof value.requirementId === 'string' &&
    typeof value.requirementLabel === 'string' &&
    typeof value.gate === 'string' &&
    typeof value.boundary === 'string' &&
    typeof value.status === 'string' &&
    Array.isArray(value.blockerKinds) &&
    value.blockerKinds.every(kind => typeof kind === 'string') &&
    Array.isArray(value.issueIds) &&
    value.issueIds.every(issueId => typeof issueId === 'string') &&
    Array.isArray(value.freshnessIssueIds) &&
    value.freshnessIssueIds.every(issueId => typeof issueId === 'string') &&
    typeof value.required === 'number' &&
    typeof value.satisfied === 'number' &&
    typeof value.missing === 'number' &&
    typeof value.invalid === 'number' &&
    typeof value.artifactCount === 'number' &&
    typeof value.acceptedArtifactCount === 'number' &&
    typeof value.mutatesPlatform === 'boolean' &&
    typeof value.requiresExternalAccount === 'boolean' &&
    typeof value.requiresPhone === 'boolean' &&
    typeof value.cannotClaim === 'boolean' &&
    typeof value.safeToAutomate === 'boolean' &&
    (typeof value.cannotClaimReason === 'string' || value.cannotClaimReason === null) &&
    typeof value.nextOperatorAction === 'string'
}

function isReleasePreflightJsonReport(value: unknown): value is ReleasePreflightJsonReport {
  return isRecord(value) &&
    typeof value.canClaimComplete === 'boolean' &&
    typeof value.status === 'string' &&
    Array.isArray(value.blockerKinds) &&
    value.blockerKinds.every(kind => typeof kind === 'string') &&
    isReleasePreflightSummary(value.summary) &&
    Array.isArray(value.nextRows) &&
    value.nextRows.every(isReleasePreflightNextRow)
}

function parseReleasePreflightJson(stdout: string): ReleasePreflightJsonReport {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isReleasePreflightJsonReport(parsed)) {
    throw new Error('style-proof release preflight JSON shape is invalid')
  }

  return parsed
}

function isStringIssueArray(value: unknown): value is Array<Record<string, string>> {
  return Array.isArray(value) && value.every(item =>
    isRecord(item) && Object.values(item).every(field => typeof field === 'string')
  )
}

function isApplicationPreflightJsonReport(value: unknown): value is ApplicationPreflightJsonReport {
  return isRecord(value) &&
    value.scope === 'application' &&
    (value.status === 'application-ready' || value.status === 'application-blocked') &&
    (value.applicationGalleryStatus === 'application-gallery-ready' ||
      value.applicationGalleryStatus === 'application-gallery-blocked') &&
    typeof value.canClaimApplicationReady === 'boolean' &&
    typeof value.canClaimReleaseComplete === 'boolean' &&
    isRecord(value.summary) &&
    hasNumberKeys(value.summary, [
      'svgModuleCount',
      'svgFamilyCount',
      'personaCount',
      'renderedModulePersonaPairs',
      'applicationGalleryRenderedModulePersonaPairs',
      'applicationGalleryWechatSafeViolationCount',
      'applicationGalleryModuleSentinelFailureCount',
      'applicationGalleryIssueCount',
      'wechatApplicationSvgSlotCount',
      'wechatApplicationSvgShowcaseModuleCount',
      'wechatApplicationSvgSlotFailureCount',
      'wechatApplicationSurfaceCount',
      'wechatApplicationSurfaceFailureCount',
      'wechatExportPipelineContractCount',
      'wechatExportPipelineFailureCount',
      'wechatOptionInjectedModuleCount',
      'wechatOptionInjectionFailureCount',
      'wechatSafeViolationCount',
      'moduleSentinelFailureCount',
      'wechatStyleChoiceCount',
      'wechatUsableChoiceCount',
      'wechatSelectableChoiceCount',
      'usableButUnselectableWechatChoices',
      'actionableLocalRows',
      'catalogBlockedLocalRows',
      'manualDeferredOpenSteps',
      'releaseBlockingOpenSteps',
      'externalHandoffRows',
      'nextExternalRows',
    ]) &&
    isStringIssueArray(value.moduleIssues) &&
    isStringIssueArray(value.applicationGalleryIssues) &&
    isStringIssueArray(value.wechatApplicationSlotIssues) &&
    isStringIssueArray(value.wechatApplicationSurfaceIssues) &&
    isStringIssueArray(value.wechatExportPipelineIssues) &&
    isStringIssueArray(value.wechatOptionIssues) &&
    isStringIssueArray(value.choiceIssues) &&
    isRecord(value.externalProof) &&
    value.externalProof.notProof === true &&
    typeof value.externalProof.releaseCanClaimComplete === 'boolean' &&
    typeof value.externalProof.releaseStatus === 'string' &&
    typeof value.externalProof.releaseBlockingOpenSteps === 'number' &&
    typeof value.externalProof.releaseBlockingPhoneOpenSteps === 'number' &&
    typeof value.externalProof.releaseBlockingExternalDependencyOpenSteps === 'number' &&
    typeof value.externalProof.releaseBlockingUnsafeToAutomateOpenSteps === 'number' &&
    typeof value.externalProof.releaseBlockingMutatingOpenSteps === 'number' &&
    typeof value.externalProof.externalHandoffRows === 'number' &&
    typeof value.externalProof.nextExternalRows === 'number' &&
    typeof value.externalProof.requiresManualWeChatProof === 'boolean' &&
    value.externalProof.xhsZhihuPublishAutomationDeferred === true
}

function parseApplicationPreflightJson(stdout: string): ApplicationPreflightJsonReport {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isApplicationPreflightJsonReport(parsed)) {
    throw new Error('style-proof application preflight JSON shape is invalid')
  }

  return parsed
}

function expectNoSensitiveFragments(output: string): void {
  for (const fragment of releasePreflightSensitiveFragments) {
    expect(output).not.toContain(fragment)
  }
}

describe('style-proof release preflight CLI', { timeout: 60_000 }, () => {
  it('emits compact JSON and blocks release claims while external gates remain open', async () => {
    const result = await runReleasePreflightCli(['--json'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')
    expectNoSensitiveFragments(result.stdout)

    const report = parseReleasePreflightJson(result.stdout)
    expect(report.status).toBe('blocked-by-external')
    expect(report.canClaimComplete).toBe(false)
    expect(report.blockerKinds).toEqual([
      'phone-preview',
      'external-dependency',
      'unsafe-to-automate',
      'mutating-platform',
    ])
    expect(report.summary).toMatchObject({
      blockerCount: 4,
      combinedIssueCount: 11,
      cannotClaimSteps: 26,
      phoneOpenSteps: 4,
      externalDependencyOpenSteps: 11,
      unsafeToAutomateOpenSteps: 10,
      mutatingOpenSteps: 10,
      manualDeferredOpenSteps: 7,
      releaseBlockingOpenSteps: 19,
      releaseBlockingPhoneOpenSteps: 4,
      releaseBlockingExternalDependencyOpenSteps: 4,
      releaseBlockingUnsafeToAutomateOpenSteps: 4,
      releaseBlockingMutatingOpenSteps: 4,
      externalHandoffRows: 8,
      safeExternalRows: 0,
      actionableLocalRows: 0,
      nextRowRefs: 4,
      uniqueNextRows: 2,
    })
    expect(report.nextRows).toHaveLength(2)
    expect(report.nextRows.map(row => row.kind)).toEqual([
      'phone-preview',
      'external-account',
    ])
    expect(report.nextRows.map(row => row.refKinds)).toEqual([
      ['phone-preview'],
      ['external-account', 'unsafe-to-automate', 'mutating-platform'],
    ])
    expect(new Set(report.nextRows.map(row => row.id)).size).toBe(report.summary.uniqueNextRows)
    expect(report.nextRows.every(row => row.cannotClaim)).toBe(true)
    expect(report.nextRows.every(row => !row.safeToAutomate)).toBe(true)
    expect(report.nextRows.every(row => row.nextOperatorAction.length > 0)).toBe(true)
    expect(report.nextRows.some(row =>
      row.issueIds.includes('style-proof-manifest-proof-stale')
    )).toBe(false)
    expect(report.nextRows.some(row =>
      row.freshnessIssueIds.includes('style-proof-manifest-proof-stale')
    )).toBe(false)
    expect(report.nextRows.find(row => row.kind === 'external-account')?.cannotClaimReason)
      .toContain('mutating credentialed platform action')
    expect(report.nextRows.find(row => row.kind === 'external-account')?.refKinds)
      .toEqual(['external-account', 'unsafe-to-automate', 'mutating-platform'])
    expect(report.nextRows.every(row =>
      row.commands.template.startsWith('pnpm --silent -C inkforge style-proof:external-handoff --template ')
    )).toBe(true)
    expect(report.nextRows.every(row =>
      row.commands.manifestDrafts.startsWith('pnpm --silent -C inkforge style-proof:external-handoff --manifest-drafts ')
    )).toBe(true)
    expect(report.nextRows.every(row =>
      row.commands.intake === 'pnpm --silent -C inkforge style-proof:manifest-intake --file REDACTED_MANIFEST.json --json'
    )).toBe(true)
    expect(report.nextRows.every(row =>
      row.commands.merge === 'pnpm --silent -C inkforge style-proof:manifest-merge --file REDACTED_MANIFEST.json --json'
    )).toBe(true)
    expect(report.nextRows.every(row => row.artifactGuidance.notProof)).toBe(true)
    expect(report.nextRows.every(row =>
      row.artifactGuidance.appendOnlyAfterExternalProof
    )).toBe(true)
    expect(report.nextRows.every(row =>
      row.artifactGuidance.templateCommand === row.commands.template
    )).toBe(true)
    expect(report.nextRows.every(row =>
      row.artifactGuidance.manifestDraftsCommand === row.commands.manifestDrafts
    )).toBe(true)
    expect(report.nextRows.every(row =>
      row.artifactGuidance.allMatchingTemplateCommand === row.commands.allMatchingTemplate
    )).toBe(true)
    expect(report.nextRows.every(row =>
      row.artifactGuidance.allMatchingManifestDraftsCommand === row.commands.allMatchingManifestDrafts
    )).toBe(true)
    expect(report.nextRows.every(row =>
      !row.commands.allMatchingTemplate.includes('--next-only')
    )).toBe(true)
    expect(report.nextRows.every(row =>
      !row.commands.allMatchingManifestDrafts.includes('--next-only')
    )).toBe(true)
    expect(report.nextRows.every(row => row.allMatchingSummary.notProof)).toBe(true)
    expect(report.nextRows.map(row => row.allMatchingSummary.rowCount)).toEqual([4, 4])
    expect(report.nextRows.find(row =>
      row.kind === 'phone-preview'
    )?.allMatchingSummary.requirementIds).toEqual([
      'cover-thumbnail-check',
      'dark-mode-check',
      'phone-preview-readback',
      'phone-screenshot',
    ])
    expect(report.nextRows.find(row =>
      row.kind === 'external-account'
    )?.allMatchingSummary.requirementIds).toEqual([
      'credentialed-channel-response',
      'sync-readback',
      'published-url-or-platform-preview',
      'scheduled-send-readback',
    ])
    expect(report.nextRows.find(row =>
      row.kind === 'phone-preview'
    )?.allMatchingSummary.requiresPhoneCount).toBe(4)
    expect(report.nextRows.find(row =>
      row.kind === 'external-account'
    )?.allMatchingSummary.mutatingPlatformCount).toBe(4)
    expect(report.nextRows.find(row =>
      row.requirementId === 'credentialed-channel-response'
    )?.artifactGuidance.requiredFields).toContain('externalAccountAuthenticated')
    expect(report.nextRows.find(row =>
      row.requirementId === 'credentialed-channel-response'
    )?.artifactGuidance.forbiddenFields).toContain('externalAccountLoginBlocked')
    expect(report.nextRows.find(row =>
      row.requirementId === 'cover-thumbnail-check'
    )?.artifactGuidance.requiredFields).toContain('coverThumbnailAccepted')
    expect(report.nextRows.map(row => row.commands.template)).toEqual([
      'pnpm --silent -C inkforge style-proof:external-handoff --template --platform=wechat --kind=phone-preview --status=blocked-by-external --issue=style-proof-manifest-requirement-missing --next-only',
      'pnpm --silent -C inkforge style-proof:external-handoff --template --platform=wechat --kind=external-account --status=unsafe-to-automate --issue=style-proof-manifest-requirement-missing --next-only',
    ])
    expect(report.nextRows.map(row => row.commands.allMatchingTemplate)).toEqual([
      'pnpm --silent -C inkforge style-proof:external-handoff --template --platform=wechat --kind=phone-preview --status=blocked-by-external --issue=style-proof-manifest-requirement-missing',
      'pnpm --silent -C inkforge style-proof:external-handoff --template --platform=wechat --kind=external-account --status=unsafe-to-automate --issue=style-proof-manifest-requirement-missing',
    ])
  })

  it('emits an application-scope JSON gate for the narrowed local round target', async () => {
    const result = await runReleasePreflightCli(['--scope=application', '--json'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')
    expectNoSensitiveFragments(result.stdout)

    const report = parseApplicationPreflightJson(result.stdout)
    expect(report.scope).toBe('application')
    expect(report.status).toBe('application-ready')
    expect(report.applicationGalleryStatus).toBe('application-gallery-ready')
    expect(report.canClaimApplicationReady).toBe(true)
    expect(report.canClaimReleaseComplete).toBe(false)
    expect(report.summary).toMatchObject({
      svgModuleCount: 27,
      svgFamilyCount: 7,
      personaCount: 4,
      renderedModulePersonaPairs: 108,
      applicationGalleryRenderedModulePersonaPairs: 108,
      applicationGalleryWechatSafeViolationCount: 0,
      applicationGalleryModuleSentinelFailureCount: 0,
      applicationGalleryIssueCount: 0,
      wechatApplicationSvgSlotCount: 5,
      wechatApplicationSvgShowcaseModuleCount: 27,
      wechatApplicationSvgSlotFailureCount: 0,
      wechatApplicationSurfaceCount: 2,
      wechatApplicationSurfaceFailureCount: 0,
      wechatExportPipelineContractCount: 3,
      wechatExportPipelineFailureCount: 0,
      wechatOptionInjectedModuleCount: 27,
      wechatOptionInjectionFailureCount: 0,
      wechatSafeViolationCount: 0,
      moduleSentinelFailureCount: 0,
      wechatStyleChoiceCount: 17,
      wechatUsableChoiceCount: 8,
      wechatSelectableChoiceCount: 8,
      usableButUnselectableWechatChoices: 0,
      actionableLocalRows: 0,
      manualDeferredOpenSteps: 7,
      releaseBlockingOpenSteps: 19,
      externalHandoffRows: 8,
      nextExternalRows: 2,
    })
    expect(report.moduleIssues).toEqual([])
    expect(report.applicationGalleryIssues).toEqual([])
    expect(report.wechatApplicationSlotIssues).toEqual([])
    expect(report.wechatApplicationSurfaceIssues).toEqual([])
    expect(report.wechatExportPipelineIssues).toEqual([])
    expect(report.wechatOptionIssues).toEqual([])
    expect(report.choiceIssues).toEqual([])
    expect(report.externalProof).toMatchObject({
      notProof: true,
      releaseCanClaimComplete: false,
      releaseStatus: 'blocked-by-external',
      releaseBlockingPhoneOpenSteps: 4,
      releaseBlockingExternalDependencyOpenSteps: 4,
      releaseBlockingUnsafeToAutomateOpenSteps: 4,
      releaseBlockingMutatingOpenSteps: 4,
      requiresManualWeChatProof: true,
      xhsZhihuPublishAutomationDeferred: true,
    })
  })

  it('prints copy-safe next-row commands in text output without claiming release success', async () => {
    const result = await runReleasePreflightCli([])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('operator commands (copy-safe placeholders):')
    expect(result.stdout).toContain('proof guidance (not proof):')
    expect(result.stdout).toContain('manualDeferredOpenSteps: 7')
    expect(result.stdout).toContain('releaseBlockingExternalDependencyOpenSteps: 4')
    expect(result.stdout).toContain('requiredFields: artifactFingerprint|exactArtifact|coverThumbnailAccepted|collectedAt|safeForCommit')
    expect(result.stdout).toContain('forbiddenFields: externalAccountLoginBlocked')
    expect(result.stdout).toContain('appendOnlyAfterExternalProof: yes')
    expect(result.stdout).toContain('allMatchingRowCount: 4')
    expect(result.stdout).toContain('allMatchingRequirementIds: cover-thumbnail-check|dark-mode-check|phone-preview-readback|phone-screenshot')
    expect(result.stdout).toContain('allMatchingRequirementIds: credentialed-channel-response|sync-readback|published-url-or-platform-preview|scheduled-send-readback')
    expect(result.stdout).toContain('allMatchingTemplate: pnpm --silent -C inkforge style-proof:external-handoff --template --platform=wechat --kind=phone-preview --status=blocked-by-external --issue=style-proof-manifest-requirement-missing')
    expect(result.stdout).toContain('style-proof:external-handoff --template --platform=wechat --kind=phone-preview --status=blocked-by-external --issue=style-proof-manifest-requirement-missing --next-only')
    expect(result.stdout).toContain('style-proof:external-handoff --manifest-drafts --platform=wechat --kind=external-account --status=unsafe-to-automate --issue=style-proof-manifest-requirement-missing --next-only')
    expect(result.stdout).toContain('style-proof:manifest-intake --file REDACTED_MANIFEST.json --json')
    expect(result.stdout).toContain('style-proof:manifest-merge --file REDACTED_MANIFEST.json --json')
    expect(result.stdout).toContain('release claim blocked: in-scope WeChat phone/account/platform proof gates remain open.')
    expect(result.stdout).toContain('XHS/Zhihu publish-side checks are manual-deferred for this round')
    expect(result.stdout).not.toContain('<redacted-manifest.json>')
    expect(result.stdout).not.toContain('canClaimComplete: true')
    expectNoSensitiveFragments(result.stdout)
  })

  it('prints application-scope text without claiming phone or account proof', async () => {
    const result = await runReleasePreflightCli(['--application'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('InkForge style-proof application preflight')
    expect(result.stdout).toContain('applicationReady: true')
    expect(result.stdout).toContain('canClaimReleaseComplete: false')
    expect(result.stdout).toContain('renderedModulePersonaPairs: 108')
    expect(result.stdout).toContain('applicationGalleryStatus: application-gallery-ready')
    expect(result.stdout).toContain('applicationGalleryRenderedModulePersonaPairs: 108')
    expect(result.stdout).toContain('applicationGalleryWechatSafeViolationCount: 0')
    expect(result.stdout).toContain('applicationGalleryModuleSentinelFailureCount: 0')
    expect(result.stdout).toContain('applicationGalleryIssueCount: 0')
    expect(result.stdout).toContain('wechatApplicationSvgSlotCount: 5')
    expect(result.stdout).toContain('wechatApplicationSvgShowcaseModuleCount: 27')
    expect(result.stdout).toContain('wechatApplicationSvgSlotFailureCount: 0')
    expect(result.stdout).toContain('wechatApplicationSurfaceCount: 2')
    expect(result.stdout).toContain('wechatApplicationSurfaceFailureCount: 0')
    expect(result.stdout).toContain('wechatExportPipelineContractCount: 3')
    expect(result.stdout).toContain('wechatExportPipelineFailureCount: 0')
    expect(result.stdout).toContain('wechatOptionInjectedModuleCount: 27')
    expect(result.stdout).toContain('wechatOptionInjectionFailureCount: 0')
    expect(result.stdout).toContain('- applicationGalleryIssues: 0')
    expect(result.stdout).toContain('- wechatApplicationSlotIssues: 0')
    expect(result.stdout).toContain('- wechatApplicationSurfaceIssues: 0')
    expect(result.stdout).toContain('- wechatExportPipelineIssues: 0')
    expect(result.stdout).toContain('usableButUnselectableWechatChoices: 0')
    expect(result.stdout).toContain('actionableLocalRows: 0')
    expect(result.stdout).toContain('external proof boundary (not proof):')
    expect(result.stdout).toContain('requiresManualWeChatProof: true')
    expect(result.stdout).toContain('XHS/Zhihu publish-side automation remains manually deferred for this round.')
    expect(result.stdout).not.toContain('canClaimComplete: true')
    expect(result.stdout).not.toContain('canClaimReleaseComplete: true')
    expect(result.stdout).not.toContain('releaseCanClaimComplete: true')
    expectNoSensitiveFragments(result.stdout)
  })

  it('prints help with a successful exit code', async () => {
    const result = await runReleasePreflightCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('Usage: pnpm style-proof:release-preflight [--json] [--scope=release|application]')
    expect(result.stdout).toContain('--json')
    expect(result.stdout).toContain('--scope=application')
    expect(result.stdout).toContain('--application')
    expect(result.stdout).toContain('--help')
    expect(result.stdout).toContain('pnpm --silent -C inkforge style-proof:release-preflight --json')
    expectNoSensitiveFragments(result.stdout)
  })

  it('exposes a dedicated package script for the narrowed application gate', () => {
    const scripts = readPackageJsonScripts()

    expect(scripts['style-proof:release-preflight']).toBe('tsx scripts/style-proof-release-preflight.ts')
    expect(scripts['style-proof:application-preflight']).toBe(
      'tsx scripts/style-proof-release-preflight.ts --scope=application',
    )
    expect(scripts['style-proof:application-acceptance']).toBe(
      'tsx scripts/style-proof-application-acceptance.ts',
    )
    expect(scripts['style-proof:application-gallery']).toBe('tsx scripts/style-proof-application-gallery.ts')
    expect(scripts['style-proof:wechat-manual-handoff']).toBe(
      'tsx scripts/style-proof-external-handoff.ts --template --platform=wechat --next-only --handoff-ok-exit-zero',
    )
    expect(scripts['style-proof:wechat-manual-manifest-drafts']).toBe(
      'tsx scripts/style-proof-external-handoff.ts --manifest-drafts --platform=wechat --next-only --handoff-ok-exit-zero',
    )
  })

  it('rejects unknown arguments before reading or claiming release success', async () => {
    const result = await runReleasePreflightCli(['--unknown-release-flag'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Unknown option: --unknown-release-flag')
    expect(result.stdout).toContain('Usage: pnpm style-proof:release-preflight [--json] [--scope=release|application]')
    expect(result.stdout).not.toContain('canClaimComplete')
    expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
  })
})
