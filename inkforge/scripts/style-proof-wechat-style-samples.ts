#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createWechatStyleExportSamplesReport,
  formatWechatStyleExportSamplesReportText,
} from '../src/services/export/wechat-style-export-samples.ts'
import { getPlatformStyleApplicationReport } from '../src/services/export/style-catalog.ts'
import { getPresetById } from '../src/services/export/themes.ts'
import { markdownToWechatWithStats } from '../src/services/export/wechat.ts'
import { planWechatDraftPublish } from '../src/services/export/wechat-publish.ts'
import { createDefaultWechatSvgInjectionPlan } from '../src/services/export/wechat-svg-application.ts'

type DomRuntimeGlobal = typeof globalThis & {
  window?: unknown
  document?: unknown
  Node?: unknown
  Element?: unknown
  HTMLElement?: unknown
  HTMLImageElement?: unknown
  SVGElement?: unknown
  DOMParser?: unknown
  XMLSerializer?: unknown
  navigator?: unknown
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const repositoryRoot = resolve(projectRoot, '..')
const DRAFT_PREFLIGHT_CHOICES = [
  { choiceId: 'wechat-classic-inline', shortId: 'classic', enableSvgModules: false },
  { choiceId: 'wechat-flagship-kiln', shortId: 'kiln', enableSvgModules: true },
  { choiceId: 'wechat-flagship-kiln-paste-safe', shortId: 'paste', enableSvgModules: true },
] as const

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

function repoRelativePath(inputPath: string): string {
  const relativePath = relative(repositoryRoot, inputPath)
  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Draft preflight corpus must be a file inside the repository')
  }
  return relativePath.split(sep).join('/')
}

function readSourceOwnedCoverImage(
  html: string,
  expectedSha256?: string,
): { sha256: string; image: { src: string; resolvedUrl: string; mimeType: string; alt?: string; width?: number; height?: number } } {
  const claimed = expectedSha256
    ?? /source-owned-image-sha256:\s*([a-f0-9]{64})/i.exec(html)?.[1]?.toLowerCase()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const images = doc.querySelectorAll('[data-inkforge-role="source-owned-cover"] img')
  const image = images.item(0)
  const src = image?.getAttribute('src')?.trim() || ''
  const encoded = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/i.exec(src)?.[1]
  if (!claimed || images.length !== 1 || !image || !encoded) {
    throw new Error('Draft preflight corpus lacks the source-owned PNG binding')
  }
  const actual = sha256(Buffer.from(encoded, 'base64'))
  if (actual !== claimed) {
    throw new Error('Draft preflight corpus source-owned PNG SHA-256 mismatch')
  }
  const width = Number.parseInt(image.getAttribute('width') || '', 10)
  const height = Number.parseInt(image.getAttribute('height') || '', 10)
  return {
    sha256: actual,
    image: {
      src,
      resolvedUrl: src,
      mimeType: 'image/png',
      alt: image.getAttribute('alt') || undefined,
      width: Number.isFinite(width) ? width : undefined,
      height: Number.isFinite(height) ? height : undefined,
    },
  }
}

function collectSemanticNames(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const elements = Array.from(doc.body.querySelectorAll('*'))
  const sortedUnique = (values: string[]) => [...new Set(values)].sort()

  return {
    tags: sortedUnique(elements.map(element => element.tagName.toLowerCase())),
    roles: sortedUnique(elements.flatMap(element => [
      element.getAttribute('role'),
      element.getAttribute('data-ink-role'),
      element.getAttribute('data-inkforge-role'),
    ].flatMap(value => value?.toLowerCase().split(/\s+/).filter(Boolean) ?? []))),
    attributes: sortedUnique(elements.flatMap(element =>
      Array.from(element.attributes, attribute => attribute.name.toLowerCase())
        .filter(name => name !== 'style')
    )),
    styleProperties: sortedUnique(elements.flatMap(element => {
      const style = (element as Element & { style?: CSSStyleDeclaration }).style
      return style ? Array.from({ length: style.length }, (_, index) => style.item(index).toLowerCase()) : []
    })),
  }
}

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:wechat-style-samples [--json]',
    '       pnpm style-proof:wechat-style-samples --draft-preflight --corpus <path> --json',
    '',
    'Renders every currently selectable WeChat style-catalog row through the real',
    'InkForge WeChat export pipeline with application SVG options enabled.',
    '',
    'This command is local and read-only. It does not open a browser, paste into',
    'WeChat, upload, sync, schedule, publish, or create phone/account proof.',
    '',
    'Options:',
    '  --draft-preflight  Render the pinned corpus and produce wechat-draft-preflight/v1.',
    '  --corpus <path>    Repository-owned Markdown corpus for draft preflight.',
    '  --json             Print a compact JSON report.',
    '  --help             Print this help.',
  ].join('\n'))
}

