/**
 * 共享排版 CSS 生成
 *
 * 编辑器 (TipTap) 和预览面板统一使用的排版 CSS 变量，
 * 确保编辑态和预览态的视觉一致性。
 *
 * 数据来源：settings.appearance 中的用户配置
 */
import { FONT_STACKS, type FontFamily } from '@/constants'

// ═══════════════════════════════════════════════════════════════════
// 字体映射
// ═══════════════════════════════════════════════════════════════════

/** Settings 字体键 → CSS font-family 栈 */
export function getFontStack(key: string): string {
  return Object.prototype.hasOwnProperty.call(FONT_STACKS, key)
    ? FONT_STACKS[key as FontFamily]
    : FONT_STACKS.serif
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
  /** 正文对齐 */
  textAlign: 'left' | 'justify'
  /** 列表项间距 (px) */
  listSpacing: number
  /** 标题字号层级 */
  headingScale: 'compact' | 'balanced' | 'display'
  /** Settings 字体键 */
  fontFamily: string
  /** 标题装饰 */
  headingStyle: 'underline' | 'background' | 'border-left' | 'pill' | 'marker' | 'none'
  /** 引用块装饰 */
  blockquoteStyle: 'classic' | 'modern' | 'minimal' | 'card' | 'double-line'
  /** 分隔线装饰 */
  dividerStyle: 'line' | 'dots' | 'ornament'
  /** 图片装饰 */
  mediaStyle: 'plain' | 'rounded' | 'framed'
}

type CssDeclarations = Readonly<Record<string, string>>

interface ResolvedWechatTypography {
  fontStack: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  paragraphIndent: string
  textAlign: 'left' | 'justify'
  listSpacing: number
  headingSizes: Readonly<Record<'h1' | 'h2' | 'h3', string>>
  headingStyle: CssDeclarations
  blockquoteStyle: CssDeclarations
  dividerStyle: CssDeclarations
  mediaStyle: CssDeclarations
}

