import type { ImageAlign } from './types'

export type ImageAttributeValue = string | number | boolean | null | undefined

const IMAGE_ALIGN_VALUES = new Set<ImageAlign>(['left', 'center', 'right', 'float-left', 'float-right'])
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

export function normalizeImageAlign(value: unknown): ImageAlign {
  if (typeof value !== 'string') {
    return 'center'
  }

  const normalized = value.trim().toLowerCase()
  return IMAGE_ALIGN_VALUES.has(normalized as ImageAlign) ? normalized as ImageAlign : 'center'
}

export function parseStringAttribute(value: string | null): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export function parseNumberAttribute(value: string | null): number | null {
  if (!value) {
    return null
  }

  const match = value.match(/\d+(?:\.\d+)?/)
  if (!match) {
    return null
  }

  const parsed = Number(match[0])
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null
}

export function normalizeImageLink(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  try {
    const baseUrl = typeof window === 'undefined' ? 'https://inkforge.local/' : window.location.href
    const url = new URL(normalized, baseUrl)
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? normalized : null
  } catch {
    return null
  }
}

export function renderDataAttribute(name: string, value: ImageAttributeValue): Record<string, string> {
  if (value === null || value === undefined || value === '') {
    return {}
  }

  return { [name]: String(value) }
}
