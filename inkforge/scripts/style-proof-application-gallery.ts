import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildThemeContext,
  checkWechatSafe,
  SVG_MODULES,
} from '../src/services/export/svg-modules/index.ts'

type ApplicationGalleryStatus = 'application-gallery-ready' | 'application-gallery-blocked'
type ApplicationGalleryPersona = (typeof APPLICATION_GALLERY_PERSONAS)[number]

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const workspaceRoot = resolve(projectRoot, '..')
const DEFAULT_OUTPUT_PATH = resolve(
  workspaceRoot,
  'prompts/0601/evidence/application-svg-gallery-20260704.html',
)

const APPLICATION_GALLERY_PERSONAS = ['academic', 'business', 'lifestyle', 'creative'] as const
const APPLICATION_GALLERY_PERSONA_COLORS = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
} as const satisfies Record<ApplicationGalleryPersona, string>

interface ApplicationGalleryIssue {
  moduleId: string
  family: string
  persona: ApplicationGalleryPersona
  issue: string
}

interface ApplicationGalleryTile {
  moduleId: string
  family: string
  description: string
  persona: ApplicationGalleryPersona
  html: string
}

interface ApplicationGalleryReport {
  notProof: true
  scope: 'application-gallery'
  status: ApplicationGalleryStatus
  outputPath: string
  summary: {
    svgModuleCount: number
    svgFamilyCount: number
    personaCount: number
    renderedModulePersonaPairs: number
    wechatSafeViolationCount: number
    moduleSentinelFailureCount: number
  }
  issues: readonly ApplicationGalleryIssue[]
}

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:application-gallery [--json] [--out <path>]',
    '',
    'Renders every registered InkForge SVG module across the current application personas',
    'into a local visual HTML gallery, while checking the same WeChat-safe module contract',
    'used by application preflight.',
    '',
    'This command writes a local evidence artifact only. It does not open a browser, paste',
    'into WeChat, upload, sync, schedule, publish, or create phone/account proof.',
    '',
    'Options:',
    '  --json        Print a compact JSON report.',
    '  --out <path>  Write the gallery HTML to a specific path.',
    '  --help        Print this help.',
  ].join('\n'))
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function toReportPath(outputPath: string): string {
  const relativePath = relative(workspaceRoot, outputPath).replaceAll('\\', '/')
  return relativePath.startsWith('..') ? outputPath.replaceAll('\\', '/') : relativePath
}

function parseOutputPath(args: readonly string[]): string {
  const equalsArg = args.find(arg => arg.startsWith('--out='))
  if (equalsArg) {
    const value = equalsArg.slice('--out='.length)
    return isAbsolute(value) ? value : resolve(workspaceRoot, value)
  }

  const outIndex = args.indexOf('--out')
  if (outIndex >= 0) {
    const value = args[outIndex + 1]
    if (!value || value.startsWith('--')) {
      throw new Error('--out requires a path value')
    }
    return isAbsolute(value) ? value : resolve(workspaceRoot, value)
  }

  return DEFAULT_OUTPUT_PATH
}

function getUnknownArgs(args: readonly string[]): string[] {
  const unknownArgs: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--json' || arg === '--help' || arg.startsWith('--out=')) {
      continue
    }
    if (arg === '--out') {
      index += 1
      continue
    }
    unknownArgs.push(arg)
  }

  return unknownArgs
}

function getModuleSentinelIssues(html: string, moduleId: string): string[] {
  const issues: string[] = []
  if (!html.includes(`data-ink-svg="${moduleId}"`)) {
    issues.push('missing-data-ink-svg-sentinel')
  }
  if (!/<svg\b/i.test(html)) {
    issues.push('missing-inline-svg')
  }
  if (!/viewBox=/i.test(html)) {
    issues.push('missing-viewBox')
  }
  if (!html.includes('width="100%"')) {
    issues.push('missing-responsive-width')
  }

  return issues
}

