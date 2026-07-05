#!/usr/bin/env node

import {
  createWechatStyleExportSamplesReport,
  formatWechatStyleExportSamplesReportText,
} from '../src/services/export/wechat-style-export-samples.ts'

type DomRuntimeGlobal = typeof globalThis & {
  window?: unknown
  document?: unknown
  Node?: unknown
  Element?: unknown
  HTMLElement?: unknown
  SVGElement?: unknown
  DOMParser?: unknown
  XMLSerializer?: unknown
  navigator?: unknown
}

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:wechat-style-samples [--json]',
    '',
    'Renders every currently selectable WeChat style-catalog row through the real',
    'InkForge WeChat export pipeline with application SVG options enabled.',
    '',
    'This command is local and read-only. It does not open a browser, paste into',
    'WeChat, upload, sync, schedule, publish, or create phone/account proof.',
    '',
    'Options:',
    '  --json        Print a compact JSON report.',
    '  --help        Print this help.',
  ].join('\n'))
}

async function ensureDomRuntime(): Promise<void> {
  const runtimeGlobal = globalThis as DomRuntimeGlobal
  if (runtimeGlobal.window && runtimeGlobal.document) {
    return
  }

  const { Window } = await import('happy-dom')
  const window = new Window({ url: 'http://127.0.0.1/style-proof-wechat-style-samples' })
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
  defineRuntimeValue('SVGElement', windowRecord.SVGElement)
  defineRuntimeValue('DOMParser', windowRecord.DOMParser)
  defineRuntimeValue('XMLSerializer', windowRecord.XMLSerializer)
  defineRuntimeValue('navigator', window.navigator)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const unknownArgs = args.filter(arg => arg !== '--json')
  if (unknownArgs.length > 0) {
    console.error(`Unknown option: ${unknownArgs.join(', ')}`)
    printHelp()
    process.exit(2)
  }

  await ensureDomRuntime()
  const report = await createWechatStyleExportSamplesReport()
  if (args.includes('--json')) {
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
