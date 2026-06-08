/**
 * 三平台质量检测器
 *
 * 在导出前自动检测内容是否符合目标平台的要求，
 * 返回结构化的质量报告，帮助用户优化内容。
 *
 * 参考：
 * - docs/platform-rendering-rules/wechat-rules.md
 * - docs/platform-rendering-rules/xiaohongshu-rules.md
 * - docs/platform-rendering-rules/zhihu-rules.md
 */

import { SUPPORTED_CODE_LANGUAGES } from '@/extensions/codeLanguages'
import type { Platform, QualityReport, QualityIssue, QualityIssueSeverity } from './types'

const XHS_IMAGE_PAGE_COUNT_LIMIT = 18
const XHS_IMAGE_COUNT_REVIEW_THRESHOLD = XHS_IMAGE_PAGE_COUNT_LIMIT
const XHS_ALLOWED_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png'])
const DIAGRAM_FENCE_LANGUAGES = new Set([
  'mermaid',
  'graphviz',
  'dot',
  'plantuml',
  'puml',
  'vega',
  'vega-lite',
  'vegalite',
])

// ═══════════════════════════════════════════════════════════════════
// 统一入口
// ═══════════════════════════════════════════════════════════════════

/**
 * 对 Markdown 内容执行目标平台的质量检测
 *
 * @param markdown - 原始 Markdown 内容
 * @param platform - 目标平台
 * @returns 质量报告
 */
export function detectQuality(markdown: string, platform: Platform): QualityReport {
  const issues: QualityIssue[] = []

  switch (platform) {
    case 'wechat':
      detectWechatIssues(markdown, issues)
      break
    case 'xiaohongshu':
      detectXiaohongshuIssues(markdown, issues)
      break
    case 'zhihu':
      detectZhihuIssues(markdown, issues)
      break
    default: {
      const _exhaustiveCheck: never = platform
      throw new Error(`未支持的平台: ${_exhaustiveCheck}`)
    }
  }

  // 通用检测
  detectCommonIssues(markdown, platform, issues)
  detectRenderingCoreIssues(markdown, issues)

  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const suggestions = issues.filter(i => i.severity === 'suggestion').length

  return {
    platform,
    timestamp: Date.now(),
    passed: errors === 0,
    issues,
    stats: { errors, warnings, suggestions },
  }
}

// ═══════════════════════════════════════════════════════════════════
// 微信公众号质量检测
// ═══════════════════════════════════════════════════════════════════

