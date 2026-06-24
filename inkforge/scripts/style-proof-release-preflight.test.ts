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
  kind: string
  platform: string
  requirementId: string
  boundary: string
  status: string
  cannotClaim: boolean
  safeToAutomate: boolean
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
    typeof value.kind === 'string' &&
    typeof value.platform === 'string' &&
    typeof value.requirementId === 'string' &&
    typeof value.boundary === 'string' &&
    typeof value.status === 'string' &&
    typeof value.cannotClaim === 'boolean' &&
    typeof value.safeToAutomate === 'boolean'
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
      cannotClaimSteps: 29,
      phoneOpenSteps: 4,
      externalDependencyOpenSteps: 14,
      unsafeToAutomateOpenSteps: 13,
      mutatingOpenSteps: 13,
      externalHandoffRows: 18,
      safeExternalRows: 0,
      actionableLocalRows: 0,
      nextRowRefs: 5,
      uniqueNextRows: 3,
    })
    expect(report.nextRows.map(row => row.kind)).toEqual([
      'phone-preview',
      'external-account',
      'public-host',
      'unsafe-to-automate',
      'mutating-platform',
    ])
    expect(report.nextRows.every(row => row.cannotClaim)).toBe(true)
    expect(report.nextRows.every(row => !row.safeToAutomate)).toBe(true)
  })

  it('prints help with a successful exit code', async () => {
    const result = await runReleasePreflightCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('Usage: pnpm style-proof:release-preflight [--json]')
    expect(result.stdout).toContain('--json')
    expect(result.stdout).toContain('--help')
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
