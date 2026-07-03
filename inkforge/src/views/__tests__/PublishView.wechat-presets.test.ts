/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import {
  PUBLISH_COPY_ALLOWED_ATTR,
  PUBLISH_COPY_ALLOWED_TAGS,
  SVG_MODULES,
  WECHAT_SVG_APPLICATION_SLOTS,
  markdownToWechatWithStats,
  themePresets,
} from '@/services/export'
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

  it('loads direct publish route article ids through the real article and editor stores', () => {
    expect(PUBLISH_SOURCE).toContain("import { useRoute, useRouter } from 'vue-router'")
    expect(PUBLISH_SOURCE).toContain("import { useArticleStore } from '@/stores/article'")
    expect(PUBLISH_SOURCE).toMatch(/const\s+route\s*=\s*useRoute\(\)/)
    expect(PUBLISH_SOURCE).toMatch(/const\s+articleStore\s*=\s*useArticleStore\(\)/)
    expect(PUBLISH_SOURCE).toMatch(/function\s+getRouteArticleId\(\):\s*string\s*\|\s*null/)
    expect(PUBLISH_SOURCE).toMatch(/async\s+function\s+ensurePublishRouteArticleLoaded\(\)/)
    expect(PUBLISH_SOURCE).toContain('await articleStore.loadArticles()')
    expect(PUBLISH_SOURCE).toContain('articleStore.selectArticle(routeArticleId)')
    expect(PUBLISH_SOURCE).toMatch(/watch\(\(\)\s*=>\s*route\.query\.id/)
    expect(PUBLISH_SOURCE).toContain("router.push({ path: '/workstation', query: { id: routeArticleId } })")
  })

  it('keeps WeChat-safe SVG allowed in the rich-copy fallback sanitizer', () => {
    expect(PUBLISH_SOURCE).toContain("import { sanitizePublishRichCopyHtml } from '@/services/export/publish-copy'")
    expect(PUBLISH_SOURCE).toContain('container.innerHTML = sanitizePublishRichCopyHtml(generatedHtml.value)')
    expect(PUBLISH_SOURCE).toContain('Publish rich-copy fallback execCommand returned false')
    expect(PUBLISH_COPY_ALLOWED_TAGS).toEqual(expect.arrayContaining(['svg', 'path', 'animateTransform']))
    expect(PUBLISH_COPY_ALLOWED_ATTR).toEqual(expect.arrayContaining(['data-ink-svg', 'viewBox']))
  })

  it('exposes the app SVG slot selector in PublishView and forwards it to WeChat export options', () => {
    expect(PUBLISH_SOURCE).toContain('WECHAT_SVG_APPLICATION_SLOTS')
    expect(PUBLISH_SOURCE).toContain('SVG_MODULES')
    expect(PUBLISH_SOURCE).toContain('handlePublishWechatSvgModulesToggle')
    expect(PUBLISH_SOURCE).toContain('handlePublishWechatSvgSlotChange')
    expect(PUBLISH_SOURCE).toContain('publish-svg-options')
    expect(PUBLISH_SOURCE).toContain('发布中心微信公众号 SVG 高级排版模块')
    expect(PUBLISH_SOURCE).toContain('enableSvgModules: false')
    expect(PUBLISH_SOURCE).toContain('enableSvgModules: exportOptions.value.enableSvgModules')
    expect(PUBLISH_SOURCE).toContain('svgInjectionPlan: exportOptions.value.svgInjectionPlan')
    expect(PUBLISH_SOURCE).toContain('getPublishWechatSvgSlotModuleId(slot.id)')
    expect(PUBLISH_SOURCE).toContain('handlePublishWechatSvgSlotChange(slot.id, $event)')
  })

  it('keeps the PublishView all-module SVG slot aligned with the live registry', () => {
    const showcase = WECHAT_SVG_APPLICATION_SLOTS.find(slot => slot.id === 'showcase')

    expect(WECHAT_SVG_APPLICATION_SLOTS.map(slot => slot.id)).toEqual([
      'cover',
      'heading',
      'divider',
      'blockquote',
      'showcase',
    ])
    expect(showcase?.modules.map(module => module.id)).toEqual(SVG_MODULES.map(module => module.id))
    expect(showcase?.modules).toHaveLength(27)
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
