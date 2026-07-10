import {
  CUSTOM_CSS_ERROR_THRESHOLD,
  CUSTOM_CSS_ERROR_WINDOW_MS,
  CUSTOM_CSS_STYLE_ID,
  type CustomCssErrorLogEntry,
  type CustomCssErrorType,
  type CustomCssIssue,
  type CustomCssSandboxResult,
  type CustomCssSettings,
  type CustomCssSuspendedReason,
} from './types'
import { sandboxCustomCss } from './sandbox'

export type CustomCssRuntimeStatus = 'applied' | 'disabled' | 'rejected' | 'suspended' | 'skipped'

export interface CustomCssRuntimeResult {
  status: CustomCssRuntimeStatus
  message: string
  sandboxResult: CustomCssSandboxResult | null
  styleId: string
}

export interface CustomCssRuntimeOptions {
  documentRef?: Document
  now?: number
  safeMode?: boolean
}

export interface CustomCssErrorLogInput {
  type: CustomCssErrorType
  message: string
  snippet?: string
}

const adoptedCustomCssSheets = new WeakMap<Document, CSSStyleSheet>()

function runtimeDocument(documentRef?: Document): Document | null {
  if (documentRef) {
    return documentRef
  }

  return typeof document === 'undefined' ? null : document
}

function runtimeNow(now?: number): number {
  return typeof now === 'number' && Number.isFinite(now) ? now : Date.now()
}

function removeAdoptedCustomCssSheet(doc: Document | null): void {
  if (!doc || !('adoptedStyleSheets' in doc)) {
    return
  }

  const sheet = adoptedCustomCssSheets.get(doc)
  if (!sheet) {
    return
  }

  doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter(item => item !== sheet)
  adoptedCustomCssSheets.delete(doc)
}

export function removeCustomCssStyle(documentRef?: Document): boolean {
  const doc = runtimeDocument(documentRef)
  const style = doc?.getElementById(CUSTOM_CSS_STYLE_ID)
  removeAdoptedCustomCssSheet(doc)
  if (!style) {
    return false
  }

  style.remove()
  return true
}

function countStyleSheetRules(sheet: CSSStyleSheet | null): number {
  if (!sheet) {
    return 0
  }

  try {
    return sheet.cssRules.length
  } catch {
    return 0
  }
}

function splitCssRulesForRuntime(css: string): string[] {
  const rules: string[] = []
  let current = ''
  let quote: string | null = null
  let escaped = false
  let braceDepth = 0
  let inComment = false

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index]
    const next = css[index + 1]

    if (inComment) {
      current += char
      if (char === '*' && next === '/') {
        current += next
        index += 1
        inComment = false
      }
      continue
    }

    if (!quote && char === '/' && next === '*') {
      current += char + next
      index += 1
      inComment = true
      continue
    }

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

    if (char === '{') {
      braceDepth += 1
      current += char
      continue
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1)
      current += char
      if (braceDepth === 0 && current.trim()) {
        rules.push(current.trim())
        current = ''
      }
      continue
    }

    current += char
  }

  if (current.trim()) {
    rules.push(current.trim())
  }

  return rules
}

function clearStyleSheetRules(sheet: CSSStyleSheet): boolean {
  try {
    while (sheet.cssRules.length > 0) {
      sheet.deleteRule(sheet.cssRules.length - 1)
    }
    return true
  } catch {
    return false
  }
}

function insertStyleSheetRules(sheet: CSSStyleSheet, css: string): boolean {
  for (const rule of splitCssRulesForRuntime(css)) {
    try {
      sheet.insertRule(rule, sheet.cssRules.length)
    } catch {
      return countStyleSheetRules(sheet) > 0
    }
  }

  return countStyleSheetRules(sheet) > 0
}

function replaceStyleSheetRules(sheet: CSSStyleSheet, css: string, forceRefresh = false): boolean {
  let usedReplaceSync = false

  try {
    const replaceSyncCandidate: unknown = sheet.replaceSync
    if (typeof replaceSyncCandidate === 'function') {
      replaceSyncCandidate.call(sheet, css)
      usedReplaceSync = true
    }
  } catch {
    /* WebView2/Tauri linked style sheets can reject replaceSync; insertRule below is the compatibility path. */
  }

  if ((usedReplaceSync || !forceRefresh) && countStyleSheetRules(sheet) > 0) {
    return true
  }

  if (!clearStyleSheetRules(sheet)) {
    return false
  }

  return insertStyleSheetRules(sheet, css)
}

function ensureCustomCssSheetRules(style: HTMLStyleElement, css: string, forceRefresh: boolean): boolean {
  if (!css.trim()) {
    return true
  }

  if (!('sheet' in style)) {
    return true
  }

  const sheet = style.sheet
  if (!sheet) {
    return false
  }

  if (!forceRefresh && countStyleSheetRules(sheet) > 0) {
    return true
  }

  return replaceStyleSheetRules(sheet, css, forceRefresh)
}

function ensureAdoptedCustomCssSheet(doc: Document, css: string): boolean {
  if (!css.trim() || !('adoptedStyleSheets' in doc)) {
    return false
  }

  const StyleSheetConstructor = doc.defaultView?.CSSStyleSheet
  if (typeof StyleSheetConstructor !== 'function') {
    return false
  }

  let sheet = adoptedCustomCssSheets.get(doc)
  if (!sheet) {
    sheet = new StyleSheetConstructor()
    adoptedCustomCssSheets.set(doc, sheet)
  }

  if (!replaceStyleSheetRules(sheet, css, true)) {
    return false
  }

  if (!doc.adoptedStyleSheets.includes(sheet)) {
    doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet]
  }

  return countStyleSheetRules(sheet) > 0
}

