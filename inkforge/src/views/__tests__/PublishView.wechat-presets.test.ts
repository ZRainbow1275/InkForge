/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import { markdownToWechatWithStats, themePresets } from '@/services/export'
import PUBLISH_SOURCE from '../PublishView.vue?raw'

const FLAGSHIP_PRESET_IDS = [
  'flagship-kiln',
  'flagship-kiln-paste-safe',
  'flagship-tempera',
  'flagship-amber',
] as const

const WECHAT_MARKDOWN_FIXTURE = [
  '# 炉火与匠心',
  '## 微信 SVG 旗舰验证',
  '这是一段真实 Markdown 正文，用于验证发布中心暴露的微信预设能够进入公众号导出链路。',
  '### 内容结构',
  '- 样式需要稳定内联',
  '- SVG 装饰需要在旗舰预设中保留',
  '> 引用内容用于触发引用卡片或引用样式。',
  '---',
  '结尾段落用于确认正文没有在转换过程中丢失。',
].join('\n\n')

const WECHAT_RENDER_OPTIONS = {
  enableCjkSpacing: true,
  enableReadingTime: false,
  enableCiteStatus: false,
} as const

describe('PublishView — WeChat preset selector coverage', () => {
  it('uses the full export themePresets list instead of the legacy five-item article preset slice', () => {
    expect(PUBLISH_SOURCE).toContain("import { useThemeStore } from '@/stores/theme'")
    expect(PUBLISH_SOURCE).not.toContain('ARTICLE_PRESETS')
    expect(PUBLISH_SOURCE).not.toContain('.slice(0, 5)')
    expect(PUBLISH_SOURCE).toMatch(/const\s+quickPresets\s*=\s*computed\(\(\)\s*=>\s*themePresets\s*\)/)
  })

  it('keeps all SVG flagship presets selectable from the publish center contract', () => {
    const presetIds = themePresets.map(preset => preset.id)

    expect(themePresets).toHaveLength(16)
    expect(presetIds).toEqual(expect.arrayContaining([...FLAGSHIP_PRESET_IDS]))
  })

  it('renders every publish-center WeChat preset through the real Markdown export path', async () => {
    const renderedPresetIds = new Set<string>()

    for (const preset of themePresets) {
      const result = await markdownToWechatWithStats(WECHAT_MARKDOWN_FIXTURE, preset, WECHAT_RENDER_OPTIONS)

      renderedPresetIds.add(preset.id)
      expect(result.html, `${preset.id} should produce non-empty WeChat HTML`).toContain('微信 SVG 旗舰验证')
      expect(result.html, `${preset.id} should preserve body text`).toContain('结尾段落')
      expect(result.html, `${preset.id} should inline WeChat-compatible styles`).toMatch(/\sstyle="/i)
      expect(result.html, `${preset.id} must not emit script tags`).not.toMatch(/<script\b/i)
      expect(result.html, `${preset.id} must not emit style tags`).not.toMatch(/<style\b/i)
      expect(result.stats.wordCount, `${preset.id} should calculate stats from real Markdown`).toBeGreaterThan(0)
    }

    expect(renderedPresetIds.size).toBe(16)
  })

  it('renders all SVG flagship presets from Markdown into WeChat-safe SVG/style blocks', async () => {
    for (const presetId of FLAGSHIP_PRESET_IDS) {
      const preset = themePresets.find(item => item.id === presetId)
      expect(preset, `${presetId} should exist`).toBeDefined()
      if (!preset) continue

      const result = await markdownToWechatWithStats(WECHAT_MARKDOWN_FIXTURE, preset, WECHAT_RENDER_OPTIONS)

      expect(result.html, `${presetId} should emit SVG modules`).toContain('data-ink-svg')
      expect(result.html, `${presetId} should contain inline svg`).toMatch(/<svg\b/i)
      expect(result.html, `${presetId} should emit premium HTML style blocks`).toContain('data-ink-block')
      expect(result.html, `${presetId} svg should scale for WeChat mobile width`).toContain('width="100%"')
      expect(result.html, `${presetId} svg should preserve viewBox scaling`).toMatch(/viewBox="[^"]+"/i)
      expect(result.html, `${presetId} should preserve heading text`).toContain('微信 SVG 旗舰验证')
      expect(result.html, `${presetId} should preserve quote text`).toContain('引用内容')
      expect(result.html, `${presetId} must not emit script tags`).not.toMatch(/<script\b/i)
      expect(result.html, `${presetId} must not emit style tags`).not.toMatch(/<style\b/i)
    }
  })
})
