/**
 * 微信公众号本地保真预览渲染器
 *
 * 把已渲染的 HTML 内容包装成微信公众号文章样式的预览 HTML。
 * 与 xhs/zhihu 本地预览通道对齐：
 *   - 注入 previewCSS 为 <style> 块（浏览器原生渲染伪元素/counter/字体）
 *   - CSS rescoping: #nice -> #wechat-article
 *   - 不走 juice / DOMPurify / postProcessForWechat — 仅用于本地预览
 *   - 外层只复刻实测编辑画布，不伪造账号、发布时间、发布状态或平台水印
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
   * 未提供时预览仍以实测的 586px 编辑画布基线渲染。
   *
   * 注意：preset 中使用 `#nice` 前缀的规则会被自动改写为 `#wechat-article`
   * 以匹配本预览的文章容器 id。
   */
  themeCSS?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────────────────────────────────────

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
  const themeStyle = renderThemeStyle(options?.themeCSS)

  // 2026-07-27 实机测量：编辑画布 586px，左右各 4px 后正文可用宽度 578px，
  // 默认正文 17px / 27.2px。仅复刻画布，不伪造公众号账号或发布元信息。
  const containerStyle = [
    `font-family:${FONT_STACK}`,
    'font-size:17px',
    'line-height:27.2px',
    'color:#1a1a1a',
    'background:#ffffff',
    'width:100%',
    'max-width:586px',
    'min-height:100%',
    'padding:0 4px',
    'margin:0 auto',
    'box-sizing:border-box',
  ].join(';')

  const articleStyle = [
    'display:block',
    'width:100%',
    'min-width:0',
    'margin:0 auto',
    'box-sizing:border-box',
  ].join(';')

  return [
    `<section class="wechat-editor-canvas" data-platform-editor="wechat" data-editor-canvas-width="586" style="${containerStyle}">`,
    themeStyle,
    `<section id="wechat-article" class="wechat-mock wechat-mock-${escapeAttr(presetId)}" style="${articleStyle}">`,
    `<div class="wechat-mock-body">${content.html}</div>`,
    '</section>',
    '</section>',
  ].join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS rescoping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap preset.previewCSS in a `<style>` block scoped to the WeChat article.
 *
 * - themes.ts wechat preset CSS uses `#nice` selectors — rewritten to
 *   `#wechat-article` so all preset rules match the local fidelity DOM.
 * - composeRecipes() returns rules prefixed with `#nice` — also rewritten.
 * - `</style>` in the payload is escaped to prevent breaking out of the block.
 */
function renderThemeStyle(css: string | undefined): string {
  if (!css || !css.trim()) return ''
  const rescoped = css.replace(/#nice\b/g, '#wechat-article')
  const safe = rescoped.replace(/<\/style/gi, '<\\/style')
  return `<style data-preset-theme="wechat-article">${safe}</style>`
}
