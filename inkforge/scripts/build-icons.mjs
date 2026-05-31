#!/usr/bin/env node
/**
 * InkForge brand icon builder
 *
 * Reads progressive 5-tier SVG masters from `src-tauri/icons/` and produces
 * all platform raster outputs by selecting the tier appropriate to the
 * output size (preserves silhouette legibility at 16px and surfaces full
 * detail at 1024px).
 *
 * Tier sources (墨滴 · 笔锋 · 铁砧 mark — Logo Concept 08). The masters MIRROR
 * src/components/chrome/ForgeNibMark.vue (the canonical in-app logo): the
 * nib-arrow is RESTORED so the rastered taskbar/dock icon matches what the
 * user sees inside the app. Each master is identical, verbatim, to the
 * corresponding ForgeNibMark <template v-if="tier === N"> block — same drop,
 * slice, nib-arrow (shaft + head), ember, and anvil geometry — and keeps the
 * mark's natural tall proportions (slightly taller than wide), exactly like
 * the in-app logo rather than a footprint-stuffed bold blob:
 *   master-16.svg  — solid ink-drop + ember + anvil (no slice, no arrow)
 *   master-32.svg  — adds a thin slice + a short stub nib-arrow (shaft + head)
 *   master-64.svg  — full slice + full arrowhead + a 1px-equivalent drop highlight
 *   master-256.svg — adds ember halo + soft drop highlight + contact shadow (full detail)
 *   master-1024.svg — hero: sheen gradient on drop + ember glow + warm
 *                     contact shadow. RESERVED for in-app hero / splash /
 *                     About display; NOT used as a square app-icon raster
 *                     source (the hero gradients/shadow would blur at small
 *                     platform-icon sizes; the 256 tier is the icon source).
 *
 * Selection (by INNER mark px, not the tile size — so a 32px tile whose mark
 * occupies ~25px uses the simplified master-16 silhouette):
 *   inner ≤ 30        → master-16.svg
 *   30 < inner ≤ 56   → master-32.svg
 *   56 < inner ≤ 150  → master-64.svg
 *   inner > 150       → master-256.svg
 *
 * Framing: each raster output is the NATURAL tier mark (NO color inversion) —
 * the canonical 墨滴·笔锋·铁砧 silhouette that MIRRORS the in-app ForgeNibMark
 * logo (sliced ink-drop + nib-arrow + ember + anvil, keeping its natural tall
 * proportions) — TRIMMED to its bounding box, scaled to ~88% of the tile, and
 * centered over a WARM-PAPER rounded-rect tile so the mark reads as the brand
 * logo with logo-like margin rather than a footprint-stuffed blob. The tile is
 * a subtle vertical gradient (#FBF9F5 → #F1ECE4) with a faint ink hairline ring
 * for edge definition on light backgrounds; both degrade gracefully to flat
 * paper at tiny sizes. The tier is chosen by INNER mark px (master-16 for the
 * smallest up to master-256) and rasterized at native resolution. This reads
 * as the canonical brand logo (matching public/favicon.svg and the in-app
 * ForgeNibMark) rather than a dark blob.
 *
 * Outputs:
 *   Windows .ico   — DPI-aware multi-resolution: 16, 20, 24, 32, 40, 48, 64, 96, 256
 *   macOS .icns    — 16, 32, 64, 128, 256, 512, 1024 + 1024@2x (2048)
 *   Linux PNG      — 32, 64, 128, 256, 512
 *   Tauri-named    — 32x32.png, 128x128.png, 128x128@2x.png (back-compat
 *                    for tauri.conf.json bundle.icon)
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

const PAPER = '#F7F4EF'
const INK = '#1C1F23'
const MARK_FILL_RATIO = 0.88        // mark mirrors the in-app ForgeNibMark logo; 0.88 keeps the 36px (150% taskbar) frame on the slice+arrow tier (master-32) while leaving logo-like margin
const PLATE_RADIUS_RATIO = 0.225    // rounded-rect corner radius / size

// Tier picked by the INNER (mark) pixel size, NOT the tile size, so a 32px
// tile (inner ~25px) uses the simplified master-16 silhouette (no slice/arrow).
function masterForInner(px) {
  if (px <= 30) return 'master-16.svg'
  if (px <= 56) return 'master-32.svg'
  if (px <= 150) return 'master-64.svg'
  return 'master-256.svg'
}

// Module-level SVG cache (read each tier master at most once).
const svgCache = new Map()
async function getSvg(file) {
  if (!svgCache.has(file)) {
    const buf = await readFile(join(ICONS_DIR, file))
    svgCache.set(file, buf)
  }
  return svgCache.get(file)
}

// DPI-aware shell-icon sizes — the full Microsoft target-size set. Now includes
// 30/36/60/72/80/128 so Windows has an EXACT native frame at 100/125/150/175/
// 200%+ taskbar scaling (e.g. 150% → 36px) and never upscales a mismatched size
// — that mismatch was the cause of the blurry "not HD" taskbar icon. Ordered
// LARGEST-FIRST because Tauri's runtime window icon can use only the FIRST .ico
// entry: a 256px first entry is only ever downscaled (always crisp), whereas a
// small first entry gets upscaled and blurs. The render pipeline picks the right
// master tier by inner px (30→master-16, 36/60→master-32, 72/80/128→master-64),
// so no other change is needed.
const WIN_SIZES = [256, 128, 96, 80, 72, 64, 60, 48, 40, 36, 32, 30, 24, 20, 16]
const MAC_SIZES = [16, 32, 64, 128, 256, 512, 1024]
const MAC_RETINA_SIZE = 2048 // 1024@2x
const LINUX_SIZES = [32, 64, 128, 256, 512]

// Render the mark at a moderate multiple of the target (crisp, avoids extreme
// downscale softness), then TRIM the transparent 1024-viewBox margins so the
// mark's bounding box — not the empty canvas — drives the fit. Returns the
// trimmed/fitted mark plus its real (non-square) dimensions.
async function renderMark(svgBuf, boxPx) {
  const renderPx = Math.min(768, Math.max(160, boxPx * 4))
  const big = await sharp(svgBuf, { density: Math.round((renderPx / 1024) * 96) })
    .resize(renderPx, renderPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()
  const trimmed = await sharp(big).trim({ threshold: 8 }).png().toBuffer()
  const fitted = await sharp(trimmed)
    .resize(boxPx, boxPx, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()
  const m = await sharp(fitted).metadata()
  return { buf: fitted, w: m.width, h: m.height }
}

/**
 * Warm-paper rounded tile: subtle vertical gradient (#FBF9F5 → #F1ECE4) + a
 * faint ink hairline ring for edge definition on light backgrounds. The
 * gradient/ring degrade gracefully to flat paper at tiny sizes. Stroke width
 * scales with size so the ring stays proportional at 512/1024.
 */
