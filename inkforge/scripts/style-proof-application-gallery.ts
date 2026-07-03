import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createApplicationSvgGalleryReport,
  createApplicationSvgGallerySnapshot,
  formatApplicationSvgGalleryReportText,
  renderApplicationSvgGalleryHtml,
} from '../src/services/export/application-svg-gallery.ts'

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const workspaceRoot = resolve(projectRoot, '..')
const DEFAULT_OUTPUT_PATH = resolve(
  workspaceRoot,
  'prompts/0601/evidence/application-svg-gallery-20260704.html',
)

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

async function writeGallery(outputPath: string, html: string): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, html, 'utf8')
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

  const snapshot = createApplicationSvgGallerySnapshot()
  const report = createApplicationSvgGalleryReport(snapshot, toReportPath(outputPath))
  await writeGallery(outputPath, renderApplicationSvgGalleryHtml(snapshot))

  if (args.includes('--json')) {
    console.log(JSON.stringify(report))
  } else {
    console.log(formatApplicationSvgGalleryReportText(report))
  }

  process.exit(report.status === 'application-gallery-ready' ? 0 : 1)
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