function detectWechatIssues(markdown: string, issues: QualityIssue[]): void {
  // 1. 检测 CSS 变量（微信不支持）
  const cssVarMatches = markdown.match(/var\(--[\w-]+\)/g)
  if (cssVarMatches) {
    addIssue(issues, {
      id: 'wechat-css-var',
      severity: 'warning',
      message: `发现 ${cssVarMatches.length} 个 CSS 变量引用，微信不支持 CSS 变量`,
      suggestion: '导出时会自动替换为实际值，确保变量值已定义',
    })
  }

  // 2. 检测 SVG 图片
  const svgMatches = markdown.match(/!\[.*?\]\([^)]*\.svg[^)]*\)/gi)
  if (svgMatches) {
    addIssue(issues, {
      id: 'wechat-svg-image',
      severity: 'warning',
      message: `发现 ${svgMatches.length} 张 SVG 图片，微信编辑器中 SVG 需使用素材库链接`,
      suggestion: '建议将 SVG 转换为 PNG/JPG 后上传微信素材库',
    })
  }

  // 3. 检测外链
  const linkMatches = markdown.match(/\[([^\]]+)\]\((https?:\/\/(?!mp\.weixin\.qq\.com)[^)]+)\)/g)
  if (linkMatches && linkMatches.length > 0) {
    addIssue(issues, {
      id: 'wechat-external-links',
      severity: 'suggestion',
      message: `发现 ${linkMatches.length} 个外部链接，非微信域名链接会触发安全提醒弹窗`,
      suggestion: '导出时会自动转为文末脚注',
    })
  }

  // 4. 检测图片宽度建议
  const imgWithSize = markdown.match(/<img[^>]+width=["'](\d+)/gi)
  if (imgWithSize) {
    for (const img of imgWithSize) {
      const widthMatch = img.match(/width=["'](\d+)/)
      if (widthMatch && parseInt(widthMatch[1]) > 640) {
        addIssue(issues, {
          id: 'wechat-image-width',
          severity: 'suggestion',
          message: `检测到图片宽度 ${widthMatch[1]}px > 640px`,
          suggestion: '微信公众号建议图片宽度 ≤ 640px，导出时会自动降级到 640px 并保持自适应高度',
        })
        break // 只报告一次
      }
    }
  }

  // 5. 检测 <style> 标签
  if (/<style[\s>]/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-style-tag',
      severity: 'warning',
      message: '检测到 <style> 标签，微信会过滤掉 <style> 标签',
      suggestion: '导出时会自动内联 CSS，无需手动处理',
    })
  }

  // 6. 检测不支持的 HTML 标签
  const unsupportedTags = ['iframe', 'embed', 'object', 'form', 'input', 'button', 'select', 'audio', 'video', 'canvas', 'script']
  for (const tag of unsupportedTags) {
    const regex = new RegExp(`<${tag}[\\s>]`, 'i')
    if (regex.test(markdown)) {
      addIssue(issues, {
        id: `wechat-unsupported-tag-${tag}`,
        severity: 'warning',
        message: `检测到 <${tag}> 标签，微信不支持此标签`,
        suggestion: `移除或替换 <${tag}> 标签`,
      })
    }
  }

  // 7. 检测 Mermaid 图表
  const mermaidBlocks = markdown.match(/```mermaid/gi) ?? []
  if (mermaidBlocks.length > 0) {
    addIssue(issues, {
      id: 'wechat-mermaid',
      severity: 'suggestion',
      message: `发现 ${mermaidBlocks.length} 个 Mermaid 图表`,
      suggestion: '微信发布链不能依赖矢量节点直出；请先转为 PNG/JPG 并上传为微信正文图片，失败时保留文字摘要',
    })
  }

  // 8. 检测 LaTeX 公式。WeChat 不保留 KaTeX class/CSS，导出会降级为自包含可读公式文本。
  const latexBlocks = markdown.match(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g)
  if (latexBlocks) {
    addIssue(issues, {
      id: 'wechat-latex-degrade',
      severity: 'suggestion',
      message: `发现 ${latexBlocks.length} 个 LaTeX 公式，微信粘贴链不可靠保留 KaTeX 样式`,
      suggestion: '导出时会降级为自包含公式文本；如需公式图片，请接入真实素材上传链路',
    })
  }

  // 9. 微信官方编辑器规范：固定宽高、line-height:0、普通文本 pre、start/end 对齐等
  detectWechatOfficialEditorSpecIssues(markdown, issues)
}

function detectWechatOfficialEditorSpecIssues(markdown: string, issues: QualityIssue[]): void {
  if (/line-height\s*:\s*0(?:px|em|rem|;|")/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-line-height-zero',
      severity: 'error',
      message: '检测到 line-height:0，微信官方规范将其列为可读性和可见性风险',
      suggestion: '不要用 line-height:0 包裹可读文本；改用结构化 section/p/span 和正常行高',
    })
  }

  if (/<(?:section|div|p)\b[^>]*style=["'][^"']*(?:width|height)\s*:\s*\d{3,}px/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-fixed-container-size',
      severity: 'error',
      message: '检测到正文容器固定宽高，可能破坏微信移动端响应式呈现',
      suggestion: '正文容器使用 max-width、width:100% 或自然流布局；图片尺寸由导出器单独处理',
    })
  }

  if (/text-align\s*:\s*(?:start|end)\b/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-text-align-logical',
      severity: 'error',
      message: '检测到 text-align:start/end，不同终端表现可能不一致',
      suggestion: '改用 left、center 或 right',
    })
  }

  if (/<pre\b(?:(?!<\/pre>).)*<\/pre>/is.test(markdown)) {
    const preBlocks = markdown.match(/<pre\b[\s\S]*?<\/pre>/gi) ?? []
    const textPreBlocks = preBlocks.filter(block => !/<code[\s>]/i.test(block))
    if (textPreBlocks.length > 0) {
      addIssue(issues, {
        id: 'wechat-pre-ordinary-text',
        severity: 'error',
        message: `检测到 ${textPreBlocks.length} 个未包含 <code> 的 <pre> 块，普通段落不应使用 pre`,
        suggestion: '普通正文使用 <p> 或 <section>；仅代码块保留 <pre><code>',
      })
    }
  }

  if (/<img\b[^>]*style=["'][^"']*opacity\s*:\s*0/i.test(markdown) && /<svg[\s>]/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-transparent-image-svg-overlay',
      severity: 'error',
      message: '检测到透明图片叠加 SVG 的模式，发布后可能导致公众号后台无法编辑真实图片',
      suggestion: '不要隐藏真实图片再用 SVG 背景替代；将图片作为真实 <img> 输出，SVG 只做装饰',
    })
  }

  const touchstartOnlyAnimate = /<animate(?:Transform)?\b[^>]*\bbegin=["'][^"']*\btouchstart\b(?![^"']*\bclick\b)[^"']*["']/i
  if (touchstartOnlyAnimate.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-svg-touchstart-only',
      severity: 'error',
      message: '检测到 SVG 动画 begin 仅依赖 touchstart，PC 端微信编辑器可能无法触发',
      suggestion: '互动 SVG 必须 opt-in 并真实验证；需要触发时至少覆盖 click，默认避免 DOM 事件处理器',
    })
  }

  if (/!important\b/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-important-style',
      severity: 'suggestion',
      message: '检测到 !important，可能干扰微信公共样式和 Dark Mode 修正',
      suggestion: '优先使用结构和明确 inline style，避免依赖 !important',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 小红书质量检测
// ═══════════════════════════════════════════════════════════════════

function detectXiaohongshuIssues(markdown: string, issues: QualityIssue[]): void {
  // 0. 计算纯文本字数（移除 Markdown 标记后）
  const plainText = stripMarkdownSyntax(markdown)
  const charCount = plainText.length

  // 1. 字数检测（硬限制 1000 字）
  if (charCount > 1000) {
    addIssue(issues, {
      id: 'xhs-char-limit',
      severity: 'error',
      message: `正文 ${charCount} 字，超过小红书 1000 字限制（差 ${charCount - 1000} 字）`,
      suggestion: '精简内容至 600-800 字为最佳阅读体验',
    })
  } else if (charCount > 800) {
    addIssue(issues, {
      id: 'xhs-char-warning',
      severity: 'suggestion',
      message: `正文 ${charCount} 字，接近 1000 字限制`,
      suggestion: '建议控制在 600-800 字以获得最佳阅读体验',
    })
  }

  // 2. 标题检测
  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    const titleLength = titleMatch[1].trim().length
    if (titleLength > 20) {
      addIssue(issues, {
        id: 'xhs-title-length',
        severity: 'warning',
        message: `标题 ${titleLength} 字，超过小红书 20 字限制`,
        suggestion: '缩短标题至 10-15 字，保留关键词与明确利益点',
      })
    }
  }

  // 3. 段落长度检测
  const paragraphs = markdown.split(/\n\s*\n/).filter(p => p.trim())
  const longParagraphs = paragraphs.filter(p => {
    const lines = p.trim().split('\n')
    return lines.length > 5
  })
  if (longParagraphs.length > 0) {
    addIssue(issues, {
      id: 'xhs-paragraph-length',
      severity: 'warning',
      message: `${longParagraphs.length} 个段落超过 5 行`,
      suggestion: '每段控制在 5 行以内，段间加空行提升可读性',
    })
  }

  // 4. 装饰层次检测
  const markerCount = countDecorativeMarkers(plainText)
  const markerDensity = charCount > 0 ? markerCount / charCount * 100 : 0
  if (markerDensity < 0.5 && charCount > 100) {
    addIssue(issues, {
      id: 'xhs-marker-sparse',
      severity: 'suggestion',
      message: `内容层次提示偏少（${markerCount} 处 / ${charCount} 字）`,
      suggestion: '建议通过标题、分隔线或简短提示词增强阅读锚点，导出时会自动补入基础装饰',
    })
  } else if (markerDensity > 3) {
    addIssue(issues, {
      id: 'xhs-marker-dense',
      severity: 'suggestion',
      message: `内容层次提示偏密（${markerCount} 处 / ${charCount} 字）`,
      suggestion: '建议减少重复分隔或装饰标记，避免视觉噪音',
    })
  }

  // 5. 检测不支持的元素
  if (/<[^>]+>/i.test(markdown)) {
    addIssue(issues, {
      id: 'xhs-html-tags',
      severity: 'error',
      message: '检测到 HTML 标签，小红书是纯文本平台',
      suggestion: '导出时会自动清理 HTML 标签',
    })
  }

  if (/data-ink-(?:block|svg)=|<svg[\s>]/i.test(markdown)) {
    addIssue(issues, {
      id: 'xhs-wechat-decoration-leak',
      severity: 'error',
      message: '检测到微信装饰块或 inline SVG，小红书正文不能承载微信富文本装饰',
      suggestion: '导出时必须降级为纯文本、图片页或长图，不得粘贴微信 HTML/SVG',
    })
  }

  // 6. 检测链接
  const links = markdown.match(/\[([^\]]+)\]\([^)]+\)/g)
  if (links && links.length > 0) {
    addIssue(issues, {
      id: 'xhs-links',
      severity: 'warning',
      message: `发现 ${links.length} 个超链接，小红书不支持点击跳转`,
      suggestion: '导出时会自动转为"搜索关键词"提示',
    })
  }

  // 7. 检测表格
  if (/\|[^\n]+\|/.test(markdown) && /\|[-: ]+\|/.test(markdown)) {
    addIssue(issues, {
      id: 'xhs-table',
      severity: 'warning',
      message: '检测到 Markdown 表格，小红书不支持表格',
      suggestion: '导出时会自动转为列表化描述',
    })
  }

  // 8. 检测代码块
  const codeBlocks = markdown.match(/```[\s\S]*?```/g)
  if (codeBlocks && codeBlocks.length > 0) {
    addIssue(issues, {
      id: 'xhs-code-blocks',
      severity: 'warning',
      message: `发现 ${codeBlocks.length} 个代码块，小红书不支持代码格式`,
      suggestion: '导出时短代码会保留为文本引用，长代码建议截图',
    })
  }

  // 9. 检测 LaTeX 公式
  const latexBlocks = markdown.match(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g)
  if (latexBlocks) {
    addIssue(issues, {
      id: 'xhs-latex',
      severity: 'warning',
      message: `发现 ${latexBlocks.length} 个 LaTeX 公式，小红书不支持数学公式`,
      suggestion: '导出时会转为文字描述',
    })
  }

  detectXhsImageReferenceIssues(markdown, issues)
  detectXhsImageArtifactIssues(markdown, issues)
}

// ═══════════════════════════════════════════════════════════════════
// 知乎质量检测
// ═══════════════════════════════════════════════════════════════════

function detectZhihuIssues(markdown: string, issues: QualityIssue[]): void {
  if (/data-ink-(?:block|svg)=|<mp(?:voice|video)\b/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-wechat-decoration-leak',
      severity: 'error',
      message: '检测到微信旗舰装饰块或微信专属媒体标签，知乎输出必须是 clean Markdown',
      suggestion: '将微信标题卡、阅读条、金句卡、SVG 分隔符和专属媒体组件降级为 Markdown 语义或图片 fallback',
    })
  }

  if (/<svg[\s>]/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-inline-svg',
      severity: 'error',
      message: '检测到 inline SVG，知乎正文不应依赖微信 SVG 装饰',
      suggestion: '将 SVG 降级为 PNG/JPG 或删除装饰，仅保留 Markdown 语义',
    })
  }

  // 1. 检测残留 HTML 标签
  const htmlTags = markdown.match(/<(?!\/?\s*(?:br|hr|img)\s*\/?)[a-zA-Z][^>]*>/g)
  if (htmlTags && htmlTags.length > 0) {
    const uniqueTags = [...new Set(htmlTags.map(t => {
      const match = t.match(/<\/?([a-zA-Z]+)/)
      return match ? match[1] : t
    }))]
    addIssue(issues, {
      id: 'zhihu-html-tags',
      severity: 'warning',
      message: `检测到 ${htmlTags.length} 个 HTML 标签（${uniqueTags.join(', ')}），知乎会过滤 HTML`,
      suggestion: '导出时会自动清理 HTML 标签，保留纯 Markdown',
    })
  }

  // 2. 检测内联样式
  if (/style="[^"]*"/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-inline-style',
      severity: 'warning',
      message: '检测到内联 style 属性，知乎会过滤 style',
      suggestion: '导出时会自动清理内联样式',
    })
  }

  detectZhihuResidualHtmlDependencyIssues(markdown, issues)
  detectZhihuComplexTableIssues(markdown, issues)

  // 3. 检测 Mermaid / Graphviz / PlantUML / Vega 等图表围栏
  const diagramFences = collectDiagramFenceLanguages(markdown)
  const mermaidBlocks = diagramFences.filter(language => language === 'mermaid')
  if (mermaidBlocks.length > 0) {
    addIssue(issues, {
      id: 'zhihu-mermaid',
      severity: 'warning',
      message: `发现 ${mermaidBlocks.length} 个 Mermaid 图表，知乎不支持 Mermaid 渲染`,
      suggestion: '建议将 Mermaid 图表截图后上传',
    })
  }
  const otherDiagramFences = diagramFences.filter(language => language !== 'mermaid')
  if (otherDiagramFences.length > 0) {
    addIssue(issues, {
      id: 'zhihu-raw-diagram-fence',
      severity: 'warning',
      message: `发现 ${otherDiagramFences.length} 个原始图表围栏（${[...new Set(otherDiagramFences)].join(', ')}）`,
      suggestion: '知乎发布前应转为 PNG/JPG 并提供 alt/caption，或保留文字说明，不直接发布 raw diagram block',
    })
  }

  // 4. 检测任务列表
  const taskLists = markdown.match(/^- \[([ x])\]/gm)
  if (taskLists) {
    addIssue(issues, {
      id: 'zhihu-task-list',
      severity: 'suggestion',
      message: `发现 ${taskLists.length} 个任务列表项，知乎不支持复选框`,
      suggestion: '导出时会自动转为“已完成 / 待处理”文本标记',
    })
  }

  // 5. 检测 LaTeX 语法错误和发布前预览提示
  detectLatexErrors(markdown, issues)

  const slash = String.fromCharCode(92)
  const dollar = String.fromCharCode(36)
  const latexPattern = `${slash}${dollar}${slash}${dollar}[${slash}s${slash}S]*?${slash}${dollar}${slash}${dollar}|${slash}${dollar}[^${dollar}${slash}n]+${slash}${dollar}`
  const latexBlocks = markdown.match(new RegExp(latexPattern, 'g'))
  if (latexBlocks) {
    addIssue(issues, {
      id: 'zhihu-latex-preview',
      severity: 'suggestion',
      message: `发现 ${latexBlocks.length} 个 LaTeX 公式，知乎不同导入入口的公式渲染表现可能不一致`,
      suggestion: '导出会保留 LaTeX 源格式；发布前请在知乎编辑器预览，若未渲染则转换为 equation 图片或截图后上传',
    })
  }

  // 6. 检测 SVG 图片（知乎不支持 SVG）
  const svgImages = markdown.match(/!\[.*?\]\([^)]*\.svg[^)]*\)/gi)
  if (svgImages) {
    addIssue(issues, {
      id: 'zhihu-svg-image',
      severity: 'warning',
      message: `发现 ${svgImages.length} 张 SVG 图片，知乎不支持 SVG 格式`,
      suggestion: '将 SVG 转换为 PNG/JPG',
    })
  }

  // 7. 检测超长代码行
  const codeBlockMatches = markdown.matchAll(/```\w*\n([\s\S]*?)```/g)
  for (const match of codeBlockMatches) {
    const code = match[1]
    const longLines = code.split('\n').filter(line => line.length > 120)
    if (longLines.length > 0) {
      addIssue(issues, {
        id: 'zhihu-long-code-line',
        severity: 'suggestion',
        message: `代码块中有 ${longLines.length} 行超过 120 字符`,
        suggestion: '可能影响阅读体验，建议适当换行',
      })
      break // 只报告一次
    }
  }

  // 8. 检测 class 属性
  if (/class="[^"]*"/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-class-attr',
      severity: 'warning',
      message: '检测到 class 属性，知乎会过滤 class',
      suggestion: '导出时会自动清理 class 属性',
    })
  }

  detectZhihuImageIssues(markdown, issues)
}

// ═══════════════════════════════════════════════════════════════════
// 通用检测
// ═══════════════════════════════════════════════════════════════════

function detectCommonIssues(markdown: string, _platform: Platform, issues: QualityIssue[]): void {
  // 1. 检测 Base64 图片
  const base64Images = markdown.match(/!\[.*?\]\(data:image\/[^)]+\)/g)
  if (base64Images) {
    addIssue(issues, {
      id: 'common-base64-image',
      severity: 'warning',
      message: `发现 ${base64Images.length} 张 Base64 内嵌图片`,
      suggestion: '大多数平台不支持 Base64 图片，建议上传至图床',
    })
  }

  // 2. 检测空内容
  const trimmed = markdown.trim()
  if (!trimmed) {
    addIssue(issues, {
      id: 'common-empty-content',
      severity: 'error',
      message: '内容为空',
      suggestion: '请输入需要导出的内容',
    })
  }

  // 3. 检测图片可访问性（外链）
  const externalImages = markdown.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/g)
  if (externalImages && externalImages.length > 5) {
    addIssue(issues, {
      id: 'common-many-images',
      severity: 'suggestion',
      message: `文章包含 ${externalImages.length} 张外链图片`,
      suggestion: '较多外链图片可能导致加载缓慢，发布后请检查图片显示',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 渲染核心检测
// ═══════════════════════════════════════════════════════════════════

const CODE_LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'shell',
  zsh: 'shell',
  yml: 'yaml',
  md: 'markdown',
  cs: 'csharp',
  cplusplus: 'cpp',
  kt: 'kotlin',
}

const SPECIAL_RENDERER_BLOCK_LANGUAGES = DIAGRAM_FENCE_LANGUAGES

function normalizeCodeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase()
  return CODE_LANGUAGE_ALIASES[normalized] ?? normalized
}

function detectRenderingCoreIssues(markdown: string, issues: QualityIssue[]): void {
  const codeBlocks = collectFencedCodeBlocks(markdown)
  const unlabeledBlocks = codeBlocks.filter(block => !block.language).length
  const unsupportedLanguages = Array.from(new Set(
    codeBlocks
      .map(block => normalizeCodeLanguage(block.language))
      .filter(language => language
        && !SPECIAL_RENDERER_BLOCK_LANGUAGES.has(language)
        && !(SUPPORTED_CODE_LANGUAGES as readonly string[]).includes(language)),
  ))
  const inferredUnlabeledLanguages = Array.from(new Set(
    codeBlocks
      .filter(block => !block.language)
      .map(block => inferCodeBlockLanguage(block.code))
      .filter((language): language is string => Boolean(language)),
  ))

  if (unlabeledBlocks > 0) {
    addIssue(issues, {
      id: 'render-code-language-missing',
      severity: 'suggestion',
      message: `发现 ${unlabeledBlocks} 个未声明语言的代码块`,
      suggestion: '为代码块补充语言名，可启用语言标签与稳定语法高亮',
    })
  }

  if (inferredUnlabeledLanguages.length > 0) {
    addIssue(issues, {
      id: 'render-code-language-inferred',
      severity: 'warning',
      message: `发现可推断但未声明语言的代码块: ${inferredUnlabeledLanguages.join(', ')}`,
      suggestion: '当源文档、代码内容或扩展名能确定语言时，导出前应补全 fenced code language，避免知乎等平台高亮失效',
    })
  }

  if (unsupportedLanguages.length > 0) {
    addIssue(issues, {
      id: 'render-code-language-unsupported',
      severity: 'warning',
      message: `发现未覆盖的代码语言: ${unsupportedLanguages.join(', ')}`,
      suggestion: '改用已支持语言别名，或在渲染语言注册表中补充该语言',
    })
  }

  const blobImages = markdown.match(/!\[[^\]]*\]\(blob:[^)]+\)/g)
  if (blobImages) {
    addIssue(issues, {
      id: 'render-blob-image-source',
      severity: 'error',
      message: `发现 ${blobImages.length} 张使用临时 blob: URL 的图片`,
      suggestion: '图片必须通过资产管道写入 IndexedDB，并使用 inkforge-asset:// 稳定引用',
    })
  }

  const localAssetImages = markdown.match(/!\[[^\]]*\]\(inkforge-asset:\/\/[^)]+\)/g)
  if (localAssetImages && localAssetImages.length > 0) {
    addIssue(issues, {
      id: 'render-local-asset-image',
      severity: 'suggestion',
      message: `发现 ${localAssetImages.length} 张本地资产图片`,
      suggestion: '发布前请通过目标平台导出器解析本地资产，避免直接复制内部引用',
    })
  }

  const htmlTables = markdown.match(/<table[\s>]/gi)
  if (htmlTables) {
    addIssue(issues, {
      id: 'render-html-table',
      severity: 'suggestion',
      message: `发现 ${htmlTables.length} 个 HTML 表格`,
      suggestion: 'HTML 表格导出时需要内联样式；编辑器内建议使用原生表格节点以保留结构',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════

function detectXhsImageReferenceIssues(markdown: string, issues: QualityIssue[]): void {
  const imageCount = collectMarkdownImages(markdown).length
  if (imageCount > XHS_IMAGE_COUNT_REVIEW_THRESHOLD) {
    addIssue(issues, {
      id: 'xhs-image-count-review',
      severity: 'warning',
      message: `发现 ${imageCount} 张图片，超过当前小红书图文市场资料常见的 ${XHS_IMAGE_COUNT_REVIEW_THRESHOLD} 张上限`,
      suggestion: '不要硬编码平台上限；发布前通过真实入口确认当前账号允许数量，并同步重建图片 manifest 与正文图号引用',
    })
    addIssue(issues, {
      id: 'xhs-image-page-count-limit',
      severity: 'error',
      message: `发现 ${imageCount} 张图片，超过当前默认小红书图片页检查上限 ${XHS_IMAGE_PAGE_COUNT_LIMIT}`,
      suggestion: '将页面上限作为可配置发布清单项；超过默认上限时必须由真实发布入口确认或拆分为长图/多篇内容',
    })
  }

  const references = collectXhsImageReferences(markdown)
  if (references.length === 0) return

  const invalidReferences = references.filter(ref => ref < 1 || (imageCount > 0 && ref > imageCount))
  if (imageCount === 0 || invalidReferences.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-reference-mismatch',
      severity: 'error',
      message: imageCount === 0
        ? `正文引用了 ${references.length} 个“见第 N 张图”，但源内容没有可计数图片`
        : `正文引用的图片序号超出现有 ${imageCount} 张图片范围：${[...new Set(invalidReferences)].join(', ')}`,
      suggestion: '新增、删除或重排图片后必须重建 manifest、正文“见第 N 张图”引用、封面页和导出文件列表',
    })
  }
}

function detectXhsImageArtifactIssues(markdown: string, issues: QualityIssue[]): void {
  const images = [
    ...collectMarkdownImages(markdown),
    ...collectHtmlImages(markdown),
  ]
  const unsupportedFormats = Array.from(new Set(
    images
      .map(image => detectImageFormat(image.src))
      .filter((format): format is string => format !== null && !XHS_ALLOWED_IMAGE_FORMATS.has(format)),
  ))

  if (unsupportedFormats.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-format-unsupported',
      severity: 'error',
      message: `发现非 JPG/PNG 图片格式：${unsupportedFormats.join(', ')}`,
      suggestion: '小红书图片页默认只放行 JPG/PNG；SVG/WebP/GIF/HEIC/AVIF 等必须先通过真实转换器生成可预览 artifact，再进入发布清单',
    })
  }
}

function detectZhihuImageIssues(markdown: string, issues: QualityIssue[]): void {
  const markdownImages = collectMarkdownImages(markdown)
  const htmlImages = collectHtmlImages(markdown)
  const blockedSources = [
    ...markdownImages.map(image => image.src),
    ...htmlImages.map(image => image.src),
  ].filter(isBlockedZhihuImageSource)

  if (blockedSources.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-host-blocked',
      severity: 'error',
      message: `发现 ${blockedSources.length} 个不适合作为知乎最终产物的图片地址`,
      suggestion: '知乎最终 Markdown 图片必须使用稳定公开 HTTPS 地址，或真实知乎/目标发布入口上传后返回的平台图床地址；本地、blob/data、私网、http 和微信专用 CDN 必须重写或阻断',
    })
  }

  const missingAlt = [
    ...markdownImages.filter(image => !image.alt.trim()),
    ...htmlImages.filter(image => !image.alt.trim()),
  ]
  if (missingAlt.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-alt-missing',
      severity: 'warning',
      message: `发现 ${missingAlt.length} 张图片缺少 alt 文本`,
      suggestion: '知乎图片 fallback、公式图、表格图和图表图必须保留 alt；图片替代语义内容时还应保留 caption 或文字说明',
    })
  }
}

function detectZhihuResidualHtmlDependencyIssues(markdown: string, issues: QualityIssue[]): void {
  const htmlDependencyTags = Array.from(markdown.matchAll(/<[a-zA-Z][^>]*>/g))
    .map(match => match[0])
    .filter(tag => {
      const name = tag.match(/^<\s*([a-zA-Z0-9-]+)/)?.[1]?.toLowerCase() ?? ''
      if (name === 'img' && isAllowedZhihuEquationImgTag(tag)) return false
      if (['section', 'div', 'article', 'aside', 'figure', 'figcaption'].includes(name)) return true
      if (/^mp(?:voice|video)$/.test(name)) return true
      return /\s(?:style|class)=|data-ink-(?:block|svg)=/i.test(tag)
    })

  if (htmlDependencyTags.length > 0) {
    addIssue(issues, {
      id: 'zhihu-html-dependency',
      severity: 'error',
      message: `检测到 ${htmlDependencyTags.length} 个依赖 HTML/CSS/微信包装的节点`,
      suggestion: '知乎最终 Markdown 不能依赖 section/div、style/class、微信 wrapper 或微信专属媒体标签；请清理为语义 Markdown 或图片 fallback',
    })
  }
}

function detectZhihuComplexTableIssues(markdown: string, issues: QualityIssue[]): void {
  const htmlTables = markdown.match(/<table\b[\s\S]*?<\/table>/gi) ?? []
  const complexHtmlTables = htmlTables.filter(table =>
    /\s(?:style|class|rowspan|colspan)=/i.test(table)
    || /<(?:section|div|p|ul|ol|pre|code)\b/i.test(table),
  )
  const markdownTables = collectMarkdownTableBlocks(markdown)
  const complexMarkdownTables = markdownTables.filter(table => {
    const columnCount = countMarkdownTableColumns(table)
    return columnCount > 6
      || /<br\s*\/?>|<(?:section|div|p|ul|ol|pre|code)\b|`[^`]+`/i.test(table)
  })
  const total = complexHtmlTables.length + complexMarkdownTables.length

  if (total > 0) {
    addIssue(issues, {
      id: 'zhihu-complex-table',
      severity: 'error',
      message: `检测到 ${total} 个复杂表格，可能无法作为知乎 clean Markdown 稳定发布`,
      suggestion: '将多段落/列表/代码单元格、宽表格或依赖 HTML 属性的表格简化为语义 Markdown 表格，或图片化并保留 alt/caption',
    })
  }
}

function collectDiagramFenceLanguages(markdown: string): string[] {
  return Array.from(markdown.matchAll(/^```([^\s`]*)/gmi))
    .map(match => normalizeCodeLanguage(match[1] ?? ''))
    .filter(language => DIAGRAM_FENCE_LANGUAGES.has(language))
}

