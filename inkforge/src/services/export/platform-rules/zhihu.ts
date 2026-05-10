/**
 * 知乎平台合规规则（Markdown 源转换）
 *
 * 纯函数集合，不依赖 DOM。直接对 Markdown 字符串进行变换：
 *   1. LaTeX → 知乎 equation 图片占位（含 ee_img tr_noresize class，工业标准）
 *   2. 表格 → HTML <table>（知乎 Markdown 表格渲染不稳，HTML 表格被原生支持）
 *   3. 代码块语言强制：无语言标识的 fenced code 自动补默认语言
 *
 * 参考（2026 实证最佳实践）：
 *   - miracleyoo/Markdown4Zhihu: equation img 必带 class="ee_img tr_noresize"
 *   - drmingdrmer/md2zhihu: 同上，使用 ee_img tr_noresize 标记
 *   - OpenACID: 知乎公式渲染要求 eeimg + ee_img class 双重标记
 *   - 现代知乎编辑器原生消费 HTML <table>，比 blockquote 降级更准确
 */
'use strict'

// ═══════════════════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════════════════

export interface ZhihuRuleOptions {
  convertLatexToImg?: boolean
  /**
   * 表格处理方式：
   * - 'preserve': 保留 GFM Markdown 表格语法
   * - 'html':     转为 HTML <table>（知乎原生支持，2026 工业标准）
   * - 'fallback': 兼容别名，等价于 'html'（保留旧调用方）
   */
  tableHandling?: 'preserve' | 'html' | 'fallback'
  codeLangCoerce?: boolean
  defaultLang?: string
}

export interface ZhihuRuleStats {
  latexBlocks: number
  latexInlines: number
  /** 转为 HTML 的表格数（字段名保留以维持向后兼容） */
  tablesFallback: number
  codeLangFixed: number
}

export interface LatexConversionResult {
  md: string
  blockCount: number
  inlineCount: number
}

export interface TableFallbackResult {
  md: string
  tableCount: number
}

export interface CodeLangCoerceResult {
  md: string
  replacedCount: number
}

export interface ZhihuMarkdownRulesResult {
  md: string
  stats: ZhihuRuleStats
}

// ═══════════════════════════════════════════════════════════════════
// 内部工具：保护代码区段，避免规则误伤
// ═══════════════════════════════════════════════════════════════════

interface ProtectedSegments {
  text: string
  fences: string[]
  inlineCodes: string[]
}

const FENCE_TOKEN = (i: number) => `\u0000ZHRULE_FENCE_${i}\u0000`
const INLINE_CODE_TOKEN = (i: number) => `\u0000ZHRULE_INLINE_${i}\u0000`

function protectFences(md: string): { text: string; fences: string[] } {
  const fences: string[] = []
  // 匹配 ```...``` 围栏代码块（多行，非贪婪）
  const text = md.replace(/```[\s\S]*?```/g, (match) => {
    const idx = fences.length
    fences.push(match)
    return FENCE_TOKEN(idx)
  })
  return { text, fences }
}

function restoreFences(md: string, fences: string[]): string {
  return md.replace(/\u0000ZHRULE_FENCE_(\d+)\u0000/g, (_m, idx: string) => {
    return fences[parseInt(idx, 10)] ?? ''
  })
}

