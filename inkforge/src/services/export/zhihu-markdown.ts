/**
 * 知乎 Markdown 导出引擎
 *
 * 知乎平台原生支持 Markdown，包括 LaTeX 公式、代码块、表格等。
 * 本模块输出清洁的 Markdown 内容，可直接导入知乎编辑器。
 * 核心策略是"减法"——清理不兼容内容，保留原始 Markdown 语法。
 *
 * 参考：docs/platform-rendering-rules/zhihu-rules.md
 */

import type { ZhihuMarkdownResult, ZhihuMarkdownOptions } from './types'
import { zhihuMarkdownRulesTransform } from './platform-rules/zhihu'

// ═══════════════════════════════════════════════════════════════════
// Markdown → 知乎 Markdown 转换
// ═══════════════════════════════════════════════════════════════════

/**
 * 将 Markdown 转换为知乎兼容的清洁 Markdown
 *
 * 转换规则参考 docs/platform-rendering-rules/zhihu-rules.md
 */
export function markdownToZhihuClean(
  markdown: string,
  options?: ZhihuMarkdownOptions
): ZhihuMarkdownResult {
  // 向后兼容：显式 convertLatexToImg 优先；否则若旧字段 preserveLatex 显式给出，
  // 则反向映射；否则启用新默认 true。
  const explicitConvert = options?.convertLatexToImg
  const explicitPreserve = options?.preserveLatex
  const convertLatexToImg =
    explicitConvert !== undefined
      ? explicitConvert
      : explicitPreserve !== undefined
        ? !explicitPreserve
        : true
  // 在保护阶段，无论是否最终转换，都需保护 LaTeX 不被 HTML/GFM 步骤误伤；
  // 因此 protectLatex 始终为 true。
  const protectLatex = true
  const convertTasks = options?.convertTaskLists ?? true
  const mermaidHandling = options?.mermaidHandling ?? 'prompt'
  const cleanGfm = options?.cleanGfmExtensions ?? true
  const tableHandling: 'preserve' | 'html' | 'fallback' = options?.tableHandling ?? 'html'
  const codeLangCoerce = options?.codeLangCoerce ?? true
  const defaultLang = options?.defaultLang ?? 'text'

  let result = markdown.trim()
  let mermaidCount = 0
  let taskListCount = 0
  const cleanedHtmlTags: string[] = []
  let latexCount = 0

  // Step 1: 保护 LaTeX 公式（避免后续处理破坏公式）
  const latexBlocks: string[] = []
  if (protectLatex) {
    // 保护块级公式 $$...$$
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
      latexBlocks.push(match)
      latexCount++
      return `%%LATEX_BLOCK_${latexBlocks.length - 1}%%`
    })
    // 保护行内公式 $...$（避免匹配货币符号等）
    result = result.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (match) => {
      latexBlocks.push(match)
      latexCount++
      return `%%LATEX_INLINE_${latexBlocks.length - 1}%%`
    })
  }

  // Step 2: 保护代码块（避免内容被处理）
  const codeBlocks: string[] = []
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    // 检查是否是 Mermaid
    if (match.startsWith('```mermaid')) {
      mermaidCount++
      if (mermaidHandling === 'prompt') {
        codeBlocks.push('> 此处原为 Mermaid 图表，知乎不支持 Mermaid 渲染，建议截图后上传。')
      } else {
        codeBlocks.push('') // remove 模式
      }
    } else {
      codeBlocks.push(match) // 保留普通代码块
    }
    return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`
  })

  // Step 3: 保护行内代码
  const inlineCodes: string[] = []
  result = result.replace(/`([^`\n]+)`/g, (match) => {
    inlineCodes.push(match)
    return `%%INLINE_CODE_${inlineCodes.length - 1}%%`
  })

  // Step 4: 清理 HTML 标签
  result = cleanHtmlTags(result, cleanedHtmlTags)

  // Step 5: 清理内联样式
  result = result.replace(/\s*style="[^"]*"/gi, '')
  result = result.replace(/\s*class="[^"]*"/gi, '')

  // Step 6: 处理 GFM 扩展语法
  if (cleanGfm) {
    result = convertGfmExtensions(result)
  }

  // Step 7: 处理任务列表
  if (convertTasks) {
    result = result.replace(/^(\s*)- \[x\]\s*/gm, (_match, indent: string) => {
      taskListCount++
      return `${indent}- 已完成：`
    })
    result = result.replace(/^(\s*)- \[ \]\s*/gm, (_match, indent: string) => {
      taskListCount++
      return `${indent}- 待处理：`
    })
  }

  // Step 8: 清理微信/平台特有格式
  result = cleanPlatformSpecific(result)

  // Step 9: 恢复保护的内容
  // 恢复行内代码
  result = result.replace(/%%INLINE_CODE_(\d+)%%/g, (_match, idx: string) => {
    return inlineCodes[parseInt(idx)] ?? ''
  })
  // 恢复代码块
  result = result.replace(/%%CODE_BLOCK_(\d+)%%/g, (_match, idx: string) => {
    return codeBlocks[parseInt(idx)] ?? ''
  })
  // 恢复 LaTeX（始终恢复，否则 %%LATEX_*%% 占位会泄漏到输出）
  if (protectLatex) {
    result = result.replace(/%%LATEX_(?:BLOCK|INLINE)_(\d+)%%/g, (_match, idx: string) => {
      return latexBlocks[parseInt(idx)] ?? ''
    })
  }

  // Step 10: 应用 platform-rules 转换（LaTeX → equation img、表格降级、代码语言强制）
  // 顺序在 finalCleanup 之前，保证规则可见到完整恢复后的 markdown。
  const rulesResult = zhihuMarkdownRulesTransform(result, {
    convertLatexToImg,
    tableHandling,
    codeLangCoerce,
    defaultLang,
  })
  result = rulesResult.md

  // Step 11: 最终清理
  result = finalCleanup(result)

  return {
    markdown: result,
    mermaidCount,
    taskListCount,
    cleanedHtmlTags: [...new Set(cleanedHtmlTags)],
    latexCount,
    latexBlocksConverted: rulesResult.stats.latexBlocks,
    latexInlinesConverted: rulesResult.stats.latexInlines,
    tablesConverted: rulesResult.stats.tablesFallback,
    codeLangsFixed: rulesResult.stats.codeLangFixed,
  }
}