function resolveWechatTypography(
  config: TypographyConfig,
  accentColor: string,
): ResolvedWechatTypography {
  const clamp = (value: number, min: number, max: number, fallback: number): number =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
  const color = /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor.toUpperCase() : '#D32F2F'
  const colorValue = Number.parseInt(color.slice(1), 16)
  const softColor = `rgba(${colorValue >> 16}, ${(colorValue >> 8) & 0xFF}, ${colorValue & 0xFF}, 0.1)`
  const headingSizes: Record<TypographyConfig['headingScale'], ResolvedWechatTypography['headingSizes']> = {
    compact: { h1: '1.55em', h2: '1.22em', h3: '1.08em' },
    balanced: { h1: '1.75em', h2: '1.38em', h3: '1.12em' },
    display: { h1: '2em', h2: '1.55em', h3: '1.2em' },
  }
  const headingStyles: Record<TypographyConfig['headingStyle'], CssDeclarations> = {
    none: {},
    underline: {
      'border-bottom': `2px solid ${color}`,
      'padding-bottom': '0.18em',
    },
    background: {
      background: '#F7F8FA',
      color: '#252933',
      padding: '0.12em 0.4em',
      'border-radius': '6px',
    },
    'border-left': {
      'border-left': `4px solid ${color}`,
      'padding-left': '0.5em',
    },
    pill: {
      display: 'inline-block',
      'max-width': '100%',
      border: `1px solid ${color}`,
      'border-radius': '999px',
      background: softColor,
      color: '#252933',
      padding: '0.18em 0.72em',
      'box-sizing': 'border-box',
    },
    marker: {
      'border-bottom': `0.42em solid ${softColor}`,
      padding: '0 0.08em 0.04em',
    },
  }
  const blockquoteStyles: Record<TypographyConfig['blockquoteStyle'], CssDeclarations> = {
    classic: {
      'border-left': `4px solid ${color}`,
      background: '#F7F8FA',
      color: 'inherit',
      padding: '12px 16px',
    },
    modern: {
      border: '0',
      'border-left': '0',
      background: '#F7F8FA',
      color: 'inherit',
      'border-radius': '8px',
      'box-shadow': `inset 4px 0 0 ${color}`,
      padding: '14px 18px',
    },
    minimal: {
      border: '0',
      'border-left': `2px solid ${color}`,
      background: 'transparent',
      color: 'inherit',
      padding: '0 0 0 12px',
    },
    card: {
      border: `1px solid ${softColor}`,
      'border-left': `4px solid ${color}`,
      background: '#FFFFFF',
      color: 'inherit',
      'border-radius': '10px',
      'box-shadow': '0 8px 24px rgba(38, 50, 56, 0.08)',
      padding: '16px 18px',
    },
    'double-line': {
      border: '0',
      'border-top': `2px solid ${color}`,
      'border-bottom': `2px solid ${color}`,
      background: 'transparent',
      color: 'inherit',
      padding: '14px 4px',
    },
  }
  const dividerStyles: Record<TypographyConfig['dividerStyle'], CssDeclarations> = {
    line: {
      border: '0',
      'border-top': '1px solid #D8DEE4',
      height: '0',
      background: 'transparent',
      'max-width': '100%',
    },
    dots: {
      border: '0',
      'border-top': `3px dotted ${color}`,
      height: '0',
      background: 'transparent',
      'max-width': '120px',
    },
    ornament: {
      border: '0',
      'border-top': `3px double ${color}`,
      height: '0',
      background: 'transparent',
      'max-width': '72px',
    },
  }
  const mediaStyles: Record<TypographyConfig['mediaStyle'], CssDeclarations> = {
    plain: {
      border: '0',
      'border-radius': '0',
      'box-shadow': 'none',
      padding: '0',
      'box-sizing': 'border-box',
    },
    rounded: {
      border: '0',
      'border-radius': '12px',
      'box-shadow': '0 6px 18px rgba(38, 50, 56, 0.12)',
      padding: '0',
      'box-sizing': 'border-box',
    },
    framed: {
      border: `1px solid ${softColor}`,
      'border-radius': '8px',
      background: '#FFFFFF',
      'box-shadow': '0 8px 24px rgba(38, 50, 56, 0.12)',
      padding: '6px',
      'box-sizing': 'border-box',
    },
  }

  return {
    fontStack: getFontStack(config.fontFamily),
    fontSize: clamp(config.fontSize, 12, 24, 16),
    lineHeight: clamp(config.lineHeight, 1.2, 2.4, 1.618),
    letterSpacing: clamp(config.letterSpacing, -0.05, 0.2, 0),
    paragraphSpacing: clamp(config.paragraphSpacing, 0, 32, 16),
    paragraphIndent: config.paragraphIndent ? '2em' : '0',
    textAlign: config.textAlign === 'justify' ? 'justify' : 'left',
    listSpacing: clamp(config.listSpacing, 2, 16, 8),
    headingSizes: headingSizes[config.headingScale] ?? headingSizes.balanced,
    headingStyle: headingStyles[config.headingStyle] ?? headingStyles.none,
    blockquoteStyle: blockquoteStyles[config.blockquoteStyle] ?? blockquoteStyles.classic,
    dividerStyle: dividerStyles[config.dividerStyle] ?? dividerStyles.line,
    mediaStyle: mediaStyles[config.mediaStyle] ?? mediaStyles.plain,
  }
}

