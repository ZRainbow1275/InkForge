import { describe, expect, it } from 'vitest'
import {
  normalizeImageAlign,
  normalizeImageLink,
  parseNumberAttribute,
  parseStringAttribute,
  renderDataAttribute,
} from '../imageAttrs'

describe('ImageV2 attribute helpers', () => {
  it('normalizes only supported image alignment values', () => {
    expect(normalizeImageAlign('left')).toBe('left')
    expect(normalizeImageAlign(' CENTER ')).toBe('center')
    expect(normalizeImageAlign('float-left')).toBe('float-left')
    expect(normalizeImageAlign('float-right')).toBe('float-right')
    expect(normalizeImageAlign('justify')).toBe('center')
    expect(normalizeImageAlign(null)).toBe('center')
  })

  it('parses positive dimension attributes from HTML values', () => {
    expect(parseNumberAttribute('240')).toBe(240)
    expect(parseNumberAttribute('320px')).toBe(320)
    expect(parseNumberAttribute('80.4px')).toBe(80)
    expect(parseNumberAttribute('0')).toBeNull()
    expect(parseNumberAttribute('auto')).toBeNull()
    expect(parseNumberAttribute(null)).toBeNull()
  })

  it('normalizes optional strings without inventing placeholders', () => {
    expect(parseStringAttribute(' asset-1 ')).toBe('asset-1')
    expect(parseStringAttribute('   ')).toBeNull()
    expect(parseStringAttribute(null)).toBeNull()
  })

  it('allows only safe image links', () => {
    expect(normalizeImageLink('https://example.com/image')).toBe('https://example.com/image')
    expect(normalizeImageLink('http://example.com/image')).toBe('http://example.com/image')
    expect(normalizeImageLink('mailto:editor@example.com')).toBe('mailto:editor@example.com')
    expect(normalizeImageLink('/relative/path')).toBe('/relative/path')
    expect(normalizeImageLink('javascript:alert(1)')).toBeNull()
    expect(normalizeImageLink('data:text/html,hello')).toBeNull()
    expect(normalizeImageLink('')).toBeNull()
  })

  it('renders data attributes only for meaningful values', () => {
    expect(renderDataAttribute('data-link', 'https://example.com')).toEqual({ 'data-link': 'https://example.com' })
    expect(renderDataAttribute('data-width', 240)).toEqual({ 'data-width': '240' })
    expect(renderDataAttribute('data-empty', '')).toEqual({})
    expect(renderDataAttribute('data-null', null)).toEqual({})
  })
})
