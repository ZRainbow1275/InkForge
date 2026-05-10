import { describe, expect, it } from 'vitest'
import { degradeCitationsForPlainText } from '@/services/citation'
import { markdownToXiaohongshuText } from './xiaohongshu-text'

describe('citation export degradation', () => {
  it('degrades footnotes and citations to readable Xiaohongshu plain text before cleanup', () => {
    const text = degradeCitationsForPlainText([
      '正文[^n] references [@smith2023].',
      '',
      '[^n]: 真实脚注内容。',
    ].join('\n'), 'xiaohongshu')

    expect(text).toContain('正文 (note: 真实脚注内容。) references (smith2023).')
    expect(text).toContain('Notes:')
    expect(text).toContain('n: 真实脚注内容。')
  })

  it('keeps native Xiaohongshu export from leaking raw footnote definitions', () => {
    const result = markdownToXiaohongshuText([
      '# 标题',
      '正文[^n] references [@smith2023].',
      '',
      '[^n]: 真实脚注内容。',
    ].join('\n'), {
      addSignature: false,
      injectEmojis: false,
      generateTags: false,
      autoSplitParagraphs: false,
    })

    expect(result.text).not.toContain('[^n]:')
    expect(result.text).not.toContain('[@smith2023]')
    expect(result.text).toContain('真实脚注内容')
    expect(result.text).toContain('smith2023')
  })
})
