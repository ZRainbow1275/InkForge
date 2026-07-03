import { execFile, type ExecFileException } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface ApplicationGalleryCliResult {
  exitCode: number
  stdout: string
  stderr: string
}

interface ApplicationGalleryJsonReport {
  notProof: true
  scope: 'application-gallery'
  status: 'application-gallery-ready' | 'application-gallery-blocked'
  outputPath: string
  summary: {
    svgModuleCount: number
    svgFamilyCount: number
    personaCount: number
    renderedModulePersonaPairs: number
    wechatSafeViolationCount: number
    moduleSentinelFailureCount: number
  }
  issues: Array<{
    moduleId: string
    family: string
    persona: string
    issue: string
  }>
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const galleryScriptPath = resolve(projectRoot, 'scripts', 'style-proof-application-gallery.ts')

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

function runGalleryCli(args: readonly string[]): Promise<ApplicationGalleryCliResult> {
  return new Promise(resolveResult => {
    execFile(
      process.execPath,
      [tsxCliPath, galleryScriptPath, ...args],
      {
        cwd: projectRoot,
        env: getCliEnvironment(),
        maxBuffer: 1024 * 1024 * 8,
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

function isApplicationGalleryJsonReport(value: unknown): value is ApplicationGalleryJsonReport {
  return isRecord(value) &&
    value.notProof === true &&
    value.scope === 'application-gallery' &&
    (value.status === 'application-gallery-ready' || value.status === 'application-gallery-blocked') &&
    typeof value.outputPath === 'string' &&
    isRecord(value.summary) &&
    hasNumberKeys(value.summary, [
      'svgModuleCount',
      'svgFamilyCount',
      'personaCount',
      'renderedModulePersonaPairs',
      'wechatSafeViolationCount',
      'moduleSentinelFailureCount',
    ]) &&
    Array.isArray(value.issues)
}

function parseGalleryJson(stdout: string): ApplicationGalleryJsonReport {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isApplicationGalleryJsonReport(parsed)) {
    throw new Error('style-proof application gallery JSON shape is invalid')
  }

  return parsed
}

describe('style-proof application gallery CLI', { timeout: 60_000 }, () => {
  it('renders a local visual gallery for every SVG module/persona pair', async () => {
    const tempDir = await mkdtemp(resolve(projectRoot, '.tmp-style-proof-gallery-'))
    const outputPath = resolve(tempDir, 'gallery.html')

    try {
      const result = await runGalleryCli(['--out', outputPath, '--json'])

      expect(result.exitCode).toBe(0)
      expect(result.stderr.trim()).toBe('')
      expect(result.stdout.trim()).not.toContain('\n')

      const report = parseGalleryJson(result.stdout)
      expect(report).toMatchObject({
        notProof: true,
        scope: 'application-gallery',
        status: 'application-gallery-ready',
        summary: {
          svgModuleCount: 27,
          svgFamilyCount: 7,
          personaCount: 4,
          renderedModulePersonaPairs: 108,
          wechatSafeViolationCount: 0,
          moduleSentinelFailureCount: 0,
        },
        issues: [],
      })
      expect(report.outputPath).toContain('.tmp-style-proof-gallery-')

      const html = await readFile(outputPath, 'utf8')
      expect(html).toContain('InkForge Application SVG Gallery')
      expect(html.match(/class="gallery-tile"/g)).toHaveLength(108)
      expect(html.match(/data-ink-svg=/g)?.length).toBeGreaterThanOrEqual(108)
      expect(html).toContain('width="100%"')
      expect(html).toContain('viewBox')
      expect(html).toContain('This artifact is visual evidence for local application rendering only.')
      expect(html).not.toContain('<script')
      expect(html).not.toContain('foreignObject')
      expect(html).not.toContain('javascript:')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('prints help and rejects unknown options before writing gallery output', async () => {
    const help = await runGalleryCli(['--help'])
    expect(help.exitCode).toBe(0)
    expect(help.stderr.trim()).toBe('')
    expect(help.stdout).toContain('Usage: pnpm style-proof:application-gallery [--json] [--out <path>]')
    expect(help.stdout).toContain('does not open a browser')

    const invalid = await runGalleryCli(['--unknown-gallery-flag'])
    expect(invalid.exitCode).toBe(2)
    expect(invalid.stderr).toContain('Unknown option: --unknown-gallery-flag')
    expect(invalid.stdout).toContain('Usage: pnpm style-proof:application-gallery')
  })
})