async function ensureDomRuntime(): Promise<void> {
  const runtimeGlobal = globalThis as DomRuntimeGlobal
  if (runtimeGlobal.window && runtimeGlobal.document) {
    return
  }

  const { Window } = await import('happy-dom')
  const window = new Window({ url: 'http://127.0.0.1/style-proof-wechat-style-samples' })
  window.document.write('<!doctype html><html><head></head><body></body></html>')
  window.document.close()
  Object.defineProperty(window.document, 'compatMode', { configurable: true, value: 'CSS1Compat' })
  const windowRecord = window as unknown as Record<string, unknown>

  const defineRuntimeValue = (key: keyof DomRuntimeGlobal, value: unknown): void => {
    Object.defineProperty(runtimeGlobal, key, {
      configurable: true,
      enumerable: false,
      value,
      writable: true,
    })
  }

  defineRuntimeValue('window', window)
  defineRuntimeValue('document', window.document)
  defineRuntimeValue('Node', windowRecord.Node)
  defineRuntimeValue('Element', windowRecord.Element)
  defineRuntimeValue('HTMLElement', windowRecord.HTMLElement)
  defineRuntimeValue('HTMLImageElement', windowRecord.HTMLImageElement)
  defineRuntimeValue('SVGElement', windowRecord.SVGElement)
  defineRuntimeValue('DOMParser', windowRecord.DOMParser)
  defineRuntimeValue('XMLSerializer', windowRecord.XMLSerializer)
  defineRuntimeValue('navigator', window.navigator)
}

async function createWechatDraftPreflightReport(corpusArgument: string) {
  const corpusPath = resolve(process.cwd(), corpusArgument)
  const corpusRef = repoRelativePath(corpusPath)
  const corpusBytes = await readFile(corpusPath)
  const markdown = corpusBytes.toString('utf8')
  if (!markdown.trim()) throw new Error('Draft preflight corpus is empty')

  const corpusSha256 = sha256(corpusBytes)
  const sourceOwnedCover = readSourceOwnedCoverImage(markdown)
  const sourceOwnedImageSha256 = sourceOwnedCover.sha256
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  }).trim()
  const catalog = getPlatformStyleApplicationReport('wechat')
  const cases = []

  for (const choice of DRAFT_PREFLIGHT_CHOICES) {
    const row = catalog.find(candidate => candidate.availability.choice.id === choice.choiceId)
    if (!row?.selectable || !row.application) {
      throw new Error(`Pinned WeChat style choice is not selectable: ${choice.choiceId}`)
    }
    const preset = getPresetById(row.application.presetId)
    if (!preset) throw new Error(`Pinned WeChat preset is missing: ${row.application.presetId}`)

    const rendered = await markdownToWechatWithStats(markdown, preset, {
      enableReadingTime: false,
      enableSvgModules: choice.enableSvgModules,
      svgInjectionPlan: choice.enableSvgModules
        ? createDefaultWechatSvgInjectionPlan()
        : undefined,
    })
    const renderedCover = readSourceOwnedCoverImage(rendered.html, sourceOwnedImageSha256)
    const input = Object.freeze({
      title: `IF-WX-${corpusSha256.slice(0, 8)}-${choice.shortId}`,
      contentHtml: rendered.html,
      coverImage: renderedCover.image,
      showCoverPic: 1 as const,
    })
    const plan = await planWechatDraftPublish(input)
    cases.push({
      caseId: `${choice.choiceId}:${corpusSha256.slice(0, 12)}`,
      choiceId: choice.choiceId,
      presetId: row.application.presetId,
      options: {
        enableSvgModules: choice.enableSvgModules,
        svgPlan: choice.enableSvgModules ? 'application-default' : 'disabled',
      },
      artifactFingerprint: `sha256:${sha256(rendered.html)}`,
      eligibility: plan.eligible ? 'official-draft-eligible' : 'official-draft-ineligible',
      reasonCodes: plan.reasons.map(reason => reason.code),
      inputFingerprint: plan.inputFingerprint,
      planFingerprint: plan.planFingerprint,
      semanticNames: collectSemanticNames(rendered.html),
      limits: plan.limits,
      images: plan.images,
      cover: {
        ...plan.cover,
        sourceOwnedImageSha256,
        coverIntent: true,
      },
      unverifiedRemote: plan.unverifiedRemote,
      sideEffectUpperBounds: plan.sideEffectUpperBounds,
    })
  }

  return {
    schemaVersion: 'wechat-draft-preflight/v1',
    status: 'complete',
    notProof: true,
    corpus: {
      ref: corpusRef,
      bytes: corpusBytes.length,
      sha256: corpusSha256,
      sourceOwnedImageSha256,
    },
    commit,
    requestedChoices: DRAFT_PREFLIGHT_CHOICES.map(choice => choice.choiceId),
    cases,
    boundary: {
      noWechatWrite: true,
      noTauriInvoke: true,
      requiresSeparateExternalApproval: true,
      doesNotClaimWechatReadback: true,
    },
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  let corpusArgument: string | undefined
  let draftPreflight = false
  let json = false
  const unknownArgs: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--json') {
      json = true
    } else if (argument === '--draft-preflight') {
      draftPreflight = true
    } else if (argument === '--corpus') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) throw new Error('--corpus requires a path')
      if (corpusArgument) throw new Error('--corpus may only be provided once')
      corpusArgument = value
      index += 1
    } else {
      unknownArgs.push(argument)
    }
  }
  if (unknownArgs.length > 0) {
    console.error(`Unknown option: ${unknownArgs.join(', ')}`)
    printHelp()
    process.exit(2)
  }

  await ensureDomRuntime()
  if (draftPreflight) {
    if (!corpusArgument) throw new Error('--draft-preflight requires --corpus <path>')
    if (!json) throw new Error('--draft-preflight requires --json')
    console.log(JSON.stringify(await createWechatDraftPreflightReport(corpusArgument)))
    process.exit(0)
  }
  if (corpusArgument) throw new Error('--corpus is only valid with --draft-preflight')

  const report = await createWechatStyleExportSamplesReport()
  if (json) {
    console.log(JSON.stringify(report))
  } else {
    console.log(formatWechatStyleExportSamplesReportText(report))
  }

  process.exit(report.status === 'wechat-style-samples-ready' ? 0 : 1)
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