interface MarkdownImageRef {
  alt: string
  src: string
}

interface FencedCodeBlock {
  language: string
  code: string
}

function collectFencedCodeBlocks(markdown: string): FencedCodeBlock[] {
  return Array.from(markdown.matchAll(/^```([^\s`]*)[^\n]*\n([\s\S]*?)^```/gm))
    .map(match => ({
      language: match[1] ?? '',
      code: match[2] ?? '',
    }))
}

function collectMarkdownImages(markdown: string): MarkdownImageRef[] {
  return Array.from(markdown.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g))
    .map(match => ({
      alt: match[1] ?? '',
      src: match[2] ?? '',
    }))
}

function collectHtmlImages(markdown: string): MarkdownImageRef[] {
  return Array.from(markdown.matchAll(/<img\b[^>]*>/gi))
    .map(match => ({
      alt: getHtmlAttribute(match[0], 'alt'),
      src: getHtmlAttribute(match[0], 'src'),
    }))
    .filter(image => image.src)
}

function detectImageFormat(src: string): string | null {
  const normalized = src.trim().toLowerCase()
  const dataFormat = normalized.match(/^data:image\/([a-z0-9.+-]+)/i)?.[1]
  if (dataFormat) return normalizeImageFormat(dataFormat)

  const pathWithoutQuery = normalized.split(/[?#]/, 1)[0]
  const ext = pathWithoutQuery.match(/\.([a-z0-9]+)$/i)?.[1]
  return ext ? normalizeImageFormat(ext) : null
}

function normalizeImageFormat(format: string): string {
  const normalized = format.toLowerCase()
  if (normalized === 'jpg' || normalized === 'jpeg') return normalized
  if (normalized === 'svg+xml') return 'svg'
  return normalized
}

function isAllowedZhihuEquationImgTag(tag: string): boolean {
  return /^<img\b/i.test(tag)
    && /\bclass=["']ee_img tr_noresize["']/i.test(tag)
    && /\beeimg=["']?1["']?/i.test(tag)
}

function collectMarkdownTableBlocks(markdown: string): string[] {
  const lines = markdown.split('\n')
  const blocks: string[] = []
  const separatorPattern = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/

  for (let i = 1; i < lines.length; i++) {
    if (!separatorPattern.test(lines[i])) continue

    let start = i - 1
    while (start > 0 && lines[start - 1].includes('|') && lines[start - 1].trim()) {
      start--
    }

    let end = i + 1
    while (end < lines.length && lines[end].includes('|') && lines[end].trim()) {
      end++
    }

    blocks.push(lines.slice(start, end).join('\n'))
    i = end
  }

  return blocks
}

function countMarkdownTableColumns(table: string): number {
  const header = table.split('\n').find(line => line.includes('|')) ?? ''
  const trimmed = header.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed ? trimmed.split('|').length : 0
}

function inferCodeBlockLanguage(code: string): string | null {
  const trimmed = code.trim()
  if (!trimmed) return null
  const looksLikeJsonContainer = (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  if (looksLikeJsonContainer && /"[^"]+"\s*:/.test(trimmed)) return 'json'
  if (/\b(?:import|export)\b[\s\S]*\bfrom\b|\b(?:const|let|interface|type)\s+\w+|:\s*(?:string|number|boolean)\b/.test(trimmed)) {
    return 'typescript'
  }
  if (/^\s*(?:def|class)\s+\w+|^\s*from\s+\w+\s+import\b|^\s*import\s+\w+/m.test(trimmed)) return 'python'
  if (/\bSELECT\b[\s\S]+\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\b[\s\S]+\bSET\b/i.test(trimmed)) return 'sql'
  if (/^\s*(?:curl|npm|pnpm|git|docker|cd|export)\b/m.test(trimmed)) return 'shell'
  return null
}

function getHtmlAttribute(tag: string, name: string): string {
  const pattern = new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, 'i')
  return tag.match(pattern)?.[2] ?? ''
}

function collectXhsImageReferences(markdown: string): number[] {
  return Array.from(markdown.matchAll(/见第\s*([0-9一二三四五六七八九十]+)\s*张图/g))
    .map(match => parseChineseOrArabicNumber(match[1] ?? ''))
    .filter((value): value is number => value !== null)
}

function parseChineseOrArabicNumber(raw: string): number | null {
  if (/^\d+$/.test(raw)) return parseInt(raw, 10)

  const digitMap: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }
  if (raw === '十') return 10
  if (raw.startsWith('十')) {
    const ones = digitMap[raw.slice(1)] ?? 0
    return 10 + ones
  }
  if (raw.endsWith('十')) {
    const tens = digitMap[raw.slice(0, -1)]
    return tens === undefined ? null : tens * 10
  }
  if (raw.includes('十')) {
    const [tensRaw, onesRaw] = raw.split('十')
    const tens = digitMap[tensRaw]
    const ones = digitMap[onesRaw] ?? 0
    return tens === undefined ? null : tens * 10 + ones
  }

  return digitMap[raw] ?? null
}

function isBlockedZhihuImageSource(src: string): boolean {
  const normalized = src.trim()
  const lower = normalized.toLowerCase()
  if (!normalized) return true
  if (/^(?:blob:|data:|file:)/i.test(normalized)) return true
  if (/^(?:\.{1,2}\/|\/|[a-z]:\\|[a-z]:\/)/i.test(normalized)) return true
  if (/^http:\/\//i.test(normalized)) return true
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)/i.test(normalized)) return true
  if (/^https?:\/\/(?:mmbiz\.qpic\.cn|mmbiz\.qlogo\.cn|res\.wx\.qq\.com)\//i.test(normalized)) return true
  return !lower.startsWith('https://')
}

/** 检测 LaTeX 语法错误（不匹配的 $） */
function detectLatexErrors(text: string, issues: QualityIssue[]): void {
  // 先移除代码块内容，避免误检
  const withoutCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')

  // 检查块级 $$ 是否匹配
  const blockDelimiters = withoutCode.match(/\$\$/g)
  if (blockDelimiters && blockDelimiters.length % 2 !== 0) {
    addIssue(issues, {
      id: 'zhihu-latex-unmatched-block',
      severity: 'error',
      message: '检测到不匹配的 $$ 块级公式定界符',
      suggestion: '确保每个 $$ 都有对应的闭合 $$',
    })
  }

  // 检查行内 $ 是否匹配（粗略检查）
  const lines = withoutCode.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 跳过 $$ 行
    if (line.trim().startsWith('$$')) continue
    // 统计独立 $ 数量
    const matches = line.match(/(?<!\$)\$(?!\$)/g)
    if (matches && matches.length % 2 !== 0) {
      addIssue(issues, {
        id: 'zhihu-latex-unmatched-inline',
        severity: 'error',
        message: `第 ${i + 1} 行检测到不匹配的 $ 行内公式定界符`,
        suggestion: '确保每个 $ 都有对应的闭合 $，或使用 \\$ 转义',
        location: `Line ${i + 1}`,
      })
      break // 只报告第一个
    }
  }
}

/** 添加质量问题到列表 */
function addIssue(issues: QualityIssue[], issue: QualityIssue): void {
  issues.push(issue)
}

/** 去除 Markdown 语法标记，返回近似纯文本长度 */
function stripMarkdownSyntax(markdown: string): string {
  let text = markdown
  // 代码块
  text = text.replace(/```[\s\S]*?```/g, '')
  // 行内代码
  text = text.replace(/`[^`]+`/g, (m) => m.slice(1, -1))
  // 图片
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  // 链接
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // 标题标记
  text = text.replace(/^#{1,6}\s+/gm, '')
  // 加粗/斜体
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/__(.+?)__/g, '$1')
  text = text.replace(/\*(.+?)\*/g, '$1')
  text = text.replace(/_(.+?)_/g, '$1')
  // 删除线
  text = text.replace(/~~(.+?)~~/g, '$1')
  // 列表标记
  text = text.replace(/^[\s]*[-*+]\s+/gm, '')
  text = text.replace(/^[\s]*\d+\.\s+/gm, '')
  // 引用
  text = text.replace(/^>\s*/gm, '')
  // 水平线
  text = text.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '')
  // 表格分隔行
  text = text.replace(/^\|[-: |]+\|$/gm, '')
  // 表格管道符
  text = text.replace(/\|/g, ' ')
  // HTML 标签
  text = text.replace(/<[^>]+>/g, '')
  // 连续空行
  text = text.replace(/\n{2,}/g, '\n')

  return text.trim()
}

