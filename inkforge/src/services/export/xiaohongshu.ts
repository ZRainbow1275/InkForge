/**
 * 小红书导出引擎
 * 小红书笔记特点：清新、年轻、图文混排、层次明确
 * 增强：代码高亮、表格支持、列表样式优化
 */

import juice from 'juice'
import { marked } from 'marked'
import { renderMarkdownWithLazyOptionalEnhancements } from '@/services/rendering/lazy-optional-renderer'
import DOMPurify from 'dompurify'

// 确保 marked 配置一致性
marked.use({ breaks: true, gfm: true })
import type { XiaohongshuPreset, XiaohongshuExportOptions, ExportTarget } from './types'
import { highlightCodeBlocks, renderAlertBlocks, enhanceTableStyles, convertTaskListCheckboxes, cleanEmptyParagraphs, limitConsecutiveBreaks, normalizeExportHexColor } from './utils'
import { enforcePlatformCSS } from './css-validator'
import { REDOS_PROTECTION } from '@/config/security'
import { logger } from '@/services/error'
import { PERSONA_FONTS } from './preset-fonts'
import { composeRecipes } from './preset-decorations'
import { getVisualVariantCSS } from './visual-variants'

// ─── PR4: per-xhs-preset recipe composers ──────────────────────────────
// Recipes are scoped to `#nice`; for xhs they bring decorate-time inline
// styles so injected spans render in any container. exportCSS reuses the
// recipe CSS verbatim because juice still inlines #nice-scoped declarations
// onto whatever wrapping element matches.
const xhsFreshRecipesPreview = composeRecipes(['ornament-hr', 'h3-vertical-accent'], { target: 'preview' })
const xhsFreshRecipesExport = composeRecipes(['ornament-hr', 'h3-vertical-accent'], { target: 'export' })

const xhsSimpleRecipesPreview = composeRecipes(['h2-underline-fine', 'h3-vertical-accent'], { target: 'preview' })
const xhsSimpleRecipesExport = composeRecipes(['h2-underline-fine', 'h3-vertical-accent'], { target: 'export' })

const xhsWarmRecipesPreview = composeRecipes(['cjk-drop-cap', 'large-quote', 'ornament-hr'], { target: 'preview' })
const xhsWarmRecipesExport = composeRecipes(['cjk-drop-cap', 'large-quote', 'ornament-hr'], { target: 'export' })

const xhsTechRecipesPreview = composeRecipes(['h2-block-ribbon', 'h3-vertical-accent'], { target: 'preview' })
const xhsTechRecipesExport = composeRecipes(['h2-block-ribbon', 'h3-vertical-accent'], { target: 'export' })

const xhsNatureRecipesPreview = composeRecipes(['ornament-hr', 'large-quote'], { target: 'preview' })
const xhsNatureRecipesExport = composeRecipes(['ornament-hr', 'large-quote'], { target: 'export' })

// ═══════════════════════════════════════════════════════════════════
// 小红书基础样式
// ═══════════════════════════════════════════════════════════════════