export function injectCustomCssStyle(css: string, documentRef?: Document): boolean {
  const doc = runtimeDocument(documentRef)
  if (!doc?.head) {
    return false
  }

  let style = doc.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = CUSTOM_CSS_STYLE_ID
    style.type = 'text/css'
    doc.head.appendChild(style)
  } else if (style.parentElement !== doc.head) {
    style.remove()
    doc.head.appendChild(style)
  } else if (style.nextSibling) {
    style.remove()
    doc.head.appendChild(style)
  }

  const styleTextChanged = style.textContent !== css
  if (styleTextChanged) {
    style.textContent = css
  }

  if (ensureCustomCssSheetRules(style, css, styleTextChanged)) {
    removeAdoptedCustomCssSheet(doc)
    return true
  }

  return ensureAdoptedCustomCssSheet(doc, css)
}

export function detectCustomCssSafeModeFromStorage(storage?: Storage): boolean {
  const targetStorage = storage ?? (typeof window === 'undefined' ? null : window.localStorage)
  if (!targetStorage) {
    return false
  }

  try {
    for (let index = 0; index < targetStorage.length; index += 1) {
      const key = targetStorage.key(index)
      if (!key?.startsWith('inkforge.crashCount.')) {
        continue
      }

      const value = Number(targetStorage.getItem(key) ?? '0')
      if (Number.isFinite(value) && value >= CUSTOM_CSS_ERROR_THRESHOLD) {
        return true
      }
    }
  } catch {
    return false
  }

  return false
}

export function createCustomCssErrorLogEntry(input: CustomCssErrorLogInput, now = Date.now()): CustomCssErrorLogEntry {
  return {
    id: `custom-css-${now}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: new Date(now).toISOString(),
    type: input.type,
    message: input.message,
    snippet: input.snippet,
  }
}

export function appendCustomCssErrorLog(
  existing: readonly CustomCssErrorLogEntry[],
  input: CustomCssErrorLogInput,
  now = Date.now(),
): CustomCssErrorLogEntry[] {
  return [createCustomCssErrorLogEntry(input, now), ...existing].slice(0, 20)
}

export function countRecentCustomCssErrors(
  errorLog: readonly CustomCssErrorLogEntry[],
  now = Date.now(),
  windowMs = CUSTOM_CSS_ERROR_WINDOW_MS,
): number {
  return errorLog.filter(entry => {
    const timestamp = Date.parse(entry.occurredAt)
    return Number.isFinite(timestamp) && now - timestamp <= windowMs
  }).length
}

export function shouldSuspendForCustomCssErrors(
  errorLog: readonly CustomCssErrorLogEntry[],
  now = Date.now(),
): boolean {
  return countRecentCustomCssErrors(errorLog, now) >= CUSTOM_CSS_ERROR_THRESHOLD
}

export function firstCustomCssErrorMessage(issues: readonly CustomCssIssue[]): string {
  return issues[0]?.message ?? 'CustomCSS 校验失败。'
}

export function applyCustomCssRuntime(
  settings: CustomCssSettings,
  options: CustomCssRuntimeOptions = {},
): CustomCssRuntimeResult {
  const safeMode = options.safeMode ?? detectCustomCssSafeModeFromStorage()
  if (safeMode || settings.suspendedReason === 'safe-mode') {
    removeCustomCssStyle(options.documentRef)
    return {
      status: 'suspended',
      message: 'SafeMode 已启用，CustomCSS 已禁用。',
      sandboxResult: null,
      styleId: CUSTOM_CSS_STYLE_ID,
    }
  }

  if (!settings.enabled || settings.suspendedReason) {
    removeCustomCssStyle(options.documentRef)
    return {
      status: 'disabled',
      message: settings.suspendedReason ? `CustomCSS 已暂停：${settings.suspendedReason}` : 'CustomCSS 未启用。',
      sandboxResult: null,
      styleId: CUSTOM_CSS_STYLE_ID,
    }
  }

  const sourceCss = settings.published.trim() ? settings.published : settings.draft
  if (!sourceCss.trim()) {
    removeCustomCssStyle(options.documentRef)
    return {
      status: 'disabled',
      message: 'CustomCSS 内容为空。',
      sandboxResult: null,
      styleId: CUSTOM_CSS_STYLE_ID,
    }
  }

  const sandboxResult = sandboxCustomCss(sourceCss)
  if (!sandboxResult.ok) {
    return {
      status: 'rejected',
      message: firstCustomCssErrorMessage(sandboxResult.errors),
      sandboxResult,
      styleId: CUSTOM_CSS_STYLE_ID,
    }
  }

  const injected = injectCustomCssStyle(sandboxResult.css, options.documentRef)
  if (!injected) {
    return {
      status: 'skipped',
      message: '当前运行环境没有 document.head，跳过 CustomCSS 注入。',
      sandboxResult,
      styleId: CUSTOM_CSS_STYLE_ID,
    }
  }

  return {
    status: 'applied',
    message: `CustomCSS 已应用 ${sandboxResult.ruleCount} 条规则。`,
    sandboxResult,
    styleId: CUSTOM_CSS_STYLE_ID,
  }
}

export function suspendCustomCssSettings(
  settings: CustomCssSettings,
  reason: CustomCssSuspendedReason,
  error: CustomCssErrorLogInput,
  now = runtimeNow(),
): CustomCssSettings {
  return {
    ...settings,
    enabled: false,
    suspendedReason: reason,
    errorLog: appendCustomCssErrorLog(settings.errorLog, error, now),
  }
}
