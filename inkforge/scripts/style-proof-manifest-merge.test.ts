import { execFile, type ExecFileException } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

interface ManifestMergeCliResult {
  exitCode: number
  stdout: string
  stderr: string
}

interface ManifestMergeSourceSummary {
  index: number
  status: string
  acceptedManifestCount: number
  rejectedManifestCount: number
  schemaIssueCount: number
  schemaErrorCount: number
  schemaWarningCount: number
  semanticIssueCount: number
  artifactCount: number
  canClaimComplete: boolean
}

interface ManifestMergeIssueCount {
  id: string
  count: number
}

interface ManifestMergeNextProofStep {
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

interface ManifestMergeJsonReport {
  source: string
  status: string
  exitCode: number
  sourceFileCount: number
  outputRequested: boolean
  outputWritten: boolean
  canWritePack: boolean
  canClaimComplete: boolean
  blockers: string[]
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
    schema: ManifestMergeIssueCount[]
    semantic: ManifestMergeIssueCount[]
  }
  sources: ManifestMergeSourceSummary[]
  nextProofSteps: ManifestMergeNextProofStep[]
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const manifestMergeScriptPath = resolve(projectRoot, 'scripts', 'style-proof-manifest-merge.ts')

const tempDirs: string[] = []

const manifestMergeSensitiveFragments = [
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
  ['proof://redacted', 'merge'].join('/'),
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
  if (!error) return 0
  if (typeof error.code === 'number') return error.code
  if (typeof error.code === 'string') {
    const parsedCode = Number.parseInt(error.code, 10)
    if (Number.isFinite(parsedCode)) return parsedCode
  }

  return 1
}

function runManifestMergeCli(args: readonly string[]): Promise<ManifestMergeCliResult> {
  return new Promise(resolveCliRun => {
    execFile(
      process.execPath,
      [tsxCliPath, manifestMergeScriptPath, ...args],
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

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'inkforge-style-proof-merge-'))
  tempDirs.push(dir)
  return dir
}

function buildDocOnlyManifest(idPrefix: string): unknown {
  return {
    platform: 'wechat',
    claimedEvidence: ['doc-only'],
    artifacts: [{
      id: `${idPrefix}-catalog-source`,
      requirementId: 'catalog-source',
      kind: 'doc-reference',
      label: `${idPrefix} catalog source proof`,
      channel: 'local-artifact',
      action: 'catalog-source',
      readback: 'none',
      artifactRef: `proof://redacted/merge/${idPrefix}`,
      safeForCommit: true,
    }],
  }
}

function buildSensitiveManifest(): unknown {
  return {
    platform: 'wechat',
    claimedEvidence: ['doc-only'],
    artifacts: [{
      id: 'sensitive-catalog-source',
      requirementId: 'catalog-source',
      kind: 'doc-reference',
      label: 'sensitive catalog source proof',
      channel: 'local-artifact',
      action: 'catalog-source',
      readback: 'none',
      artifactRef: [['C:/Users', 'HP'].join('/'), 'runtime', ['proof', '.', 'har'].join('')].join('/'),
      safeForCommit: true,
    }],
  }
}

function buildDraftManifest(platform: string, choiceId: string): unknown {
  return {
    platform,
    choiceId,
    scope: 'style-choice',
    claimedEvidence: [],
    artifacts: [],
  }
}

function buildTemplateMisuseManifest(): unknown {
  return {
    platform: 'wechat',
    choiceId: 'wechat-card-rich',
    scope: 'style-choice',
    claimedEvidence: ['pc-editor-paste'],
    artifacts: [{
      id: 'merge-template-misuse-row',
      requirementId: 'pc-editor-paste-event',
      kind: 'editor-readback',
      label: 'merge template misuse fixture',
      platform: 'wechat',
      choiceId: 'wechat-card-rich',
      channel: 'platform-editor',
      action: 'pc-paste',
      readback: 'visual-and-dom',
      artifactFingerprint: 'inkforge-merge-template-misuse-fixture',
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
      artifactDraftTemplate: {
        draftOnly: true,
        notProof: true,
        appendOnlyAfterExternalProof: true,
        keepOutOfManifestUntilCollected: true,
      },
      artifactGuidance: {
        requiredFields: ['artifactFingerprint', 'exactArtifact', 'safeForCommit'],
        forbiddenFields: ['sensitive'],
      },
    }],
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value), 'utf8')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasNumberKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every(key => typeof value[key] === 'number')
}

function isManifestMergeSourceSummary(value: unknown): value is ManifestMergeSourceSummary {
  return isRecord(value) &&
    typeof value.index === 'number' &&
    typeof value.status === 'string' &&
    hasNumberKeys(value, [
      'acceptedManifestCount',
      'rejectedManifestCount',
      'schemaIssueCount',
      'schemaErrorCount',
      'schemaWarningCount',
      'semanticIssueCount',
      'artifactCount',
    ]) &&
    typeof value.canClaimComplete === 'boolean'
}

function isManifestMergeIssueCount(value: unknown): value is ManifestMergeIssueCount {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.count === 'number'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isManifestMergeNextProofStep(value: unknown): value is ManifestMergeNextProofStep {
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

function isManifestMergeSummary(value: unknown): value is ManifestMergeJsonReport['summary'] {
  return isRecord(value) && hasNumberKeys(value, [
    'inputManifestCount',
    'acceptedManifestCount',
    'rejectedManifestCount',
    'schemaIssueCount',
    'schemaErrorCount',
    'schemaWarningCount',
    'semanticIssueCount',
    'artifactCount',
    'duplicateArtifactIdCount',
    'cannotClaimRequirements',
    'cannotClaimSteps',
    'safeToAutomateOpenSteps',
    'externalDependencyOpenSteps',
    'phoneOpenSteps',
    'mutatingOpenSteps',
    'unsafeToAutomateOpenSteps',
  ])
}

function isManifestMergeJsonReport(value: unknown): value is ManifestMergeJsonReport {
  return isRecord(value) &&
    value.source === 'files' &&
    typeof value.status === 'string' &&
    typeof value.exitCode === 'number' &&
    typeof value.sourceFileCount === 'number' &&
    typeof value.outputRequested === 'boolean' &&
    typeof value.outputWritten === 'boolean' &&
    typeof value.canWritePack === 'boolean' &&
    typeof value.canClaimComplete === 'boolean' &&
    Array.isArray(value.blockers) &&
    value.blockers.every(blocker => typeof blocker === 'string') &&
    isManifestMergeSummary(value.summary) &&
    isRecord(value.issueIds) &&
    Array.isArray(value.issueIds.schema) &&
    value.issueIds.schema.every(isManifestMergeIssueCount) &&
    Array.isArray(value.issueIds.semantic) &&
    value.issueIds.semantic.every(isManifestMergeIssueCount) &&
    Array.isArray(value.sources) &&
    value.sources.every(isManifestMergeSourceSummary) &&
    Array.isArray(value.nextProofSteps) &&
    value.nextProofSteps.every(isManifestMergeNextProofStep)
}

function parseManifestMergeJson(stdout: string): ManifestMergeJsonReport {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isManifestMergeJsonReport(parsed)) {
    throw new Error('style-proof manifest merge JSON shape is invalid')
  }

  return parsed
}

function expectNoSensitiveFragments(output: string): void {
  for (const fragment of manifestMergeSensitiveFragments) {
    expect(output).not.toContain(fragment)
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('style-proof manifest merge CLI', { timeout: 60_000 }, () => {
  it('prints a sanitized text merge summary for clean redacted packs', async () => {
    const dir = await createTempDir()
    const first = join(dir, 'first.json')
    const second = join(dir, 'second.json')
    await writeJson(first, { manifests: [buildDocOnlyManifest('first')] })
    await writeJson(second, { manifests: [buildDocOnlyManifest('second')] })

    const result = await runManifestMergeCli(['--file', first, '--file', second])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('InkForge style-proof manifest merge')
    expect(result.stdout).toContain('status: merge-ready')
    expect(result.stdout).toContain('sourceFileCount: 2')
    expect(result.stdout).toContain('acceptedManifestCount: 2')
    expect(result.stdout).toContain('semanticIssueCount: 0')
    expect(result.stdout).toContain('canClaimComplete: false')
    expect(result.stdout).toContain('next proof steps:')
    expect(result.stdout).toContain('fields=')
    expect(result.stdout).toContain('next=')
    expectNoSensitiveFragments(result.stdout)
  })

  it('emits sanitized JSON without leaking raw artifact references', async () => {
    const dir = await createTempDir()
    const input = join(dir, 'input.json')
    await writeJson(input, { manifests: [buildDocOnlyManifest('json')] })

    const result = await runManifestMergeCli(['--file', input, '--json'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')
    expectNoSensitiveFragments(result.stdout)

    const report = parseManifestMergeJson(result.stdout)
    expect(report.status).toBe('merge-ready')
    expect(report.canWritePack).toBe(true)
    expect(report.canClaimComplete).toBe(false)
    expect(report.summary).toMatchObject({
      inputManifestCount: 1,
      acceptedManifestCount: 1,
      schemaErrorCount: 0,
      semanticIssueCount: 0,
      artifactCount: 1,
    })
    expect(report.sources).toHaveLength(1)
    expect(report.sources[0]).toMatchObject({
      index: 0,
      status: 'ready-for-review',
      acceptedManifestCount: 1,
      canClaimComplete: false,
    })
    expect(report.nextProofSteps.length).toBeGreaterThan(0)
    expect(report.nextProofSteps.every(row => row.status !== 'completed')).toBe(true)
  })

  it('emits runbook-level next proof fields after merging empty external draft packs', async () => {
    const dir = await createTempDir()
    const first = join(dir, 'wechat-draft.json')
    const second = join(dir, 'zhihu-draft.json')
    await writeJson(first, { manifests: [buildDraftManifest('wechat', 'wechat-card-rich')] })
    await writeJson(second, { manifests: [buildDraftManifest('zhihu', 'zhihu-public-image-upload-checklist')] })

    const result = await runManifestMergeCli(['--file', first, '--file', second, '--json'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expectNoSensitiveFragments(result.stdout)

    const report = parseManifestMergeJson(result.stdout)
    expect(report.status).toBe('merge-blocked')
    expect(report.canClaimComplete).toBe(false)
    expect(report.summary.artifactCount).toBe(0)
    expect(report.blockers).toContain('semantic-issue')

    const phoneStep = report.nextProofSteps.find(row =>
      row.platform === 'wechat' &&
      row.requirementId === 'cover-thumbnail-check' &&
      row.gate === 'phone-preview'
    )
    expect(phoneStep).toBeDefined()
    expect(phoneStep?.requiresPhone).toBe(true)
    expect(phoneStep?.requiredChannels).toEqual(['phone-preview'])
    expect(phoneStep?.requiredActions).toEqual(['cover-thumbnail-check'])
    expect(phoneStep?.requiredReadbacks).toContain('phone')
    expect(phoneStep?.requiredFields).toEqual(expect.arrayContaining([
      'artifactFingerprint',
      'exactArtifact',
      'coverThumbnailAccepted',
      'safeForCommit',
    ]))

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
  })

  it('writes a clean merged pack only when requested and does not print the output path', async () => {
    const dir = await createTempDir()
    const first = join(dir, 'first.json')
    const second = join(dir, 'second.json')
    const output = join(dir, 'merged', 'pack.json')
    await writeJson(first, { manifests: [buildDocOnlyManifest('write-first')] })
    await writeJson(second, { manifests: [buildDocOnlyManifest('write-second')] })

    const result = await runManifestMergeCli(['--file', first, '--file', second, '--out', output, '--json'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).not.toContain(output)
    const report = parseManifestMergeJson(result.stdout)
    expect(report.status).toBe('written')
    expect(report.outputRequested).toBe(true)
    expect(report.outputWritten).toBe(true)

    const written = JSON.parse(await readFile(output, 'utf8')) as unknown
    expect(isRecord(written)).toBe(true)
    expect(Array.isArray(written.manifests)).toBe(true)
    expect(written.manifests).toHaveLength(2)
  })

  it('blocks overwrite without --force and keeps the existing output intact', async () => {
    const dir = await createTempDir()
    const input = join(dir, 'input.json')
    const output = join(dir, 'merged.json')
    await writeJson(input, { manifests: [buildDocOnlyManifest('overwrite')] })
    await writeFile(output, 'existing-content', 'utf8')

    const result = await runManifestMergeCli(['--file', input, '--out', output, '--json'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).not.toContain(output)
    const report = parseManifestMergeJson(result.stdout)
    expect(report.status).toBe('merge-blocked')
    expect(report.blockers).toContain('output-exists')
    expect(await readFile(output, 'utf8')).toBe('existing-content')
    expectNoSensitiveFragments(result.stdout)
  })

  it('blocks sensitive artifact references before writing a merged pack', async () => {
    const dir = await createTempDir()
    const input = join(dir, 'sensitive.json')
    const output = join(dir, 'merged.json')
    await writeJson(input, { manifests: [buildSensitiveManifest()] })

    const result = await runManifestMergeCli(['--file', input, '--out', output, '--json'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expectNoSensitiveFragments(result.stdout)
    const report = parseManifestMergeJson(result.stdout)
    expect(report.status).toBe('merge-blocked')
    expect(report.blockers).toContain('semantic-issue')
    expect(report.issueIds.semantic.some(issue => issue.id === 'style-proof-manifest-sensitive-artifact')).toBe(true)
    await expect(readFile(output, 'utf8')).rejects.toThrow()
  })

  it('blocks external handoff template artifacts before writing a merged pack', async () => {
    const dir = await createTempDir()
    const input = join(dir, 'template-misuse.json')
    const output = join(dir, 'merged-template-misuse.json')
    await writeJson(input, { manifests: [buildTemplateMisuseManifest()] })

    const result = await runManifestMergeCli(['--file', input, '--out', output, '--json'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expectNoSensitiveFragments(result.stdout)

    const report = parseManifestMergeJson(result.stdout)
    expect(report.status).toBe('merge-blocked')
    expect(report.canWritePack).toBe(false)
    expect(report.outputWritten).toBe(false)
    expect(report.blockers).toContain('input-schema-error')
    expect(report.blockers).toContain('empty-pack')
    expect(report.summary).toMatchObject({
      acceptedManifestCount: 0,
      artifactCount: 0,
    })
    expect(report.sources[0]).toMatchObject({
      status: 'schema-invalid',
      acceptedManifestCount: 0,
      rejectedManifestCount: 1,
      artifactCount: 0,
    })
    expect(report.issueIds.schema).toContainEqual({
      id: 'style-proof-manifest-intake-template-artifact',
      count: 1,
    })
    expect(report.issueIds.semantic).toEqual([])
    await expect(readFile(output, 'utf8')).rejects.toThrow()
  })

  it('rejects malformed JSON as a merge-blocked sanitized report', async () => {
    const dir = await createTempDir()
    const input = join(dir, 'malformed.json')
    await writeFile(input, '{"manifests": [', 'utf8')

    const result = await runManifestMergeCli(['--file', input, '--json'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    const report = parseManifestMergeJson(result.stdout)
    expect(report.status).toBe('merge-blocked')
    expect(report.blockers).toContain('input-schema-error')
    expect(report.issueIds.schema.some(issue => issue.id === 'style-proof-manifest-intake-json-invalid')).toBe(true)
    expectNoSensitiveFragments(result.stdout)
  })

  it('returns usage errors without reading or writing packs', async () => {
    const result = await runManifestMergeCli(['--json'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Missing required --file option.')
    expect(result.stdout).toContain('Usage: pnpm style-proof:manifest-merge')
    expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
  })

  it('prints help with machine-readable JSON guidance', async () => {
    const result = await runManifestMergeCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('Usage: pnpm style-proof:manifest-merge')
    expect(result.stdout).toContain('--file')
    expect(result.stdout).toContain('--json')
    expect(result.stdout).toContain('--help')
    expect(result.stdout).toContain(
      'pnpm --silent -C inkforge style-proof:manifest-merge --file <redacted-manifest.json> --json'
    )
    expectNoSensitiveFragments(result.stdout)
  })

  it('rejects conflicting output modes and unknown arguments', async () => {
    const dir = await createTempDir()
    const input = join(dir, 'input.json')
    await writeJson(input, { manifests: [buildDocOnlyManifest('modes')] })

    const conflict = await runManifestMergeCli(['--file', input, '--text', '--json'])
    expect(conflict.exitCode).toBe(2)
    expect(conflict.stderr).toContain('Choose only one output mode: --text or --json.')
    expectNoSensitiveFragments(`${conflict.stdout}\n${conflict.stderr}`)

    const unknown = await runManifestMergeCli(['--file', input, '--unknown-merge-flag'])
    expect(unknown.exitCode).toBe(2)
    expect(unknown.stderr).toContain('Unknown option: --unknown-merge-flag')
    expectNoSensitiveFragments(`${unknown.stdout}\n${unknown.stderr}`)
  })

  it('returns a sanitized file-read error for unreadable inputs', async () => {
    const dir = await createTempDir()
    const missing = join(dir, 'missing.json')

    const result = await runManifestMergeCli(['--file', missing])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Unable to read one manifest JSON file.')
    expect(result.stderr).not.toContain(missing)
    expect(result.stdout).toBe('')
    expectNoSensitiveFragments(result.stderr)
  })
})