export const xiaohongshuBaseCSS = `
/* 小红书基础样式 */
#xhs-note {
  font-size: 15px;
  line-height: 2;
  color: #333;
  padding: 16px;
  word-break: break-word;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif;
}

#xhs-note p {
  margin: 0 0 1.2em 0;
  padding: 0;
  line-height: 2.0;
}

#xhs-note h1 {
  font-size: 22px;
  font-weight: 700;
  color: #222;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

#xhs-note h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 24px 0 12px 0;
  line-height: 1.5;
}

#xhs-note h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 20px 0 10px 0;
  line-height: 1.5;
}

#xhs-note strong {
  font-weight: 700;
  color: #FF2442;
}

#xhs-note em {
  font-style: italic;
  color: #666;
}

#xhs-note blockquote {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 3px solid #FF2442;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFF0F0 100%);
  border-radius: 0 8px 8px 0;
  color: #666;
}

#xhs-note blockquote p {
  margin: 0;
}

#xhs-note ul, #xhs-note ol {
  margin: 16px 0;
  padding-left: 20px;
}

#xhs-note li {
  margin-bottom: 8px;
  line-height: 1.8;
}

#xhs-note ul li::marker {
  color: #FF2442;
}

#xhs-note code {
  font-family: "SF Mono", Monaco, Consolas, monospace;
  font-size: 13px;
  background: #FFF5F5;
  padding: 2px 6px;
  border-radius: 4px;
  color: #FF2442;
}

#xhs-note pre {
  margin: 16px 0;
  padding: 16px;
  background: #2D2D2D;
  border-radius: 12px;
  overflow-x: auto;
}

#xhs-note pre code {
  background: transparent;
  color: #F8F8F2;
  padding: 0;
  font-size: 13px;
  line-height: 1.6;
}

#xhs-note a {
  color: #FF2442;
  text-decoration: none;
  border-bottom: 1px dashed #FF2442;
}

#xhs-note img {
  max-width: 100%;
  height: auto;
  margin: 16px 0;
  border-radius: 12px;
}

#xhs-note hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, #FFE4E6, transparent);
  margin: 24px 0;
}

#xhs-note h4 {
  font-size: 15px;
  font-weight: 600;
  color: #444;
  margin: 16px 0 8px 0;
  line-height: 1.5;
}

#xhs-note h5 {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin: 12px 0 8px 0;
  line-height: 1.5;
}

#xhs-note h6 {
  font-size: 13px;
  font-weight: 600;
  color: #777;
  margin: 12px 0 8px 0;
  line-height: 1.5;
}

#xhs-note del, #xhs-note s {
  text-decoration: line-through;
  color: #999;
}

#xhs-note mark {
  background: #FFE4E6;
  padding: 2px 4px;
  border-radius: 4px;
  color: #333;
}

#xhs-note sub {
  font-size: 0.75em;
  vertical-align: sub;
}

#xhs-note sup {
  font-size: 0.75em;
  vertical-align: super;
  color: #FF2442;
}

#xhs-note table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
}

#xhs-note th {
  padding: 10px 14px;
  background: #FFF5F5;
  font-weight: 600;
  font-size: 13px;
  color: #333;
  border: 1px solid #FFE4E6;
  text-align: left;
}

#xhs-note td {
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid #FFE4E6;
  color: #555;
}

#xhs-note tr:nth-child(even) td {
  background: #f8f9fa;
}

/* 小红书特色：分割符 */
#xhs-note .xhs-divider {
  text-align: center;
  margin: 24px 0;
  color: #FF2442;
  font-size: 14px;
}
`

// ═══════════════════════════════════════════════════════════════════
// 小红书预设主题
// ═══════════════════════════════════════════════════════════════════

