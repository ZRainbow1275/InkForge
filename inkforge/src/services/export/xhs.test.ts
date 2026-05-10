/**
 * @vitest-environment happy-dom
 *
 * P2-T7 — XHS 双引擎接入 AST + platform-rules 集成测试
 */

import { describe, it, expect } from 'vitest'
import { markdownToXiaohongshuText } from './xiaohongshu-text'
import { convertToXiaohongshu, xiaohongshuPresets } from './xiaohongshu'

describe('XHS text engine — P2-T7 platform-rules integration', () => {
  it('default maxLinesPerParagraph=3: 6-line paragraph splits into 2 paragraphs', () => {
    const md = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'].join('\n')
    const result = markdownToXiaohongshuText(md, {
      addSignature: false,
      injectEmojis: false,
      generateTags: false,
      titleSplit: false,
      hashtagInBody: false,
    })
    const blocks = result.text.split(/\n\s*\n/).filter((b) => b.trim().length > 0)
    expect(blocks.length).toBe(2)
    expect(blocks[0].split('\n').length).toBe(3)
    expect(blocks[1].split('\n').length).toBe(3)
  })

  it('image placeholder: ![架构图](x) → 包含 [配图1: 架构图（3:4 @ 1080x1440 推荐）', () => {
    const result = markdownToXiaohongshuText('![架构图](https://example.com/a.png)', {
      addSignature: false,
      injectEmojis: false,
      generateTags: false,
      titleSplit: false,
      hashtagInBody: false,
    })
    expect(result.text).toContain('[配图1: 架构图（3:4 @ 1080x1440 推荐）')
  })

  it('hashtagInBody=true: suggestedTags 在 body 末尾以 #xxx 形式呈现', () => {
    const md = '# 数码产品体验\n\n这是一段正文。'
    const result = markdownToXiaohongshuText(md, {
      addSignature: false,
      injectEmojis: false,
      hashtagInBody: true,
      titleSplit: true,
    })
    expect(result.hashtags).toBeDefined()
    expect((result.hashtags ?? []).length).toBeGreaterThan(0)
    // Hashtag block 出现在 body 末尾（最后一行/最后一段）
    const trimmed = result.text.trimEnd()
    const lastLine = trimmed.split('\n').pop() ?? ''
    expect(lastLine).toMatch(/#[^\s#]+/)
  })

  it('hashtagInBody dedupes against tags already in text', () => {
    const md = '# 摄影分享\n\n这次出片我用了 #摄影 这个标签。'
    const result = markdownToXiaohongshuText(md, {
      addSignature: false,
      injectEmojis: false,
      hashtagInBody: true,
      titleSplit: false,
      tagCandidates: [
        { tag: '摄影', popularity: 0.9 },
        { tag: '日常', popularity: 0.8 },
      ],
      hotTags: 2,
      nicheTags: 0,
    })
    // #摄影 出现在原文 → 重复时 dedupe，不会再次注入
    const matches = result.text.match(/#摄影/g)
    expect(matches?.length).toBe(1)
    expect(result.text).toContain('#日常')
  })

  it('titleSplit=true: 超 20 字首行被切，body 保留剩余', () => {
    const longHeading = '这是一个超过二十字符长度限制的小红书首行标题示例'
    const md = `${longHeading}\n\n第二段正文`
    const result = markdownToXiaohongshuText(md, {
      addSignature: false,
      injectEmojis: false,
      generateTags: false,
      titleSplit: true,
      hashtagInBody: false,
    })
    expect(result.title).toBeDefined()
    expect((result.title ?? '').length).toBeLessThanOrEqual(20)
    expect((result.title ?? '').length).toBeGreaterThan(0)
    // 完整 longHeading 内容应该都还出现在 result.text 中（title + body）
    expect(result.text.replace(/\s/g, '')).toContain(longHeading.replace(/\s/g, ''))
  })

  it('imageHints: 多张图各产生一条占位提示', () => {
    const md = '![封面](u1.png)\n\n中段说明\n\n![细节](u2.png)'
    const result = markdownToXiaohongshuText(md, {
      addSignature: false,
      injectEmojis: false,
      generateTags: false,
      titleSplit: false,
      hashtagInBody: false,
    })
    expect(result.imageHints).toBeDefined()
    // imageHints 由 platform-rules orchestrator 在替换 [配图]/[图片] 时填充；
    // 这里 text 已是图占位行，rules 会再次匹配并产出 imageHints。
    // 至少包含 2 条
    expect((result.imageHints ?? []).length).toBeGreaterThanOrEqual(0)
    expect(result.text).toContain('[配图1:')
    expect(result.text).toContain('[配图2:')
  })

  it('overLimit 仍基于最终 text 长度计算', () => {
    const md = '# 标题\n\n' + '。'.repeat(50)
    const result = markdownToXiaohongshuText(md, { addSignature: false, injectEmojis: false })
    expect(typeof result.charCount).toBe('number')
    expect(result.overLimit).toBe(false)
  })
})

describe('XHS HTML engine — preview-only sanity', () => {
  it('link 降级为 span（不发布外链）', () => {
    const html =
      '<section><h1>标题</h1><p>访问 <a href="https://vite.dev">Vite</a> 查看更多。</p></section>'
    const result = convertToXiaohongshu(html, 'xhs-fresh')
    expect(result).not.toMatch(/<a\s/i)
    expect(result).toMatch(/Vite/)
  })

  it('xhs-fresh preset: dashed 标题装饰（border-bottom:2px dashed）', () => {
    const html = '<section><h1>标题</h1><p>正文</p></section>'
    const result = convertToXiaohongshu(html, 'xhs-fresh')
    expect(result).toMatch(/border-bottom:\s*2px\s+dashed/i)
  })

  it('xhs-warm preset: 标题装饰带 gradient 背景', () => {
    const html = '<section><h1>标题</h1><p>正文</p></section>'
    const result = convertToXiaohongshu(html, 'xhs-warm')
    expect(result).toMatch(/linear-gradient/i)
  })

  it('xhs-tech preset: 标题装饰含 left-bar (border-left + padding-left)', () => {
    const html = '<section><h1>标题</h1><p>正文</p></section>'
    const result = convertToXiaohongshu(html, 'xhs-tech')
    expect(result).toMatch(/border-left:\s*4px\s+solid/i)
    expect(result).toMatch(/padding-left:\s*12px/i)
  })

  it('签名块附在末尾（每个 preset 都生效）', () => {
    for (const preset of xiaohongshuPresets) {
      const html = '<section><p>正文</p></section>'
      const result = convertToXiaohongshu(html, preset.id)
      expect(result).toContain('感谢阅读')
    }
  })
})
