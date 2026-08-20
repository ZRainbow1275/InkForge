import { execFile, type ExecFileException } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface WechatStyleSamplesCliResult {
  exitCode: number
  stdout: string
  stderr: string
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
  issues: unknown[]
  samples: Array<{
    choiceId: string
    presetId: string
    htmlLength: number
    htmlSha256: string
    svgModuleCount: number
    svgModuleIds: string[]
  }>
  boundary: {
    xhsZhihuPublishAutomationDeferred: true
    requiresManualWeChatProof: true
    doesNotClaimReleaseComplete: true
  }
}

interface WechatDraftPreflightJsonReport {
  schemaVersion: 'wechat-draft-preflight/v1'
  status: 'complete'
  notProof: true
  corpus: {
    ref: string
    bytes: number
    sha256: string
    sourceOwnedImageSha256: string
  }
  commit: string
  requestedChoices: string[]
  cases: Array<{
    choiceId: string
    artifactFingerprint: string
    eligibility: 'official-draft-eligible' | 'official-draft-ineligible'
    reasonCodes: string[]
    inputFingerprint: string
    planFingerprint: string
    semanticNames: {
      tags: string[]
      roles: string[]
      attributes: string[]
      styleProperties: string[]
    }
    images: {
      uniqueNonWechatImageCount: number
      uniqueWechatHostedImageCount: number
      preparedArticleUploadCount: number
      preparedLocalArticleSourceCount: number
    }
    cover: {
      state: string
      sourceOwnedImageSha256: string
      coverIntent: true
    }
    sideEffectUpperBounds: {
      draftCreates: number
      articleImageUploads: number
      permanentCoverUploads: number
    }
  }>
  boundary: {
    noWechatWrite: true
    noTauriInvoke: true
    requiresSeparateExternalApproval: true
    doesNotClaimWechatReadback: true
  }
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const repositoryRoot = resolve(projectRoot, '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const styleSamplesScriptPath = resolve(projectRoot, 'scripts', 'style-proof-wechat-style-samples.ts')
const draftPreflightCorpusPath = resolve(
  projectRoot,
  '..',
  '.trellis',
  'tasks',
  '08-20-mdnice-yiban-meibian-rendering-benchmark',
  'research',
  'wechat-fidelity-corpus.md',
)

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

function runWechatStyleSamplesCli(args: readonly string[]): Promise<WechatStyleSamplesCliResult> {
  return new Promise(resolveResult => {
    execFile(
      process.execPath,
      [tsxCliPath, styleSamplesScriptPath, ...args],
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

function isWechatStyleSamplesJsonReport(value: unknown): value is WechatStyleSamplesJsonReport {
  return isRecord(value) &&
    value.notProof === true &&
    value.scope === 'wechat-style-export-samples' &&
    (value.status === 'wechat-style-samples-ready' || value.status === 'wechat-style-samples-blocked') &&
    isRecord(value.summary) &&
    hasNumberKeys(value.summary, [
      'wechatStyleChoiceCount',
      'selectableStyleChoiceCount',
      'renderedStyleChoiceCount',
      'uniquePresetCount',
      'svgBearingStyleChoiceCount',
      'totalSvgModuleCount',
      'issueCount',
    ]) &&
    Array.isArray(value.issues) &&
    Array.isArray(value.samples) &&
    value.samples.every(sample =>
      isRecord(sample) &&
      typeof sample.choiceId === 'string' &&
      typeof sample.presetId === 'string' &&
      typeof sample.htmlLength === 'number' &&
      typeof sample.htmlSha256 === 'string' &&
      typeof sample.svgModuleCount === 'number' &&
      Array.isArray(sample.svgModuleIds)
    ) &&
    isRecord(value.boundary) &&
    value.boundary.xhsZhihuPublishAutomationDeferred === true &&
    value.boundary.requiresManualWeChatProof === true &&
    value.boundary.doesNotClaimReleaseComplete === true
}

function parseWechatStyleSamplesJson(stdout: string): WechatStyleSamplesJsonReport {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isWechatStyleSamplesJsonReport(parsed)) {
    throw new Error('style-proof WeChat style samples JSON shape is invalid')
  }

  return parsed
}

function parseWechatDraftPreflightJson(stdout: string): WechatDraftPreflightJsonReport {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (
    !isRecord(parsed)
    || parsed.schemaVersion !== 'wechat-draft-preflight/v1'
    || parsed.status !== 'complete'
    || parsed.notProof !== true
    || !isRecord(parsed.corpus)
    || !Array.isArray(parsed.requestedChoices)
    || !Array.isArray(parsed.cases)
    || !isRecord(parsed.boundary)
    || parsed.boundary.noWechatWrite !== true
    || parsed.boundary.noTauriInvoke !== true
  ) {
    throw new Error('draft preflight JSON shape is invalid')
  }
  return parsed as unknown as WechatDraftPreflightJsonReport
}

describe('style-proof WeChat style samples CLI', { timeout: 90_000 }, () => {
  it('renders selectable WeChat style choices through the real WeChat export pipeline', async () => {
    const result = await runWechatStyleSamplesCli(['--json'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')

    const report = parseWechatStyleSamplesJson(result.stdout)
    expect(report).toMatchObject({
      notProof: true,
      scope: 'wechat-style-export-samples',
      status: 'wechat-style-samples-ready',
      summary: {
        wechatStyleChoiceCount: 17,
        selectableStyleChoiceCount: 13,
        renderedStyleChoiceCount: 13,
        svgBearingStyleChoiceCount: 13,
        totalSvgModuleCount: 45,
        issueCount: 0,
      },
      issues: [],
    })
    expect(report.summary.uniquePresetCount).toBeGreaterThanOrEqual(4)
    expect(report.summary.totalSvgModuleCount).toBeGreaterThanOrEqual(report.summary.renderedStyleChoiceCount)
    expect(report.samples).toHaveLength(13)
    expect(report.samples.every(sample => sample.htmlSha256.match(/^[a-f0-9]{64}$/))).toBe(true)
    expect(report.samples.every(sample => sample.svgModuleCount > 0)).toBe(true)
  })

  it('renders the pinned Markdown corpus into a deterministic no-write draft preflight report', async () => {
    expect(readFileSync(resolve(repositoryRoot, '.gitattributes'), 'utf8').split(/\r?\n/)).toContain(
      '.trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/research/wechat-fidelity-corpus.md text eol=lf',
    )
    const args = ['--draft-preflight', '--corpus', draftPreflightCorpusPath, '--json']
    const first = await runWechatStyleSamplesCli(args)
    const second = await runWechatStyleSamplesCli(args)

    expect(first.exitCode).toBe(0)
    expect(first.stderr.trim()).toBe('')
    expect(first.stdout).not.toContain('data:image')
    expect(first.stdout).not.toContain('mmbiz.qpic.cn')
    const firstReport = parseWechatDraftPreflightJson(first.stdout)
    const secondReport = parseWechatDraftPreflightJson(second.stdout)

    expect(firstReport.requestedChoices).toEqual([
      'wechat-classic-inline',
      'wechat-flagship-kiln',
      'wechat-flagship-kiln-paste-safe',
    ])
    expect(firstReport.cases).toHaveLength(3)
    expect(firstReport.cases.map(item => [item.choiceId, item.eligibility, item.reasonCodes])).toEqual([
      ['wechat-classic-inline', 'official-draft-ineligible', ['content-invalid']],
      ['wechat-flagship-kiln', 'official-draft-ineligible', ['content-invalid']],
      ['wechat-flagship-kiln-paste-safe', 'official-draft-ineligible', ['content-invalid']],
    ])
    expect(firstReport.corpus.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(firstReport.corpus.sourceOwnedImageSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(firstReport.commit).toMatch(/^[a-f0-9]{40}$/)
    expect(firstReport.cases.every(item => item.inputFingerprint.match(/^[a-f0-9]{64}$/))).toBe(true)
    expect(firstReport.cases.every(item => item.planFingerprint.match(/^[a-f0-9]{64}$/))).toBe(true)
    expect(firstReport.cases.every(item => item.artifactFingerprint.match(/^sha256:[a-f0-9]{64}$/))).toBe(true)
    expect(firstReport.cases.every(item =>
      Object.values(item.semanticNames).every(names => names.length > 0 && names.join('\0') === [...names].sort().join('\0'))
    )).toBe(true)
    const semanticUnion = Object.fromEntries(
      (['tags', 'roles', 'attributes', 'styleProperties'] as const).map(key => [
        key,
        new Set(firstReport.cases.flatMap(item => item.semanticNames[key])),
      ]),
    ) as Record<keyof WechatDraftPreflightJsonReport['cases'][number]['semanticNames'], Set<string>>
    const semanticUnionSnapshot = Object.fromEntries(
      Object.entries(semanticUnion).map(([key, names]) => [key, [...names].sort()]),
    )
    expect(Object.fromEntries(Object.entries(semanticUnion).map(([key, names]) => [key, names.size]))).toEqual({
      tags: 39,
      roles: 3,
      attributes: 49,
      styleProperties: 74,
    })
    expect(createHash('sha256').update(JSON.stringify(semanticUnionSnapshot)).digest('hex'))
      .toBe('2aeb1226188fa97871bdfca956c32b85f0e8283a9c5b59c4713c6edcff7c7e77')
    expect([...semanticUnion.tags]).toEqual(expect.arrayContaining(['cite', 'details', 'summary', 'svg', 'path']))
    expect([...semanticUnion.roles]).toEqual(expect.arrayContaining(['doc-endnotes', 'doc-noteref', 'source-owned-cover']))
    expect([...semanticUnion.attributes]).toEqual(expect.arrayContaining([
      'd', 'data-inkforge-role', 'fill', 'id', 'viewbox',
    ]))
    expect([...semanticUnion.styleProperties]).toEqual(expect.arrayContaining([
      '-moz-osx-font-smoothing', '-webkit-font-smoothing', 'border-image-source',
      'counter-increment', 'font-feature-settings', 'font-variant-numeric',
    ]))
    expect(firstReport.cases.every(item => item.images.uniqueNonWechatImageCount === 1)).toBe(true)
    expect(firstReport.cases.every(item => item.images.uniqueWechatHostedImageCount === 0)).toBe(true)
    expect(firstReport.cases.every(item => item.sideEffectUpperBounds.articleImageUploads === 1)).toBe(true)
    expect(firstReport.cases.every(item => item.sideEffectUpperBounds.permanentCoverUploads === 1)).toBe(true)
    expect(secondReport).toEqual(firstReport)
  })

  it('prints help and rejects unknown options before rendering samples', async () => {
    const help = await runWechatStyleSamplesCli(['--help'])
    expect(help.exitCode).toBe(0)
    expect(help.stderr.trim()).toBe('')
    expect(help.stdout).toContain('Usage: pnpm style-proof:wechat-style-samples [--json]')
    expect(help.stdout).toContain('does not open a browser')
    expect(help.stdout).toContain('--draft-preflight')

    const invalid = await runWechatStyleSamplesCli(['--unknown-style-samples-flag'])
    expect(invalid.exitCode).toBe(2)
    expect(invalid.stderr).toContain('Unknown option: --unknown-style-samples-flag')
    expect(invalid.stdout).toContain('Usage: pnpm style-proof:wechat-style-samples')

    const missingCorpus = await runWechatStyleSamplesCli(['--draft-preflight', '--json'])
    expect(missingCorpus.exitCode).toBe(1)
    expect(missingCorpus.stderr).toContain('--draft-preflight requires --corpus <path>')
  })
})
