import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildPlatformArtifactBundle } from './platform-artifact-bundle'

describe('platform artifact bundle', () => {
  it('fails closed instead of creating files for an empty article', async () => {
    await expect(buildPlatformArtifactBundle({
      platform: 'xiaohongshu',
      markdown: '   ',
      title: '真实标题',
    })).rejects.toThrow('当前文稿为空')
  })

  it('requires the real browser canvas path for XHS PNG output', async () => {
    if (typeof document !== 'undefined') return

    await expect(buildPlatformArtifactBundle({
      platform: 'xiaohongshu',
      markdown: '# 真实标题\n\n真实正文',
      title: '真实标题',
    })).rejects.toThrow(/DOM\/canvas/)
  })

  it('does not claim a Zhihu image pack when the article has no local fallback bytes', async () => {
    await expect(buildPlatformArtifactBundle({
      platform: 'zhihu',
      markdown: '# 真实标题\n\n真实正文',
      title: '真实标题',
    })).rejects.toThrow('没有可写出的本地图片 fallback')
  })

  it('passes the strict Zhihu manifest into the returned native result', () => {
    const source = readFileSync(new URL('./platform-artifact-bundle.ts', import.meta.url), 'utf8')

    expect(source).toContain('zhihuImageArtifactManifest: manifest')
    expect(source).not.toContain('zhihuImageArtifactManifest: localManifest')
  })
})
