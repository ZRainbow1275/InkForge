/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import {
  SVG_MODULES,
  WECHAT_SVG_APPLICATION_SLOTS,
  getXiaohongshuPresets,
  getZhihuPresets,
  markdownToWechatWithStats,
  themePresets,
} from '@/services/export'
import DELIVERY_PANEL_SOURCE from '@/components/export/DeliveryAdornmentPanel.vue?raw'
import EXPORT_MODAL_SOURCE from '@/components/export/ExportModal.vue?raw'
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
    expect(PUBLISH_SOURCE).not.toContain("import { useThemeStore } from '@/stores/theme'")
    expect(PUBLISH_SOURCE).not.toContain('ARTICLE_PRESETS')
    expect(PUBLISH_SOURCE).not.toContain('.slice(0, 5)')
    expect(PUBLISH_SOURCE).toMatch(/const\s+quickPresets\s*=\s*computed\(\(\)\s*=>\s*themePresets\s*\)/)
  })

  it('inherits the canonical platform, preset, and typography state used by Workstation and Export', () => {
    expect(PUBLISH_SOURCE).toContain('const platform = ref<Platform>(settingsStore.settings.export.defaultPlatform)')
    expect(PUBLISH_SOURCE).toContain('const storedPublishPresetId = settingsStore.settings.export.defaultPresetId')
    expect(PUBLISH_SOURCE).toContain('getPlatformPresets(platform.value).some')
    expect(PUBLISH_SOURCE).toContain('const selectedPublishPresetId = computed')
    expect(PUBLISH_SOURCE).toContain('settingsStore.settings.export.defaultPresetId = nextPresetId')
    expect(PUBLISH_SOURCE).toContain('typographyToWechatCss')
    expect(PUBLISH_SOURCE).toContain('articleTitle: currentContent.value?.title?.trim() || undefined')
    expect(PUBLISH_SOURCE).toContain("import { useCategoryStore } from '@/stores/category'")
    expect(PUBLISH_SOURCE).toContain('articleCategory: articleCategory.value?.trim() || undefined')
    expect(PUBLISH_SOURCE).toContain('await categoryStore.loadCategories()')
    expect(PUBLISH_SOURCE).toContain('enableTextIndent: appearance.typography.paragraphIndent')
    expect(PUBLISH_SOURCE).toContain('settingsStore.settings.export.customCss.trim()')
    expect(PUBLISH_SOURCE).not.toContain('textIndent: boolean')
    expect(PUBLISH_SOURCE).not.toContain('exportOptions.textIndent')
    expect(PUBLISH_SOURCE).toContain('v-if="platform !== \'zhihu\'"')
    expect(PUBLISH_SOURCE).toMatch(/v-if="platform === 'wechat'"[\s\S]{0,500}?首行缩进/)
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

  it('copies the canonical native artifact while keeping the WeChat rich boundary fail-closed', () => {
    expect(PUBLISH_SOURCE).toContain('convertToNativeFormat')
    expect(PUBLISH_SOURCE).toContain('convertToPlatform')
    expect(PUBLISH_SOURCE).toContain('NativeExportResult')
    expect(PUBLISH_SOURCE).toContain('const nativeResult = ref<NativeExportResult | null>(null)')
    expect(PUBLISH_SOURCE).toContain('const version = ++generationVersion')
    expect(PUBLISH_SOURCE).toContain('if (version !== generationVersion) return')
    expect(PUBLISH_SOURCE).toContain('copyWechatHtmlToClipboard')
    expect(PUBLISH_SOURCE).toContain('copyTextToClipboard(result.content)')
    expect(PUBLISH_SOURCE).not.toContain('copySanitizedPublishRichHtmlWithExecCommand')
    expect(PUBLISH_SOURCE).toContain("if (result.format === 'html')")
    expect(PUBLISH_SOURCE).toContain("recordPublishExportHistory(`发布中心 ${info.artifactLabel}`, 'copy', result.content)")
    expect(PUBLISH_SOURCE).toContain("artifactLabel: '微信富文本'")
    expect(PUBLISH_SOURCE).toContain("artifactLabel: '小红书文本'")
    expect(PUBLISH_SOURCE).toContain("artifactLabel: '知乎 Markdown'")
    expect(PUBLISH_SOURCE).not.toContain('copyRichHtmlToClipboard')
    expect(PUBLISH_SOURCE).not.toContain("hasPublishSource ? '复制到剪贴板'")
    expect(PUBLISH_SOURCE).not.toContain('onMounted(() => {\n  generateHtml()')
    expect(PUBLISH_SOURCE).not.toContain('copyToClipboard(generatedHtml.value)')
  })

  it('keeps local file download in Export instead of duplicating it in Publish', () => {
    expect(PUBLISH_SOURCE).not.toContain('function buildDownloadFileName')
    expect(PUBLISH_SOURCE).not.toContain('function downloadHtmlFile')
    expect(PUBLISH_SOURCE).not.toContain('@click="downloadHtmlFile"')
    expect(PUBLISH_SOURCE).not.toContain('下载预览 HTML')
    expect(PUBLISH_SOURCE).toContain("@click=\"viewMode = 'code'\"")
    expect(PUBLISH_SOURCE).toContain('@click="copyHtmlCode"')
  })

  it('renders the export preview on a centered WeChat-width device canvas', () => {
    expect(EXPORT_MODAL_SOURCE).toMatch(/\.export-panel\s*\{[\s\S]{0,140}?max-width:\s*1180px/)
    expect(EXPORT_MODAL_SOURCE).toMatch(/\.control-column\s*\{[\s\S]{0,140}?width:\s*360px/)
    expect(EXPORT_MODAL_SOURCE).toMatch(/\.preview-render\s*\{[\s\S]{0,220}?width:\s*390px/)
    expect(EXPORT_MODAL_SOURCE).toMatch(/\.preview-render\s*\{[\s\S]{0,260}?margin:\s*0 auto/)
    expect(EXPORT_MODAL_SOURCE).toContain('resolveVisualVariant(selectedPlatform.value, preset.id)')
    expect(EXPORT_MODAL_SOURCE).toContain('class="preset-variant"')
    expect(EXPORT_MODAL_SOURCE).toContain('class="preset-signature"')
  })

  it('shares one persisted typed delivery snapshot without merging Export and Publish responsibilities', () => {
    expect(EXPORT_MODAL_SOURCE).toContain("import DeliveryAdornmentPanel from './DeliveryAdornmentPanel.vue'")
    expect(PUBLISH_SOURCE).toContain("import DeliveryAdornmentPanel from '@/components/export/DeliveryAdornmentPanel.vue'")
    expect(EXPORT_MODAL_SOURCE).toContain('v-model="deliveryAdornmentConfig"')
    expect(PUBLISH_SOURCE).toContain('v-model="deliveryAdornmentConfig"')
    expect(EXPORT_MODAL_SOURCE).toContain('settingsStore.settings.export.deliveryAdornment')
    expect(PUBLISH_SOURCE).toContain('settingsStore.settings.export.deliveryAdornment')
    expect(EXPORT_MODAL_SOURCE).toContain('nextOptions.deliveryAdornment = deliveryAdornment')
    expect(EXPORT_MODAL_SOURCE).toContain('nextOptions.articleTitle = props.title')
    expect(PUBLISH_SOURCE).toContain('deliveryAdornment,')
    expect(PUBLISH_SOURCE).not.toContain('buildLocalDeliveryBundle')
    expect(PUBLISH_SOURCE).not.toContain('writeLocalDeliveryBundle')
  })

  it('keeps platform components schema-driven and never accepts pasted raw HTML', () => {
    expect(DELIVERY_PANEL_SOURCE).toContain('DeliveryAdornmentConfigSchema.safeParse')
    expect(DELIVERY_PANEL_SOURCE).toContain("type: 'song'")
    expect(DELIVERY_PANEL_SOURCE).toContain("type: 'image'")
    expect(DELIVERY_PANEL_SOURCE).toContain("type: 'link'")
    expect(DELIVERY_PANEL_SOURCE).toContain("type: 'related-article'")
    expect(DELIVERY_PANEL_SOURCE).toContain("type: 'contact-card'")
    expect(DELIVERY_PANEL_SOURCE).toContain('修正前不会覆盖已保存的交付快照')
    expect(DELIVERY_PANEL_SOURCE).not.toContain('v-html')
    expect(DELIVERY_PANEL_SOURCE).not.toContain('rawHtml')
  })

  it('gives the source viewer its own scroll owner, native-format content, copy, and disclosure controls', () => {
    expect(PUBLISH_SOURCE).toContain('const sourceViewerContent = computed')
    expect(PUBLISH_SOURCE).toContain("if (nativeResult.value?.format === 'text')")
    expect(PUBLISH_SOURCE).toContain("if (nativeResult.value?.format === 'markdown')")
    expect(PUBLISH_SOURCE).toContain('aria-label="平台原生产物源码"')
    expect(PUBLISH_SOURCE).toContain('<Copy :size="12" />')
    expect(PUBLISH_SOURCE).toContain('收起源码')
    expect(PUBLISH_SOURCE).toContain('tabindex="0"')
    expect(PUBLISH_SOURCE).toMatch(/\.code-view-container\s*\{[\s\S]{0,180}?min-height:\s*0/)
    expect(PUBLISH_SOURCE).toMatch(/\.code-panel\s*\{[\s\S]{0,180}?min-height:\s*0/)
    expect(PUBLISH_SOURCE).toMatch(/\.code-content\s*\{[\s\S]{0,220}?overflow:\s*auto/)
    expect(PUBLISH_SOURCE).toContain('max-height: none')
    expect(PUBLISH_SOURCE).not.toContain('max-height: 600px')
  })

  it('owns the credentialed WeChat draft channel instead of the export modal', () => {
    expect(PUBLISH_SOURCE).toContain('getWechatPublishStatus')
    expect(PUBLISH_SOURCE).toContain('publishWechatDraft')
    expect(PUBLISH_SOURCE).toContain('handleCreateWechatDraft')
    expect(PUBLISH_SOURCE).toContain('微信草稿')
    expect(PUBLISH_SOURCE).toContain('封面自动取正文首张真实图片')
    expect(PUBLISH_SOURCE).toContain('wechatDraftCoverHandle')
    expect(PUBLISH_SOURCE).not.toContain('thumb_media_id')
  })

  it('exposes a backend-only redacted WeChat draft round-trip gate', () => {
    expect(PUBLISH_SOURCE).toContain('runWechatDraftLiveRoundTrip')
    expect(PUBLISH_SOURCE).toContain('WechatDraftLiveRoundTripReceipt')
    expect(PUBLISH_SOURCE).toContain('handleWechatDraftLiveRoundTrip')
    expect(PUBLISH_SOURCE).toContain('只返回脱敏 hash、计数、错误码与清理状态')
    expect(PUBLISH_SOURCE).toMatch(/wechatDraftLiveRoundTripReceipt(?:\.value)?\.error === 'recovery-zero-candidates'/)
    expect(PUBLISH_SOURCE).toContain('let wechatDraftLiveRoundTripVersion = 0')
    expect(PUBLISH_SOURCE).toContain('const version = ++wechatDraftLiveRoundTripVersion')
    expect(PUBLISH_SOURCE).toContain('watch([platform, wechatDraftCoverHandle]')
    expect(PUBLISH_SOURCE).toContain('if (version !== wechatDraftLiveRoundTripVersion) return')
    expect(PUBLISH_SOURCE).not.toContain('wechatDraftLiveRoundTripReceipt.mediaId')
    expect(PUBLISH_SOURCE).toContain('草稿已创建；正文图片')
    expect(PUBLISH_SOURCE).not.toContain('草稿 media_id：')
  })

  it('exposes every canonical Xiaohongshu and Zhihu style in the publish center', () => {
    expect(getXiaohongshuPresets()).toHaveLength(5)
    expect(getZhihuPresets()).toHaveLength(3)
    expect(PUBLISH_SOURCE).toContain('const xhsPresets = getXiaohongshuPresets()')
    expect(PUBLISH_SOURCE).toContain('const zhihuPresets = getZhihuPresets()')
    expect(PUBLISH_SOURCE).toContain('v-for="preset in zhihuPresets"')
    expect(PUBLISH_SOURCE).toContain('convertToPlatform(content, currentPlatform')
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
