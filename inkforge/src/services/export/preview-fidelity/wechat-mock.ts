/**
 * 微信公众号发布预览 — 高保真 mock 渲染器
 *
 * 把已渲染的 HTML 内容包装成微信公众号文章样式的预览 HTML。
 * 与 xhs/zhihu mock 对齐：
 *   - 注入 previewCSS 为 <style> 块（浏览器原生渲染伪元素/counter/字体）
 *   - CSS rescoping: #nice -> #wechat-article
 *   - 不走 juice / DOMPurify / postProcessForWechat — 仅用于本地预览
 *
 * 本模块 self-contained：
 *   - 输入已渲染 HTML（由调用方通过 renderMarkdownWithLazyOptionalEnhancements 生成）
 *   - 不引入新依赖
 *   - 输出 HTML 可直接用于 v-html
 */

// ─────────────────────────────────────────────────────────────────────────────
// 类型
// ─────────────────────────────────────────────────────────────────────────────

export interface WechatMockOptions {
  /** 当前预设 ID（如 'thesis', 'report', 'aigc' 等） */
  presetId?: string
  /** primary color override（覆盖 preset 默认色） */
  primaryColor?: string
  /**
   * 来自 themes.ts wechat preset.previewCSS 经 generateThemeCSS(preset, 'preview')
   * 生成的主题 CSS。scope 到 `#wechat-article`。
   * 注入后浏览器原生渲染伪元素、counter、字体等 CSS3 特性。
   * 未提供时 mock 仍以内联 fallback 样式渲染。
   *
   * 注意：preset 中使用 `#nice` 前缀的规则会被自动改写为 `#wechat-article`
   * 以匹配本 mock 的容器 id。
   */
  themeCSS?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────────────────────────────────────

const WATERMARK_TEXT = '预览 · 微信公众号'

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif"

// ─────────────────────────────────────────────────────────────────────────────
// HTML 转义（仅用于属性值）
// ─────────────────────────────────────────────────────────────────────────────

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ─────────────────────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 把已渲染 HTML 包装为微信公众号文章样式的预览 HTML。
 *
 * @param content - 包含已渲染 HTML 的对象
 * @param options - 预设 ID、主色覆盖、主题 CSS
 * @returns 完整的 HTML 字符串，可直接用于 v-html
 */
export function renderWechatMockHtml(
  content: { html: string },
  options?: WechatMockOptions
): string {
  const presetId = options?.presetId ?? 'aigc'
  const primaryColor = options?.primaryColor
  const themeStyle = renderThemeStyle(options?.themeCSS)

  // 容器样式：模拟微信公众号文章阅读环境
  const containerStyle = [
    `font-family:${FONT_STACK}`,
    'font-size:17px',
    'line-height:1.75',
    'color:#1a1a1a',
    'background:#ffffff',
    'padding:24px 20px',
    'max-width:677px',
    'margin:0 auto',
    'box-sizing:border-box',
  ].join(';')

  // 水印样式
  const watermarkStyle = [
    'margin-top:24px',
    'padding:8px 12px',
    'font-size:12px',
    'color:#999',
    'border-top:1px dashed #e5e5e5',
    'text-align:center',
    'letter-spacing:1px',
  ].join(';')

  // 微信文章头部 chrome：模拟公众号名称 + 发布时间行
  const chromeHeader = renderChromeHeader(primaryColor)

  return [
    `<section id="wechat-article" class="wechat-mock wechat-mock-${escapeAttr(presetId)}" style="${containerStyle}">`,
    themeStyle,
    chromeHeader,
    `<div class="wechat-mock-body">${content.html}</div>`,
    `<div class="wechat-mock-watermark" style="${watermarkStyle}">${WATERMARK_TEXT}</div>`,
    '</section>',
  ].join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS rescoping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap preset.previewCSS in a `<style>` block scoped to the wechat mock container.
 *
 * - themes.ts wechat preset CSS uses `#nice` selectors — rewritten to
 *   `#wechat-article` so all preset rules match the actual mock DOM.
 * - composeRecipes() returns rules prefixed with `#nice` — also rewritten.
 * - `</style>` in the payload is escaped to prevent breaking out of the block.
 */
function renderThemeStyle(css: string | undefined): string {
  if (!css || !css.trim()) return ''
  const rescoped = css.replace(/#nice\b/g, '#wechat-article')
  const safe = rescoped.replace(/<\/style/gi, '<\\/style')
  return `<style data-preset-theme="wechat-article">${safe}</style>`
}

// ─────────────────────────────────────────────────────────────────────────────
// 内部渲染辅助
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 渲染微信公众号文章顶部的 chrome 元素：
 * 模拟公众号名称行 + 时间行，给预览增加平台真实感。
 */
function renderChromeHeader(primaryColor?: string): string {
  const accentColor = primaryColor ?? '#576b95'

  const headerStyle = [
    'display:block',
    'margin-bottom:20px',
    'padding-bottom:16px',
    'border-bottom:1px solid #f0f0f0',
  ].join(';')

  const nameStyle = [
    'font-size:17px',
    'font-weight:600',
    'color:#1a1a1a',
    'line-height:1.4',
    'margin-bottom:4px',
  ].join(';')

  const metaStyle = [
    'font-size:12px',
    'color:#999',
    'line-height:1.4',
  ].join(';')

  const linkStyle = [
    `color:${accentColor}`,
    'text-decoration:none',
    'font-size:12px',
  ].join(';')

  return [
    `<header class="wechat-mock-chrome" style="${headerStyle}">`,
    `<div class="wechat-mock-author" style="${nameStyle}">InkForge</div>`,
    `<div class="wechat-mock-meta" style="${metaStyle}">`,
    `<span style="${linkStyle}">InkForge</span>`,
    ` · `,
    `<span>刚刚</span>`,
    `</div>`,
    `</header>`,
  ].join('')
}
