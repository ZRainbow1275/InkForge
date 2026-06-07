/**
 * SVG → 栅格 PNG — 见 prompts/0601/SPEC.md §6。
 *
 * 用途：小红书海报卡（3:4 封面 / 1:1 内容）与知乎「SVG-as-img」。微信走 inline SVG，
 * 这里专供需要把装饰 SVG 落成位图 <img> 的目标平台。
 *
 * SSR 安全：真实 canvas 仅在浏览器 / Tauri WebView 可用；node/jsdom 测试环境无 canvas。
 * 因此本模块把「纯逻辑」（viewBox/dataURI/<img> 拼装，可单测、零 DOM）与「canvas 绘制」
 * （藏在 hasDom() 守卫之后）严格分层。所有 canvas 调用前必经 hasDom() 守卫，
 * 测试只覆盖纯函数 + 守卫抛错路径，绝不在测试里碰真 canvas。
 *
 * 注意：buildSvgDataUri 是「全系统唯一」有意给 <svg> 固定 px 宽高的地方——它喂给
 * canvas（栅格化需要确定的位图尺寸），不进微信，故不受 no-fixed-svg-width 约束。
 */

/** 栅格化选项。width/height = 目标位图逻辑尺寸（px）；scale = DPR 倍率；background = 可选底色。 */
export interface RasterOptions {
  width: number
  height: number
  scale?: number
  background?: string
}

/** 小红书海报版心：封面 3:4 → 1080×1440；内容 1:1 → 1080×1080。 */
export function posterViewBox(ratio: '3:4' | '1:1'): { width: number; height: number } {
  if (ratio === '1:1') return { width: 1080, height: 1080 }
  return { width: 1080, height: 1440 }
}

/**
 * 把 SVG 片段包成可栅格化的 data:image/svg+xml URI。
 *
 * 给外层 <svg> 注入显式 width/height（栅格化要确定位图尺寸——这是全系统唯一有意固定
 * px 的位置，因为它喂 canvas 而非微信）。若输入已有 <svg> 开标签，则在其上覆盖/注入
 * width+height；若没有 <svg>，则用一个带 viewBox 的 <svg> 包裹原始内容。
 */
export function buildSvgDataUri(svgHtml: string, width: number, height: number): string {
  const svgDocument = extractSvgDocument(String(svgHtml ?? ''))
  const sized = injectSvgSize(svgDocument, width, height)
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized)
}

/**
 * Module renderers usually return `<section data-ink-svg>...<svg>...</svg></section>`.
 * Canvas image loading needs an SVG document root, not an HTML fragment, so raster targets
 * extract the first SVG before sizing it. Bare SVG input and raw shape fragments remain valid.
 */
function extractSvgDocument(svgHtml: string): string {
  const m = /<svg\b[\s\S]*?<\/svg>/i.exec(svgHtml)
  return m?.[0] ?? svgHtml
}

/** 在最外层 <svg ...> 开标签上覆盖/注入 width/height；无 <svg> 时用 viewBox 包裹。 */
function injectSvgSize(svgHtml: string, width: number, height: number): string {
  const openTagRe = /<svg\b([^>]*)>/i
  const m = openTagRe.exec(svgHtml)
  if (!m) {
    // 没有 <svg>：用带 viewBox 的外壳包裹（viewBox 保比例，width/height 供栅格）。
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}">` +
      svgHtml +
      `</svg>`
    )
  }
  // 去掉已有的 width/height（含百分比），再注入固定像素尺寸。
  let attrPart = m[1].replace(/\s+(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, '')
  if (!/xmlns\s*=/.test(attrPart)) {
    attrPart = ' xmlns="http://www.w3.org/2000/svg"' + attrPart
  }
  const newOpen = `<svg${attrPart} width="${width}" height="${height}">`
  return svgHtml.replace(openTagRe, newOpen)
}

/**
 * 把位图 dataURL 包成保留 data-ink-svg 幂等哨兵的 <img>。
 * 哨兵让 inject 的 rasterize 回调可识别「这是我方注入的装饰」，二次扫描时跳过。
 */
export function svgToImgTag(dataUrl: string, moduleId: string, alt: string): string {
  return (
    '<img data-ink-svg="' +
    moduleId +
    '" src="' +
    dataUrl +
    '" alt="' +
    alt +
    '" style="width:100%;height:auto;display:block;" />'
  )
}

/** 是否处于具备 canvas 能力的 DOM 环境（浏览器 / Tauri WebView）。 */
export function hasDom(): boolean {
  return typeof document !== 'undefined' && typeof Image !== 'undefined'
}

/**
 * 真实 canvas 栅格化：SVG 字符串 → PNG dataURL（无 mock）。
 *
 * 仅在 hasDom() 为真时执行；node/jsdom 下直接抛错（调用方应先判 hasDom 或在浏览器侧用）。
 * 流程：buildSvgDataUri 在 width*scale × height*scale 尺寸 → new Image() 载入 → 画到同尺寸
 * canvas（可选先填 background）→ toDataURL('image/png')。
 */
export async function rasterizeSvg(svgHtml: string, opts: RasterOptions): Promise<string> {
  if (!hasDom()) {
    throw new Error('rasterizeSvg requires a DOM/canvas environment')
  }
  const scale = opts.scale ?? 2
  const pxW = Math.max(1, Math.round(opts.width * scale))
  const pxH = Math.max(1, Math.round(opts.height * scale))
  const dataUri = buildSvgDataUri(svgHtml, pxW, pxH)

  const img = await loadImage(dataUri)

  const canvas = document.createElement('canvas')
  canvas.width = pxW
  canvas.height = pxH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('rasterizeSvg: 2D canvas context unavailable')
  }
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, pxW, pxH)
  }
  ctx.drawImage(img, 0, 0, pxW, pxH)
  return canvas.toDataURL('image/png')
}

/** new Image() 载入 dataURI，resolve 于 onload，reject 于 onerror。 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('rasterizeSvg: failed to load SVG image'))
    img.src = src
  })
}

/**
 * 小红书海报卡：取静态首帧（调用方应传 allowMotion=false 渲染的 SVG），
 * 按 ratio 选版心，scale=1（版心已是 1080 物理像素，足够清晰），栅格成 PNG dataURL。
 */
export async function renderXhsPosterCard(
  svgHtml: string,
  ratio: '3:4' | '1:1',
  background?: string,
): Promise<string> {
  const vb = posterViewBox(ratio)
  return rasterizeSvg(svgHtml, { width: vb.width, height: vb.height, scale: 1, background })
}
