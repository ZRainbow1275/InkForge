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

#nice strong {
  font-weight: 700;
  color: #333;
}

#nice em {
  font-style: italic;
}

#nice blockquote {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid #0066cc;
  background: #f5f7f9;
  color: #666;
}

#nice blockquote p {
  margin: 0;
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
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  color: #c7254e;
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
    icon: '📜',
    description: '学术严谨，苏联红色调',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#8B0000',
    isUseIndent: true,
    isUseJustify: true,
    customCSS: `
      #nice h2::before, #nice h2::after { content: "★"; color: #D4AF37; margin: 0 8px; }
      #nice blockquote { border-left-color: #8B0000; background: rgba(139, 0, 0, 0.03); }
    `
  },
  {
    id: 'legal',
    name: '法学研讨',
    icon: '⚖️',
    description: '常青藤学院风',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#1A3A5C',
    isUseIndent: true,
    isUseJustify: true,
    customCSS: `
      #nice h2 { border-bottom: 2px solid #1A3A5C; padding-bottom: 8px; }
      #nice blockquote { background: #f5f5f0; border-left-color: #4A7C59; }
    `
  },
  {
    id: 'report',
    name: '行业研报',
    icon: '📊',
    description: '华尔街日报风',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#004080',
    isUseIndent: false,
    isUseJustify: true,
    customCSS: `
      #nice { border-top: 8px solid #004080; }
      #nice table th { background: #004080; color: #fff; }
    `
  },
  {
    id: 'commentary',
    name: '时事点评',
    icon: '💬',
    description: '观点清晰鲜明',
    theme: 'simple',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#C00000',
    isUseIndent: false,
    isUseJustify: true,
    customCSS: `
      #nice strong { color: #C00000; font-weight: 900; }
      #nice blockquote { border-left-color: #C00000; font-style: italic; }
    `
  },
  {
    id: 'aigc',
    name: 'AIGC',
    icon: '🤖',
    description: '未来科技感',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#7B2D8E',
    isUseIndent: false,
    isUseJustify: false,
    customCSS: `
      /* 注意：渐变文字效果（-webkit-background-clip: text）仅在预览中生效，微信公众号不支持此属性，会降级为纯色显示 */
      #nice h2 { color: #7B2D8E; background: linear-gradient(90deg, #7B2D8E, #00D4FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      #nice code { background: rgba(123, 45, 142, 0.1); }
    `
  },
  {
    id: 'code',
    name: '编程创造',
    icon: '💻',
    description: '程序员简练风',
    theme: 'default',
    fontFamily: 'monospace',
    fontSize: '15px',
    primaryColor: '#00FF41',
    isUseIndent: false,
    isUseJustify: false,
    customCSS: `
      #nice { background: #1a1a1a; color: #00FF41; }
      #nice h2, #nice h3 { color: #00FF41; }
    `
  },
  {
    id: 'notes',
    name: '学习笔记',
    icon: '📚',
    description: '知识卡片风',
    theme: 'grace',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#E07020',
    isUseIndent: false,
    isUseJustify: false,
    customCSS: `
      #nice blockquote { background: #FFF8E7; border-left-color: #E07020; border-radius: 4px; }
    `
  },
  {
    id: 'news',
    name: '新闻',
    icon: '📰',
    description: '极简新媒体',
    theme: 'simple',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#000000',
    isUseIndent: false,
    isUseJustify: true,
    customCSS: `
      #nice h2 { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 0; text-align: center; }
    `
  },
  {
    id: 'meme',
    name: '整活',
    icon: '🎭',
    description: '年轻有趣',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#FF6B9D',
    isUseIndent: false,
    isUseJustify: false,
    customCSS: `
      #nice h2 { color: #FF6B9D; }
      #nice strong { background: linear-gradient(180deg, transparent 60%, #FFD700 60%); }
    `
  },
  {
    id: 'life',
    name: '人生感悟',
    icon: '💭',
    description: '极简Vlog风',
    theme: 'simple',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#666666',
    isUseIndent: true,
    isUseJustify: false,
    customCSS: `
      #nice { max-width: 600px; margin: 0 auto; }
      #nice p { line-height: 2; }
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
