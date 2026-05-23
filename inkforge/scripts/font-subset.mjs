#!/usr/bin/env node
/**
 * Font subset helper for InkForge preset typography overhaul.
 *
 * USAGE:
 *   node scripts/font-subset.mjs --check   # report which fonts are shipped
 *   node scripts/font-subset.mjs --plan    # print download + subset commands
 *
 * This script does NOT auto-download fonts (licensing varies, manual review
 * needed). It prints the exact commands needed to populate
 * inkforge/public/fonts/.
 *
 * Prerequisites:
 *   - Python 3 + fonttools (pip install fonttools brotli)
 *   - Manual woff2 download from sources in manifest.json
 *
 * This script is intentionally NOT wired into pnpm prebuild — fonts are a
 * one-time manual setup step, not a per-build dependency.
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FONTS_DIR = resolve(__dirname, '..', 'public', 'fonts')
const MANIFEST_PATH = resolve(FONTS_DIR, 'manifest.json')

// GB2312 + ASCII + Latin-1 Supplement + a few common ext-A glyphs.
// Use pyftsubset's --unicodes-file for the full curated character set;
// inline below is a compact summary suitable for one-off CLI usage.
const UNICODE_RANGE = [
  'U+0020-007F', // ASCII
  'U+00A0-00FF', // Latin-1 supplement
  'U+0100-017F', // Latin ext-A
  'U+2000-206F', // General punctuation
  'U+2E80-2EFF', // CJK radicals supplement
  'U+3000-303F', // CJK symbols & punctuation
  'U+3400-4DBF', // CJK ext A
  'U+4E00-9FFF', // CJK Unified Ideographs (Basic)
  'U+FF00-FFEF', // Halfwidth & fullwidth forms
].join(',')

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`[font-subset] manifest not found: ${MANIFEST_PATH}`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
}

function checkShipped(manifest) {
  console.log(`\n[font-subset] Inspecting ${FONTS_DIR}\n`)
  let shipped = 0
  for (const file of manifest.files) {
    const target = resolve(FONTS_DIR, file.name)
    const exists = existsSync(target)
    const size = exists ? (statSync(target).size / 1024).toFixed(1) + ' KB' : '—'
    const flag = exists ? 'OK' : 'missing'
    console.log(`  [${flag}] ${file.name.padEnd(48)} ${size}`)
    if (exists) shipped += 1
  }
  console.log(`\n[font-subset] ${shipped}/${manifest.files.length} font files shipped.`)
  if (shipped < manifest.files.length) {
    console.log('[font-subset] Run with --plan to see download + subset commands.')
  }
}

function checkPyftsubset() {
  try {
    execSync('python --version', { stdio: 'pipe' })
  } catch {
    try {
      execSync('python3 --version', { stdio: 'pipe' })
    } catch {
      return false
    }
  }
  try {
    execSync('pyftsubset --help', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function planCommands(manifest) {
  console.log('\n[font-subset] Subsetting plan (manual execution required)\n')
  console.log('Step 1 — install fonttools (one-time):')
  console.log('  pip install fonttools brotli zopfli\n')
  console.log('Step 2 — download source fonts from each upstream release page:\n')
  for (const file of manifest.files) {
    console.log(`  - ${file.name}`)
    console.log(`    upstream: ${file.source}`)
  }
  console.log('\nStep 3 — subset each font with pyftsubset. Template command:\n')
  console.log(`  pyftsubset SOURCE.otf \\
    --output-file=inkforge/public/fonts/TARGET-subset.woff2 \\
    --flavor=woff2 \\
    --layout-features='*' \\
    --unicodes='${UNICODE_RANGE}' \\
    --with-zopfli\n`)
  console.log('Step 4 — verify with:  node scripts/font-subset.mjs --check\n')
  console.log('NOTE: Latin fonts only need ASCII + Latin-1 + Latin-ext-A; drop the CJK')
  console.log('      ranges from the --unicodes argument when subsetting Latin faces.')
}

function main() {
  const args = process.argv.slice(2)
  const manifest = loadManifest()

  if (args.includes('--check')) {
    checkShipped(manifest)
    process.exit(0)
  }

  if (args.includes('--plan')) {
    const hasPy = checkPyftsubset()
    if (!hasPy) {
      console.warn('[font-subset] Warning: pyftsubset not found on PATH.')
      console.warn('  Install with: pip install fonttools brotli zopfli\n')
    }
    planCommands(manifest)
    process.exit(hasPy ? 0 : 1)
  }

  console.log('Usage:')
  console.log('  node scripts/font-subset.mjs --check')
  console.log('  node scripts/font-subset.mjs --plan')
  process.exit(0)
}

main()
