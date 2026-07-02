import { execFile, type ExecFileException } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface ExternalHandoffCliResult {
  exitCode: number
  stdout: string
  stderr: string
}

interface ExternalHandoffSummary {
  externalHandoffRows: number
  phoneRows: number
  externalAccountRows: number
  publicHostRows: number
  unsafeToAutomateRows: number
  mutatingRows: number
  safeExternalRows: number
  actionableLocalRows: number
}

interface ExternalHandoffRow {
  id: string
  platform: string
  requirementId: string
  boundary: string
  status: string
  blockerKinds: string[]
  issueIds: string[]
  freshnessIssueIds: string[]
  requiresExternalAccount: boolean
  requiresPhone: boolean
  safeToAutomate: boolean
  cannotClaim: boolean
  nextOperatorAction: string
}

interface ExternalHandoffNextRowRef {
  kind: string
  row: ExternalHandoffRow
}

interface ExternalHandoffJsonPacket {
  canClaimComplete: boolean
  status: string
  canContinueLocally: boolean
  requiresOperator: boolean
  requiresPhone: boolean
  requiresExternalAccount: boolean
  requiresPublicHost: boolean
  containsUnsafeToAutomateRows: boolean
  containsMutatingPlatformRows: boolean
  recommendedNextAction: string | null
  cannotAutoCompleteReason: string | null
  summary: ExternalHandoffSummary
  rows: ExternalHandoffRow[]
  nextRowRefs: ExternalHandoffNextRowRef[]
  nextRows: ExternalHandoffRow[]
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const externalHandoffScriptPath = resolve(projectRoot, 'scripts', 'style-proof-external-handoff.ts')

const externalHandoffSensitiveFragments = [
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
  ['private', ' material'].join(''),
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

function runExternalHandoffCli(args: readonly string[]): Promise<ExternalHandoffCliResult> {
  return new Promise(resolveCliRun => {
    execFile(
      process.execPath,
      [tsxCliPath, externalHandoffScriptPath, ...args],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env: getCliEnvironment(),
        maxBuffer: 2 * 1024 * 1024,
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

function isExternalHandoffSummary(value: unknown): value is ExternalHandoffSummary {
  return isRecord(value) && hasNumberKeys(value, [
    'externalHandoffRows',
    'phoneRows',
    'externalAccountRows',
    'publicHostRows',
    'unsafeToAutomateRows',
    'mutatingRows',
    'safeExternalRows',
    'actionableLocalRows',
  ])
}

function isExternalHandoffRow(value: unknown): value is ExternalHandoffRow {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.platform === 'string' &&
    typeof value.requirementId === 'string' &&
    typeof value.boundary === 'string' &&
    typeof value.status === 'string' &&
    Array.isArray(value.blockerKinds) &&
    value.blockerKinds.every(kind => typeof kind === 'string') &&
    Array.isArray(value.issueIds) &&
    value.issueIds.every(issueId => typeof issueId === 'string') &&
    Array.isArray(value.freshnessIssueIds) &&
    value.freshnessIssueIds.every(issueId => typeof issueId === 'string') &&
    typeof value.requiresExternalAccount === 'boolean' &&
    typeof value.requiresPhone === 'boolean' &&
    typeof value.safeToAutomate === 'boolean' &&
    typeof value.cannotClaim === 'boolean' &&
    typeof value.nextOperatorAction === 'string'
}

function isExternalHandoffNextRowRef(value: unknown): value is ExternalHandoffNextRowRef {
  return isRecord(value) &&
    typeof value.kind === 'string' &&
    isExternalHandoffRow(value.row)
}

function isExternalHandoffJsonPacket(value: unknown): value is ExternalHandoffJsonPacket {
  return isRecord(value) &&
    typeof value.canClaimComplete === 'boolean' &&
    typeof value.status === 'string' &&
    typeof value.canContinueLocally === 'boolean' &&
    typeof value.requiresOperator === 'boolean' &&
    typeof value.requiresPhone === 'boolean' &&
    typeof value.requiresExternalAccount === 'boolean' &&
    typeof value.requiresPublicHost === 'boolean' &&
    typeof value.containsUnsafeToAutomateRows === 'boolean' &&
    typeof value.containsMutatingPlatformRows === 'boolean' &&
    (typeof value.recommendedNextAction === 'string' || value.recommendedNextAction === null) &&
    (typeof value.cannotAutoCompleteReason === 'string' || value.cannotAutoCompleteReason === null) &&
    isExternalHandoffSummary(value.summary) &&
    Array.isArray(value.rows) &&
    value.rows.every(isExternalHandoffRow) &&
    Array.isArray(value.nextRowRefs) &&
    value.nextRowRefs.every(isExternalHandoffNextRowRef) &&
    Array.isArray(value.nextRows) &&
    value.nextRows.every(isExternalHandoffRow)
}

function parseExternalHandoffJson(stdout: string): ExternalHandoffJsonPacket {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isExternalHandoffJsonPacket(parsed)) {
    throw new Error('style-proof external handoff JSON shape is invalid')
  }

  return parsed
}

function expectNoSensitiveFragments(output: string): void {
  for (const fragment of externalHandoffSensitiveFragments) {
    expect(output).not.toContain(fragment)
  }
}

describe('style-proof external handoff CLI', { timeout: 60_000 }, () => {
  it('prints markdown handoff rows and blocks completion while external gates remain open', async () => {
    const result = await runExternalHandoffCli([])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('# Committed Style Proof External Handoff')
    expect(result.stdout).toContain('- Status: blocked-by-external')
    expect(result.stdout).toContain('- Can claim complete: no')
    expect(result.stdout).toContain('- Can continue locally: no')
    expect(result.stdout).toContain('- Requires operator: yes')
    expect(result.stdout).toContain('- Phone rows: 4')
    expect(result.stdout).toContain('- External account rows: 14')
    expect(result.stdout).toContain('- Public host rows: 1')
    expect(result.stdout).toContain('- External handoff rows: 19')
    expect(result.stdout).toContain('## Cannot-Claim Boundary')
    expect(result.stdout).toContain('Do not claim phone preview, mobile interaction, Dark Mode')
    expect(result.stdout).toContain('- phone-preview: wechat / cover-thumbnail-check / phone-preview:')
    expect(result.stdout).toContain('- Issue ids: style-proof-manifest-proof-stale')
    expect(result.stdout).toContain('- Freshness issue ids: style-proof-manifest-proof-stale')
    expectNoSensitiveFragments(result.stdout)
  })

  it('emits the raw handoff packet JSON without claiming external proof completion', async () => {
    const result = await runExternalHandoffCli(['--json'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')
    expectNoSensitiveFragments(result.stdout)

    const packet = parseExternalHandoffJson(result.stdout)
    expect(packet.status).toBe('blocked-by-external')
    expect(packet.canClaimComplete).toBe(false)
    expect(packet.canContinueLocally).toBe(false)
    expect(packet.requiresOperator).toBe(true)
    expect(packet.requiresPhone).toBe(true)
    expect(packet.requiresExternalAccount).toBe(true)
    expect(packet.requiresPublicHost).toBe(true)
    expect(packet.containsUnsafeToAutomateRows).toBe(true)
    expect(packet.containsMutatingPlatformRows).toBe(true)
    expect(packet.summary).toMatchObject({
      externalHandoffRows: 19,
      phoneRows: 4,
      externalAccountRows: 14,
      publicHostRows: 1,
      unsafeToAutomateRows: 10,
      mutatingRows: 14,
      safeExternalRows: 0,
      actionableLocalRows: 0,
    })
    expect(packet.rows).toHaveLength(19)
    expect(packet.nextRowRefs).toHaveLength(5)
    expect(packet.nextRows).toHaveLength(4)
    expect(packet.nextRowRefs.map(ref => ref.kind)).toEqual([
      'phone-preview',
      'external-account',
      'public-host',
      'unsafe-to-automate',
      'mutating-platform',
    ])
    expect(packet.nextRowRefs.every(ref => ref.row.cannotClaim)).toBe(true)
    expect(packet.nextRowRefs.every(ref => !ref.row.safeToAutomate)).toBe(true)
    expect(packet.nextRowRefs.some(ref =>
      ref.row.issueIds.includes('style-proof-manifest-proof-stale')
    )).toBe(true)
    expect(packet.nextRowRefs.some(ref =>
      ref.row.freshnessIssueIds.includes('style-proof-manifest-proof-stale')
    )).toBe(true)
  })

  it('prints help with a successful exit code', async () => {
    const result = await runExternalHandoffCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('Usage: pnpm style-proof:external-handoff [--markdown|--json]')
    expect(result.stdout).toContain('--markdown')
    expect(result.stdout).toContain('--json')
    expect(result.stdout).toContain('--help')
    expectNoSensitiveFragments(result.stdout)
  })

  it('rejects invalid output modes before reading or claiming proof success', async () => {
    const result = await runExternalHandoffCli(['--markdown', '--json'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Choose only one output mode: --markdown or --json')
    expect(result.stdout).toContain('Usage: pnpm style-proof:external-handoff [--markdown|--json]')
    expect(result.stdout).not.toContain('Can claim complete')
    expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
  })

  it('rejects unknown arguments before reading or claiming proof success', async () => {
    const result = await runExternalHandoffCli(['--unknown-handoff-flag'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Unknown option: --unknown-handoff-flag')
    expect(result.stdout).toContain('Usage: pnpm style-proof:external-handoff [--markdown|--json]')
    expect(result.stdout).not.toContain('Can claim complete')
    expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
  })
})