// ═══════════════════════════════════════════════════════════════════
// 内部转换函数
// ═══════════════════════════════════════════════════════════════════

/** 清理 HTML 标签 — 知乎不渲染 HTML */
function cleanHtmlTags(text: string, cleanedTags: string[]): string {
  // 匹配自闭合和成对标签
  return text.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g, (match, tagName: string) => {
    const lower = tagName.toLowerCase()
    // 保留特定标签的文本内容（如 <strong>text</strong> → text）
    const preserveContentTags = ['strong', 'b', 'em', 'i', 'u', 'del', 's', 'mark', 'sub', 'sup', 'span', 'a']
    if (preserveContentTags.includes(lower)) {
      // 只移除标签，保留内容
      cleanedTags.push(lower)
      return ''
    }

    // 块级标签：替换为换行
    const blockTags = ['div', 'section', 'p', 'br', 'hr', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'figure', 'figcaption', 'details', 'summary', 'header', 'footer', 'nav', 'main', 'article', 'aside']
    if (blockTags.includes(lower)) {
      cleanedTags.push(lower)
      // 闭合标签换行，开启标签保持
      if (match.startsWith('</')) return '\n'
      return ''
    }

    // 其他标签：静默移除
    cleanedTags.push(lower)
    return ''
  })
}

/** 转换 GFM 扩展语法为知乎兼容格式 */
function convertGfmExtensions(text: string): string {
  // GFM 警告块 → 引用块
  text = text.replace(
    />\s*\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*\n/gi,
    (_, type: string) => {
      const labels: Record<string, string> = {
        'NOTE': '> **注意：**\n',
        'TIP': '> **提示：**\n',
        'WARNING': '> **警告：**\n',
        'CAUTION': '> **注意：**\n',
        'IMPORTANT': '> **重要：**\n',
      }
      return labels[type.toUpperCase()] ?? '> '
    }
  )

  // 脚注引用保留（知乎部分支持）
  // 不做处理

  return text
}

/** 清理微信/平台特有格式 */
function cleanPlatformSpecific(text: string): string {
  // 移除 Front Matter（若存在）
  text = text.replace(/^---\n[\s\S]*?\n---\n/, '')

  // 移除 rehype 自定义标记
  text = text.replace(/<!--\s*rehype:.*?-->/g, '')

  // 移除 HTML 注释
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // 移除零宽字符
  text = text.replace(/(?:\u200B|\u200C|\u200D|\uFEFF)/g, '')

  return text
}

/** 最终清理 */
function finalCleanup(text: string): string {
  // 清理因 HTML 标签移除产生的连续空行
  text = text.replace(/\n{3,}/g, '\n\n')
  // 清理行尾空格
  text = text.replace(/[ \t]+$/gm, '')
  // 移除文首空行
  text = text.replace(/^\n+/, '')
  return text.trim()
}
