#!/usr/bin/env node
/**
 * InkForge brand icon builder
 *
 * Reads `src-tauri/icons/master.svg` (single SVG source of truth, 1024×1024)
 * and produces all platform raster outputs:
 *
 *   Windows .ico   — multi-resolution: 16, 24, 32, 48, 64, 128, 256
 *   macOS .icns    — 16, 32, 64, 128, 256, 512, 1024 + 1024@2x (2048)
 *   Linux PNG      — 32, 64, 128, 256, 512
 *   Tauri-named    — 32x32.png, 128x128.png, 128x128@2x.png (back-compat for tauri.conf.json)
 *
 * Idempotent — safe to re-run. Overwrites prior outputs in `src-tauri/icons/`.
 *
 * Requires devDependencies: sharp, png-to-ico
 */

import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const ICONS_DIR = join(REPO_ROOT, 'src-tauri', 'icons')
const MASTER_SVG = join(ICONS_DIR, 'master.svg')

const WIN_SIZES = [16, 24, 32, 48, 64, 128, 256]
const MAC_SIZES = [16, 32, 64, 128, 256, 512, 1024]
const MAC_RETINA_SIZE = 2048 // 1024@2x
const LINUX_SIZES = [32, 64, 128, 256, 512]

async function renderSvgAt(svgBuffer, size) {
  return sharp(svgBuffer, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function buildIco(pngBufs, outPath) {
  const ico = await pngToIco(pngBufs)
  await writeFile(outPath, ico)
}

/**
 * Build a macOS .icns binary.
 * Format reference: https://en.wikipedia.org/wiki/Apple_Icon_Image_format
 *
 *   File header: "icns" (4 bytes) + total length BE u32 (4 bytes)
 *   Each entry:  4-byte OSType + BE u32 length (incl. 8-byte header) + PNG payload
 */
async function buildIcns(entries, outPath) {
  // entries: Array<{ type: string(4), data: Buffer }>
  const HEADER_SIZE = 8
  let totalLen = HEADER_SIZE
  for (const e of entries) totalLen += HEADER_SIZE + e.data.length

  const out = Buffer.alloc(totalLen)
  out.write('icns', 0, 4, 'ascii')
  out.writeUInt32BE(totalLen, 4)

  let offset = HEADER_SIZE
  for (const e of entries) {
    out.write(e.type, offset, 4, 'ascii')
    out.writeUInt32BE(HEADER_SIZE + e.data.length, offset + 4)
    e.data.copy(out, offset + HEADER_SIZE)
    offset += HEADER_SIZE + e.data.length
  }
  await writeFile(outPath, out)
}

/** macOS icns OSType codes by size (PNG payloads). */
const ICNS_TYPES = {
  16: 'icp4',
  32: 'icp5',
  64: 'icp6',
  128: 'ic07',
  256: 'ic08',
  512: 'ic09',
  1024: 'ic10', // also used for 1024@2x by convention
}

async function main() {
  console.log('[icons] master:', MASTER_SVG)
  const svgBuf = await readFile(MASTER_SVG)
  await mkdir(ICONS_DIR, { recursive: true })

  // ------------------------------------------------------------------
  // 1. Master PNGs (collect a unique set; reused across platforms)
  // ------------------------------------------------------------------
  const allSizes = new Set([...WIN_SIZES, ...MAC_SIZES, MAC_RETINA_SIZE, ...LINUX_SIZES])
  const pngBySize = new Map()
  for (const s of [...allSizes].sort((a, b) => a - b)) {
    const buf = await renderSvgAt(svgBuf, s)
    pngBySize.set(s, buf)
    console.log(`[icons] rendered ${s}x${s} → ${buf.length} bytes`)
  }

  // ------------------------------------------------------------------
  // 2. Tauri-named back-compat PNGs (referenced from tauri.conf.json)
  // ------------------------------------------------------------------
  await writeFile(join(ICONS_DIR, '32x32.png'), pngBySize.get(32))
  await writeFile(join(ICONS_DIR, '128x128.png'), pngBySize.get(128))
  await writeFile(join(ICONS_DIR, '128x128@2x.png'), pngBySize.get(256)) // @2x of 128 is 256
  console.log('[icons] wrote tauri-named: 32x32.png, 128x128.png, 128x128@2x.png')

  // ------------------------------------------------------------------
  // 3. Linux PNGs (kebab-case to match Tauri convention)
  // ------------------------------------------------------------------
  for (const s of LINUX_SIZES) {
    await writeFile(join(ICONS_DIR, `${s}x${s}.png`), pngBySize.get(s))
  }
  console.log('[icons] wrote linux sizes:', LINUX_SIZES.map(s => `${s}x${s}.png`).join(', '))

  // ------------------------------------------------------------------
  // 4. Windows .ico (multi-resolution)
  // ------------------------------------------------------------------
  // png-to-ico accepts an array of Buffers (one per size) and packs them.
  const winBufs = WIN_SIZES.map(s => pngBySize.get(s))
  await buildIco(winBufs, join(ICONS_DIR, 'icon.ico'))
  console.log('[icons] wrote icon.ico containing:', WIN_SIZES.join(', '))

  // ------------------------------------------------------------------
  // 5. macOS .icns
  // ------------------------------------------------------------------
  const icnsEntries = []
  for (const s of MAC_SIZES) {
    icnsEntries.push({ type: ICNS_TYPES[s], data: pngBySize.get(s) })
  }
  // 1024@2x retina: payload is 2048 PNG, OSType is ic10 too — replace last entry
  // (More precisely, ic10 on modern macOS expects 1024×1024 logical = 2048 actual)
  icnsEntries[icnsEntries.length - 1] = { type: 'ic10', data: pngBySize.get(MAC_RETINA_SIZE) }
  await buildIcns(icnsEntries, join(ICONS_DIR, 'icon.icns'))
  console.log('[icons] wrote icon.icns containing:', MAC_SIZES.join(', '), '(ic10 = @2x 2048)')

  console.log('[icons] done.')
}

main().catch(err => {
  console.error('[icons] FAILED:', err)
  process.exit(1)
})
