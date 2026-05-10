import { AppError, ErrorCode } from '@/services/error'
import type { DiagnosticErrorClassification } from './types'

const DATA_RISK_PATTERNS = [/corrupt/i, /integrity/i, /hash/i, /tamper/i, /schema/i, /migration/i, /quota/i]
const RECOVERABLE_PATTERNS = [/timeout/i, /network/i, /offline/i, /abort/i, /retry/i, /unavailable/i]
const NOTICE_PATTERNS = [/cancel/i, /ignored/i, /not found/i, /empty/i]

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function codeOf(error: unknown): string | undefined {
  if (error instanceof AppError) return error.code
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

export function classifyDiagnosticError(error: unknown): DiagnosticErrorClassification {
  const code = codeOf(error)
  const message = messageOf(error)
  const evidence = `${code ?? ''} ${message}`

  if (DATA_RISK_PATTERNS.some(pattern => pattern.test(evidence))) {
    return { category: 'data-risk', reason: 'Data integrity, storage quota, or schema evidence detected', code }
  }

  if (code === ErrorCode.DB_WRITE_FAILED || code === ErrorCode.DB_READ_FAILED) {
    return { category: 'blocking', reason: 'Database read/write failures can block local-first durability', code }
  }

  if (code === ErrorCode.DB_NOT_FOUND || NOTICE_PATTERNS.some(pattern => pattern.test(evidence))) {
    return { category: 'notice', reason: 'The failure is informational or scoped to a missing optional record', code }
  }

  if (
    code === ErrorCode.PARSE_FETCH_FAILED ||
    code === ErrorCode.AI_SERVICE_UNAVAILABLE ||
    code === ErrorCode.AI_GENERATION_FAILED ||
    code === ErrorCode.VALIDATION_ERROR ||
    RECOVERABLE_PATTERNS.some(pattern => pattern.test(evidence))
  ) {
    return { category: 'recoverable', reason: 'The failure can be retried, corrected, or safely surfaced to the user', code }
  }

  return { category: 'blocking', reason: 'Unknown diagnostic errors default to the safe blocking category', code }
}