export const xiaohongshuPresets: XiaohongshuPreset[] = [
  // XHS-FRESH: 清新少女, Smiley Sans + Space Grotesk, 花体 hr + h3 竖条; 经典红
  {
    id: 'xhs-fresh',
    name: '清新少女',
    icon: 'xhs-fresh',
    description: '清新少女，经典小红书红',
    visualSignature: {
      rhythm: '卡片短段 · 高频留白',
      heading: '红色虚线标题 · 竖条小节',
      quote: '浅红种草引用',
      divider: '花体红点分隔',
      media: '12px 圆角图卡',
      modules: ['花体分隔', '列表彩点', '阅读签名'],
    },
    primaryColor: '#FF2442',
    accentColor: '#FFE4E6',
    persona: 'creative',
    fonts: PERSONA_FONTS.creative,
    previewCSS: `
#xhs-note h2 { color: #FF2442; font-weight: 700; }
#xhs-note h3 { border-left: 2px solid #FF2442; padding-left: 0.6em; margin-top: 1.4em; font-weight: 600; color: #FF2442; }
#xhs-note strong { color: #FF2442; }
${xhsFreshRecipesPreview.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-fresh', 'preview')}`,
    exportCSS: `
#xhs-note h2 { color: #FF2442; font-weight: 700; }
#xhs-note h3 { border-left: 2px solid #FF2442; padding-left: 0.6em; margin-top: 1.4em; font-weight: 600; color: #FF2442; }
#xhs-note strong { color: #FF2442; }
${xhsFreshRecipesExport.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-fresh', 'export')}`,
    decorate: (html: string, target: ExportTarget): string => xhsFreshRecipesExport.decorate(html, target),
    customCSS: ``
  },
  // XHS-SIMPLE: 极简高级, 思源黑体 + Inter (business), h2 极细底线 + h3 竖条; 近黑庄重
  {
    id: 'xhs-simple',
    name: '极简高级',
    icon: 'xhs-simple',
    description: '极简高级，近黑庄重',
    visualSignature: {
      rhythm: '短句留白 · 黑白画册',
      heading: '极细黑线标题 · 竖条小节',
      quote: '灰白极简引用',
      divider: '单线留白分节',
      media: '12px 圆角图卡',
      modules: ['极细标题线', '黑白高亮', '阅读签名'],
    },
    primaryColor: '#1A1A1A',
    accentColor: '#F5F5F5',
    persona: 'business',
    fonts: PERSONA_FONTS.business,
    previewCSS: `
#xhs-note { background: #FAFAFA; }
#xhs-note h2 { color: #1A1A1A; font-weight: 700; border-bottom: 1px solid #1A1A1A; padding-bottom: 0.3em; }
#xhs-note h3 { color: #1A1A1A; border-left: 2px solid #1A1A1A; padding-left: 0.6em; margin-top: 1.4em; font-weight: 600; }
#xhs-note strong { color: #1A1A1A; font-weight: 900; }
#xhs-note blockquote { border-left-color: #1A1A1A; background: #F5F5F5; }
${xhsSimpleRecipesPreview.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-simple', 'preview')}`,
    exportCSS: `
#xhs-note { background: #FAFAFA; }
#xhs-note h2 { color: #1A1A1A; font-weight: 700; border-bottom: 1px solid #1A1A1A; padding-bottom: 0.3em; }
#xhs-note h3 { color: #1A1A1A; border-left: 2px solid #1A1A1A; padding-left: 0.6em; margin-top: 1.4em; font-weight: 600; }
#xhs-note strong { color: #1A1A1A; font-weight: 900; }
#xhs-note blockquote { border-left-color: #1A1A1A; background: #F5F5F5; }
${xhsSimpleRecipesExport.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-simple', 'export')}`,
    decorate: (html: string, target: ExportTarget): string => xhsSimpleRecipesExport.decorate(html, target),
    customCSS: `
      #xhs-note { background: #FAFAFA; }
      #xhs-note strong { color: #1A1A1A; font-weight: 900; }
      #xhs-note blockquote { border-left-color: #1A1A1A; background: #F5F5F5; }
    `
  },
  // XHS-WARM: 温暖治愈, LXGW WenKai Lite + Crimson Pro, drop cap + 大引号 + 花体 hr; 焦糖暖色
  {
    id: 'xhs-warm',
    name: '温暖治愈',
    icon: 'xhs-warm',
    description: '温暖治愈，焦糖暖色',
    visualSignature: {
      rhythm: '文楷慢节奏 · 奶油留白',
      heading: '焦糖渐变便签标题',
      quote: '奶油大引号',
      divider: '暖色花体分隔',
      media: '12px 圆角暖白图卡',
      modules: ['首字下沉', '大引号', '阅读签名'],
    },
    primaryColor: '#D4A574',
    accentColor: '#FDF6EC',
    persona: 'lifestyle',
    fonts: PERSONA_FONTS.lifestyle,
    previewCSS: `
#xhs-note { background: #FFFDF9; }
#xhs-note h2 { color: #D4A574; font-weight: 600; }
#xhs-note h3 { color: #B8860B; font-weight: 600; }
#xhs-note strong { color: #D4A574; }
#xhs-note blockquote { border-left-color: #D4A574; background: #FDF6EC; font-style: italic; }
${xhsWarmRecipesPreview.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-warm', 'preview')}`,
    exportCSS: `
#xhs-note { background: #FFFDF9; }
#xhs-note h2 { color: #D4A574; font-weight: 600; }
#xhs-note h3 { color: #B8860B; font-weight: 600; }
#xhs-note strong { color: #D4A574; }
#xhs-note blockquote { border-left-color: #D4A574; background: #FDF6EC; font-style: italic; }
${xhsWarmRecipesExport.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-warm', 'export')}`,
    decorate: (html: string, target: ExportTarget): string => xhsWarmRecipesExport.decorate(html, target),
    customCSS: `
      #xhs-note { background: #FFFDF9; }
      #xhs-note strong { color: #D4A574; }
      #xhs-note blockquote { border-left-color: #D4A574; background: #FDF6EC; }
    `
  },
  // XHS-TECH: 科技数码, 思源黑体 + Inter (business), h2 色块条 + h3 竖条; 靛蓝
  {
    id: 'xhs-tech',
    name: '科技数码',
    icon: 'xhs-tech',
    description: '科技数码，靛蓝色块',
    visualSignature: {
      rhythm: '信息密排 · 模块卡片',
      heading: '靛蓝色块 · 左轨小节',
      quote: '靛蓝提示卡',
      divider: '数码字标分隔',
      media: '12px 圆角产品图卡',
      modules: ['色块标题', '列表箭头', '阅读签名'],
    },
    primaryColor: '#4F46E5',
    accentColor: '#818CF8',
    secondaryBg: '#f0f0ff',
    listMarker: '▸',
    dividerText: '·  ·  · 数码 ·  ·  ·',
    persona: 'business',
    fonts: PERSONA_FONTS.business,
    previewCSS: `
#xhs-note h2 { background: #4F46E5; color: #fff; padding: 0.5em 0.8em; border-radius: 4px; margin-top: 1.6em; font-weight: 700; }
#xhs-note h3 { color: #4F46E5; border-left: 2px solid #4F46E5; padding-left: 0.6em; font-weight: 600; }
#xhs-note strong { color: #4F46E5; }
#xhs-note code { background: rgba(79,70,229,0.08); color: #4F46E5; padding: 0.1em 0.35em; border-radius: 3px; }
#xhs-note blockquote { border-left-color: #4F46E5; background: #f0f0ff; }
${xhsTechRecipesPreview.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-tech', 'preview')}`,
    exportCSS: `
#xhs-note h2 { background: #4F46E5; color: #fff; padding: 0.5em 0.8em; border-radius: 4px; margin-top: 1.6em; font-weight: 700; }
#xhs-note h3 { color: #4F46E5; border-left: 2px solid #4F46E5; padding-left: 0.6em; font-weight: 600; }
#xhs-note strong { color: #4F46E5; }
#xhs-note code { background: rgba(79,70,229,0.08); color: #4F46E5; padding: 0.1em 0.35em; border-radius: 3px; }
#xhs-note blockquote { border-left-color: #4F46E5; background: #f0f0ff; }
${xhsTechRecipesExport.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-tech', 'export')}`,
    decorate: (html: string, target: ExportTarget): string => xhsTechRecipesExport.decorate(html, target),
    customCSS: `
      #xhs-note strong { color: #4F46E5; }
      #xhs-note blockquote { border-left-color: #4F46E5; background: #f0f0ff; }
    `
  },
  // XHS-NATURE: 自然清新, LXGW WenKai Lite + Fraunces, 花体 hr + 大引号; 翠绿
  {
    id: 'xhs-nature',
    name: '自然清新',
    icon: 'xhs-nature',
    description: '自然清新，翠绿生机',
    visualSignature: {
      rhythm: '轻段落 · 自然留白',
      heading: '翠绿渐变底线',
      quote: '薄荷大引号',
      divider: '自然点阵分隔',
      media: '12px 圆角清透图卡',
      modules: ['渐变标题线', '自然列表点', '阅读签名'],
    },
    primaryColor: '#059669',
    accentColor: '#34D399',
    secondaryBg: '#ecfdf5',
    listMarker: '·',
    dividerText: '·  ·  · 自然 ·  ·  ·',
    persona: 'lifestyle',
    fonts: PERSONA_FONTS.lifestyle,
    previewCSS: `
#xhs-note h2 { color: #059669; font-weight: 600; border-bottom: 1px solid #34D399; padding-bottom: 0.3em; }
#xhs-note h3 { color: #047857; font-weight: 600; }
#xhs-note strong { color: #059669; }
#xhs-note blockquote { border-left-color: #059669; background: #ecfdf5; font-style: italic; }
${xhsNatureRecipesPreview.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-nature', 'preview')}`,
    exportCSS: `
#xhs-note h2 { color: #059669; font-weight: 600; border-bottom: 1px solid #34D399; padding-bottom: 0.3em; }
#xhs-note h3 { color: #047857; font-weight: 600; }
#xhs-note strong { color: #059669; }
#xhs-note blockquote { border-left-color: #059669; background: #ecfdf5; font-style: italic; }
${xhsNatureRecipesExport.css}
${getVisualVariantCSS('xiaohongshu', 'xhs-nature', 'export')}`,
    decorate: (html: string, target: ExportTarget): string => xhsNatureRecipesExport.decorate(html, target),
    customCSS: `
      #xhs-note strong { color: #059669; }
      #xhs-note blockquote { border-left-color: #059669; background: #ecfdf5; }
    `
  }
]

