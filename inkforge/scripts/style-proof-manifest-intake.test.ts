import { execFile, type ExecFileException } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface ManifestIntakeCliResult {
  exitCode: number
  stdout: string
  stderr: string
}

interface ManifestIntakeIssueCount {
  id: string
  count: number
}

interface ManifestIntakeCannotClaimRow {
  platform: string
  requirementId: string
  gate: string
  status: string
  issueIds: string[]
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

interface ManifestIntakeNextProofStep {
  platform: string
  requirementId: string
  requirementLabel: string
  gate: string
  boundary: string
  status: string
  choiceIds: string[]
  issueIds: string[]
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
  cannotClaimReason: string | null
  nextOperatorAction: string
  requiredChannels: string[]
  requiredActions: string[]
  requiredReadbacks: string[]
  requiredFields: string[]
  forbiddenFields: string[]
  acceptedHostStatuses: string[]
  maxFreshnessDays: number | null
  redactionBoundary: string
  successCriteria: string[]
  failureSignals: string[]
}

interface ManifestIntakeJsonReport {
  source: string
  status: string
  canClaimComplete: boolean
  exitCode: number
  summary: {
    inputManifestCount: number
    acceptedManifestCount: number
    rejectedManifestCount: number
    schemaIssueCount: number
    schemaErrorCount: number
    schemaWarningCount: number
    semanticIssueCount: number
    artifactCount: number
    cannotClaimRequirements: number
    cannotClaimSteps: number
    safeToAutomateOpenSteps: number
    externalDependencyOpenSteps: number
    phoneOpenSteps: number
    mutatingOpenSteps: number
    unsafeToAutomateOpenSteps: number
    completedRequirements: number
    openGates: number
    duplicateArtifactIdCount: number
  }
  issueIds: {
    schema: ManifestIntakeIssueCount[]
    semantic: ManifestIntakeIssueCount[]
  }
  platforms: Array<{
    platform: string
    completedRequirements: number
    cannotClaimRequirements: number
    blockedByExternalRequirements: number
    unsafeToAutomateRequirements: number
    safeToAutomateOpenRequirements: number
    nextLocalSafeGate: string | null
    nextPhoneGate: string | null
    nextExternalAccountGate: string | null
    nextUnsafeToAutomateGate: string | null
  }>
  cannotClaimRows: ManifestIntakeCannotClaimRow[]
  nextProofSteps: ManifestIntakeNextProofStep[]
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const manifestIntakeScriptPath = resolve(projectRoot, 'scripts', 'style-proof-manifest-intake.ts')

const manifestIntakeSensitiveFragments = [
  ['C:/Users', 'HP'].join('/'),
  ['C:', 'Users', 'HP'].join('\\'),
  ['.', 'codex', 'tools', 'cloakbrowser'].join('/'),
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
  ['draft', 'URL'].join(''),
  ['publish', 'URL'].join(''),
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

function runManifestIntakeCli(args: readonly string[]): Promise<ManifestIntakeCliResult> {
  return new Promise(resolveCliRun => {
    execFile(
      process.execPath,
      [tsxCliPath, manifestIntakeScriptPath, ...args],
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

async function withManifestFile<T>(jsonText: string, run: (filePath: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'inkforge-style-proof-intake-'))
  const filePath = join(directory, 'redacted-manifest.json')
  try {
    await writeFile(filePath, jsonText, 'utf8')
    return await run(filePath)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasNumberKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every(key => typeof value[key] === 'number')
}

function isIssueCount(value: unknown): value is ManifestIntakeIssueCount {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.count === 'number'
}

function isCannotClaimRow(value: unknown): value is ManifestIntakeCannotClaimRow {
  return isRecord(value) &&
    typeof value.platform === 'string' &&
    typeof value.requirementId === 'string' &&
    typeof value.gate === 'string' &&
    typeof value.status === 'string' &&
    Array.isArray(value.issueIds) &&
    value.issueIds.every(issueId => typeof issueId === 'string') &&
    hasNumberKeys(value, [
      'required',
      'satisfied',
      'missing',
      'invalid',
      'artifactCount',
      'acceptedArtifactCount',
    ]) &&
    typeof value.mutatesPlatform === 'boolean' &&
    typeof value.requiresExternalAccount === 'boolean' &&
    typeof value.requiresPhone === 'boolean' &&
    typeof value.safeToAutomate === 'boolean'
}

function isPlatformSummary(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.platform === 'string' &&
    hasNumberKeys(value, [
      'completedRequirements',
      'cannotClaimRequirements',
      'blockedByExternalRequirements',
      'unsafeToAutomateRequirements',
      'safeToAutomateOpenRequirements',
    ]) &&
    (typeof value.nextLocalSafeGate === 'string' || value.nextLocalSafeGate === null) &&
    (typeof value.nextPhoneGate === 'string' || value.nextPhoneGate === null) &&
    (typeof value.nextExternalAccountGate === 'string' || value.nextExternalAccountGate === null) &&
    (typeof value.nextUnsafeToAutomateGate === 'string' || value.nextUnsafeToAutomateGate === null)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isNextProofStep(value: unknown): value is ManifestIntakeNextProofStep {
  return isRecord(value) &&
    typeof value.platform === 'string' &&
    typeof value.requirementId === 'string' &&
    typeof value.requirementLabel === 'string' &&
    typeof value.gate === 'string' &&
    typeof value.boundary === 'string' &&
    typeof value.status === 'string' &&
    isStringArray(value.choiceIds) &&
    isStringArray(value.issueIds) &&
    hasNumberKeys(value, [
      'required',
      'satisfied',
      'missing',
      'invalid',
      'artifactCount',
      'acceptedArtifactCount',
    ]) &&
    typeof value.mutatesPlatform === 'boolean' &&
    typeof value.requiresExternalAccount === 'boolean' &&
    typeof value.requiresPhone === 'boolean' &&
    typeof value.safeToAutomate === 'boolean' &&
    (typeof value.cannotClaimReason === 'string' || value.cannotClaimReason === null) &&
    typeof value.nextOperatorAction === 'string' &&
    isStringArray(value.requiredChannels) &&
    isStringArray(value.requiredActions) &&
    isStringArray(value.requiredReadbacks) &&
    isStringArray(value.requiredFields) &&
    isStringArray(value.forbiddenFields) &&
    isStringArray(value.acceptedHostStatuses) &&
    (typeof value.maxFreshnessDays === 'number' || value.maxFreshnessDays === null) &&
    typeof value.redactionBoundary === 'string' &&
    isStringArray(value.successCriteria) &&
    isStringArray(value.failureSignals)
}

function isManifestIntakeJsonReport(value: unknown): value is ManifestIntakeJsonReport {
  return isRecord(value) &&
    value.source === 'file' &&
    typeof value.status === 'string' &&
    typeof value.canClaimComplete === 'boolean' &&
    typeof value.exitCode === 'number' &&
    isRecord(value.summary) &&
    hasNumberKeys(value.summary, [
      'inputManifestCount',
      'acceptedManifestCount',
      'rejectedManifestCount',
      'schemaIssueCount',
      'schemaErrorCount',
      'schemaWarningCount',
      'semanticIssueCount',
      'artifactCount',
      'cannotClaimRequirements',
      'cannotClaimSteps',
      'safeToAutomateOpenSteps',
      'externalDependencyOpenSteps',
      'phoneOpenSteps',
      'mutatingOpenSteps',
      'unsafeToAutomateOpenSteps',
      'completedRequirements',
      'openGates',
      'duplicateArtifactIdCount',
    ]) &&
    isRecord(value.issueIds) &&
    Array.isArray(value.issueIds.schema) &&
    value.issueIds.schema.every(isIssueCount) &&
    Array.isArray(value.issueIds.semantic) &&
    value.issueIds.semantic.every(isIssueCount) &&
    Array.isArray(value.platforms) &&
    value.platforms.every(isPlatformSummary) &&
    Array.isArray(value.cannotClaimRows) &&
    value.cannotClaimRows.every(isCannotClaimRow) &&
    Array.isArray(value.nextProofSteps) &&
    value.nextProofSteps.every(isNextProofStep)
}

function parseManifestIntakeJson(stdout: string): ManifestIntakeJsonReport {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isManifestIntakeJsonReport(parsed)) {
    throw new Error('style-proof manifest intake JSON shape is invalid')
  }

  return parsed
}

function expectNoSensitiveFragments(output: string): void {
  for (const fragment of manifestIntakeSensitiveFragments) {
    expect(output).not.toContain(fragment)
  }
}

function getRedactedFixtureManifestJson(): string {
  const sensitiveArtifactRef = [
    ['C:/Users', 'HP'].join('/'),
    ['.', 'codex', 'tools', 'cloakbrowser'].join('/'),
    'profiles',
    'inkforge-private',
    ['scan', 'qr'].join('-') + ['.', 'har'].join(''),
  ].join('/')

  return JSON.stringify({
    manifests: [
      {
        platform: 'wechat',
        choiceId: 'wechat-classic-inline',
        scope: 'style-choice',
        claimedEvidence: ['unit-tested'],
        artifacts: [
          {
            id: 'manifest-intake-unit-proof',
            requirementId: 'unit-test-coverage',
            kind: 'test-log',
            label: 'redacted unit proof with unsafe private reference fixture',
            evidenceLabel: 'unit-tested',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'unit-test',
            action: 'test-run',
            readback: 'test-assertion',
            artifactRef: sensitiveArtifactRef,
            committed: true,
            safeForCommit: true,
          },
        ],
      },
    ],
  })
}

describe('style-proof manifest intake CLI', { timeout: 60_000 }, () => {
  it('prints sanitized text intake results without leaking raw artifact references', async () => {
    await withManifestFile(getRedactedFixtureManifestJson(), async filePath => {
      const result = await runManifestIntakeCli(['--file', filePath])

      expect(result.exitCode).toBe(1)
      expect(result.stderr.trim()).toBe('')
      expect(result.stdout).toContain('InkForge style-proof manifest intake')
      expect(result.stdout).toContain('source: file')
      expect(result.stdout).toContain('status: ready-for-review')
      expect(result.stdout).toContain('canClaimComplete: false')
      expect(result.stdout).toContain('acceptedManifestCount: 1')
      expect(result.stdout).toContain('semanticIssueCount:')
      expect(result.stdout).toContain('style-proof-manifest-sensitive-artifact')
      expect(result.stdout).toContain('cannot claim rows:')
      expect(result.stdout).toContain('next proof steps:')
      expect(result.stdout).toContain('fields=')
      expect(result.stdout).toContain('next=')
      expect(result.stdout).toContain('wechat/')
      expect(result.stdout).toContain('boundary: sanitized local intake only')
      expectNoSensitiveFragments(result.stdout)
    })
  })

  it('emits sanitized JSON intake results for operator-supplied manifest packs', async () => {
    await withManifestFile(getRedactedFixtureManifestJson(), async filePath => {
      const result = await runManifestIntakeCli(['--file', filePath, '--json'])

      expect(result.exitCode).toBe(1)
      expect(result.stderr.trim()).toBe('')
      expect(result.stdout.trim()).not.toContain('\n')
      expectNoSensitiveFragments(result.stdout)

      const report = parseManifestIntakeJson(result.stdout)
      expect(report.source).toBe('file')
      expect(report.status).toBe('ready-for-review')
      expect(report.canClaimComplete).toBe(false)
      expect(report.exitCode).toBe(1)
      expect(report.summary).toMatchObject({
        inputManifestCount: 1,
        acceptedManifestCount: 1,
        rejectedManifestCount: 0,
        schemaErrorCount: 0,
        artifactCount: 1,
      })
      expect(report.issueIds.semantic.map(issue => issue.id)).toContain('style-proof-manifest-sensitive-artifact')
      expect(report.platforms.map(platform => platform.platform)).toEqual(['wechat', 'xiaohongshu', 'zhihu'])
      expect(report.cannotClaimRows.length).toBeGreaterThan(0)
      expect(report.cannotClaimRows.some(row => row.platform === 'wechat')).toBe(true)
      expect(report.cannotClaimRows.every(row => row.status !== 'completed')).toBe(true)
      expect(report.nextProofSteps.length).toBeGreaterThan(0)
      expect(report.nextProofSteps.every(row => row.status !== 'completed')).toBe(true)
    })
  })

  it('emits runbook-level next proof fields without treating an empty draft as evidence', async () => {
    const draftJson = JSON.stringify({
      manifests: [
        {
          platform: 'wechat',
          choiceId: 'wechat-card-rich',
          scope: 'style-choice',
          claimedEvidence: [],
          artifacts: [],
        },
        {
          platform: 'zhihu',
          choiceId: 'zhihu-public-image-upload-checklist',
          scope: 'style-choice',
          claimedEvidence: [],
          artifacts: [],
        },
      ],
    })

    await withManifestFile(draftJson, async filePath => {
      const result = await runManifestIntakeCli(['--file', filePath, '--json'])

      expect(result.exitCode).toBe(1)
      expect(result.stderr.trim()).toBe('')
      expectNoSensitiveFragments(result.stdout)

      const report = parseManifestIntakeJson(result.stdout)
      expect(report.canClaimComplete).toBe(false)
      expect(report.summary.artifactCount).toBe(0)

      const phoneStep = report.nextProofSteps.find(row =>
        row.platform === 'wechat' &&
        row.requirementId === 'cover-thumbnail-check' &&
        row.gate === 'phone-preview'
      )
      expect(phoneStep).toBeDefined()
      expect(phoneStep?.requiresPhone).toBe(true)
      expect(phoneStep?.requiresExternalAccount).toBe(false)
      expect(phoneStep?.requiredChannels).toEqual(['phone-preview'])
      expect(phoneStep?.requiredActions).toEqual(['cover-thumbnail-check'])
      expect(phoneStep?.requiredReadbacks).toContain('phone')
      expect(phoneStep?.requiredFields).toEqual(expect.arrayContaining([
        'artifactFingerprint',
        'exactArtifact',
        'coverThumbnailAccepted',
        'safeForCommit',
      ]))
      expect(phoneStep?.nextOperatorAction).toContain('phone')
      expect(phoneStep?.redactionBoundary).not.toContain('C:/Users')

      const publicHostStep = report.nextProofSteps.find(row =>
        row.platform === 'zhihu' &&
        row.requirementId === 'public-image-host' &&
        row.gate === 'public-host'
      )
      expect(publicHostStep).toBeDefined()
      expect(publicHostStep?.acceptedHostStatuses).toEqual(['public-https', 'platform-hosted'])
      expect(publicHostStep?.requiredChannels).toEqual(['public-web'])
      expect(publicHostStep?.requiredActions).toEqual(['public-image-host-check'])
      expect(publicHostStep?.requiredFields).toEqual(expect.arrayContaining([
        'artifactRef',
        'hostStatus',
        'safeForCommit',
      ]))
      expect(publicHostStep?.nextOperatorAction).toContain('public')
    })
  })

  it('rejects external handoff artifact draft templates pasted as proof artifacts', async () => {
    const templateMisuseJson = JSON.stringify({
      manifests: [
        {
          platform: 'wechat',
          choiceId: 'wechat-card-rich',
          scope: 'style-choice',
          claimedEvidence: ['pc-editor-paste'],
          artifacts: [
            {
              id: 'mistaken-template-row',
              requirementId: 'pc-editor-paste-event',
              kind: 'editor-readback',
              label: 'mistaken external handoff template paste',
              platform: 'wechat',
              choiceId: 'wechat-card-rich',
              channel: 'platform-editor',
              action: 'pc-paste',
              readback: 'visual-and-dom',
              artifactFingerprint: 'inkforge-template-misuse-fixture',
              exactArtifact: true,
              authenticatedSessionVerified: true,
              platformEditorTargetVerified: true,
              platformEditorSurfaceVerified: true,
              platformEditorDomVerified: true,
              ordinaryClipboardPasteVerified: true,
              sameEditorTabVerified: true,
              pasteInputEventVerified: true,
              editorBodyMutationVerified: true,
              mojibakeFreeVerified: true,
              safeForCommit: true,
              draftOnly: true,
              notProof: true,
              appendOnlyAfterExternalProof: true,
              keepOutOfManifestUntilCollected: true,
              baseFields: {
                id: null,
                artifactRef: null,
                collectedAt: null,
              },
              requiredVerificationFields: [
                { field: 'artifactFingerprint', value: null, required: true, forbidden: false },
              ],
              acceptedValues: {
                channels: ['platform-editor'],
                actions: ['pc-paste'],
                readbacks: ['visual-and-dom'],
                hostStatuses: [],
              },
              doNotInclude: ['browser profiles', 'cookies'],
            },
          ],
        },
      ],
    })

    await withManifestFile(templateMisuseJson, async filePath => {
      const result = await runManifestIntakeCli(['--file', filePath, '--json'])

      expect(result.exitCode).toBe(2)
      expect(result.stderr.trim()).toBe('')
      expectNoSensitiveFragments(result.stdout)

      const report = parseManifestIntakeJson(result.stdout)
      expect(report.status).toBe('schema-invalid')
      expect(report.canClaimComplete).toBe(false)
      expect(report.summary).toMatchObject({
        inputManifestCount: 1,
        acceptedManifestCount: 0,
        rejectedManifestCount: 1,
        schemaErrorCount: 1,
        artifactCount: 0,
      })
      expect(report.issueIds.schema).toContainEqual({
        id: 'style-proof-manifest-intake-template-artifact',
        count: 1,
      })
      expect(report.issueIds.semantic).toEqual([])
    })
  })

  it('accepts UTF-8 BOM-prefixed JSON files produced by Windows editors', async () => {
    await withManifestFile(`\uFEFF${getRedactedFixtureManifestJson()}`, async filePath => {
      const result = await runManifestIntakeCli(['--file', filePath, '--json'])

      expect(result.exitCode).toBe(1)
      expect(result.stderr.trim()).toBe('')
      expectNoSensitiveFragments(result.stdout)

      const report = parseManifestIntakeJson(result.stdout)
      expect(report.status).toBe('ready-for-review')
      expect(report.summary).toMatchObject({
        inputManifestCount: 1,
        acceptedManifestCount: 1,
        rejectedManifestCount: 0,
        schemaErrorCount: 0,
      })
      expect(report.issueIds.schema).toEqual([])
    })
  })

  it('returns schema-invalid output and exit code 2 for malformed JSON files', async () => {
    await withManifestFile('{ "manifests": [', async filePath => {
      const result = await runManifestIntakeCli(['--file', filePath])

      expect(result.exitCode).toBe(2)
      expect(result.stderr.trim()).toBe('')
      expect(result.stdout).toContain('status: schema-invalid')
      expect(result.stdout).toContain('exitCode: 2')
      expect(result.stdout).toContain('style-proof-manifest-intake-json-invalid')
      expect(result.stdout).not.toContain(filePath)
      expectNoSensitiveFragments(result.stdout)
    })
  })

  it('prints help with a successful exit code', async () => {
    const result = await runManifestIntakeCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('Usage: pnpm style-proof:manifest-intake --file <redacted-manifest.json> [--text|--json]')
    expect(result.stdout).toContain('--file')
    expect(result.stdout).toContain('--json')
    expect(result.stdout).toContain('--help')
    expect(result.stdout).toContain(
      'pnpm --silent -C inkforge style-proof:manifest-intake --file <redacted-manifest.json> --json'
    )
    expectNoSensitiveFragments(result.stdout)
  })

  it('rejects missing file arguments before reading or claiming proof success', async () => {
    const result = await runManifestIntakeCli(['--json'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Missing required --file option.')
    expect(result.stdout).toContain('Usage: pnpm style-proof:manifest-intake')
    expect(result.stdout).not.toContain('canClaimComplete')
    expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
  })

  it('rejects conflicting output modes before reading or claiming proof success', async () => {
    await withManifestFile(getRedactedFixtureManifestJson(), async filePath => {
      const result = await runManifestIntakeCli(['--file', filePath, '--text', '--json'])

      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain('Choose only one output mode: --text or --json.')
      expect(result.stdout).toContain('Usage: pnpm style-proof:manifest-intake')
      expect(result.stdout).not.toContain('canClaimComplete')
      expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
    })
  })

  it('rejects unreadable files without printing local paths', async () => {
    const missingPath = join(tmpdir(), 'inkforge-style-proof-intake-missing.json')
    const result = await runManifestIntakeCli(['--file', missingPath])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Unable to read manifest JSON file.')
    expect(result.stderr).not.toContain(missingPath)
    expect(result.stdout.trim()).toBe('')
    expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
  })

  it('rejects unknown arguments before reading or claiming proof success', async () => {
    const result = await runManifestIntakeCli(['--unknown-intake-flag'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Unknown option: --unknown-intake-flag')
    expect(result.stdout).toContain('Usage: pnpm style-proof:manifest-intake')
    expect(result.stdout).not.toContain('canClaimComplete')
    expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
  })
})