function renderApplicationGallery(): {
  tiles: readonly ApplicationGalleryTile[]
  issues: readonly ApplicationGalleryIssue[]
} {
  const tiles: ApplicationGalleryTile[] = []
  const issues: ApplicationGalleryIssue[] = []

  for (const module of SVG_MODULES) {
    for (const persona of APPLICATION_GALLERY_PERSONAS) {
      try {
        const theme = buildThemeContext({
          primaryColor: APPLICATION_GALLERY_PERSONA_COLORS[persona],
          persona,
          target: 'wechat',
        })
        const html = module.render({
          theme,
          text: 'InkForge application SVG gallery',
          subtitle: `${module.family} module visual proof`,
          index: 2,
          items: [
            { title: 'Design rule', body: 'WeChat-safe inline SVG subset' },
            { title: 'Application state', body: 'Local renderer output' },
          ],
        })

        tiles.push({
          moduleId: module.id,
          family: module.family,
          description: module.description,
          persona,
          html,
        })

        for (const violation of checkWechatSafe(html)) {
          issues.push({
            moduleId: module.id,
            family: module.family,
            persona,
            issue: violation.rule,
          })
        }

        for (const issue of getModuleSentinelIssues(html, module.id)) {
          issues.push({
            moduleId: module.id,
            family: module.family,
            persona,
            issue,
          })
        }
      } catch (error) {
        issues.push({
          moduleId: module.id,
          family: module.family,
          persona,
          issue: error instanceof Error ? `render-error:${error.message}` : `render-error:${String(error)}`,
        })
      }
    }
  }

  return { tiles, issues }
}

function isSentinelIssue(issue: string): boolean {
  return issue === 'missing-data-ink-svg-sentinel' ||
    issue === 'missing-inline-svg' ||
    issue === 'missing-viewBox' ||
    issue === 'missing-responsive-width'
}

function buildGalleryReport(outputPath: string, issues: readonly ApplicationGalleryIssue[]): ApplicationGalleryReport {
  const moduleSentinelFailureCount = issues.filter(issue => isSentinelIssue(issue.issue)).length

  return {
    notProof: true,
    scope: 'application-gallery',
    status: issues.length === 0 ? 'application-gallery-ready' : 'application-gallery-blocked',
    outputPath: toReportPath(outputPath),
    summary: {
      svgModuleCount: SVG_MODULES.length,
      svgFamilyCount: new Set(SVG_MODULES.map(module => module.family)).size,
      personaCount: APPLICATION_GALLERY_PERSONAS.length,
      renderedModulePersonaPairs: SVG_MODULES.length * APPLICATION_GALLERY_PERSONAS.length,
      wechatSafeViolationCount: issues.length - moduleSentinelFailureCount,
      moduleSentinelFailureCount,
    },
    issues,
  }
}