// ═══════════════════════════════════════════════════════════════════
// 标题装饰系统
// ═══════════════════════════════════════════════════════════════════

/**
 * 标题装饰样式生成器 — 为不同预设生成不同的内联装饰
 */
function getHeadingDecorationStyle(presetId: string, level: 'h1' | 'h2' | 'h3', primaryColor: string, secondaryBg?: string): string {
  switch (presetId) {
    case 'xhs-fresh':
      return `border-bottom:2px dashed ${primaryColor};padding-bottom:8px;`
    case 'xhs-simple':
      return `border-bottom:1px solid ${primaryColor};padding-bottom:6px;`
    case 'xhs-warm':
      return `background:linear-gradient(135deg,#FDF6EC 0%,#FFF8F0 100%);padding:8px 12px;border-radius:6px;`
    case 'xhs-tech':
      return `border-left:4px solid ${primaryColor};padding-left:12px;background:${secondaryBg || '#f0f0ff'};padding-top:6px;padding-bottom:6px;border-radius:0 6px 6px 0;`
    case 'xhs-nature': {
      // 使用伪元素替代方案：底部绿色渐变线用 border-image
      const thickness = level === 'h1' ? '3px' : '2px'
      return `border-bottom:${thickness} solid transparent;border-image:linear-gradient(90deg,${primaryColor},#34D399,transparent) 1;padding-bottom:8px;`
    }
    default:
      return ''
  }
}

