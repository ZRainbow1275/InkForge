/**
 * 主题预设和 CSS 生成
 */

import type { ExportPreset } from '@/types'
import { FONT_STACKS } from '@/constants'

// highlight.js 代码主题样式 (atom-one-dark)
export const codeThemeCSS = `
/* Atom One Dark Theme */
.hljs {
  background: #282c34;
  color: #abb2bf;
}
.hljs-comment,
.hljs-quote {
  color: #5c6370;
  font-style: italic;
}
.hljs-doctag,
.hljs-keyword,
.hljs-formula {
  color: #c678dd;
}
.hljs-section,
.hljs-name,
.hljs-selector-tag,
.hljs-deletion,
.hljs-subst {
  color: #e06c75;
}
.hljs-literal {
  color: #56b6c2;
}
.hljs-string,
.hljs-regexp,
.hljs-addition,
.hljs-attribute,
.hljs-meta .hljs-string {
  color: #98c379;
}
.hljs-attr,
.hljs-variable,
.hljs-template-variable,
.hljs-type,
.hljs-selector-class,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-number {
  color: #d19a66;
}
.hljs-symbol,
.hljs-bullet,
.hljs-link,
.hljs-meta,
.hljs-selector-id,
.hljs-title {
  color: #61aeee;
}
.hljs-built_in,
.hljs-title.class_,
.hljs-class .hljs-title {
  color: #e6c07b;
}
.hljs-emphasis {
  font-style: italic;
}
.hljs-strong {
  font-weight: bold;
}
.hljs-link {
  text-decoration: underline;
}
`

// 基础CSS样式
export const baseCSS = `
/* 基础样式 */
#nice {
  font-size: 15px;
  line-height: 1.8;
  color: #333;
  padding: 16px;
  word-break: break-word;
}

#nice p {
  margin: 0 0 16px 0;
  padding: 0;
  line-height: 1.8;
}

#nice h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 32px 0 16px 0;
  padding: 0;
  line-height: 1.4;
}

#nice h2 {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 24px 0 16px 0;
  padding: 0;
  line-height: 1.5;
}

#nice h3 {
  font-size: 17px;
  font-weight: 600;
  color: #333;
  margin: 20px 0 12px 0;
  padding: 0;
  line-height: 1.5;
}

#nice h4 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 16px 0 8px 0;
  padding: 0;
  line-height: 1.5;
}

#nice h5 {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin: 12px 0 8px 0;
  padding: 0;
  line-height: 1.5;
}

#nice h6 {
  font-size: 13px;
  font-weight: 600;
  color: #777;
  margin: 12px 0 8px 0;
  padding: 0;
  line-height: 1.5;
}

#nice strong {
  font-weight: 700;
  color: #333;
}

#nice em {
  font-style: italic;
}

#nice del, #nice s {
  text-decoration: line-through;
  color: #999;
}

#nice mark {
  background: #fff3b0;
  padding: 2px 4px;
  border-radius: 2px;
}

#nice sub {
  font-size: 0.75em;
  vertical-align: sub;
}

#nice sup {
  font-size: 0.75em;
  vertical-align: super;
}

#nice blockquote {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid #0066cc;
  background: #f5f7f9;
  color: #666;
}

#nice blockquote p {
  margin: 4px 0;
}

#nice ul, #nice ol {
  margin: 16px 0;
  padding-left: 24px;
}

#nice li {
  margin-bottom: 8px;
  line-height: 1.8;
}

#nice code {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 14px;
  background: #fff5f5;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--md-primary-color, #c7254e);
  word-break: break-word;
}

#nice pre {
  margin: 16px 0;
  padding: 16px;
  background: #282c34;
  border-radius: 8px;
  overflow-x: auto;
}

#nice pre code {
  background: transparent;
  color: #abb2bf;
  padding: 0;
  font-size: 14px;
  line-height: 1.6;
}

#nice a {
  color: #0066cc;
  text-decoration: none;
}

#nice img {
  max-width: 100%;
  height: auto;
  margin: 16px 0;
  border-radius: 4px;
}

#nice table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

#nice th, #nice td {
  padding: 10px 12px;
  border: 1px solid #ddd;
  text-align: left;
}

#nice th {
  background: #f5f5f5;
  font-weight: 600;
}

#nice hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 24px 0;
}
`

