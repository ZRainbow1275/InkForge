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

function runtimeDocument(documentRef?: Document): Document | null {
  if (documentRef) {
    return documentRef
  }

  return typeof document === 'undefined' ? null : document
}

function runtimeNow(now?: number): number {
  return typeof now === 'number' && Number.isFinite(now) ? now : Date.now()
}

export function removeCustomCssStyle(documentRef?: Document): boolean {
  const doc = runtimeDocument(documentRef)
  const style = doc?.getElementById(CUSTOM_CSS_STYLE_ID)
  if (!style) {
    return false
  }

  style.remove()
  return true
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

  if (style.textContent !== css) {
    style.textContent = css
  }

  return true
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