// ═══════════════════════════════════════════════════════════════════
// 小红书后处理
// ═══════════════════════════════════════════════════════════════════

/**
 * 小红书后处理
 * 增强：标题样式多样化、列表标记、图片圆角、表格边框修补、签名块
 */
function postProcessForXiaohongshu(html: string, preset: XiaohongshuPreset): string {
  let result = html
  const { primaryColor, id: presetId, secondaryBg } = preset

  // 1. 移除不支持的属性
  result = result.replace(/position:\s*(fixed|sticky)[^;]*;?/gi, '')
  result = result.replace(/animation:[^;]+;?/gi, '')
  result = result.replace(/transition:[^;]+;?/gi, '')

  // 2. 图片确保有圆角
  result = result.replace(
    /<img(?![^>]*border-radius)([^>]*)>/gi,
    '<img style="border-radius:12px;max-width:100%;height:auto;"$1>'
  )

  // 3. 表格单元格确保有内联边框（juice 可能不完整内联到 th/td）
  result = result.replace(
    /<th(?![^>]*border)([^>]*)>/gi,
    (match, attrs: string) => {
      if (attrs.includes('style=')) {
        return match.replace(/style="([^"]*)"/, `style="$1;border:1px solid #FFE4E6;padding:10px 14px;background:#FFF5F5;font-weight:600;"`)
      }
      return `<th style="border:1px solid #FFE4E6;padding:10px 14px;background:#FFF5F5;font-weight:600;text-align:left;"${attrs}>`
    }
  )
  result = result.replace(
    /<td(?![^>]*border)([^>]*)>/gi,
    (match, attrs: string) => {
      if (attrs.includes('style=')) {
        return match.replace(/style="([^"]*)"/, `style="$1;border:1px solid #FFE4E6;padding:10px 14px;"`)
      }
      return `<td style="border:1px solid #FFE4E6;padding:10px 14px;"${attrs}>`
    }
  )

  // 4. 标题样式装饰
  const headingLevels: Array<'h1' | 'h2' | 'h3'> = ['h1', 'h2', 'h3']
  for (const tag of headingLevels) {
    const decoStyle = getHeadingDecorationStyle(presetId, tag, primaryColor, secondaryBg)
    if (!decoStyle) continue

    result = result.replace(
      new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi'),
      (_match, attrs: string, content: string) => {
        let newAttrs = attrs
        if (newAttrs.includes('style="')) {
          newAttrs = newAttrs.replace(/style="([^"]*)"/, `style="$1;${decoStyle}"`)
        } else {
          newAttrs = ` style="${decoStyle}"${newAttrs}`
        }

        return `<${tag}${newAttrs}>${content}</${tag}>`
      }
    )
  }

  // 5. 列表标记增强 — 使用预设 listMarker 或默认彩色圆点
  const listMarker = preset.listMarker || '•'
  result = result.replace(
    /<li([^>]*)>([\s\S]*?)<\/li>/gi,
    (_match, attrs: string, content: string) => {
      return `<li${attrs}><span style="color:${primaryColor};margin-right:4px;">${listMarker}</span>${content}</li>`
    }
  )

  // 6. 签名装饰块 — 添加到 #xhs-note 末尾
  const signatureBlock = `<section style="text-align:center;margin-top:32px;padding:16px 0;color:${primaryColor};font-size:13px;">` +
    `感谢阅读` +
    `</section>`
  // 插入到最后一个 </section> 之前（即 #xhs-note 闭合标签前）
  const lastSectionClose = result.lastIndexOf('</section>')
  if (lastSectionClose !== -1) {
    result = result.slice(0, lastSectionClose) + signatureBlock + result.slice(lastSectionClose)
  }

  // 7. 清理空 style 和多余分号
  result = result.replace(/style="\s*;*\s*"/gi, '')
  result = result.replace(/;\s*;+/g, ';')

  return result
}

