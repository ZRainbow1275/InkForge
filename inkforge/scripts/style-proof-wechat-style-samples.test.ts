import { execFile, type ExecFileException } from 'node:child_process'
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

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const styleSamplesScriptPath = resolve(projectRoot, 'scripts', 'style-proof-wechat-style-samples.ts')

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

  it('prints help and rejects unknown options before rendering samples', async () => {
    const help = await runWechatStyleSamplesCli(['--help'])
    expect(help.exitCode).toBe(0)
    expect(help.stderr.trim()).toBe('')
    expect(help.stdout).toContain('Usage: pnpm style-proof:wechat-style-samples [--json]')
    expect(help.stdout).toContain('does not open a browser')

    const invalid = await runWechatStyleSamplesCli(['--unknown-style-samples-flag'])
    expect(invalid.exitCode).toBe(2)
    expect(invalid.stderr).toContain('Unknown option: --unknown-style-samples-flag')
    expect(invalid.stdout).toContain('Usage: pnpm style-proof:wechat-style-samples')
  })
})
