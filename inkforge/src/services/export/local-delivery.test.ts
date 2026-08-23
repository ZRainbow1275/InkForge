import { describe, expect, it } from 'vitest'

import {
  buildLocalDeliveryBundle,
  containsInkforgeAssetReference,
  createLocalDeliverySlug,
} from './local-delivery'

describe('local delivery bundle', () => {
  it('creates deterministic cross-platform safe slugs', () => {
    expect(createLocalDeliverySlug('  论文 2026 / Final  ')).toBe('论文-2026-final')
    expect(createLocalDeliverySlug('CON')).toBe('article-con')
    expect(createLocalDeliverySlug('***')).toBe('untitled')
  })

  it('preserves existing frontmatter byte-for-byte for static blog Markdown', async () => {
    const source = '---\ntitle: "已有标题"\ncustom: keep-me\n---\n\n# 正文\n内容'
    const bundle = await buildLocalDeliveryBundle({
      target: 'blog',
      format: 'markdown',
      title: '新的展示标题',
      markdown: source,
      exportedAt: new Date('2026-07-22T00:00:00.000Z'),
    })

    expect(bundle.entryPath).toBe('新的展示标题.md')
    expect(bundle.files).toEqual([{
      relativePath: '新的展示标题.md',
      content: source,
    }])
  })

  it('adds portable frontmatter only for a blog target and emits semantic HTML', async () => {
    const blog = await buildLocalDeliveryBundle({
      target: 'blog',
      format: 'html',
      title: 'A < B',
      markdown: '# Heading\n\nBody',
      exportedAt: new Date('2026-07-22T01:02:03.000Z'),
    })
    const folder = await buildLocalDeliveryBundle({
      target: 'folder',
      format: 'markdown',
      title: 'Plain copy',
      markdown: '# Heading\n\nBody',
    })

    expect(blog.files[0]?.content).toContain('date: "2026-07-22T01:02:03.000Z"')
    expect(blog.files[0]?.content).toContain('<!doctype html>')
    expect(blog.files[0]?.content).toContain('<title>A &lt; B</title>')
    expect(folder.files[0]?.content).toBe('# Heading\n\nBody')
  })

  it('fails closed for empty articles and exposes unresolved local references', async () => {
    await expect(buildLocalDeliveryBundle({
      target: 'folder',
      format: 'markdown',
      title: 'Empty',
      markdown: '   ',
    })).rejects.toThrow('当前文稿为空')

    expect(containsInkforgeAssetReference('![图](inkforge-asset://asset-1)')).toBe(true)
    expect(containsInkforgeAssetReference('![图](assets/asset-1.png)')).toBe(false)
  })
})