function protectInlineCodes(md: string): { text: string; inlineCodes: string[] } {
  const inlineCodes: string[] = []
  // 行内代码：`...`，不跨行
  const text = md.replace(/`[^`\n]+`/g, (match) => {
    const idx = inlineCodes.length
    inlineCodes.push(match)
    return INLINE_CODE_TOKEN(idx)
  })
  return { text, inlineCodes }
}

function restoreInlineCodes(md: string, inlineCodes: string[]): string {
  return md.replace(/\u0000ZHRULE_INLINE_(\d+)\u0000/g, (_m, idx: string) => {
    return inlineCodes[parseInt(idx, 10)] ?? ''
  })
}

function protectAll(md: string): ProtectedSegments {
  const a = protectFences(md)
  const b = protectInlineCodes(a.text)
  return { text: b.text, fences: a.fences, inlineCodes: b.inlineCodes }
}

function restoreAll(md: string, segs: ProtectedSegments): string {
  let out = restoreInlineCodes(md, segs.inlineCodes)
  out = restoreFences(out, segs.fences)
  return out
}

// ═══════════════════════════════════════════════════════════════════
// 1. LaTeX → 知乎 equation 图片占位
// ═══════════════════════════════════════════════════════════════════

/**
 * 将 LaTeX 公式转换为知乎 equation?tex= 图片占位。
 *
 * - 块级 `$$x$$` → `<img src="https://www.zhihu.com/equation?tex=${encodeURIComponent(x)}" alt="${escapeAlt(x)}" class="ee_img tr_noresize" eeimg="1">`
 * - 行内 `$x$`   → 同上（alt 截断为简短形式）
 *
 * `class="ee_img tr_noresize"` 是知乎工业标准（Markdown4Zhihu / md2zhihu / OpenACID
 * 三方实证）：保证编辑器在粘贴时识别为公式占位、不强制压缩尺寸。
 *
 * 代码围栏与行内代码内的 `$...$` 会被保留原样。
 */
export function convertLatexToEquationImg(md: string): LatexConversionResult {
  const segs = protectAll(md)
  let blockCount = 0
  let inlineCount = 0

  // 先处理块级 $$...$$（多行，非贪婪），避免被行内规则误吃
  let text = segs.text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, raw: string) => {
    blockCount++
    const expr = raw.trim()
    return buildEquationImg(expr, false)
  })

  // 行内 $x$：避免匹配孤立 `$`（货币符号），左右必须紧贴非 `$`，且 expr 不含换行
  text = text.replace(
    /(^|[^$\\])\$(?!\$)([^\n$]+?)\$(?!\$)/g,
    (_match, prefix: string, raw: string) => {
      inlineCount++
      const expr = raw.trim()
      return `${prefix}${buildEquationImg(expr, true)}`
    }
  )

  return {
    md: restoreAll(text, segs),
    blockCount,
    inlineCount,
  }
}

function buildEquationImg(expr: string, inline: boolean): string {
  const src = `https://www.zhihu.com/equation?tex=${encodeURIComponent(expr)}`
  const alt = inline ? truncateAlt(expr, 32) : escapeAlt(expr)
  return `<img src="${src}" alt="${alt}" class="ee_img tr_noresize" eeimg="1">`
}

