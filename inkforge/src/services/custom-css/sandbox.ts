import postcss, { type AtRule, type Declaration, type Rule } from 'postcss'
import {
  CUSTOM_CSS_MAX_DATA_IMAGE_BYTES,
  CUSTOM_CSS_MAX_LENGTH,
  CUSTOM_CSS_MAX_RULES,
  CUSTOM_CSS_SCOPE,
  type CustomCssIssue,
  type CustomCssIssueCode,
  type CustomCssSandboxResult,
} from './types'

const FORBIDDEN_PROTOCOL_PATTERN = /(?:javascript|vbscript)\s*:/i
const EXPRESSION_PATTERN = /expression\s*\(/i
const REMOTE_URL_PATTERN = /^(?:https?:)?\/\//i
const DATA_IMAGE_PATTERN = /^data:image\//i
const URL_FUNCTION_PATTERN = /url\(\s*(?:['"])?([^'")]*)(?:['"])?\s*\)/gi
const HOST_SELECTOR_PATTERN = /:host(?:-context)?\b/i
const FROZEN_TOKEN_NAMES = new Set([
  '--chrome-brand-red',
  '--chrome-brand-red-hover',
  '--chrome-brand-red-active',
  '--chrome-ink-900',
  '--chrome-text-primary',
  '--paper-bg',
  '--paper-brand',
  '--paper-text-primary',
])

function issue(
  code: CustomCssIssueCode,
  severity: CustomCssIssue['severity'],
  message: string,
  node?: { source?: { start?: { line?: number; column?: number } }; toString?: () => string },
): CustomCssIssue {
  return {
    code,
    severity,
    message,
    line: node?.source?.start?.line,
    column: node?.source?.start?.column,
    snippet: node?.toString?.().slice(0, 240),
  }
}

function splitSelectorList(selector: string): string[] {
  const selectors: string[] = []
  let current = ''
  let quote: string | null = null
  let parenDepth = 0
  let bracketDepth = 0
  let escaped = false

  for (const char of selector) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\') {
      current += char
      escaped = true
      continue
    }

    if (quote) {
      current += char
      if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }

    if (char === '(') {
      parenDepth += 1
      current += char
      continue
    }

    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      current += char
      continue
    }

    if (char === '[') {
      bracketDepth += 1
      current += char
      continue
    }

    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1)
      current += char
      continue
    }

    if (char === ',' && parenDepth === 0 && bracketDepth === 0) {
      selectors.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) {
    selectors.push(current.trim())
  }

  return selectors.filter(Boolean)
}

function stripRootSelector(selector: string): string {
  let next = selector.trim()

  for (;;) {
    const stripped = next
      .replace(/^html\s*>?\s*/i, '')
      .replace(/^body\s*>?\s*/i, '')
      .replace(/^:root\s*>?\s*/i, '')
      .replace(/^\*\s*/i, '')
      .trim()

    if (stripped === next) {
      return next
    }

    next = stripped
  }
}

function scopeSingleSelector(selector: string): { selector: string; rewritten: boolean } {
  const trimmed = selector.trim()
  if (!trimmed) {
    return { selector: CUSTOM_CSS_SCOPE, rewritten: true }
  }

  if (trimmed === CUSTOM_CSS_SCOPE || trimmed.startsWith(`${CUSTOM_CSS_SCOPE} `) || trimmed.startsWith(`${CUSTOM_CSS_SCOPE}:`) || trimmed.startsWith(`${CUSTOM_CSS_SCOPE}[`)) {
    return { selector: trimmed, rewritten: false }
  }

  if (trimmed.startsWith(`:where(${CUSTOM_CSS_SCOPE})`)) {
    return { selector: trimmed, rewritten: false }
  }

  const strippedRoot = stripRootSelector(trimmed)
  if (!strippedRoot) {
    return { selector: CUSTOM_CSS_SCOPE, rewritten: true }
  }

  if (strippedRoot === CUSTOM_CSS_SCOPE || strippedRoot.startsWith(`${CUSTOM_CSS_SCOPE} `) || strippedRoot.startsWith(`${CUSTOM_CSS_SCOPE}:`) || strippedRoot.startsWith(`${CUSTOM_CSS_SCOPE}[`)) {
    return { selector: strippedRoot, rewritten: strippedRoot !== trimmed }
  }

  if (strippedRoot.startsWith('>') || strippedRoot.startsWith('+') || strippedRoot.startsWith('~')) {
    return { selector: `${CUSTOM_CSS_SCOPE} ${strippedRoot}`, rewritten: true }
  }

  return { selector: `${CUSTOM_CSS_SCOPE} ${strippedRoot}`, rewritten: true }
}