/** 统计装饰标记数量 */
function countDecorativeMarkers(text: string): number {
  const markerPattern = /(?:^|\s)(?:【|〔|◆|◇|▫|○|▸|·|要点：|说明：|提示：|摘录：|片段：|检索关键词|查找关键词|\[代码\]|\[配图\]|\[图片\]|\[示意图\]|\[公式\]|\[表格\]|\[数据\])/gm
  const matches = text.match(markerPattern)
  return matches ? matches.length : 0
}

// ═══════════════════════════════════════════════════════════════════
// 批量检测
// ═══════════════════════════════════════════════════════════════════

/**
 * 同时对 Markdown 执行所有平台的质量检测
 * 适用于用户还没选定平台时的预览场景
 */
export function detectQualityAll(markdown: string): Record<Platform, QualityReport> {
  return {
    wechat: detectQuality(markdown, 'wechat'),
    xiaohongshu: detectQuality(markdown, 'xiaohongshu'),
    zhihu: detectQuality(markdown, 'zhihu'),
  }
}

/**
 * 快速检测：仅返回是否通过，不含详细信息
 */
export function quickCheck(markdown: string, platform: Platform): boolean {
  return detectQuality(markdown, platform).passed
}

/**
 * 获取指定严重度的问题
 */
export function filterIssues(
  report: QualityReport,
  severity: QualityIssueSeverity
): QualityIssue[] {
  return report.issues.filter(i => i.severity === severity)
}
