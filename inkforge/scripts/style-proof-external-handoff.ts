#!/usr/bin/env node

import {
  formatCommittedStyleProofExternalHandoffPacketMarkdown,
  getCommittedStyleProofExternalHandoffPacket,
} from '../src/services/export/style-catalog.ts'

function printHelp(): void {
  console.log([
    'Usage: pnpm style-proof:external-handoff [--markdown|--json]',
    '',
    'Prints the committed InkForge style-proof external handoff packet for',
    'operator-run phone, account, public-host, sync, scheduled-send, upload,',
    'preview, and publish proof collection.',
    '',
    'This command is read-only. It does not open a browser, upload content,',
    'sync drafts, schedule sends, publish articles, or create proof artifacts.',
    'It exits non-zero while the packet cannot be claimed complete.',
    '',
    'Options:',
    '  --markdown   Print the human handoff packet. This is the default.',
    '  --json       Print the raw handoff packet JSON.',
    '  --help       Print this help.',
  ].join('\n'))
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const allowedArgs = new Set(['--markdown', '--json'])
  const unknownArgs = args.filter(arg => !allowedArgs.has(arg))
  if (unknownArgs.length > 0) {
    console.error(`Unknown option: ${unknownArgs.join(', ')}`)
    printHelp()
    process.exit(2)
  }

  if (args.includes('--markdown') && args.includes('--json')) {
    console.error('Choose only one output mode: --markdown or --json')
    printHelp()
    process.exit(2)
  }

  const packet = getCommittedStyleProofExternalHandoffPacket()
  if (args.includes('--json')) {
    console.log(JSON.stringify(packet))
  } else {
    console.log(formatCommittedStyleProofExternalHandoffPacketMarkdown(packet).trimEnd())
  }

  process.exit(packet.canClaimComplete ? 0 : 1)
}

main()
