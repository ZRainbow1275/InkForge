/**
 * InkforgeAST — 平台中性 AST 适配层
 *
 * 在 marked tokens 之上构建一棵规范化树，供所有 platform 引擎消费：
 *   1. 类型统一为 InkforgeNodeType（'code-block' / 'list-item' / 'thematic-break' 等横线命名）
 *   2. 预处理 LaTeX 块/行内（$$...$$ / $...$），代码区段内的 `$` 不识别
 *   3. 预处理 GFM alert（> [!NOTE] 等）
 *   4. 输出 InkforgeMeta（latex 计数、code-block 行数、heading 列表、image 列表、mermaid 计数、word count）
 *
 * 设计原则：
 *   - 不引入新依赖，仅复用 marked 词法。
 *   - LaTeX/alert 走 Markdown 源预处理 + 占位符注入（参考 zhihu-rules 保护代码段模式）。
 *   - 节点字段保持松散，避免类型爆炸，但全程 strict。
 */
'use strict'

import { marked } from 'marked'
import type { Token, Tokens } from 'marked'

// ═══════════════════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════════════════

export type InkforgeNodeType =
  | 'root'
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'list-item'
  | 'blockquote'
  | 'code-block'
  | 'inline-code'
  | 'image'
  | 'link'
  | 'emphasis'
  | 'strong'
  | 'text'
  | 'thematic-break'
  | 'table'
  | 'table-row'
  | 'table-cell'
  | 'html'
  | 'latex-block'
  | 'latex-inline'
  | 'alert-block'

export type AlertKind = 'note' | 'tip' | 'important' | 'warning' | 'caution'

export interface InkforgeNode {
  type: InkforgeNodeType
  children?: InkforgeNode[]
  raw?: string
  // type-specific
  depth?: number
  ordered?: boolean
  start?: number
  value?: string
  lang?: string
  url?: string
  alt?: string
  title?: string
  align?: ('left' | 'center' | 'right' | null)[]
  header?: boolean
  latex?: string
  alertKind?: AlertKind
}

export interface InkforgeMeta {
  latexBlocks: number
  latexInlines: number
  codeBlocks: { lang: string | null; lineCount: number }[]
  headings: { depth: number; text: string }[]
  images: { url: string; alt: string }[]
  mermaidBlocks: number
  wordCount: number
}

export interface InkforgeASTResult {
  root: InkforgeNode
  meta: InkforgeMeta
}

export interface ASTVisitor {
  enter?: (node: InkforgeNode, parent: InkforgeNode | null) => void
  leave?: (node: InkforgeNode, parent: InkforgeNode | null) => void
}

// ═══════════════════════════════════════════════════════════════════
// LaTeX 源预处理：保护代码区段，提取 $$...$$ 与 $...$ 为占位符
// ═══════════════════════════════════════════════════════════════════

const AST_TOKEN_BOUNDARY = String.fromCharCode(0)
const LATEX_BLOCK_TOKEN = (i: number) => `${AST_TOKEN_BOUNDARY}IFAST_LATEX_B_${i}${AST_TOKEN_BOUNDARY}`
const LATEX_INLINE_TOKEN = (i: number) => `${AST_TOKEN_BOUNDARY}IFAST_LATEX_I_${i}${AST_TOKEN_BOUNDARY}`
const FENCE_PROTECT_TOKEN = (i: number) => `${AST_TOKEN_BOUNDARY}IFAST_FENCE_${i}${AST_TOKEN_BOUNDARY}`
const INLINECODE_PROTECT_TOKEN = (i: number) => `${AST_TOKEN_BOUNDARY}IFAST_INLINE_${i}${AST_TOKEN_BOUNDARY}`
const LATEX_BLOCK_TOKEN_RE = new RegExp(`${AST_TOKEN_BOUNDARY}IFAST_LATEX_B_(\\d+)${AST_TOKEN_BOUNDARY}`, 'g')
const LATEX_INLINE_TOKEN_RE = new RegExp(`${AST_TOKEN_BOUNDARY}IFAST_LATEX_I_(\\d+)${AST_TOKEN_BOUNDARY}`, 'g')
const FENCE_PROTECT_TOKEN_RE = new RegExp(`${AST_TOKEN_BOUNDARY}IFAST_FENCE_(\\d+)${AST_TOKEN_BOUNDARY}`, 'g')
const INLINECODE_PROTECT_TOKEN_RE = new RegExp(`${AST_TOKEN_BOUNDARY}IFAST_INLINE_(\\d+)${AST_TOKEN_BOUNDARY}`, 'g')
const LATEX_ANY_TOKEN_RE = new RegExp(`${AST_TOKEN_BOUNDARY}IFAST_LATEX_(B|I)_(\\d+)${AST_TOKEN_BOUNDARY}`, 'g')

