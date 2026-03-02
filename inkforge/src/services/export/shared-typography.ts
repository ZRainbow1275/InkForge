/**
 * 共享排版 CSS 生成
 *
 * 编辑器 (TipTap) 和预览面板统一使用的排版 CSS 变量，
 * 确保编辑态和预览态的视觉一致性。
 *
 * 数据来源：settings.appearance 中的用户配置
 */

// ═══════════════════════════════════════════════════════════════════
// 字体映射
// ═══════════════════════════════════════════════════════════════════

/** Settings 字体键 → CSS font-family 栈 */
export function getFontStack(key: string): string {
  switch (key) {
    case 'serif':
      return "'Noto Serif SC', 'Source Han Serif SC', serif"
    case 'sans':
      return "'Noto Sans SC', 'Source Han Sans SC', -apple-system, sans-serif"
    case 'kai':
      return "'KaiTi', 'STKaiti', serif"
    case 'mono':
      return "'JetBrains Mono', 'Fira Code', monospace"
    default:
      return "'Noto Serif SC', serif"
  }
}

// ═══════════════════════════════════════════════════════════════════
// 共享排版 CSS 变量生成
// ═══════════════════════════════════════════════════════════════════

export interface SharedTypographyOptions {
  /** 字体键 (serif/sans/kai/mono) */
  fontFamily: string
  /** 正文字号 (px) */
  fontSize: number
  /** 行高倍数 */
  lineHeight: number
  /** 主色调 */
  accentColor: string
}

/**
 * 生成共享排版 CSS 变量字符串
 *
 * 返回的是纯 CSS 属性声明（不含选择器），
 * 可直接插入 :root 或任何容器的 style 中。
 */
export function generateSharedTypographyCSS(options: SharedTypographyOptions): string {
  const fontStack = getFontStack(options.fontFamily)

  return `
    --inkforge-font-family: ${fontStack};
    --inkforge-font-size: ${options.fontSize}px;
    --inkforge-line-height: ${options.lineHeight};
    --inkforge-accent: ${options.accentColor};
    --inkforge-heading-font: 'Noto Serif SC', ${fontStack};
    --inkforge-code-font: 'JetBrains Mono', 'Fira Code', monospace;
  `
}

// ═══════════════════════════════════════════════════════════════════
// 排版配置 → CSS 变量映射
// 确保编辑器和预览面板渲染一致
// ═══════════════════════════════════════════════════════════════════

/**
 * 细粒度排版配置
 * 用于编辑器/预览面板的精确排版控制
 */
export interface TypographyConfig {
  /** 正文字号 (px) */
  fontSize: number
  /** 行高倍数 */
  lineHeight: number
  /** 字间距 (em) */
  letterSpacing: number
  /** 段间距 (px) */
  paragraphSpacing: number
  /** 是否启用首行缩进 */
  paragraphIndent: boolean
  /** 字体族 CSS 值 */
  fontFamily: string
}

/**
 * 将排版配置转换为 CSS 变量对象
 * 用于注入到编辑器和预览面板的 style 绑定
 */
export function typographyToCssVars(config: TypographyConfig): Record<string, string> {
  return {
    '--ink-font-size': `${config.fontSize}px`,
    '--ink-line-height': `${config.lineHeight}`,
    '--ink-letter-spacing': `${config.letterSpacing}em`,
    '--ink-paragraph-spacing': `${config.paragraphSpacing}px`,
    '--ink-text-indent': config.paragraphIndent ? '2em' : '0',
    '--ink-font-family': config.fontFamily,
  }
}

/**
 * 将排版配置转换为内联 CSS 字符串
 * 用于导出 HTML 时注入到容器 style 属性
 */
export function typographyToInlineCss(config: TypographyConfig): string {
  return Object.entries(typographyToCssVars(config))
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ')
}
