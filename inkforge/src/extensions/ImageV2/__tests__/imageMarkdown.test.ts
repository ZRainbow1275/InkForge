import { describe, expect, it } from 'vitest'
import {
  appendMarkdownImage,
  escapeMarkdownImageAlt,
  parseMarkdownImage,
  serializeMarkdownImage,
  unescapeMarkdownImageAlt,
} from '../imageMarkdown'
import type { MarkdownImage } from '../types'

const baseImage: MarkdownImage = {
  src: 'inkforge-asset://asset-1',
  alt: 'Diagram',
  title: null,
  width: null,
  height: null,
  caption: '',
  link: null,
  align: 'center',
}

describe('ImageV2 Markdown image utilities', () => {
  it('serializes and parses a basic image', () => {
    const markdown = serializeMarkdownImage(baseImage)

    expect(markdown).toBe('![Diagram](inkforge-asset://asset-1)')
    expect(parseMarkdownImage(markdown)).toEqual(baseImage)
  })

  it('serializes and parses titled images', () => {
    const image = { ...baseImage, title: 'Architecture "Map"' }
    const markdown = serializeMarkdownImage(image)

    expect(markdown).toBe('![Diagram](inkforge-asset://asset-1 "Architecture \\"Map\\"")')
    expect(parseMarkdownImage(markdown)).toEqual(image)
  })

  it('serializes and parses Typora-style dimensions', () => {
    const image = { ...baseImage, width: 240, height: 160 }
    const markdown = serializeMarkdownImage(image)

    expect(markdown).toBe('![Diagram](inkforge-asset://asset-1 =240x160)')
    expect(parseMarkdownImage(markdown)).toEqual(image)
  })

  it('serializes and parses captions on the line after the image', () => {
    const image = { ...baseImage, caption: 'System overview' }
    const markdown = serializeMarkdownImage(image)

    expect(markdown).toBe('![Diagram](inkforge-asset://asset-1)\n*System overview*')
    expect(parseMarkdownImage(markdown)).toEqual(image)
  })

  it('serializes and parses safe linked-image syntax', () => {
    const image = { ...baseImage, link: 'https://example.com/full-size' }
    const markdown = serializeMarkdownImage(image)

    expect(markdown).toBe('[![Diagram](inkforge-asset://asset-1)](https://example.com/full-size)')
    expect(parseMarkdownImage(markdown)).toEqual(image)
  })

  it('drops unsafe linked-image targets instead of serializing active content', () => {
    const image = { ...baseImage, link: 'javascript:alert' }

    expect(serializeMarkdownImage(image)).toBe('![Diagram](inkforge-asset://asset-1)')
    expect(parseMarkdownImage('[![Diagram](inkforge-asset://asset-1)](javascript:alert)')).toEqual(baseImage)
  })

  it('preserves optional alignment comments for non-default alignment', () => {
    const image = { ...baseImage, align: 'float-left' as const }
    const markdown = serializeMarkdownImage(image, { includeAlignmentComment: true })

    expect(markdown).toBe('<!-- align: float-left -->\n![Diagram](inkforge-asset://asset-1)')
    expect(parseMarkdownImage(markdown)).toEqual(image)
  })

  it('escapes and unescapes alt text brackets and backslashes', () => {
    const alt = String.raw`A \ B ] C`
    const escaped = escapeMarkdownImageAlt(alt)

    expect(escaped).toBe(String.raw`A \\ B \] C`)
    expect(unescapeMarkdownImageAlt(escaped)).toBe(alt)
    expect(parseMarkdownImage(`![${escaped}](inkforge-asset://asset-1)`)).toMatchObject({ alt })
  })

  it('appends a serialized image to empty and existing Markdown', () => {
    const imageMarkdown = '![Diagram](inkforge-asset://asset-1)'

    expect(appendMarkdownImage('', baseImage)).toBe(imageMarkdown)
    expect(appendMarkdownImage('Paragraph', baseImage)).toBe(`Paragraph\n\n${imageMarkdown}`)
    expect(appendMarkdownImage('Paragraph\n', baseImage)).toBe(`Paragraph\n\n${imageMarkdown}`)
    expect(appendMarkdownImage('Paragraph\n\n', baseImage)).toBe(`Paragraph\n\n${imageMarkdown}`)
  })

  it('keeps Markdown unchanged when the image source is invalid', () => {
    expect(appendMarkdownImage('Paragraph', { ...baseImage, src: '   ' })).toBe('Paragraph')
  })

  it('rejects incomplete image targets', () => {
    expect(serializeMarkdownImage({ ...baseImage, src: '   ' })).toBe('')
    expect(parseMarkdownImage('![Diagram]()')).toBeNull()
    expect(parseMarkdownImage('plain text')).toBeNull()
  })
})