// 10种主题预设
export const themePresets: ExportPreset[] = [
  {
    id: 'thesis',
    name: '论文翻译',
    icon: 'thesis',
    description: '学术严谨，苏联红色调',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#8B0000',
    isUseIndent: true,
    isUseJustify: true,
    customCSS: `
      #nice { background: #faf9f6; }
      #nice h2 { text-align: center; font-variant: small-caps; letter-spacing: 2px; border-bottom: 1px solid #8B0000; padding-bottom: 12px; margin-bottom: 24px; }
      #nice h3 { color: #8B0000; font-weight: 700; }
      #nice blockquote { border-left: 4px solid #8B0000; background: rgba(139,0,0,0.03); border-radius: 0 4px 4px 0; padding: 12px 16px; }
      #nice table th { background: #8B0000; color: #fff; }
    `
  },
  {
    id: 'legal',
    name: '法学研讨',
    icon: 'legal',
    description: '常青藤学院风',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#1A3A5C',
    isUseIndent: true,
    isUseJustify: true,
    customCSS: `
      #nice h2 { border-bottom: 2px solid #1A3A5C; padding-bottom: 8px; color: #1A3A5C; }
      #nice h3 { border-left: 4px solid #4A7C59; padding-left: 12px; }
      #nice blockquote { background: #f5f5f0; border-left-color: #4A7C59; border-radius: 0 4px 4px 0; font-style: normal; }
      #nice table th { background: #1A3A5C; color: #fff; }
      #nice table td { border-color: #d0d0c8; }
    `
  },
  {
    id: 'report',
    name: '行业研报',
    icon: 'report',
    description: '华尔街日报风',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#004080',
    isUseIndent: false,
    isUseJustify: true,
    customCSS: `
      #nice { border-top: 8px solid #004080; padding-top: 24px; }
      #nice h2 { color: #004080; font-weight: 800; letter-spacing: -0.5px; border-bottom: 2px solid #004080; padding-bottom: 6px; }
      #nice table th { background: #004080; color: #fff; font-weight: 600; }
      #nice table { border: 1px solid #004080; }
      #nice blockquote { background: #E3F2FD; border-left: 4px solid #004080; border-radius: 0 4px 4px 0; }
    `
  },
  {
    id: 'commentary',
    name: '时事点评',
    icon: 'commentary',
    description: '观点清晰鲜明',
    theme: 'simple',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#C00000',
    isUseIndent: false,
    isUseJustify: true,
    customCSS: `
      #nice h2 { color: #C00000; font-weight: 900; font-size: 22px; margin-top: 32px; }
      #nice strong { color: #C00000; font-weight: 900; }
      #nice blockquote { border-left: 4px solid #C00000; font-style: italic; background: #FFF5F5; border-radius: 0 4px 4px 0; }
      #nice hr { border-top: 2px solid #C00000; margin: 32px 0; }
    `
  },
  {
    id: 'aigc',
    name: 'AIGC',
    icon: 'aigc',
    description: '未来科技感',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#7B2D8E',
    isUseIndent: false,
    isUseJustify: false,
    customCSS: `
      #nice h2 { color: #7B2D8E; background: linear-gradient(135deg, rgba(123,45,142,0.08), rgba(99,102,241,0.08)); padding: 8px 12px; border-radius: 4px; }
      #nice code { background: rgba(123,45,142,0.1); color: #7B2D8E; }
      #nice blockquote { border-left: 4px solid #7B2D8E; background: rgba(123,45,142,0.03); }
      #nice a { color: #7B2D8E; }
    `
  },
  {
    id: 'code',
    name: '编程创造',
    icon: 'code',
    description: '程序员简练风',
    theme: 'default',
    fontFamily: 'monospace',
    fontSize: '15px',
    primaryColor: '#00FF41',
    isUseIndent: false,
    isUseJustify: false,
    customCSS: `
      #nice { background: #0d1117; color: #c9d1d9; font-family: 'JetBrains Mono', monospace; }
      #nice h2, #nice h3 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
      #nice p { color: #c9d1d9; }
      #nice a { color: #58a6ff; }
      #nice code { background: #161b22; color: #79c0ff; border: 1px solid #30363d; }
      #nice blockquote { border-left: 4px solid #3fb950; background: rgba(63,185,80,0.05); }
      #nice table th { background: #161b22; color: #c9d1d9; border-color: #30363d; }
      #nice table td { border-color: #30363d; background: #0d1117; }
      #nice strong { color: #ff7b72; }
      #nice hr { border-top: 1px solid #30363d; }
    `
  },
  {
    id: 'notes',
    name: '学习笔记',
    icon: 'notes',
    description: '知识卡片风',
    theme: 'grace',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#E07020',
    isUseIndent: false,
    isUseJustify: false,
    customCSS: `
      #nice h2 { color: #E07020; background: #FFF8E7; padding: 8px 14px; border-radius: 6px; border-left: 4px solid #E07020; }
      #nice blockquote { background: #FFF8E7; border-left-color: #E07020; border-radius: 4px; }
      #nice table th { background: #E07020; color: #fff; }
      #nice code { background: rgba(224,112,32,0.08); color: #E07020; }
    `
  },
  {
    id: 'news',
    name: '新闻',
    icon: 'news',
    description: '极简新媒体',
    theme: 'simple',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#000000',
    isUseIndent: false,
    isUseJustify: true,
    customCSS: `
      #nice h2 { font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-top: 3px solid #000; border-bottom: 1px solid #000; padding: 10px 0; text-align: center; }
      #nice h3 { font-weight: 700; border-left: 4px solid #000; padding-left: 12px; }
      #nice blockquote { border-left: 3px solid #000; background: #f5f5f5; }
      #nice strong { font-weight: 900; }
    `
  },
  {
    id: 'meme',
    name: '整活',
    icon: 'meme',
    description: '年轻有趣',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#FF6B9D',
    isUseIndent: false,
    isUseJustify: false,
    customCSS: `
      #nice h2 { color: #FF6B9D; font-weight: 800; font-size: 20px; }
      #nice h3 { color: #FF6B9D; }
      #nice strong { color: #FF6B9D; font-weight: 800; }
      #nice blockquote { border-left: 4px solid #FF6B9D; background: #FFF0F5; border-radius: 0 12px 12px 0; padding: 12px 16px; }
      #nice code { background: rgba(255,107,157,0.1); color: #FF6B9D; border-radius: 4px; }
      #nice table th { background: #FF6B9D; color: #fff; }
      #nice hr { border-top: 2px dashed #FF6B9D; margin: 24px 0; }
      #nice a { color: #FF6B9D; }
    `
  },
  {
    id: 'life',
    name: '人生感悟',
    icon: 'life',
    description: '极简Vlog风',
    theme: 'simple',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#666666',
    isUseIndent: true,
    isUseJustify: false,
    customCSS: `
      #nice { max-width: 600px; margin: 0 auto; }
      #nice p { line-height: 2.2; margin-bottom: 1.5em; }
      #nice h2 { color: #555; font-weight: 400; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-top: 36px; }
      #nice h3 { color: #666; font-weight: 400; }
      #nice blockquote { border-left: 3px solid #ccc; background: #fafafa; color: #888; font-style: italic; border-radius: 0 4px 4px 0; }
      #nice hr { border-top: 1px solid #eee; margin: 36px 0; }
      #nice a { color: #888; border-bottom: 1px solid #ddd; }
    `
  },
  {
    id: 'elegant',
    name: '优雅',
    icon: 'elegant',
    description: '暗金衬线，书卷气息',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '16px',
    primaryColor: '#B8860B',
    isUseIndent: true,
    isUseJustify: true,
    customCSS: `
      #nice { font-family: Georgia, "Noto Serif SC", "Source Han Serif SC", serif; line-height: 1.9; }
      #nice p { margin-bottom: 1.2em; text-indent: 2em; }
      #nice h2 { font-weight: 600; border-bottom: 2px double #B8860B; padding-bottom: 8px; }
      #nice blockquote { border-left: 3px solid #B8860B; background: #faf8f0; font-style: italic; }
    `
  },
  {
    id: 'tech',
    name: '科技',
    icon: 'tech',
    description: '靛蓝渐变，未来感',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#6366f1',
    isUseIndent: false,
    isUseJustify: false,
    customCSS: `
      #nice { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.8; }
      #nice p { margin-bottom: 1em; }
      #nice blockquote { border-left: 4px solid #6366f1; background: #f0f0ff; border-radius: 0 8px 8px 0; }
    `
  }
]