function escapeAlt(expr: string): string {
  return expr
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function truncateAlt(expr: string, max: number): string {
  const escaped = escapeAlt(expr)
  if (escaped.length <= max) return escaped
  return escaped.slice(0, max - 1) + '…'
}

// ═══════════════════════════════════════════════════════════════════
// 2. 表格 → HTML <table>
// ═══════════════════════════════════════════════════════════════════

/**
 * 将 GFM Markdown 表格转换为 HTML `<table>`。
 *
 * 工业实证（2026）：知乎现代编辑器原生消费 HTML 表格 — Markdown4Zhihu /
 * md2zhihu 等成熟工具均直接输出 `<table>`，比早年"剥离表格"的传言更可靠。
 *
 * 输入：
 *   | col1 | col2 |
 *   |---|---|
 *   | a | b |
 *
 * 输出：
 *   <table>
 *   <thead><tr><th>col1</th><th>col2</th></tr></thead>
 *   <tbody><tr><td>a</td><td>b</td></tr></tbody>
 *   </table>
 *
 * 代码围栏内的伪表格不处理。
 */
export function tableToHtmlTable(md: string): TableFallbackResult {
  const { text: protectedText, fences } = protectFences(md)

  let tableCount = 0
  const tableRegex =
    /(?:^|\n)([ \t]*\|[^\n]+\|[ \t]*\n[ \t]*\|[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)+\|[ \t]*\n(?:[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/g

  const result = protectedText.replace(tableRegex, (match, block: string) => {
    const lines = block.split('\n').filter((l) => l.trim().length > 0)
    if (lines.length < 3) return match

    const headers = splitTableRow(lines[0])
    const dataLines = lines.slice(2)

    if (headers.length === 0) return match

    tableCount++

    const headHtml =
      '<thead><tr>' +
      headers.map((h) => `<th>${escapeHtmlCell(h)}</th>`).join('') +
      '</tr></thead>'

    const bodyRows = dataLines.map((line) => {
      const cells = splitTableRow(line)
      const tds = headers.map((_h, idx) => `<td>${escapeHtmlCell(cells[idx] ?? '')}</td>`)
      return `<tr>${tds.join('')}</tr>`
    })
    const bodyHtml = `<tbody>${bodyRows.join('')}</tbody>`

    const html = `<table>\n${headHtml}\n${bodyHtml}\n</table>`

    const prefix = match.startsWith('\n') ? '\n' : ''
    // 前后空行隔离，确保 marked 不把 <table> 与上下段落黏成一段
    return `${prefix}\n${html}\n\n`
  })

  return {
    md: restoreFences(result, fences),
    tableCount,
  }
}

/**
 * @deprecated 旧名保留为别名，新代码请用 {@link tableToHtmlTable}。
 * 早期版本输出 blockquote 编号列表降级，现已改为 HTML 表格 — 名称仅作向后兼容。
 */
export const tableToBlockquoteFallback = tableToHtmlTable

function splitTableRow(line: string): string[] {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed.split('|').map((c) => c.trim())
}

function escapeHtmlCell(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ═══════════════════════════════════════════════════════════════════
// 3. 代码块语言强制
// ═══════════════════════════════════════════════════════════════════

/**
 * 为没有语言标识的围栏代码块补充默认语言。
 *
 * - ` ```\ncode\n``` ` → ` ```text\ncode\n``` `
 * - 已有语言（如 ` ```ts `）的围栏不变。
 *
 * 不修改 indented code blocks（4 空格缩进），知乎对其支持有限但本规则仅针对 fenced。
 */
export function coerceCodeLanguage(
  md: string,
  opts?: { defaultLang?: string }
): CodeLangCoerceResult {
  const lang = opts?.defaultLang ?? 'text'
  let replacedCount = 0

  // 匹配开围栏 ```（行首允许缩进），其后到行尾的 info string 必须为空（仅空白）
  // 使用多行模式匹配，确保仅替换“开围栏”，闭围栏 ``` 通常单独一行也无 info string，
  // 但闭围栏与开围栏成对出现 — 通过状态机方式扫描更安全。
  const lines = md.split('\n')
  let inFence = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fenceMatch = line.match(/^([ \t]*)```([^\n]*)$/)
    if (!fenceMatch) continue
    const indent = fenceMatch[1]
    const info = fenceMatch[2].trim()
    if (!inFence) {
      // 开围栏
      if (info.length === 0) {
        lines[i] = `${indent}\`\`\`${lang}`
        replacedCount++
      }
      inFence = true
    } else {
      // 闭围栏（info 通常为空）
      inFence = false
    }
  }

  return {
    md: lines.join('\n'),
    replacedCount,
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4. 编排器
// ═══════════════════════════════════════════════════════════════════

/**
 * 知乎 Markdown 规则编排器。按顺序执行：
 *   1. LaTeX → equation img（如启用）
 *   2. 表格 → HTML <table>（默认；'preserve' 跳过）
 *   3. 代码语言强制（如启用）
 *
 * 注意：LaTeX 步骤会保护代码区段；表格步骤同样保护代码区段；
 * 代码语言步骤不影响 LaTeX 输出（已是 HTML img）。
 */
export function zhihuMarkdownRulesTransform(
  md: string,
  options: ZhihuRuleOptions = {}
): ZhihuMarkdownRulesResult {
  const {
    convertLatexToImg = true,
    tableHandling = 'html',
    codeLangCoerce = true,
    defaultLang = 'text',
  } = options

  const stats: ZhihuRuleStats = {
    latexBlocks: 0,
    latexInlines: 0,
    tablesFallback: 0,
    codeLangFixed: 0,
  }

  let current = md

  if (convertLatexToImg) {
    const r = convertLatexToEquationImg(current)
    current = r.md
    stats.latexBlocks = r.blockCount
    stats.latexInlines = r.inlineCount
  }

  // 'fallback' 作为旧别名等价于 'html'
  if (tableHandling === 'html' || tableHandling === 'fallback') {
    const r = tableToHtmlTable(current)
    current = r.md
    stats.tablesFallback = r.tableCount
  }

  if (codeLangCoerce) {
    const r = coerceCodeLanguage(current, { defaultLang })
    current = r.md
    stats.codeLangFixed = r.replacedCount
  }

  return { md: current, stats }
}
