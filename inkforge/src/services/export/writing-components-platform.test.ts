/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import { convertToNativeFormat } from './index'
import { themePresets } from './themes'
import { markdownToXiaohongshuText } from './xiaohongshu-text'
import { markdownToZhihuClean } from './zhihu-markdown'

const COMPONENT_MARKDOWN = [
  '# 真实组件降级',
  '',
  '<StatBlock version="1" label="完成率" value="42%" description="实测样本" source="2026 年报" />',
  '',
  '<FutureBlock version="9" payload="不得泄漏" />',
].join('\n')

const WECHAT_COMPONENT_MARKDOWN = [
  '<InfoGrid version="1" title="项目资料" items="作者|墨铸&#10;日期|2026-07-28" />',
  '',
  '<TimelineBlock version="1" title="里程碑" items="2026-01|启动|真实记录&#10;2026-07|验收|真实记录" />',
  '',
  '<CompareBlock version="1" title="方案对比" leftTitle="方案甲" leftItems="稳定&#10;清晰" rightTitle="方案乙" rightItems="快速&#10;灵活" />',
  '',
  '<StatBlock version="1" label="完成率" value="42%" description="已核验样本" source="2026 年真实年报" />',
  '',
  '<GalleryBlock version="1" title="实拍图集" images="https://example.com/verified.png|实拍图|现场记录" />',
].join('\n')

describe('writing component platform fallback', () => {
  it('keeps only real registered fields in Xiaohongshu local text output', () => {
    const result = markdownToXiaohongshuText(COMPONENT_MARKDOWN, {
      addSignature: false,
      generateTags: false,
      injectEmojis: false,
      titleSplit: false,
      hashtagInBody: false,
    })
    expect(result.text).toContain('数据统计卡')
    expect(result.text).toContain('指标名称：完成率')
    expect(result.text).toContain('指标数值：42%')
    expect(result.text).toContain('数据来源：2026 年报')
    expect(result.text).not.toContain('FutureBlock')
    expect(result.text).not.toContain('不得泄漏')
  })

  it('keeps only real registered fields in Zhihu local Markdown output', () => {
    const result = markdownToZhihuClean(COMPONENT_MARKDOWN)
    expect(result.markdown).toContain('[数据统计卡]')
    expect(result.markdown).toContain('指标名称：完成率')
    expect(result.markdown).toContain('指标数值：42%')
    expect(result.markdown).toContain('数据来源：2026 年报')
    expect(result.markdown).not.toContain('FutureBlock')
    expect(result.markdown).not.toContain('不得泄漏')
  })

  it('keeps every WeChat preset themed and free of unsupported component layout', async () => {
    const fingerprints: string[] = []

    for (const preset of themePresets) {
      const result = await convertToNativeFormat(WECHAT_COMPONENT_MARKDOWN, 'wechat', {
        presetId: preset.id,
        includeQualityReport: false,
        exportOptions: {
          enableReadingTime: false,
          enableCiteStatus: false,
          enableCodeHighlight: false,
          enableEnhancedTable: false,
        },
      })
      const template = document.createElement('template')
      template.innerHTML = result.content
      const labels = ['项目资料', '里程碑', '方案对比', '完成率', '实拍图集']
      const components = labels.map(label => (
        Array.from(template.content.querySelectorAll('span'))
          .find(element => element.textContent === label)
          ?.parentElement
      ))
      const componentHtml = components.map(component => component?.outerHTML ?? '').join('')

      expect(components.every(Boolean), preset.id).toBe(true)
      expect(componentHtml, preset.id).not.toMatch(
        /display\s*:\s*grid|position\s*:\s*(?:absolute|fixed)|<script\b|<iframe\b|\son\w+=/i,
      )
      expect(componentHtml.toLowerCase(), preset.id).toContain(preset.primaryColor.toLowerCase())
      fingerprints.push(componentHtml)
    }

    expect(new Set(fingerprints).size).toBe(themePresets.length)
  })
})