/**
 * 生成主题CSS
 */
export function generateThemeCSS(preset: ExportPreset): string {
  let css = baseCSS

  // 字体 - 使用统一的字体栈定义
  const fontKey = preset.fontFamily === 'sans-serif' ? 'sans'
    : preset.fontFamily === 'monospace' ? 'mono'
    : preset.fontFamily as keyof typeof FONT_STACKS

  const fontStack = FONT_STACKS[fontKey] || FONT_STACKS.sans

  css += `
    #nice { font-family: ${fontStack}; }
  `

  // 主色
  css += `
    #nice a { color: ${preset.primaryColor}; }
    #nice blockquote { border-left-color: ${preset.primaryColor}; }
  `

  // 首行缩进
  if (preset.isUseIndent) {
    css += `
      #nice p { text-indent: 2em; }
    `
  }

  // 两端对齐
  if (preset.isUseJustify) {
    css += `
      #nice p { text-align: justify; }
    `
  }

  // 自定义CSS
  if (preset.customCSS) {
    css += preset.customCSS
  }

  return css
}

/**
 * 获取预设
 */
export function getPresetById(id: string): ExportPreset | undefined {
  return themePresets.find(p => p.id === id)
}

export function getDefaultPreset(): ExportPreset {
  return themePresets[0]
}

