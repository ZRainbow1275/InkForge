/**
 * 微信安全子集校验器 — 见 prompts/0601/SPEC.md §4.2。
 *
 * 这是 AC9 的执行体：所有 SVG 模块输出必须 checkWechatSafe() 零违规。
 * 规则来自 prompts/0601/research/wechat-svg-capabilities.md 的 DIES/CONDITIONAL 表：
 * 微信粘贴/发布会剥 <style>/class/id，并禁 JS/foreignObject；依赖 id 引用的
 * defs/渐变/clip/mask/filter/use 不可靠 → 一律视为违规。
 */

export interface SafeViolation {
  rule: string
  detail: string
}

interface SafeRule {
  rule: string
  re: RegExp
  detail: string
}

const RULES: SafeRule[] = [
  { rule: 'no-class', re: /\sclass\s*=/i, detail: '微信剥 class，样式必须内联' },
  { rule: 'no-style-block', re: /<style[\s>]/i, detail: '微信吞 <style> 标签' },
  { rule: 'no-css-var', re: /var\(\s*--/i, detail: '微信不支持 CSS var()' },
  { rule: 'no-calc', re: /calc\(/i, detail: '微信内联 style 不支持 calc()' },
  { rule: 'no-div', re: /<div[\s>]/i, detail: '微信改写 <div>，须用 <section>' },
  { rule: 'no-foreign-object', re: /<foreignObject[\s>]/i, detail: '微信过滤 foreignObject 内 HTML' },
  {
    rule: 'no-id-referenced',
    re: /<(defs|linearGradient|radialGradient|clipPath|mask|filter|feGaussianBlur|feColorMatrix|use|symbol|pattern)[\s>]/i,
    detail: '依赖 id 引用的元素在微信不可靠（微信剥 id）',
  },
  { rule: 'no-url-ref', re: /url\(\s*#/i, detail: 'fill="url(#id)" 依赖 id，微信剥 id 后失效' },
  {
    rule: 'no-style-transform',
    re: /style\s*=\s*"[^"]*transform\s*:/i,
    detail: 'enforcePlatformCSS 会从 style 剥 transform；用 transform 属性',
  },
  {
    rule: 'no-style-animation',
    re: /style\s*=\s*"[^"]*(animation|transition)\s*:/i,
    detail: '微信剥 CSS animation/transition；用 SMIL',
  },
  { rule: 'no-keyframes', re: /@keyframes/i, detail: '需要 <style>，被剥' },
  { rule: 'no-script', re: /<script[\s>]/i, detail: '微信完全禁止 JS' },
  { rule: 'no-xlink', re: /xlink:href/i, detail: '微信 FORBID xlink:href' },
  { rule: 'no-svg-image', re: /<image[\s>]/i, detail: '禁止 SVG <image href>，用 background-image 或 <img>' },
  {
    rule: 'no-bad-smil-trigger',
    re: /begin\s*=\s*"[^"]*(touchstart|touchend|mouseover|mouseout|focusin|focusout)/i,
    detail: '移动端不可靠的 SMIL 触发器；用 begin="click"',
  },
  {
    rule: 'no-fixed-svg-width',
    re: /<svg[^>]*\bwidth\s*=\s*"\d+(?:px)?"/i,
    detail: '外层 <svg> 禁固定 px 宽，须 width="100%" + viewBox',
  },
  { rule: 'no-iframe', re: /<iframe[\s>]/i, detail: '微信过滤 iframe' },
  { rule: 'no-media', re: /<(video|audio)[\s>]/i, detail: '微信过滤 video/audio（用其自带插入）' },
]

export function checkWechatSafe(svgHtml: string): SafeViolation[] {
  const input = String(svgHtml || '')
  const out: SafeViolation[] = []
  for (const r of RULES) {
    if (r.re.test(input)) out.push({ rule: r.rule, detail: r.detail })
  }
  return out
}

export function assertWechatSafe(svgHtml: string): void {
  const v = checkWechatSafe(svgHtml)
  if (v.length > 0) {
    const msg = v.map((x) => `[${x.rule}] ${x.detail}`).join('; ')
    throw new Error(`SVG 模块违反微信安全子集: ${msg}\n输出片段: ${String(svgHtml).slice(0, 200)}`)
  }
}