export function scopeCustomCssSelector(selector: string): { selector: string; rewritten: boolean } {
  const scoped = splitSelectorList(selector).map(scopeSingleSelector)
  return {
    selector: scoped.map(item => item.selector).join(', '),
    rewritten: scoped.some(item => item.rewritten),
  }
}

function isPostCssNode(value: unknown): value is { type: string; parent?: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value
}

function isInsideKeyframes(rule: Rule): boolean {
  let parent: unknown = rule.parent
  while (isPostCssNode(parent)) {
    if (parent.type === 'atrule') {
      const atRule = parent as AtRule
      if (atRule.name.toLowerCase().endsWith('keyframes')) {
        return true
      }
    }
    parent = parent.parent
  }
  return false
}

function estimateDataUrlBytes(url: string): number {
  const commaIndex = url.indexOf(',')
  if (commaIndex === -1) {
    return url.length
  }

  const metadata = url.slice(0, commaIndex).toLowerCase()
  const payload = url.slice(commaIndex + 1)
  if (metadata.endsWith(';base64')) {
    return Math.floor(payload.replace(/\s/g, '').length * 0.75)
  }

  try {
    return decodeURIComponent(payload).length
  } catch {
    return payload.length
  }
}

function validateUrls(value: string, issues: CustomCssIssue[], decl: Declaration): void {
  URL_FUNCTION_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = URL_FUNCTION_PATTERN.exec(value)) !== null) {
    const rawUrl = match[1]?.trim() ?? ''
    const normalizedUrl = rawUrl.replace(/^['"]|['"]$/g, '').trim()
    if (!normalizedUrl) {
      continue
    }

    if (FORBIDDEN_PROTOCOL_PATTERN.test(normalizedUrl)) {
      issues.push(issue('forbidden-active-protocol', 'error', '禁止在 CustomCSS 中使用主动内容协议。', decl))
      continue
    }

    if (REMOTE_URL_PATTERN.test(normalizedUrl)) {
      issues.push(issue('forbidden-remote-url', 'error', '禁止加载远程 CSS 资源或远程图片资源。', decl))
      continue
    }

    if (normalizedUrl.toLowerCase().startsWith('data:')) {
      if (!DATA_IMAGE_PATTERN.test(normalizedUrl)) {
        issues.push(issue('forbidden-data-url', 'error', '仅允许 data:image/... 内联图片资源。', decl))
        continue
      }

      if (estimateDataUrlBytes(normalizedUrl) > CUSTOM_CSS_MAX_DATA_IMAGE_BYTES) {
        issues.push(issue('forbidden-data-url', 'error', 'data:image 内联资源超过 50KB 上限。', decl))
      }
    }
  }
}

function validateDeclaration(decl: Declaration, issues: CustomCssIssue[], frozenTokens: Set<string>): void {
  const prop = decl.prop.trim().toLowerCase()
  const value = decl.value.trim()
  const normalizedValue = value.toLowerCase()

  if (decl.important) {
    issues.push(issue('forbidden-important', 'error', 'CustomCSS 禁止使用 !important。', decl))
  }

  if (prop === 'behavior' || prop.includes('behavior')) {
    issues.push(issue('forbidden-behavior', 'error', 'CustomCSS 禁止 IE behavior 属性。', decl))
  }

  if (FORBIDDEN_PROTOCOL_PATTERN.test(value) || EXPRESSION_PATTERN.test(value) || normalizedValue.includes('-moz-binding')) {
    issues.push(issue('forbidden-active-protocol', 'error', 'CustomCSS 禁止主动内容协议或表达式。', decl))
  }

  validateUrls(value, issues, decl)

  if (FROZEN_TOKEN_NAMES.has(prop) || prop.startsWith('--z-')) {
    frozenTokens.add(prop)
    issues.push(issue('frozen-token-override', 'warning', `覆盖冻结视觉 token：${prop}。`, decl))
  }

  if (prop === 'position' && normalizedValue === 'fixed') {
    issues.push(issue('fixed-position-warning', 'warning', 'position: fixed 可能破坏纸张布局。', decl))
  }

  if (prop === 'contain' && normalizedValue.includes('strict')) {
    issues.push(issue('contain-strict-warning', 'warning', 'contain: strict 可能影响编辑器布局树。', decl))
  }
}

function selectorDepth(selector: string): number {
  return selector
    .split(/\s+|>|\+|~/)
    .map(part => part.trim())
    .filter(Boolean)
    .length
}

function validateAndScopeRule(rule: Rule, issues: CustomCssIssue[]): boolean {
  if (isInsideKeyframes(rule)) {
    return false
  }

  if (HOST_SELECTOR_PATTERN.test(rule.selector)) {
    issues.push(issue('forbidden-host-selector', 'error', 'CustomCSS 禁止使用 :host 或 :host-context 选择器。', rule))
  }

  const selectors = splitSelectorList(rule.selector)
  const maxDepth = Math.max(0, ...selectors.map(selectorDepth))
  if (maxDepth > 5) {
    issues.push(issue('selector-specificity-warning', 'warning', '选择器层级超过 5 级，后续维护风险较高。', rule))
  }

  const scoped = scopeCustomCssSelector(rule.selector)
  if (scoped.rewritten) {
    issues.push(issue('scope-rewrite', 'info', '选择器已自动限定到 .editor-content。', rule))
  }
  rule.selector = scoped.selector
  return true
}

function rejectUnsupportedAtRule(atRule: AtRule, issues: CustomCssIssue[]): void {
  const name = atRule.name.toLowerCase()
  if (name === 'import') {
    issues.push(issue('forbidden-import', 'error', 'CustomCSS 禁止 @import 远程导入。', atRule))
  }
}

function buildResult(sourceCss: string, css: string, ruleCount: number, issues: CustomCssIssue[], frozenTokens: string[]): CustomCssSandboxResult {
  const errors = issues.filter(item => item.severity === 'error')
  const warnings = issues.filter(item => item.severity === 'warning')
  return {
    ok: errors.length === 0,
    sourceCss,
    css: errors.length === 0 ? css : '',
    ruleCount,
    issues,
    errors,
    warnings,
    frozenTokens,
  }
}

export function sandboxCustomCss(sourceCss: string): CustomCssSandboxResult {
  const normalizedSource = typeof sourceCss === 'string' ? sourceCss : ''
  const trimmed = normalizedSource.trim()
  const issues: CustomCssIssue[] = []
  const frozenTokens = new Set<string>()

  if (!trimmed) {
    return buildResult(normalizedSource, '', 0, [], [])
  }

  if (normalizedSource.length > CUSTOM_CSS_MAX_LENGTH) {
    issues.push(issue('css-too-long', 'error', `CustomCSS 长度不能超过 ${CUSTOM_CSS_MAX_LENGTH} 字符。`))
  }

  let root: postcss.Root
  try {
    root = postcss.parse(normalizedSource, { from: undefined })
  } catch (error) {
    issues.push({
      code: 'css-parse-error',
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
    return buildResult(normalizedSource, '', 0, issues, [])
  }

  root.walkAtRules(atRule => rejectUnsupportedAtRule(atRule, issues))
  root.walkDecls(decl => validateDeclaration(decl, issues, frozenTokens))

  let ruleCount = 0
  root.walkRules(rule => {
    const counted = validateAndScopeRule(rule, issues)
    if (counted) {
      ruleCount += 1
    }
  })

  if (ruleCount > CUSTOM_CSS_MAX_RULES) {
    issues.push(issue('css-too-many-rules', 'error', `CustomCSS 规则数量不能超过 ${CUSTOM_CSS_MAX_RULES} 条。`))
  }

  return buildResult(normalizedSource, root.toString(), ruleCount, issues, Array.from(frozenTokens).sort())
}

export function summarizeCustomCssIssues(issues: readonly CustomCssIssue[]): string {
  if (issues.length === 0) {
    return '未发现问题'
  }

  return issues.map(item => {
    const position = item.line ? `L${item.line}${item.column ? `:${item.column}` : ''} ` : ''
    return `${position}${item.message}`
  }).join('\n')
}