interface LatexExtraction {
  md: string
  blocks: string[]
  inlines: string[]
}

function extractLatex(md: string): LatexExtraction {
  // 1) 保护围栏代码块
  const fences: string[] = []
  let s = md.replace(/```[\s\S]*?```/g, (m) => {
    const i = fences.length
    fences.push(m)
    return FENCE_PROTECT_TOKEN(i)
  })
  // 2) 保护行内代码
  const inlineCodes: string[] = []
  s = s.replace(/`[^`\n]+`/g, (m) => {
    const i = inlineCodes.length
    inlineCodes.push(m)
    return INLINECODE_PROTECT_TOKEN(i)
  })

  // 3) 提取块级 LaTeX
  const blocks: string[] = []
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, raw: string) => {
    const i = blocks.length
    blocks.push(raw.trim())
    return LATEX_BLOCK_TOKEN(i)
  })

  // 4) 提取行内 LaTeX
  const inlines: string[] = []
  s = s.replace(
    /(^|[^$\\])\$(?!\$)([^\n$]+?)\$(?!\$)/g,
    (_m, prefix: string, raw: string) => {
      const i = inlines.length
      inlines.push(raw.trim())
      return `${prefix}${LATEX_INLINE_TOKEN(i)}`
    }
  )

  // 5) 还原代码段
  s = s.replace(INLINECODE_PROTECT_TOKEN_RE, (_m, idx: string) => {
    return inlineCodes[parseInt(idx, 10)] ?? ''
  })
  s = s.replace(FENCE_PROTECT_TOKEN_RE, (_m, idx: string) => {
    return fences[parseInt(idx, 10)] ?? ''
  })

  return { md: s, blocks, inlines }
}

// ═══════════════════════════════════════════════════════════════════
// GFM Alert 预检测：> [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION]
// ═══════════════════════════════════════════════════════════════════

const ALERT_KIND_RE = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i

function detectAlertKind(blockquote: Tokens.Blockquote): AlertKind | null {
  const firstPara = blockquote.tokens.find((t) => t.type === 'paragraph')
  if (!firstPara) return null
  const para = firstPara as Tokens.Paragraph
  const firstLine = para.text.split('\n')[0]
  const m = firstLine.match(ALERT_KIND_RE)
  if (!m) return null
  return m[1].toLowerCase() as AlertKind
}

// ═══════════════════════════════════════════════════════════════════
// 占位符 → 节点
// ═══════════════════════════════════════════════════════════════════

const LATEX_BLOCK_RE = LATEX_BLOCK_TOKEN_RE
const LATEX_INLINE_RE = LATEX_INLINE_TOKEN_RE

function makeText(value: string): InkforgeNode {
  return { type: 'text', value }
}

function expandLatexInText(text: string, ctx: BuildContext): InkforgeNode[] {
  // 把 text 中的 latex 占位拆成多个节点（文本 / latex-block / latex-inline）
  const out: InkforgeNode[] = []
  let cursor = 0
  // 使用统一正则同时匹配 block 与 inline
  const combined = LATEX_ANY_TOKEN_RE
  combined.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = combined.exec(text)) !== null) {
    if (m.index > cursor) {
      const slice = text.slice(cursor, m.index)
      if (slice.length > 0) out.push(makeText(slice))
    }
    const isBlock = m[1] === 'B'
    const idx = parseInt(m[2], 10)
    if (isBlock) {
      const tex = ctx.latexBlocks[idx] ?? ''
      out.push({ type: 'latex-block', latex: tex, raw: `$$${tex}$$` })
    } else {
      const tex = ctx.latexInlines[idx] ?? ''
      out.push({ type: 'latex-inline', latex: tex, raw: `$${tex}$` })
    }
    cursor = m.index + m[0].length
  }
  if (cursor < text.length) {
    const tail = text.slice(cursor)
    if (tail.length > 0) out.push(makeText(tail))
  }
  return out
}

function stripLatexInString(s: string, ctx: BuildContext): string {
  // 把占位符替换为对应 raw（用于 heading.text 等纯字符串字段）
  let out = s.replace(LATEX_BLOCK_RE, (_m, idx: string) => {
    const tex = ctx.latexBlocks[parseInt(idx, 10)] ?? ''
    return `$$${tex}$$`
  })
  out = out.replace(LATEX_INLINE_RE, (_m, idx: string) => {
    const tex = ctx.latexInlines[parseInt(idx, 10)] ?? ''
    return `$${tex}$`
  })
  return out
}

// ═══════════════════════════════════════════════════════════════════
// marked Token → InkforgeNode
// ═══════════════════════════════════════════════════════════════════

interface BuildContext {
  latexBlocks: string[]
  latexInlines: string[]
  meta: InkforgeMeta
}

function tokenToNode(tok: Token, ctx: BuildContext): InkforgeNode | null {
  switch (tok.type) {
    case 'space':
      return null
    case 'paragraph': {
      const t = tok as Tokens.Paragraph
      return {
        type: 'paragraph',
        raw: t.raw,
        children: tokensToNodes(t.tokens ?? [], ctx),
      }
    }
    case 'heading': {
      const t = tok as Tokens.Heading
      const text = stripLatexInString(t.text, ctx)
      ctx.meta.headings.push({ depth: t.depth, text })
      return {
        type: 'heading',
        depth: t.depth,
        raw: t.raw,
        children: tokensToNodes(t.tokens ?? [], ctx),
      }
    }
    case 'blockquote': {
      const t = tok as Tokens.Blockquote
      const kind = detectAlertKind(t)
      if (kind) {
        // 去掉 [!KIND] 行（位于第一个 paragraph 的首行）
        const cloned = t.tokens.map((x) => x)
        const firstParaIdx = cloned.findIndex((x) => x.type === 'paragraph')
        if (firstParaIdx >= 0) {
          const orig = cloned[firstParaIdx] as Tokens.Paragraph
          const lines = orig.text.split('\n')
          const rest = lines.slice(1).join('\n')
          if (rest.trim().length === 0) {
            cloned.splice(firstParaIdx, 1)
          } else {
            // 重新走 lexer 解析剩余正文
            const subTokens = marked.lexer(rest, { gfm: true })
            cloned.splice(firstParaIdx, 1, ...subTokens)
          }
        }
        return {
          type: 'alert-block',
          alertKind: kind,
          raw: t.raw,
          children: tokensToNodes(cloned, ctx),
        }
      }
      return {
        type: 'blockquote',
        raw: t.raw,
        children: tokensToNodes(t.tokens, ctx),
      }
    }
    case 'list': {
      const t = tok as Tokens.List
      return {
        type: 'list',
        ordered: t.ordered,
        start: typeof t.start === 'number' ? t.start : undefined,
        raw: t.raw,
        children: t.items.map((it) => tokenToNode(it, ctx)).filter(isNode),
      }
    }
    case 'list_item': {
      const t = tok as Tokens.ListItem
      return {
        type: 'list-item',
        raw: t.raw,
        children: tokensToNodes(t.tokens, ctx),
      }
    }
    case 'code': {
      const t = tok as Tokens.Code
      const lang = (t.lang ?? '').trim() || null
      const value = t.text
      const lineCount = value.length === 0 ? 0 : value.split('\n').length
      ctx.meta.codeBlocks.push({ lang, lineCount })
      if (lang && lang.toLowerCase() === 'mermaid') ctx.meta.mermaidBlocks++
      return {
        type: 'code-block',
        lang: lang ?? undefined,
        value,
        raw: t.raw,
      }
    }
    case 'hr':
      return { type: 'thematic-break', raw: (tok as Tokens.Hr).raw }
    case 'html': {
      const t = tok as Tokens.HTML
      return { type: 'html', value: t.text, raw: t.raw }
    }
    case 'table': {
      const t = tok as Tokens.Table
      const headerRow: InkforgeNode = {
        type: 'table-row',
        header: true,
        children: t.header.map((cell) => tableCellNode(cell, ctx, true)),
      }
      const bodyRows: InkforgeNode[] = t.rows.map((row) => ({
        type: 'table-row',
        header: false,
        children: row.map((cell) => tableCellNode(cell, ctx, false)),
      }))
      return {
        type: 'table',
        align: t.align,
        raw: t.raw,
        children: [headerRow, ...bodyRows],
      }
    }
    case 'text': {
      const t = tok as Tokens.Text
      if (t.tokens && t.tokens.length > 0) {
        // 行内场景下 text 可包含子 tokens（escape/em/etc.）
        return {
          type: 'text',
          value: t.text,
          children: tokensToNodes(t.tokens, ctx),
        }
      }
      // 纯文本：可能包含 latex 占位符
      const expanded = expandLatexInText(t.text, ctx)
      if (expanded.length === 1 && expanded[0].type === 'text') return expanded[0]
      // 如果包含 latex，就以 text 作为容器（children 已展开）
      // 这里返回 null 触发上层用 children 展开
      return null
    }
    case 'escape': {
      const t = tok as Tokens.Escape
      return makeText(t.text)
    }
    case 'em': {
      const t = tok as Tokens.Em
      return {
        type: 'emphasis',
        raw: t.raw,
        children: tokensToNodes(t.tokens, ctx),
      }
    }
    case 'strong': {
      const t = tok as Tokens.Strong
      return {
        type: 'strong',
        raw: t.raw,
        children: tokensToNodes(t.tokens, ctx),
      }
    }
    case 'codespan': {
      const t = tok as Tokens.Codespan
      return { type: 'inline-code', value: t.text, raw: t.raw }
    }
    case 'link': {
      const t = tok as Tokens.Link
      return {
        type: 'link',
        url: t.href,
        title: t.title ?? undefined,
        raw: t.raw,
        children: tokensToNodes(t.tokens, ctx),
      }
    }
    case 'image': {
      const t = tok as Tokens.Image
      const alt = t.text ?? ''
      const url = t.href
      ctx.meta.images.push({ url, alt })
      return {
        type: 'image',
        url,
        alt,
        title: t.title ?? undefined,
        raw: t.raw,
      }
    }
    case 'br':
      return makeText('\n')
    case 'def':
      // 引用定义：不参与渲染树
      return null
    case 'del': {
      const t = tok as Tokens.Del
      // 中性 AST 暂不区分 del，降级为 emphasis
      return {
        type: 'emphasis',
        raw: t.raw,
        children: tokensToNodes(t.tokens, ctx),
      }
    }
    default:
      return null
  }
}

function isNode(n: InkforgeNode | null): n is InkforgeNode {
  return n !== null
}

function tokensToNodes(tokens: Token[], ctx: BuildContext): InkforgeNode[] {
  const out: InkforgeNode[] = []
  for (const tok of tokens) {
    if (tok.type === 'text') {
      const t = tok as Tokens.Text
      if (!t.tokens || t.tokens.length === 0) {
        // 纯文本，可能含 latex 占位符 → 展开为多节点
        const expanded = expandLatexInText(t.text, ctx)
        for (const n of expanded) out.push(n)
        continue
      }
    }
    const n = tokenToNode(tok, ctx)
    if (n) out.push(n)
  }
  return out
}

function tableCellNode(
  cell: Tokens.TableCell,
  ctx: BuildContext,
  header: boolean
): InkforgeNode {
  return {
    type: 'table-cell',
    header,
    children: tokensToNodes(cell.tokens, ctx),
  }
}

// ═══════════════════════════════════════════════════════════════════
// 公共 API
// ═══════════════════════════════════════════════════════════════════

export function parseToAST(md: string): InkforgeASTResult {
  const extracted = extractLatex(md)
  const tokens = marked.lexer(extracted.md, { gfm: true })

  const meta: InkforgeMeta = {
    latexBlocks: extracted.blocks.length,
    latexInlines: extracted.inlines.length,
    codeBlocks: [],
    headings: [],
    images: [],
    mermaidBlocks: 0,
    wordCount: 0,
  }

  const ctx: BuildContext = {
    latexBlocks: extracted.blocks,
    latexInlines: extracted.inlines,
    meta,
  }

  const children = tokensToNodes(tokens, ctx)
  const root: InkforgeNode = { type: 'root', children }

  meta.wordCount = countWords(serializeText(root))

  return { root, meta }
}

export function walkAST(node: InkforgeNode, visitor: ASTVisitor): void {
  walkInternal(node, null, visitor)
}

function walkInternal(
  node: InkforgeNode,
  parent: InkforgeNode | null,
  visitor: ASTVisitor
): void {
  visitor.enter?.(node, parent)
  if (node.children) {
    for (const child of node.children) {
      walkInternal(child, node, visitor)
    }
  }
  visitor.leave?.(node, parent)
}

export function findAll(root: InkforgeNode, type: InkforgeNodeType): InkforgeNode[] {
  const out: InkforgeNode[] = []
  walkAST(root, {
    enter: (n) => {
      if (n.type === type) out.push(n)
    },
  })
  return out
}

export function serializeText(root: InkforgeNode): string {
  // 按前序遍历收集 text/inline-code/code-block.value 与块间分隔
  const parts: string[] = []
  walkAST(root, {
    enter: (n) => {
      switch (n.type) {
        case 'text':
          if (typeof n.value === 'string') parts.push(n.value)
          break
        case 'inline-code':
          if (typeof n.value === 'string') parts.push(n.value)
          break
        case 'code-block':
          if (typeof n.value === 'string') {
            parts.push('\n')
            parts.push(n.value)
            parts.push('\n')
          }
          break
        case 'image':
          if (typeof n.alt === 'string' && n.alt.length > 0) parts.push(n.alt)
          break
        case 'latex-block':
        case 'latex-inline':
          if (typeof n.latex === 'string') parts.push(n.latex)
          break
        default:
          break
      }
    },
    leave: (n) => {
      // 块级元素后追加换行，便于 word-count 与预览
      if (
        n.type === 'paragraph' ||
        n.type === 'heading' ||
        n.type === 'list-item' ||
        n.type === 'blockquote' ||
        n.type === 'alert-block' ||
        n.type === 'thematic-break'
      ) {
        parts.push('\n')
      }
    },
  })
  return parts.join('')
}

function countWords(text: string): number {
  if (!text) return 0
  // CJK 按字符计；ASCII 按 whitespace 分词
  const cjkMatches = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)
  const cjkCount = cjkMatches ? cjkMatches.length : 0
  const asciiText = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ')
  const asciiWords = asciiText
    .split(/\s+/)
    .filter((w) => w.length > 0 && /[A-Za-z0-9]/.test(w))
  return cjkCount + asciiWords.length
}