function cssRule(selector: string, declarations: CssDeclarations): string {
  const body = Object.entries(declarations)
    .map(([property, value]) => `${property}: ${value};`)
    .join(' ')
  return body ? `${selector} { ${body} }` : ''
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
    '--ink-text-align': config.textAlign,
    '--ink-list-spacing': `${config.listSpacing}px`,
    '--ink-heading-scale': config.headingScale,
    '--ink-heading-style': config.headingStyle,
    '--ink-blockquote-style': config.blockquoteStyle,
    '--ink-divider-style': config.dividerStyle,
    '--ink-media-style': config.mediaStyle,
    '--ink-font-family': getFontStack(config.fontFamily),
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

/**
 * 生成可由 juice 内联到微信公众号正文的排版覆盖。
 * 仅使用 Settings schema 允许的数值与枚举，未知运行时输入回退到安全默认值。
 */
export function typographyToWechatCss(config: TypographyConfig, accentColor = '#D32F2F'): string {
  const resolved = resolveWechatTypography(config, accentColor)

  return [
    cssRule('#nice', {
      'font-family': resolved.fontStack,
      'font-size': `${resolved.fontSize}px`,
      'line-height': `${resolved.lineHeight}`,
      'letter-spacing': `${resolved.letterSpacing}em`,
    }),
    cssRule('#nice p', {
      'font-family': resolved.fontStack,
      'font-size': `${resolved.fontSize}px`,
      'line-height': `${resolved.lineHeight}`,
      'letter-spacing': `${resolved.letterSpacing}em`,
      'margin-bottom': `${resolved.paragraphSpacing}px`,
      'text-align': resolved.textAlign,
    }),
    `#nice p, #nice p:first-of-type { text-indent: ${resolved.paragraphIndent}; }`,
    '#nice blockquote p, #nice blockquote p:first-of-type { text-indent: 0; }',
    cssRule('#nice li, #nice ul li, #nice ol li', {
      'margin-bottom': `${resolved.listSpacing}px`,
    }),
    cssRule('#nice h1', { 'font-size': resolved.headingSizes.h1 }),
    cssRule('#nice h2', { 'font-size': resolved.headingSizes.h2 }),
    cssRule('#nice h3', { 'font-size': resolved.headingSizes.h3 }),
    cssRule('#nice h1, #nice h2, #nice h3', resolved.headingStyle),
    cssRule('#nice blockquote', resolved.blockquoteStyle),
    cssRule('#nice hr', resolved.dividerStyle),
    cssRule('#nice img', resolved.mediaStyle),
  ].filter(Boolean).join('\n')
}

function escapeStyleAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function splitCssDeclarations(cssText: string): string[] {
  const declarations: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let parenthesisDepth = 0

  for (let index = 0; index < cssText.length; index += 1) {
    const character = cssText[index]
    const previous = cssText[index - 1]
    if (quote) {
      current += character
      if (character === quote && previous !== '\\') quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      current += character
      continue
    }
    if (character === '(') parenthesisDepth += 1
    if (character === ')' && parenthesisDepth > 0) parenthesisDepth -= 1
    if (character === ';' && parenthesisDepth === 0) {
      if (current.trim()) declarations.push(current.trim())
      current = ''
      continue
    }
    current += character
  }

  if (current.trim()) declarations.push(current.trim())
  return declarations
}

function expandCssProperty(property: string): readonly string[] {
  const normalized = property.toLowerCase()
  const borderImageProperties = [
    'border-image-source',
    'border-image-slice',
    'border-image-width',
    'border-image-outset',
    'border-image-repeat',
  ] as const
  const box = /^(margin|padding)(?:-(top|right|bottom|left))?$/.exec(normalized)
  if (box) {
    return box[2]
      ? [normalized]
      : ['top', 'right', 'bottom', 'left'].map(side => `${box[1]}-${side}`)
  }

  if (normalized === 'background') {
    return [
      'background-color',
      'background-image',
      'background-position',
      'background-size',
      'background-repeat',
      'background-origin',
      'background-clip',
      'background-attachment',
    ]
  }
  if (normalized === 'font') {
    return [
      'font-style',
      'font-variant',
      'font-weight',
      'font-stretch',
      'font-size',
      'line-height',
      'font-family',
    ]
  }

  const borderSide = /^border-(top|right|bottom|left)$/.exec(normalized)
  if (normalized === 'border') {
    return ['top', 'right', 'bottom', 'left']
      .flatMap(side => ['width', 'style', 'color'].map(part => `border-${side}-${part}`))
      .concat(borderImageProperties)
  }
  if (normalized === 'border-image') return borderImageProperties
  if (borderSide) {
    return ['width', 'style', 'color'].map(part => `border-${borderSide[1]}-${part}`)
  }

  const borderPart = /^border-(width|style|color)$/.exec(normalized)
  if (borderPart) {
    return ['top', 'right', 'bottom', 'left']
      .map(side => `border-${side}-${borderPart[1]}`)
  }

  if (normalized === 'border-radius') {
    return [
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius',
    ]
  }

  return [normalized]
}

function cssPropertiesConflict(left: string, right: string): boolean {
  const rightProperties = new Set(expandCssProperty(right))
  return expandCssProperty(left).some(property => rightProperties.has(property))
}

function mergeInlineStyle(
  openingTag: string,
  declarations: CssDeclarations,
  preservedProperties: readonly string[] = [],
): string {
  if (Object.keys(declarations).length === 0) return openingTag

  const styleMatch = /\sstyle\s*=\s*(["'])([\s\S]*?)\1/i.exec(openingTag)
  const controlledProperties = Object.keys(declarations).map(property => property.toLowerCase())
  const preservedPropertySet = preservedProperties.map(property => property.toLowerCase())
  const existingDeclarations = splitCssDeclarations(styleMatch?.[2] ?? '')
    .filter(declaration => {
      const separator = declaration.indexOf(':')
      if (separator < 1) return false
      const property = declaration.slice(0, separator).trim().toLowerCase()
      const isControlled = controlledProperties.some(controlled =>
        cssPropertiesConflict(property, controlled),
      )
      const isPreserved = preservedPropertySet.some(preserved =>
        cssPropertiesConflict(property, preserved),
      )
      return !isControlled || isPreserved
    })
  const canonicalDeclarations = Object.entries(declarations)
    .filter(([property]) =>
      !preservedPropertySet.some(preserved =>
        cssPropertiesConflict(property.toLowerCase(), preserved),
      ),
    )
    .map(([property, value]) => `${property}:${value}`)
  const mergedStyle = escapeStyleAttribute(
    [...existingDeclarations, ...canonicalDeclarations].join(';'),
  )

  if (styleMatch?.index !== undefined) {
    return (
      openingTag.slice(0, styleMatch.index) +
      ` style="${mergedStyle}"` +
      openingTag.slice(styleMatch.index + styleMatch[0].length)
    )
  }

  const closing = openingTag.endsWith('/>') ? '/>' : '>'
  return `${openingTag.slice(0, -closing.length)} style="${mergedStyle}"${closing}`
}

function applyOpeningTagStyles(
  html: string,
  tagNames: string,
  declarations: CssDeclarations,
  predicate: (openingTag: string) => boolean = () => true,
  preservedProperties: readonly string[] = [],
): string {
  if (Object.keys(declarations).length === 0) return html
  const pattern = new RegExp(`<(?:${tagNames})\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi')
  return html.replace(pattern, openingTag =>
    predicate(openingTag)
      ? mergeInlineStyle(openingTag, declarations, preservedProperties)
      : openingTag,
  )
}

function applyFirstFlagshipDescendantStyles(
  html: string,
  blockId: 'flagship-h2' | 'flagship-h3',
  descendantTag: 'p' | 'span',
  declarations: CssDeclarations,
): string {
  if (Object.keys(declarations).length === 0) return html
  const sectionPattern = new RegExp(
    `<section\\b(?=[^>]*\\bdata-ink-block\\s*=\\s*(?:"${blockId}"|'${blockId}'))[^>]*>[\\s\\S]*?<\\/section\\s*>`,
    'gi',
  )
  return html.replace(sectionPattern, (sectionHtml) => {
    let styled = false
    return applyOpeningTagStyles(
      sectionHtml,
      descendantTag,
      declarations,
      () => {
        if (styled) return false
        styled = true
        return true
      },
    )
  })
}

/**
 * Re-apply canonical controls after preset decorators replace semantic nodes.
 *
 * This bridge changes only controlled inline properties on known InkForge
 * nodes. It does not copy vendor DOM, remove SVG sentinels, or create another
 * renderer/state source.
 */
export function applyWechatTypographyInlineOverrides(
  html: string,
  config: TypographyConfig,
  accentColor = '#D32F2F',
  preserveBlockquoteContrast = false,
): string {
  const resolved = resolveWechatTypography(config, accentColor)
  let result = html

  result = applyOpeningTagStyles(result, 'li', {
    'margin-bottom': `${resolved.listSpacing}px`,
  })

  for (const level of ['h1', 'h2', 'h3'] as const) {
    result = applyOpeningTagStyles(result, level, {
      'font-size': resolved.headingSizes[level],
      ...resolved.headingStyle,
    })
  }

  result = applyOpeningTagStyles(
    result,
    'blockquote',
    resolved.blockquoteStyle,
    undefined,
    preserveBlockquoteContrast ? ['background', 'color'] : [],
  )
  result = applyOpeningTagStyles(result, 'hr', resolved.dividerStyle)
  result = applyOpeningTagStyles(result, 'img', resolved.mediaStyle)

  const flagshipH2Styles = {
    'font-size': resolved.headingSizes.h2,
    ...resolved.headingStyle,
  }
  const flagshipH3Styles = {
    'font-size': resolved.headingSizes.h3,
    ...resolved.headingStyle,
  }
  result = applyFirstFlagshipDescendantStyles(result, 'flagship-h2', 'p', flagshipH2Styles)
  result = applyFirstFlagshipDescendantStyles(result, 'flagship-h3', 'span', flagshipH3Styles)

  if (config.blockquoteStyle !== 'classic') {
    result = applyOpeningTagStyles(
      result,
      'section',
      resolved.blockquoteStyle,
      openingTag =>
        /\bdata-ink-block\s*=\s*["']flagship-(?:quote|callout|pullquote)["']/i.test(openingTag),
    )
  }

  if (config.dividerStyle !== 'line') {
    result = applyOpeningTagStyles(
      result,
      'div',
      {
        ...resolved.dividerStyle,
        'font-size': '0',
        'letter-spacing': '0',
      },
      openingTag =>
        /\bclass\s*=\s*["'][^"']*\bink-(?:thesis-hr|comm-hrd|ornament-hr)\b/i.test(openingTag),
    )
    result = applyOpeningTagStyles(
      result,
      'section',
      resolved.dividerStyle,
      openingTag => /\bdata-ink-svg\s*=\s*["']divider-/i.test(openingTag),
    )
  }

  return result
}