// ═══════════════════════════════════════════════════════════════════
// 主要导出函数
// ═══════════════════════════════════════════════════════════════════

/**
 * HTML 转小红书格式
 * 增强：代码高亮(浅色主题)、Alert 块、表格增强、标题装饰、段落排版
 *
 * preview-only: not for direct paste into 小红书
 *   小红书 App 仅接受纯文本，HTML 内联样式无法发布到正式笔记。
 *   该函数仅服务于编辑器内的 WYSIWYG preview / 平台外 demo 渲染。
 *   实际发布请走 markdownToXiaohongshuText（文本引擎，已接入 platform-rules）。
 */
export function convertToXiaohongshu(
  html: string,
  presetId: string = 'xhs-fresh',
  options?: XiaohongshuExportOptions
): string {
  // ReDoS 防护: 输入长度检查
  if (html.length > REDOS_PROTECTION.MAX_HTML_LENGTH) {
    logger.warn(
      `[安全警告] convertToXiaohongshu: 输入长度 ${html.length} 超过限制 ${REDOS_PROTECTION.MAX_HTML_LENGTH}，跳过处理`
    )
    return html
  }

  let preset = xiaohongshuPresets.find(p => p.id === presetId) || xiaohongshuPresets[0]
  const primaryColorOverride = normalizeExportHexColor(options?.colorOverrides?.primaryColor)
  // 应用颜色覆盖（克隆预设，不修改原始对象）
  if (primaryColorOverride) {
    preset = { ...preset, primaryColor: primaryColorOverride, accentColor: primaryColorOverride }
  }

  // Step 0: Task List Checkbox 转换（必须在 DOMPurify 之前）
  const checkboxProcessedHtml = convertTaskListCheckboxes(html, preset.primaryColor)

  // Step 1: DOMPurify XSS防护（添加 table 相关标签和 section）
  const sanitizedHtml = DOMPurify.sanitize(checkboxProcessedHtml, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 's', 'del', 'ins',
      'a', 'img', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div', 'section', 'sup', 'sub', 'mark'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style']
  })

  // Step 1.5: 空段落清理和连续换行限制
  const cleanedHtml = limitConsecutiveBreaks(cleanEmptyParagraphs(sanitizedHtml))

  // Step 2: GitHub 风格 Alert 块渲染
  const alertProcessedHtml = renderAlertBlocks(cleanedHtml)

  // Step 3: 代码语法高亮（浅色主题 — 小红书亮色背景）
  const highlightedHtml = highlightCodeBlocks(
    alertProcessedHtml,
    options?.enableLineNumbers ?? false,
    options?.enableMacCodeBlock ?? false,
    'atom-one-light'
  )

  // Step 4: 增强表格样式
  const tableEnhancedHtml = enhanceTableStyles(highlightedHtml, preset.primaryColor)

  // Step 5: 添加小红书特色分隔符（使用预设 dividerText）
  const dividerText = preset.dividerText || '· · · · · · ·'
  let processedHtml = tableEnhancedHtml
    .replace(/<hr\s*\/?>/gi, `<div class="xhs-divider" style="text-align:center;margin:24px 0;color:${preset.primaryColor};font-size:14px;">${dividerText}</div>`)

  // Step 6: 外链处理（小红书不支持外链，转为显示文本 + 标注）
  processedHtml = processedHtml.replace(
    /<a\s+[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi,
    `<span style="color:${preset.primaryColor};font-weight:500;">$2</span>`
  )

  // Step 7: 构建最终内容
  const wrappedHtml = `<section id="xhs-note">${processedHtml}</section>`

  // Step 8: 生成CSS
  let css = xiaohongshuBaseCSS
  css += `
    #xhs-note strong { color: ${preset.primaryColor}; }
    #xhs-note a { color: ${preset.primaryColor}; border-bottom-color: ${preset.primaryColor}; }
    #xhs-note blockquote { border-left-color: ${preset.primaryColor}; }
    #xhs-note code { color: ${preset.primaryColor}; background: ${preset.accentColor}; }
    #xhs-note h2 { color: ${preset.primaryColor}; }
  `
  if (preset.customCSS) {
    css += preset.customCSS
  }
  if (preset.exportCSS) {
    css += preset.exportCSS
  }

  // Step 9: CSS内联
  const styledHtml = `<style>${css}</style>${wrappedHtml}`
  let inlinedHtml = juice(styledHtml, {
    removeStyleTags: true,
    preserveImportant: true,
    inlinePseudoElements: true
  })

  // Step 9.5: PR4 dual-track decorate hook — inject real <span> wrappers for
  // pseudo-element-only effects (drop cap, large quote, ornament hr, etc.).
  // The wechat pipeline has the same hook; xhs is opt-in per preset.
  if (preset.decorate) {
    inlinedHtml = preset.decorate(inlinedHtml, 'xhs')
  }

  // Step 10: 小红书兼容性后处理（传入完整预设）
  const xhsProcessedHtml = postProcessForXiaohongshu(inlinedHtml, preset)

  // Step 11: 最终安全网 -- 平台 CSS 合规化（确保无遗漏的不支持属性）
  return enforcePlatformCSS(xhsProcessedHtml, 'xiaohongshu')
}

/**
 * Markdown 转小红书格式
 */
export async function markdownToXiaohongshu(
  markdown: string,
  presetId: string = 'xhs-fresh'
): Promise<string> {
  const html = await renderMarkdownWithLazyOptionalEnhancements(markdown)
  return convertToXiaohongshu(html, presetId)
}

// ═══════════════════════════════════════════════════════════════════
// 预设列表查询
// ═══════════════════════════════════════════════════════════════════

/**
 * 获取所有小红书预设主题列表
 */
export function getXiaohongshuPresets(): XiaohongshuPreset[] {
  return xiaohongshuPresets
}