function plateSvg(size) {
  const r = Math.round(size * PLATE_RADIUS_RATIO)
  const sw = Math.max(1, Math.round(size / 300))
  const inset = sw / 2
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<defs><linearGradient id="plateGrad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#FBF9F5"/><stop offset="1" stop-color="#F1ECE4"/>' +
    '</linearGradient></defs>' +
    '<rect x="0" y="0" width="' + size + '" height="' + size + '" rx="' + r + '" ry="' + r + '" fill="url(#plateGrad)"/>' +
    '<rect x="' + inset + '" y="' + inset + '" width="' + (size - sw) + '" height="' + (size - sw) + '" rx="' + r + '" ry="' + r + '" ' +
    'fill="none" stroke="' + INK + '" stroke-opacity="0.10" stroke-width="' + sw + '"/>' +
    '</svg>')
}

async function renderSvgAt(size) {
  const box = Math.round(size * MARK_FILL_RATIO)
  const tierFile = masterForInner(box)
  const svgBuf = await getSvg(tierFile)
  const { buf: mark, w, h } = await renderMark(svgBuf, box)
  const left = Math.round((size - w) / 2)
  const top = Math.round((size - h) / 2)
  const plate = await sharp(plateSvg(size)).png().toBuffer()
  return { tierFile, buf: await sharp(plate).composite([{ input: mark, left, top }]).png({ compressionLevel: 9 }).toBuffer() }
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
  console.log('[icons] masters dir:', ICONS_DIR)
  await mkdir(ICONS_DIR, { recursive: true })

  // ------------------------------------------------------------------
  // 1. Render each unique target size: tier selection + natural-mark render +
  //    warm-paper plate composite (all internal to renderSvgAt; SVG buffers are
  //    cached by the module-level getSvg).
  // ------------------------------------------------------------------
  const allSizes = new Set([...WIN_SIZES, ...MAC_SIZES, MAC_RETINA_SIZE, ...LINUX_SIZES])
  const pngBySize = new Map()
  for (const s of [...allSizes].sort((a, b) => a - b)) {
    const { tierFile, buf } = await renderSvgAt(s)
    pngBySize.set(s, buf)
    console.log(`[icons] rendered ${s}x${s} (← ${tierFile}) → ${buf.length} bytes`)
  }

  // ------------------------------------------------------------------
  // 2. Tauri-named back-compat PNGs (referenced from tauri.conf.json)
  // ------------------------------------------------------------------
  await writeFile(join(ICONS_DIR, '32x32.png'), pngBySize.get(32))
  await writeFile(join(ICONS_DIR, '128x128.png'), pngBySize.get(128))
  await writeFile(join(ICONS_DIR, '128x128@2x.png'), pngBySize.get(256))
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
  icnsEntries[icnsEntries.length - 1] = { type: 'ic10', data: pngBySize.get(MAC_RETINA_SIZE) }
  await buildIcns(icnsEntries, join(ICONS_DIR, 'icon.icns'))
  console.log('[icons] wrote icon.icns containing:', MAC_SIZES.join(', '), '(ic10 = @2x 2048)')

  console.log('[icons] done.')
}

main().catch(err => {
  console.error('[icons] FAILED:', err)
  process.exit(1)
})