/**
 * 在 juice CSS 内联之后应用主题特定的标题装饰
 *
 * 某些主题效果（如伪元素 ::before/::after、渐变文字裁剪）
 * 无法通过 CSS 内联实现，或微信公众号不支持。
 * 此函数将这些效果转换为真实的内联 HTML 元素。
 *
 * @param html - juice 内联后的 HTML 字符串
 * @param preset - 当前使用的导出预设
 * @returns 应用装饰后的 HTML 字符串
 */
export function applyHeadingDecorations(html: string, preset: ExportPreset): string {
  let result = html

  switch (preset.id) {
    case 'thesis':
      // 在 h2 内容前后添加金色星号装饰
      // 替代原先的 ::before/::after 伪元素
      result = result.replace(
        /<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
        (_match: string, attrs: string, content: string) => {
          return `<h2${attrs}><span style="color:#D4AF37;margin-right:8px;">&#9733;</span>${content}<span style="color:#D4AF37;margin-left:8px;">&#9733;</span></h2>`
        }
      )
      break

    case 'report':
      // 报告主题无需额外 h2 装饰，顶部边框通过 CSS 内联处理
      break

    case 'news':
      // 新闻主题的 h2 已通过 CSS 边框样式处理
      break

    case 'meme':
      // 为 strong 标签添加黄色荧光笔高亮效果
      // 替代原先的 background gradient（微信对 gradient 支持有限）
      result = result.replace(
        /<strong([^>]*)>([\s\S]*?)<\/strong>/gi,
        (_match: string, attrs: string, content: string) => {
          // 如果已有 background 样式则跳过，避免重复处理
          if (attrs.includes('background')) return _match

          // 合并或创建 style 属性
          const existingStyle = attrs.match(/style="([^"]*)"/)
          // 纯色 fallback（微信不支持 gradient，剥离后保留纯色底色）
          const highlightStyle = 'background:#FFFACD;background:linear-gradient(180deg, transparent 60%, #FFD700 60%);display:inline;'
          if (existingStyle) {
            const mergedAttrs = attrs.replace(
              /style="([^"]*)"/,
              `style="$1;${highlightStyle}"`
            )
            return `<strong${mergedAttrs}>${content}</strong>`
          }
          return `<strong${attrs} style="${highlightStyle}">${content}</strong>`
        }
      )
      break

    case 'elegant':
      // 优雅主题：h2 底部双线装饰（暗金色）+ 前后书名号装饰
      result = result.replace(
        /<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
        (_match: string, attrs: string, content: string) => {
          // 确保 style 中包含双线底部边框
          const existingStyle = attrs.match(/style="([^"]*)"/)
          const doubleLineStyle = 'border-bottom:2px double #B8860B;padding-bottom:8px;'
          if (existingStyle) {
            if (!existingStyle[1].includes('border-bottom')) {
              const mergedAttrs = attrs.replace(
                /style="([^"]*)"/,
                `style="$1;${doubleLineStyle}"`
              )
              return `<h2${mergedAttrs}><span style="color:#B8860B;margin-right:6px;">&#12302;</span>${content}<span style="color:#B8860B;margin-left:6px;">&#12303;</span></h2>`
            }
          }
          return `<h2${attrs}><span style="color:#B8860B;margin-right:6px;">&#12302;</span>${content}<span style="color:#B8860B;margin-left:6px;">&#12303;</span></h2>`
        }
      )
      break

    case 'tech':
      // 科技主题：h2 靛蓝紫渐变背景色条
      result = result.replace(
        /<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
        (_match: string, attrs: string, content: string) => {
          // 纯色 fallback（微信不支持 gradient，剥离后保留主色底色）
          const techStyle = 'background:#6366f1;background:linear-gradient(135deg, #6366f1, #8b5cf6);color:#fff;padding:8px 16px;border-radius:4px;font-weight:700;'
          const existingStyle = attrs.match(/style="([^"]*)"/)
          if (existingStyle) {
            const mergedAttrs = attrs.replace(
              /style="([^"]*)"/,
              `style="$1;${techStyle}"`
            )
            return `<h2${mergedAttrs}>${content}</h2>`
          }
          return `<h2${attrs} style="${techStyle}">${content}</h2>`
        }
      )
      break

    default:
      // 其他主题（legal, commentary, aigc, code, notes, life）
      // 均使用纯 CSS 内联样式，无需额外 HTML 装饰
      break
  }

  return result
}