function renderGalleryDocument(
  tiles: readonly ApplicationGalleryTile[],
  report: ApplicationGalleryReport,
): string {
  const generatedAt = new Date().toISOString()
  const tileMarkup = tiles.map(tile => [
    '<article class="gallery-tile">',
    '  <header>',
    `    <p class="eyebrow">${escapeHtml(tile.family)} / ${escapeHtml(tile.persona)}</p>`,
    `    <h2>${escapeHtml(tile.moduleId)}</h2>`,
    `    <p>${escapeHtml(tile.description)}</p>`,
    '  </header>',
    '  <div class="wechat-frame">',
    tile.html,
    '  </div>',
    '</article>',
  ].join('\n')).join('\n')

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>InkForge Application SVG Gallery</title>',
    '  <style>',
    '    body { margin: 0; background: #f4efe7; color: #2f2a24; font-family: Georgia, "Times New Roman", serif; }',
    '    main { max-width: 1180px; margin: 0 auto; padding: 36px 20px 64px; }',
    '    .summary { background: #fffaf2; border: 1px solid rgba(90,74,60,.18); border-radius: 20px; padding: 24px; box-shadow: 0 18px 45px rgba(47,42,36,.08); }',
    '    .summary h1 { margin: 0 0 12px; font-size: 30px; letter-spacing: -.02em; }',
    '    .summary p { margin: 8px 0; line-height: 1.7; }',
    '    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-top: 20px; }',
    '    .metric { background: #ffffff; border: 1px solid rgba(90,74,60,.12); border-radius: 14px; padding: 14px; }',
    '    .metric b { display: block; font-size: 24px; color: #5a4a3c; }',
    '    .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 28px; }',
    '    .gallery-tile { background: #fffdf8; border: 1px solid rgba(90,74,60,.16); border-radius: 18px; padding: 18px; box-shadow: 0 12px 30px rgba(47,42,36,.07); }',
    '    .gallery-tile h2 { margin: 4px 0 8px; font-size: 18px; }',
    '    .gallery-tile p { margin: 0; color: rgba(47,42,36,.72); line-height: 1.55; }',
    '    .eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: 11px; color: #8a6a42 !important; }',
    '    .wechat-frame { width: min(100%, 375px); min-height: 120px; margin: 18px auto 0; padding: 16px; background: #ffffff; border-radius: 14px; border: 1px solid rgba(47,42,36,.10); overflow: hidden; }',
    '    .boundary { margin-top: 24px; font-size: 13px; color: rgba(47,42,36,.72); }',
    '  </style>',
    '</head>',
    '<body>',
    '<main>',
    '  <section class="summary">',
    '    <h1>InkForge Application SVG Gallery</h1>',
    `    <p>Generated at ${escapeHtml(generatedAt)} from the live local SVG module registry. This artifact is visual evidence for local application rendering only.</p>`,
    '    <p>It is not WeChat phone preview, account sync, scheduled send, platform preview, public rendering, or publish proof.</p>',
    '    <div class="metrics">',
    `      <div class="metric"><b>${report.summary.svgModuleCount}</b><span>SVG modules</span></div>`,
    `      <div class="metric"><b>${report.summary.svgFamilyCount}</b><span>families</span></div>`,
    `      <div class="metric"><b>${report.summary.personaCount}</b><span>personas</span></div>`,
    `      <div class="metric"><b>${report.summary.renderedModulePersonaPairs}</b><span>rendered pairs</span></div>`,
    `      <div class="metric"><b>${report.summary.wechatSafeViolationCount}</b><span>WeChat-safe violations</span></div>`,
    `      <div class="metric"><b>${report.summary.moduleSentinelFailureCount}</b><span>sentinel failures</span></div>`,
    '    </div>',
    '  </section>',
    '  <section class="gallery">',
    tileMarkup,
    '  </section>',
    '  <p class="boundary">Boundary: local gallery artifact only; XHS/Zhihu publish-side automation remains manually deferred for this round.</p>',
    '</main>',
    '</body>',
    '</html>',
  ].join('\n')
}

async function writeGallery(outputPath: string, html: string): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, html, 'utf8')
}

function formatReportText(report: ApplicationGalleryReport): string {
  return [
    'InkForge application SVG gallery',
    `status: ${report.status}`,
    `outputPath: ${report.outputPath}`,
    `svgModuleCount: ${report.summary.svgModuleCount}`,
    `svgFamilyCount: ${report.summary.svgFamilyCount}`,
    `personaCount: ${report.summary.personaCount}`,
    `renderedModulePersonaPairs: ${report.summary.renderedModulePersonaPairs}`,
    `wechatSafeViolationCount: ${report.summary.wechatSafeViolationCount}`,
    `moduleSentinelFailureCount: ${report.summary.moduleSentinelFailureCount}`,
    `issues: ${report.issues.length}`,
    '',
    'boundary:',
    '- This is local application visual evidence only.',
    '- It does not prove WeChat phone preview, account sync, scheduled send, public rendering, or publish success.',
    '- XHS/Zhihu publish-side automation remains manually deferred for this round.',
  ].join('\n')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    printHelp()
    process.exit(0)
  }

  const unknownArgs = getUnknownArgs(args)
  if (unknownArgs.length > 0) {
    console.error(`Unknown option: ${unknownArgs.join(', ')}`)
    printHelp()
    process.exit(2)
  }

  let outputPath: string
  try {
    outputPath = parseOutputPath(args)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    printHelp()
    process.exit(2)
  }

  const { tiles, issues } = renderApplicationGallery()
  const report = buildGalleryReport(outputPath, issues)
  await writeGallery(outputPath, renderGalleryDocument(tiles, report))

  if (args.includes('--json')) {
    console.log(JSON.stringify(report))
  } else {
    console.log(formatReportText(report))
  }

  process.exit(report.status === 'application-gallery-ready' ? 0 : 1)
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
