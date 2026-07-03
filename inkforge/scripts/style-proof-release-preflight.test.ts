import { execFile, type ExecFileException } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface ReleasePreflightCliResult {
  exitCode: number
  stdout: string
  stderr: string
}

interface ReleasePreflightSummary {
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

interface ReleasePreflightNextRow {
  id: string
  kind: string
  refKinds: string[]
  commands: ReleasePreflightNextRowCommands
  artifactGuidance: ReleasePreflightArtifactGuidance
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
}

interface ReleasePreflightNextRowCommands {
  template: string
  manifestDrafts: string
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

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const releasePreflightScriptPath = resolve(projectRoot, 'scripts', 'style-proof-release-preflight.ts')

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
    typeof value.commands.intake === 'string' &&
    typeof value.commands.merge === 'string' &&
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
      externalHandoffRows: 15,
      safeExternalRows: 0,
      actionableLocalRows: 0,
      nextRowRefs: 5,
      uniqueNextRows: 3,
    })
    expect(report.nextRows).toHaveLength(3)
    expect(report.nextRows.map(row => row.kind)).toEqual([
      'phone-preview',
      'external-account',
      'public-host',
    ])
    expect(report.nextRows.map(row => row.refKinds)).toEqual([
      ['phone-preview'],
      ['external-account', 'unsafe-to-automate', 'mutating-platform'],
      ['public-host'],
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
    expect(report.nextRows.find(row =>
      row.requirementId === 'credentialed-channel-response'
    )?.artifactGuidance.requiredFields).toContain('externalAccountAuthenticated')
    expect(report.nextRows.find(row =>
      row.requirementId === 'credentialed-channel-response'
    )?.artifactGuidance.forbiddenFields).toContain('externalAccountLoginBlocked')
    expect(report.nextRows.find(row =>
      row.requirementId === 'public-image-host'
    )?.artifactGuidance.acceptedHostStatuses).toEqual(['public-https', 'platform-hosted'])
    expect(report.nextRows.find(row =>
      row.requirementId === 'cover-thumbnail-check'
    )?.artifactGuidance.requiredFields).toContain('coverThumbnailAccepted')
    expect(report.nextRows.map(row => row.commands.template)).toEqual([
      'pnpm --silent -C inkforge style-proof:external-handoff --template --platform=wechat --kind=phone-preview --status=blocked-by-external --issue=style-proof-manifest-requirement-missing --next-only',
      'pnpm --silent -C inkforge style-proof:external-handoff --template --platform=wechat --kind=external-account --status=unsafe-to-automate --issue=style-proof-manifest-requirement-missing --next-only',
      'pnpm --silent -C inkforge style-proof:external-handoff --template --platform=zhihu --kind=public-host --status=blocked-by-external --issue=style-proof-manifest-requirement-missing --next-only',
    ])
  })

  it('prints copy-safe next-row commands in text output without claiming release success', async () => {
    const result = await runReleasePreflightCli([])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('operator commands (copy-safe placeholders):')
    expect(result.stdout).toContain('proof guidance (not proof):')
    expect(result.stdout).toContain('requiredFields: artifactFingerprint|exactArtifact|coverThumbnailAccepted|collectedAt|safeForCommit')
    expect(result.stdout).toContain('forbiddenFields: externalAccountLoginBlocked')
    expect(result.stdout).toContain('acceptedHostStatuses: public-https|platform-hosted')
    expect(result.stdout).toContain('appendOnlyAfterExternalProof: yes')
    expect(result.stdout).toContain('style-proof:external-handoff --template --platform=wechat --kind=phone-preview --status=blocked-by-external --issue=style-proof-manifest-requirement-missing --next-only')
    expect(result.stdout).toContain('style-proof:external-handoff --manifest-drafts --platform=wechat --kind=external-account --status=unsafe-to-automate --issue=style-proof-manifest-requirement-missing --next-only')
    expect(result.stdout).toContain('style-proof:manifest-intake --file REDACTED_MANIFEST.json --json')
    expect(result.stdout).toContain('style-proof:manifest-merge --file REDACTED_MANIFEST.json --json')
    expect(result.stdout).toContain('release claim blocked: external phone/account/public-host/platform proof gates remain open.')
    expect(result.stdout).not.toContain('<redacted-manifest.json>')
    expect(result.stdout).not.toContain('canClaimComplete: true')
    expectNoSensitiveFragments(result.stdout)
  })

  it('prints help with a successful exit code', async () => {
    const result = await runReleasePreflightCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('Usage: pnpm style-proof:release-preflight [--json]')
    expect(result.stdout).toContain('--json')
    expect(result.stdout).toContain('--help')
    expect(result.stdout).toContain('pnpm --silent -C inkforge style-proof:release-preflight --json')
    expectNoSensitiveFragments(result.stdout)
  })

  it('rejects unknown arguments before reading or claiming release success', async () => {
    const result = await runReleasePreflightCli(['--unknown-release-flag'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Unknown option: --unknown-release-flag')
    expect(result.stdout).toContain('Usage: pnpm style-proof:release-preflight [--json]')
    expect(result.stdout).not.toContain('canClaimComplete')
    expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
  })
})
