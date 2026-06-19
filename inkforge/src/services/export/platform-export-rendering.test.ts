/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from 'vitest'
import type { StyleProofManifest } from './index'
import {
  convertToNativeFormat,
  convertToWechatWithStats,
  createXhsImageArtifactManifestFromRaster,
  createXhsImageArtifactManifestFromRasterArtifacts,
  createZhihuImageArtifactManifest,
  createStyleProofManifestDraft,
  detectQuality,
  evaluateStyleChoiceApplication,
  evaluateStyleChoiceAvailability,
  getCommittedStyleProofLocalEvidenceAuditReport,
  getCommittedStyleProofLocalEvidenceManifests,
  getCommittedStyleProofWechatPcEvidenceAuditReport,
  getCommittedStyleProofWechatPcEvidenceManifests,
  getDefaultPreset,
  getDefaultStyleEvidence,
  getEvidenceProofRequirements,
  getPlatformStyleApplicationReport,
  getPlatformStyleChoices,
  getPlatformStyleAvailabilityReport,
  getPlatformStyleProofAcceptanceAuditReport,
  getPlatformStyleProofCollectionPlan,
  getPlatformStyleProofCollectionQueue,
  getPlatformStyleProofProgressReport,
  getPlatformStyleProofReadinessReport,
  getPlatformStyleProofExecutionRunbook,
  getPresetById,
  getStyleChoiceApplication,
  getStyleChoiceById,
  getStyleChoiceCatalog,
  getStyleChoiceProofRequirements,
  getStyleProofAcceptanceAuditReport,
  getStyleProofExecutionRunbook,
  getStyleProofManifestPackReport,
  getStyleProofManifestReport,
  markdownToWechatWithStats,
  markdownToXiaohongshuText,
  markdownToZhihuClean,
  prepareWechatClipboardHtml,
  prepareWechatClipboardPlainText,
  postProcessForWechat,
  validateXhsImageArtifactManifest,
  validateZhihuImageArtifactManifest,
  validateStyleProofManifest,
} from './index'

const REAL_EXPORT_MARKDOWN = [
  '# 发布验证',
  '',
  '正文包含 [官网](https://vite.dev) 和 ![架构图](https://example.com/arch.png)。',
  '',
  '> [!NOTE]',
  '> 请先在目标平台预览真实草稿。',
  '',
  '| 渠道 | 原生格式 |',
  '| --- | --- |',
  '| 微信 | HTML |',
  '| 小红书 | 纯文本 |',
  '',
  '```mermaid',
  'graph TD',
  'A-->B',
  '```',
  '',
  '```ts',
  'const exported = true',
  '```',
  '',
  '<span class="legacy" style="color:red">HTML文本</span>',
].join('\n')

const RICH_WECHAT_PRESET_HTML = [
  '<h1>微信排版视觉手测稿</h1>',
  '<p>这是用于验证 <strong>12 个微信预设</strong> 预览与导出视觉差异的真实编辑器内容。</p>',
  '<h2>核心结论</h2>',
  '<p>微信正文需要保留标题色块、边框、背景、阴影、段落间距和字体层次。</p>',
  '<blockquote><p>引用块用于验证大引号、边框、背景色与段落间距是否被保留。</p></blockquote>',
  '<h3>小节观察</h3>',
  '<p>这段文字用于 legal 首字下沉、thesis § 前缀、commentary 下划线、report 标题徽章等装饰检查。</p>',
  '<hr>',
  '<h2>行动清单</h2>',
  '<ol><li><p>确认微信导出保留 previewCSS 的主要视觉效果。</p></li></ol>',
  '<pre><code class="language-ts">const preset = "wechat"</code></pre>',
  '<table><thead><tr><th>平台</th><th>关注点</th></tr></thead><tbody><tr><td>微信</td><td>previewCSS</td></tr></tbody></table>',
].join('')

const WECHAT_PRESET_IDS = [
  'thesis',
  'legal',
  'report',
  'commentary',
  'aigc',
  'code',
  'notes',
  'news',
  'meme',
  'life',
  'elegant',
  'tech',
] as const

const MARKET_EDITOR_RESIDUE_HTML = [
  '<section class="_135editor" data-tools="135编辑器" data-id="173488">',
  '<section class="135brush" style="display:flex;background:linear-gradient(#fff,#eee);transform:rotate(5deg)">市场标题</section>',
  '<img src="https://bcn.135editor.com/files/demo.png" data-w="900" data-ratio="1.2">',
  '</section>',
  '<section class="tn-comp-pin tn-comp-style-pin" ng-click="tplLib.onTemplateClicked($event, tpl)">',
  '<div class="tn-cell tn-cell-image" tn-cell-type="image"><img src="//statics.xiumi.us/mat/i/demo.jpg"></div>',
  '</section>',
].join('')

const MARKET_EDITOR_BACKGROUND_RESIDUE_HTML = [
  '<section style="background-image:url(https://image.135editor.com/files/bg.png);padding:24px">',
  '135 背景图残留',
  '</section>',
  '<section style="background:url(//statics.xiumi.us/mat/i/demo-bg.jpg) center/cover no-repeat">',
  '秀米背景图残留',
  '</section>',
].join('')

const MARKET_EDITOR_SLOT_RESIDUE_HTML = [
  '<section style="margin:10px auto;display:flex;justify-content:center">',
  '<strong data-brushtype="text">平台样式文本槽</strong>',
  '<strong class="autonum" data-num="4">4</strong>',
  '</section>',
  '<li style_id="173703" style_name="端午节传统节日编号标题古风绿色样式" style_price="9.9">',
  '135 样式列表元数据残留',
  '</li>',
].join('')

const MARKET_EDITOR_SVG_BUILDER_RESIDUE_HTML = [
  '<div id="app-content-canvas" class="content-wrapper">',
  '<div id="block-1781688485697" class="block" data-name="coverclickmovewithspread">',
  '<div class="block-img__content"><section><svg viewBox="0 0 1080 1920"></svg></section></div>',
  '</div>',
  '<div class="edit-placeholder block-img__default"><div class="placeholder__name">封面图点击移除并展开</div></div>',
  '</div>',
].join('')

const MARKET_EDITOR_135_SVG_TRIGGER_RESIDUE_HTML = [
  '<section id="app-content-canvas" class="content-wrapper">',
  '<div class="content-background">',
  '<div class="block-img">',
  '<span class="ant-tooltip-open">点击可设置触发热区显示触发热区</span>',
  '<svg viewBox="0 0 1080 1920"><path d="M0 0h1080v1920H0z"></path></svg>',
  '</div>',
  '</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_BINDING_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div opera-tn-ra-comp="_$.pages:0.layers:0.comps:0" disable-tn-group-flex-box="block">',
  '<p>Xiumi editor runtime binding residue</p>',
  '</div>',
  '<div opera-tn-ra-cell="_$.pages:0.layers:0.comps:0.col1"></div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_ANGULAR_RUNTIME_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<input ng-model="status.animatedArgs.duration" ng-change="onTransitionDurationChanged()" class="ng-pristine ng-untouched ng-valid ng-not-empty">',
  '<div ng-include="::/views/app/studio/OutCompEditOp/OpCarouselTplSet.html" ng-controller="OpCarouselTplSetController" class="op-loader ng-scope ng-hide">',
  '<select ng-options="category for category in status.animatedArgs.transitionCategoryList" ng-model="status.animatedArgs.transitionCategory"></select>',
  '</div>',
  '<span class="ng-binding ng-scope">Xiumi Angular runtime controls</span>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_SVG_CAROUSEL_RESIDUE_HTML = [
  '<section class="tn-comp-top-level tn-comp-inst">',
  '<div class="tn-cell tn-cell-group tn-child-position-static tn-group-usage-flow-canvas"',
  ' tn-cell-type="group" tn-child-orientation="flow-canvas"',
  ' tn-svg-animation-carousel="cell" tn-animate="cell.anim"',
  ' tn-yzk-font-usage-id="xiumi-font" tn-placeholder="{ 点击编辑 }"',
  ' opera-tn-ra-cell="_$.pages:0.layers:0.comps:0.col1" ng-style="cell.style">',
  'SVG互动效果丨图集滚动',
  '</div>',
  '</section>',
].join('')

const MARKET_EDITOR_EDITABLE_SURFACE_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div contenteditable="true">Copied editor text cell</div>',
  '<p contenteditable="plaintext-only">Copied plaintext editing surface</p>',
  '</section>',
].join('')

function exportWechatPresetHtml(presetId: string): string {
  const preset = getPresetById(presetId)
  expect(preset).toBeDefined()

  return convertToWechatWithStats(RICH_WECHAT_PRESET_HTML, preset ?? getDefaultPreset(), {
    enableReadingTime: false,
    enableCiteStatus: false,
    enableCodeHighlight: false,
    enableCjkSpacing: false,
    maxContentWidth: null,
  }).html
}

function compactText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\u202F/g, '')
    .replace(/\s+/g, '')
}

function countText(text: string, needle: string): number {
  return text.split(needle).length - 1
}

function countPattern(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0
}

function hasNonAscii(text: string): boolean {
  return Array.from(text).some((char) => {
    const codePoint = char.codePointAt(0)
    return typeof codePoint === 'number' && codePoint > 127
  })
}

describe('platform native export rendering rules', () => {
  it('exposes a gate-aware style choice catalog for all target platforms', () => {
    const catalog = getStyleChoiceCatalog()
    const ids = catalog.map(choice => choice.id)

    expect(getPlatformStyleChoices('wechat').length).toBeGreaterThanOrEqual(15)
    expect(getPlatformStyleChoices('xiaohongshu').length).toBeGreaterThanOrEqual(7)
    expect(getPlatformStyleChoices('zhihu').length).toBeGreaterThanOrEqual(7)

    expect(ids).toContain('wechat-classic-inline')
    expect(ids).toContain('wechat-cover-seal-divider')
    expect(ids).toContain('wechat-flagship-amber')
    expect(ids).toContain('wechat-mobile-only-effect')
    expect(ids).toContain('wechat-plugin-transfer-checklist')
    expect(ids).toContain('xhs-cover-carousel')
    expect(ids).toContain('xhs-markdown-card-slicer')
    expect(ids).toContain('xhs-h5-design-import-boundary')
    expect(ids).toContain('zhihu-academic-latex-column')
    expect(ids).toContain('zhihu-diagram-article')
    expect(ids).toContain('zhihu-public-image-upload-checklist')

    expect(catalog.every(choice => choice.fallbackOutput && choice.detectorBlockers.length > 0)).toBe(true)
    expect(getPlatformStyleChoices('wechat').every(choice =>
      choice.detectorBlockers.includes('wechat-market-editor-residue')
    )).toBe(true)
    expect(getPlatformStyleChoices('xiaohongshu').every(choice =>
      choice.detectorBlockers.includes('xhs-market-editor-residue')
    )).toBe(true)
    expect(getPlatformStyleChoices('zhihu').every(choice =>
      choice.detectorBlockers.includes('zhihu-market-editor-residue')
    )).toBe(true)
    expect(catalog.every(choice => choice.evidenceFloor !== 'published')).toBe(true)

    const classicInline = getStyleChoiceById('wechat-classic-inline')
    expect(classicInline).toBeDefined()
    if (!classicInline) return

    const marketAppliedEvidence = evaluateStyleChoiceAvailability(classicInline, ['applied-editor-element'])
    expect(marketAppliedEvidence.bestEvidence).toBe('applied-editor-element')
    expect(marketAppliedEvidence.usable).toBe(false)
    expect(marketAppliedEvidence.reason).toContain('unit-tested')

    const authenticatedEditorEvidence = evaluateStyleChoiceAvailability(
      classicInline,
      ['authenticated-editor-reachable', 'pc-editor-dom-readable'],
    )
    expect(authenticatedEditorEvidence.bestEvidence).toBe('pc-editor-dom-readable')
    expect(authenticatedEditorEvidence.usable).toBe(false)
    expect(authenticatedEditorEvidence.reason).toContain('unit-tested')

    const zhihuDataTable = getStyleChoiceById('zhihu-data-table')
    expect(zhihuDataTable?.fallbackOutput).toBe('image-fallback')
    expect(zhihuDataTable?.detectorBlockers).toEqual(expect.arrayContaining([
      'zhihu-image-host-blocked',
      'zhihu-image-alt-missing',
      'zhihu-image-caption-missing',
    ]))
  })

  it('maps evidence labels to explicit proof requirements without changing availability gates', () => {
    const pcPasteRequirementIds = getEvidenceProofRequirements('pc-editor-paste').map(requirement => requirement.id)
    expect(pcPasteRequirementIds).toEqual([
      'exact-artifact',
      'safe-disposable-draft',
      'pc-editor-paste-event',
      'pc-editor-dom-readback',
      'no-sensitive-artifact',
    ])

    const mobilePreviewRequirementIds = getEvidenceProofRequirements('mobile-preview').map(requirement => requirement.id)
    expect(mobilePreviewRequirementIds).toEqual([
      'exact-artifact',
      'phone-preview-readback',
      'phone-screenshot',
      'dark-mode-check',
      'cover-thumbnail-check',
      'no-sensitive-artifact',
    ])

    expect(getEvidenceProofRequirements('published').map(requirement => requirement.id)).toEqual([
      'exact-artifact',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
      'no-sensitive-artifact',
    ])
    expect(getEvidenceProofRequirements('credentialed-sync').map(requirement => requirement.id)).toEqual([
      'credentialed-channel-response',
      'sync-readback',
      'no-sensitive-artifact',
    ])

    const amber = getStyleChoiceById('wechat-flagship-amber')
    expect(amber).toBeDefined()
    if (!amber) return

    const amberRequirementIds = getStyleChoiceProofRequirements(amber).map(requirement => requirement.id)
    expect(amberRequirementIds).toEqual(expect.arrayContaining([
      'safe-disposable-draft',
      'pc-editor-paste-event',
      'phone-preview-readback',
      'phone-screenshot',
      'dark-mode-check',
      'cover-thumbnail-check',
      'published-url-or-platform-preview',
    ]))
    expect(amberRequirementIds.filter(requirementId => requirementId === 'exact-artifact')).toHaveLength(1)
    expect(amberRequirementIds.filter(requirementId => requirementId === 'no-sensitive-artifact')).toHaveLength(1)

    const amberAvailability = evaluateStyleChoiceAvailability(amber, ['pc-editor-paste', 'mobile-preview', 'published'])
    expect(amberAvailability.usable).toBe(false)
    expect(amberAvailability.status).toBe('blocked')
    expect(amberAvailability.reason).toContain('plain text')

    const xhsCleanText = getStyleChoiceById('xhs-clean-text')
    expect(xhsCleanText).toBeDefined()
    if (!xhsCleanText) return

    const xhsRequirementIds = getStyleChoiceProofRequirements(xhsCleanText).map(requirement => requirement.id)
    expect(xhsRequirementIds).not.toContain('phone-preview-readback')
    expect(xhsRequirementIds).not.toContain('xhs-artifact-manifest')
    expect(xhsRequirementIds).toEqual(expect.arrayContaining([
      'unit-test-coverage',
      'published-url-or-platform-preview',
    ]))

    const xhsCarousel = getStyleChoiceById('xhs-cover-carousel')
    expect(xhsCarousel).toBeDefined()
    if (!xhsCarousel) return

    const xhsCarouselRequirementIds = getStyleChoiceProofRequirements(xhsCarousel).map(requirement => requirement.id)
    expect(xhsCarouselRequirementIds).toContain('xhs-artifact-manifest')
    expect(xhsCarouselRequirementIds).not.toContain('zhihu-artifact-manifest')
    expect(xhsCarouselRequirementIds).not.toContain('public-image-host')

    const zhihuDiagram = getStyleChoiceById('zhihu-diagram-article')
    const zhihuUpload = getStyleChoiceById('zhihu-public-image-upload-checklist')
    expect(zhihuDiagram).toBeDefined()
    expect(zhihuUpload).toBeDefined()
    if (!zhihuDiagram || !zhihuUpload) return

    expect(getStyleChoiceProofRequirements(zhihuDiagram).map(requirement => requirement.id)).toEqual(expect.arrayContaining([
      'local-browser-rendering',
      'public-image-host',
      'zhihu-artifact-manifest',
      'published-url-or-platform-preview',
    ]))
    expect(getStyleChoiceProofRequirements(zhihuUpload).map(requirement => requirement.id)).toEqual(expect.arrayContaining([
      'credentialed-channel-response',
      'public-image-host',
      'zhihu-artifact-manifest',
      'published-url-or-platform-preview',
    ]))
    expect(getStyleChoiceProofRequirements(zhihuUpload).map(requirement => requirement.id)).not.toContain('xhs-artifact-manifest')
  })

  it('validates a complete unit-tested style proof manifest without changing availability gates', () => {
    const classicInline = getStyleChoiceById('wechat-classic-inline')
    expect(classicInline).toBeDefined()
    if (!classicInline) return

    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['unit-tested'],
      artifacts: [
        {
          id: 'style-proof-unit-log',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'platform-export-rendering.test.ts focused assertion log',
          evidenceLabel: 'unit-tested',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'unit-test',
          action: 'test-run',
          readback: 'test-assertion',
          artifactRef: 'prompts/0601/evidence/style-proof-manifest-validator-20260609.txt',
          committed: true,
          safeForCommit: true,
        },
      ],
    }

    expect(validateStyleProofManifest(manifest)).toEqual([])
    const report = getStyleProofManifestReport(manifest)
    expect(report.valid).toBe(true)
    expect(report.scope).toBe('evidence-label')
    expect(report.choiceStatus).toBe('available')
    expect(report.summary).toMatchObject({
      required: 1,
      satisfied: 1,
      missing: 0,
      invalid: 0,
      artifactCount: 1,
      acceptedArtifactCount: 1,
      sensitiveArtifactCount: 0,
      unsafeCommitArtifactCount: 0,
      issueCount: 0,
    })
    expect(report.requirements[0]?.status).toBe('satisfied')
    expect(report.requirements[0]?.artifactIds).toEqual(['style-proof-unit-log'])
    expect(report.artifacts[0]?.status).toBe('accepted')
    expect(evaluateStyleChoiceAvailability(classicInline, ['unit-tested']).usable).toBe(true)
  })

  it('creates empty style proof manifest drafts that enumerate real proof gaps without fake artifacts', () => {
    const draft = createStyleProofManifestDraft({
      platform: 'wechat',
      choiceId: 'wechat-flagship-amber',
      artifactFingerprint: 'sha256:redacted-amber-artifact',
    })

    expect(draft).toMatchObject({
      platform: 'wechat',
      choiceId: 'wechat-flagship-amber',
      scope: 'style-choice',
      claimedEvidence: [],
      artifactFingerprint: 'sha256:redacted-amber-artifact',
      artifacts: [],
    })

    const report = getStyleProofManifestReport(draft)
    expect(report.valid).toBe(false)
    expect(report.choiceStatus).toBe('blocked')
    expect(report.summary.artifactCount).toBe(0)
    expect(report.summary.acceptedArtifactCount).toBe(0)
    expect(report.summary.required).toBeGreaterThanOrEqual(9)
    expect(report.summary.missing).toBe(report.summary.required)
    expect(report.requirements.map(requirement => requirement.requirement.id)).toEqual(expect.arrayContaining([
      'exact-artifact',
      'safe-disposable-draft',
      'pc-editor-paste-event',
      'phone-preview-readback',
      'phone-screenshot',
      'dark-mode-check',
      'cover-thumbnail-check',
      'published-url-or-platform-preview',
      'no-sensitive-artifact',
    ]))
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-choice-blocked')
  })

  it('creates evidence-label proof drafts only for explicitly claimed labels', () => {
    const draft = createStyleProofManifestDraft({
      platform: 'wechat',
      claimedEvidence: ['pc-editor-dom-readable'],
    })
    const report = getStyleProofManifestReport(draft)

    expect(draft.choiceId).toBeUndefined()
    expect(draft.scope).toBe('evidence-label')
    expect(draft.artifacts).toEqual([])
    expect(report.choiceId).toBeUndefined()
    expect(report.summary.required).toBe(3)
    expect(report.summary.missing).toBe(3)
    expect(report.requirements.map(requirement => requirement.requirement.id)).toEqual([
      'authenticated-editor-url',
      'pc-editor-dom-readback',
      'no-sensitive-artifact',
    ])
  })

  it('builds platform-level proof readiness matrices from empty drafts without claiming proof', () => {
    const wechatReadiness = getPlatformStyleProofReadinessReport('wechat')
    const xhsReadiness = getPlatformStyleProofReadinessReport('xiaohongshu')
    const zhihuReadiness = getPlatformStyleProofReadinessReport('zhihu')

    expect(wechatReadiness.platform).toBe('wechat')
    expect(wechatReadiness.summary.total).toBe(getPlatformStyleChoices('wechat').length)
    expect(wechatReadiness.summary.valid).toBe(0)
    expect(wechatReadiness.summary.missingRequirements).toBeGreaterThan(0)
    expect(wechatReadiness.choices.every(choice => choice.draft.artifacts.length === 0)).toBe(true)
    expect(wechatReadiness.choices.every(choice => choice.draft.scope === 'style-choice')).toBe(true)

    const amberReadiness = wechatReadiness.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')
    expect(amberReadiness).toBeDefined()
    if (!amberReadiness) return

    expect(amberReadiness.blockedByCatalog).toBe(true)
    expect(amberReadiness.report.choiceStatus).toBe('blocked')
    expect(amberReadiness.missingRequirementIds).toEqual(expect.arrayContaining([
      'exact-artifact',
      'safe-disposable-draft',
      'pc-editor-paste-event',
      'phone-preview-readback',
      'phone-screenshot',
      'dark-mode-check',
      'cover-thumbnail-check',
      'published-url-or-platform-preview',
      'no-sensitive-artifact',
    ]))

    expect(xhsReadiness.summary.total).toBe(getPlatformStyleChoices('xiaohongshu').length)
    expect(xhsReadiness.summary.valid).toBe(0)
    expect(xhsReadiness.summary.missingRequirements).toBeGreaterThan(0)
    const xhsCarouselReadiness = xhsReadiness.choices.find(choice => choice.choice.id === 'xhs-cover-carousel')
    expect(xhsCarouselReadiness?.missingRequirementIds).toContain('xhs-artifact-manifest')
    expect(xhsCarouselReadiness?.missingRequirementIds).not.toContain('zhihu-artifact-manifest')

    const zhihuUploadReadiness = zhihuReadiness.choices.find(choice =>
      choice.choice.id === 'zhihu-public-image-upload-checklist',
    )
    expect(zhihuUploadReadiness).toBeDefined()
    expect(zhihuUploadReadiness?.missingRequirementIds).toEqual(expect.arrayContaining([
      'credentialed-channel-response',
      'sync-readback',
      'public-image-host',
      'zhihu-artifact-manifest',
      'published-url-or-platform-preview',
    ]))
    expect(zhihuUploadReadiness?.missingRequirementIds).not.toContain('xhs-artifact-manifest')
  })

  it('builds platform proof collection plans without promoting external gates', () => {
    const wechatPlan = getPlatformStyleProofCollectionPlan('wechat')
    const xhsPlan = getPlatformStyleProofCollectionPlan('xiaohongshu')
    const zhihuPlan = getPlatformStyleProofCollectionPlan('zhihu')
    const wechatReadiness = getPlatformStyleProofReadinessReport('wechat')

    expect(wechatPlan.platform).toBe('wechat')
    expect(wechatPlan.summary.total)
      .toBe(wechatReadiness.summary.missingRequirements + wechatReadiness.summary.invalidRequirements)
    expect(wechatPlan.summary.phonePreview).toBeGreaterThan(0)
    expect(wechatPlan.summary.authenticatedPcEditor).toBeGreaterThan(0)
    expect(wechatPlan.summary.platformPublish).toBeGreaterThan(0)
    expect(wechatPlan.summary.safeToAutomate).toBeLessThan(wechatPlan.summary.total)

    const amberSteps = wechatPlan.steps.filter(step => step.choice.id === 'wechat-flagship-amber')
    expect(amberSteps.some(step =>
      step.requirement.id === 'pc-editor-paste-event'
      && step.gate === 'authenticated-pc-editor'
      && step.mutatesPlatform
      && step.requiresExternalAccount
      && !step.safeToAutomate
    )).toBe(true)
    const authenticatedEditorStep = amberSteps.find(step => step.gate === 'authenticated-pc-editor')
    expect(authenticatedEditorStep?.note).toContain('authenticatedSessionVerified:true')
    expect(authenticatedEditorStep?.note).toContain('platformEditorTargetVerified:true')
    expect(authenticatedEditorStep?.note).toContain('platformEditorSurfaceVerified:true')
    expect(authenticatedEditorStep?.note).toContain('platformEditorDomVerified:true')
    expect(amberSteps.filter(step => step.gate === 'phone-preview').map(step => step.requirement.id)).toEqual(
      expect.arrayContaining(['phone-preview-readback', 'phone-screenshot', 'dark-mode-check', 'cover-thumbnail-check']),
    )
    expect(amberSteps.every(step => step.status === 'missing')).toBe(true)
    expect(amberSteps.every(step => step.blockedByCatalog)).toBe(true)

    const xhsManifestStep = xhsPlan.steps.find(step =>
      step.choice.id === 'xhs-cover-carousel' && step.requirement.id === 'xhs-artifact-manifest',
    )
    expect(xhsManifestStep?.gate).toBe('local-evidence')
    expect(xhsManifestStep?.safeToAutomate).toBe(true)
    expect(xhsPlan.steps.some(step => step.requirement.id === 'zhihu-artifact-manifest')).toBe(false)

    const zhihuUploadSteps = zhihuPlan.steps.filter(step => step.choice.id === 'zhihu-public-image-upload-checklist')
    expect(zhihuUploadSteps.find(step => step.requirement.id === 'public-image-host')?.gate).toBe('public-host')
    expect(zhihuUploadSteps.find(step => step.requirement.id === 'credentialed-channel-response')?.gate)
      .toBe('credentialed-channel')
    expect(zhihuUploadSteps.find(step => step.requirement.id === 'published-url-or-platform-preview')?.gate)
      .toBe('platform-publish')
    expect(zhihuUploadSteps.some(step => step.requirement.id === 'xhs-artifact-manifest')).toBe(false)
  })

  it('groups platform proof collection queues into ordered gates without changing catalog blockers', () => {
    const wechatQueue = getPlatformStyleProofCollectionQueue('wechat')
    const xhsQueue = getPlatformStyleProofCollectionQueue('xiaohongshu')
    const zhihuQueue = getPlatformStyleProofCollectionQueue('zhihu')
    const wechatPlan = getPlatformStyleProofCollectionPlan('wechat')

    expect(wechatQueue.platform).toBe('wechat')
    expect(wechatQueue.summary.totalSteps).toBe(wechatPlan.summary.total)
    expect(wechatQueue.summary.totalGates).toBeGreaterThanOrEqual(6)
    expect(wechatQueue.summary.safeToAutomateSteps).toBe(wechatPlan.summary.safeToAutomate)
    expect(wechatQueue.summary.phoneSteps).toBe(wechatPlan.summary.phoneSteps)
    expect(wechatQueue.summary.externalAccountSteps).toBe(wechatPlan.summary.externalAccountSteps)
    expect(wechatQueue.nextGate).toBe('local-evidence')
    expect(wechatQueue.nextSafeGate).toBe('local-evidence')

    const localGroup = wechatQueue.groups.find(group => group.gate === 'local-evidence')
    const phoneGroup = wechatQueue.groups.find(group => group.gate === 'phone-preview')
    const publishGroup = wechatQueue.groups.find(group => group.gate === 'platform-publish')
    expect(localGroup?.safeToAutomateSteps).toBe(localGroup?.stepCount)
    expect(localGroup?.mutatingSteps).toBe(0)
    expect(phoneGroup?.phoneSteps).toBe(phoneGroup?.stepCount)
    expect(phoneGroup?.safeToAutomateSteps).toBe(0)
    expect(publishGroup?.mutatingSteps).toBe(publishGroup?.stepCount)
    expect(wechatQueue.groups.map(group => group.order)).toEqual(
      [...wechatQueue.groups.map(group => group.order)].sort((left, right) => left - right),
    )
    expect(wechatQueue.groups.find(group => group.gate === 'authenticated-pc-editor')?.choiceIds)
      .toContain('wechat-flagship-amber')
    expect(wechatQueue.groups.find(group => group.gate === 'authenticated-pc-editor')?.note)
      .toContain('authenticatedSessionVerified:true')
    expect(wechatQueue.summary.blockedChoices).toBeGreaterThan(0)
    expect(getPlatformStyleAvailabilityReport('wechat').choices.find(choice =>
      choice.choice.id === 'wechat-flagship-amber',
    )?.usable).toBe(false)

    expect(xhsQueue.groups.find(group => group.gate === 'local-evidence')?.choiceIds)
      .toContain('xhs-cover-carousel')
    expect(xhsQueue.groups.some(group => group.gate === 'phone-preview')).toBe(false)
    expect(zhihuQueue.groups.find(group => group.gate === 'public-host')?.choiceIds)
      .toContain('zhihu-public-image-upload-checklist')
    expect(zhihuQueue.groups.find(group => group.gate === 'credentialed-channel')?.externalAccountSteps)
      .toBeGreaterThan(0)
  })

  it('reports style proof progress from redacted manifests without promoting blocked choices', () => {
    const manifests: StyleProofManifest[] = [
      {
        platform: 'wechat',
        choiceId: 'wechat-classic-inline',
        scope: 'style-choice',
        claimedEvidence: ['unit-tested', 'local-browser'],
        artifacts: [
          {
            id: 'classic-unit-proof',
            requirementId: 'unit-test-coverage',
            kind: 'test-log',
            label: 'redacted unit proof',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'unit-test',
            action: 'test-run',
            readback: 'test-assertion',
            committed: true,
            safeForCommit: true,
          },
          {
            id: 'classic-local-render-proof',
            requirementId: 'local-browser-rendering',
            kind: 'browser-readback',
            label: 'redacted local browser proof',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'local-browser',
            action: 'local-render',
            readback: 'visual-and-dom',
            committed: true,
            safeForCommit: true,
          },
          {
            id: 'classic-exact-artifact-proof',
            requirementId: 'exact-artifact',
            kind: 'doc-reference',
            label: 'redacted exact artifact checksum',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'local-artifact',
            action: 'source-hygiene-review',
            readback: 'hygiene-log',
            artifactFingerprint: 'sha256:redacted-classic-inline',
            exactArtifact: true,
            committed: true,
            safeForCommit: true,
          },
          {
            id: 'classic-sensitive-hygiene-proof',
            requirementId: 'no-sensitive-artifact',
            kind: 'hygiene-review',
            label: 'redacted evidence hygiene proof',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'local-artifact',
            action: 'sensitive-hygiene-review',
            readback: 'hygiene-log',
            committed: true,
            safeForCommit: true,
          },
        ],
      },
      {
        platform: 'wechat',
        choiceId: 'wechat-flagship-amber',
        scope: 'style-choice',
        claimedEvidence: ['pc-editor-paste'],
        artifacts: [
          {
            id: 'amber-exact-artifact-proof',
            requirementId: 'exact-artifact',
            kind: 'doc-reference',
            label: 'redacted amber artifact checksum',
            platform: 'wechat',
            choiceId: 'wechat-flagship-amber',
            channel: 'local-artifact',
            action: 'source-hygiene-review',
            readback: 'hygiene-log',
            artifactFingerprint: 'sha256:redacted-amber-paste-artifact',
            exactArtifact: true,
            committed: true,
            safeForCommit: true,
          },
        ],
      },
      {
        platform: 'zhihu',
        choiceId: 'zhihu-clean-column',
        claimedEvidence: ['unit-tested'],
        artifacts: [],
      },
    ]

    const progress = getPlatformStyleProofProgressReport('wechat', manifests)
    const classicProgress = progress.choices.find(choice => choice.choice.id === 'wechat-classic-inline')
    const amberProgress = progress.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')
    const platformLocalGate = progress.gates.find(gate => gate.gate === 'local-evidence')
    const classicLocalGate = classicProgress?.gates.find(gate => gate.gate === 'local-evidence')
    const classicSensitiveGate = classicProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')

    expect(progress.platform).toBe('wechat')
    expect(progress.ignoredManifestCount).toBe(1)
    expect(progress.summary.choicesWithManifest).toBe(2)
    expect(progress.summary.proofSatisfiedChoices).toBe(0)
    expect(progress.summary.proofMissingChoices).toBeGreaterThan(0)
    expect(progress.summary.blockedChoices).toBeGreaterThan(0)
    expect(progress.nextGate).toBe('local-evidence')
    expect(progress.nextSafeGate).toBe('local-evidence')

    expect(classicProgress?.manifestCount).toBe(1)
    expect(classicProgress?.status).toBe('missing')
    expect(classicProgress?.summary.satisfied).toBeGreaterThanOrEqual(4)
    expect(classicLocalGate?.status).toBe('satisfied')
    expect(classicLocalGate?.satisfied).toBeGreaterThanOrEqual(3)
    expect(classicLocalGate?.safeToAutomateRequirements).toBe(classicLocalGate?.required)
    expect(classicSensitiveGate?.status).toBe('satisfied')
    expect(classicSensitiveGate?.safeToAutomateRequirements).toBe(classicSensitiveGate?.required)

    expect(platformLocalGate?.satisfied).toBeGreaterThan(0)
    expect(platformLocalGate?.missing).toBeGreaterThan(0)
    expect(platformLocalGate?.safeToAutomateRequirements).toBe(platformLocalGate?.required)
    expect(amberProgress?.blockedByCatalog).toBe(true)
    expect(amberProgress?.report.choiceStatus).toBe('blocked')
    expect(getPlatformStyleAvailabilityReport('wechat').choices.find(choice =>
      choice.choice.id === 'wechat-flagship-amber',
    )?.usable).toBe(false)
  })

  it('counts invalid and unsafe style proof artifacts at the collection gate level', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['local-browser'],
      artifacts: [
        {
          id: 'classic-weak-local-proof',
          requirementId: 'local-browser-rendering',
          kind: 'browser-readback',
          label: 'local DOM readback is too weak for visual rendering proof',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-browser',
          action: 'local-render',
          readback: 'dom',
          safeForCommit: true,
        },
        {
          id: 'classic-unsafe-artifact-proof',
          requirementId: 'exact-artifact',
          kind: 'doc-reference',
          label: 'unsafe exact artifact proof',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          sensitive: true,
          committed: true,
          safeForCommit: false,
        },
      ],
    }

    const progress = getPlatformStyleProofProgressReport('wechat', [manifest])
    const classicProgress = progress.choices.find(choice => choice.choice.id === 'wechat-classic-inline')
    const localGate = classicProgress?.gates.find(gate => gate.gate === 'local-evidence')

    expect(classicProgress?.status).toBe('invalid')
    expect(classicProgress?.summary.invalid).toBeGreaterThan(0)
    expect(classicProgress?.summary.sensitiveArtifactCount).toBe(1)
    expect(classicProgress?.summary.unsafeCommitArtifactCount).toBe(1)
    expect(localGate?.status).toBe('invalid')
    expect(localGate?.invalid).toBeGreaterThan(0)
    expect(localGate?.sensitiveArtifactCount).toBe(1)
    expect(localGate?.unsafeCommitArtifactCount).toBe(1)
    expect(progress.summary.proofInvalidChoices).toBeGreaterThan(0)
    expect(progress.summary.sensitiveArtifactCount).toBe(1)
    expect(progress.summary.unsafeCommitArtifactCount).toBe(1)
  })

  it('requires an artifact fingerprint on exact artifact proof rows', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['local-browser'],
      artifacts: [
        {
          id: 'classic-exact-artifact-without-fingerprint',
          requirementId: 'exact-artifact',
          kind: 'doc-reference',
          label: 'exact artifact flag without fingerprint',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          exactArtifact: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const exactArtifactAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'exact-artifact',
    )

    expect(report.valid).toBe(false)
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'style-proof-manifest-exact-artifact-missing',
        location: 'exact-artifact',
      }),
    ]))
    expect(requirementStatus.get('exact-artifact')).toBe('invalid')
    expect(exactArtifactAudit?.status).toBe('invalid')
  })

  it('keeps fully evidenced blocked choices invalid in style proof progress', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-flagship-amber',
      scope: 'style-choice',
      claimedEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
      artifactFingerprint: 'sha256:redacted-amber-artifact',
      artifacts: [
        {
          id: 'amber-exact-artifact',
          requirementId: 'exact-artifact',
          kind: 'doc-reference',
          label: 'redacted exact artifact proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'local-artifact',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          exactArtifact: true,
          safeForCommit: true,
        },
        {
          id: 'amber-disposable-draft',
          requirementId: 'safe-disposable-draft',
          kind: 'editor-readback',
          label: 'redacted disposable draft proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'platform-editor',
          action: 'safe-disposable-draft',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          disposableDraft: true,
          cleanupPathVerified: true,
          safeForCommit: true,
        },
        {
          id: 'amber-pc-paste',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'redacted PC paste proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          exactArtifact: true,
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          platformEditorDomVerified: true,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: true,
          pasteInputEventVerified: true,
          editorBodyMutationVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
        {
          id: 'amber-pc-dom',
          requirementId: 'pc-editor-dom-readback',
          kind: 'editor-readback',
          label: 'redacted PC DOM proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'platform-editor',
          action: 'pc-editor-dom-readback',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          platformEditorDomVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
        {
          id: 'amber-phone-readback',
          requirementId: 'phone-preview-readback',
          kind: 'phone-readback',
          label: 'redacted phone preview proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'phone',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'amber-phone-screenshot',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'redacted phone screenshot proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'amber-dark-mode',
          requirementId: 'dark-mode-check',
          kind: 'screenshot',
          label: 'redacted dark mode proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'phone-preview',
          action: 'dark-mode-check',
          readback: 'screenshot',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          exactArtifact: true,
          phonePreviewContentVerified: true,
          darkModeEnabledVerified: true,
          safeForCommit: true,
        },
        {
          id: 'amber-cover-thumbnail',
          requirementId: 'cover-thumbnail-check',
          kind: 'screenshot',
          label: 'redacted cover thumbnail proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'phone-preview',
          action: 'cover-thumbnail-check',
          readback: 'screenshot',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          exactArtifact: true,
          coverThumbnailAccepted: true,
          safeForCommit: true,
        },
        {
          id: 'amber-published-preview',
          requirementId: 'published-url-or-platform-preview',
          kind: 'published-preview',
          label: 'redacted published preview proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'public-web',
          action: 'published-preview',
          readback: 'published-url',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          exactArtifact: true,
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
        {
          id: 'amber-scheduled-send',
          requirementId: 'scheduled-send-readback',
          kind: 'channel-response',
          label: 'redacted scheduled send proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'credentialed-channel',
          action: 'scheduled-send',
          readback: 'scheduled-send-state',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          exactArtifact: true,
          externalAccountAuthenticated: true,
          scheduledSendVerified: true,
          safeForCommit: true,
        },
        {
          id: 'amber-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted hygiene proof',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-amber-artifact',
          safeForCommit: true,
        },
      ],
    }

    const progress = getPlatformStyleProofProgressReport('wechat', [manifest])
    const amberProgress = progress.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')

    expect(amberProgress?.summary.missing).toBe(0)
    expect(amberProgress?.report.valid).toBe(false)
    expect(amberProgress?.report.issues.map(issue => issue.id)).toContain('style-proof-manifest-choice-blocked')
    expect(amberProgress?.status).toBe('invalid')
    expect(progress.summary.proofSatisfiedChoices).toBe(0)
    expect(progress.summary.proofInvalidChoices).toBeGreaterThan(0)
  })

  it('rejects style proof progress merged from different artifact fingerprints', () => {
    const manifests: StyleProofManifest[] = [
      {
        platform: 'wechat',
        choiceId: 'wechat-classic-inline',
        scope: 'style-choice',
        claimedEvidence: ['unit-tested'],
        artifactFingerprint: 'sha256:redacted-artifact-a',
        artifacts: [
          {
            id: 'classic-unit-artifact-a',
            requirementId: 'unit-test-coverage',
            kind: 'test-log',
            label: 'unit proof for artifact A',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'unit-test',
            action: 'test-run',
            readback: 'test-assertion',
            artifactFingerprint: 'sha256:redacted-artifact-a',
            safeForCommit: true,
          },
        ],
      },
      {
        platform: 'wechat',
        choiceId: 'wechat-classic-inline',
        scope: 'style-choice',
        claimedEvidence: ['local-browser'],
        artifactFingerprint: 'sha256:redacted-artifact-b',
        artifacts: [
          {
            id: 'classic-local-artifact-b',
            requirementId: 'local-browser-rendering',
            kind: 'browser-readback',
            label: 'local render proof for artifact B',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'local-browser',
            action: 'local-render',
            readback: 'visual-and-dom',
            artifactFingerprint: 'sha256:redacted-artifact-b',
            safeForCommit: true,
          },
        ],
      },
    ]

    const progress = getPlatformStyleProofProgressReport('wechat', manifests)
    const classicProgress = progress.choices.find(choice => choice.choice.id === 'wechat-classic-inline')
    const packReport = getStyleProofManifestPackReport(manifests)

    expect(classicProgress?.status).toBe('invalid')
    expect(classicProgress?.report.valid).toBe(false)
    expect(classicProgress?.report.issues.map(issue => issue.id))
      .toContain('style-proof-manifest-pack-fingerprint-mismatch')
    expect(packReport.issues.map(issue => issue.id))
      .toContain('style-proof-manifest-pack-fingerprint-mismatch')
  })

  it('reports manifest pack issues without leaking proof between platforms', () => {
    const manifests: StyleProofManifest[] = [
      {
        platform: 'wechat',
        choiceId: 'wechat-classic-inline',
        scope: 'style-choice',
        claimedEvidence: ['unit-tested'],
        artifacts: [
          {
            id: 'shared-pack-artifact-id',
            requirementId: 'unit-test-coverage',
            kind: 'test-log',
            label: 'wechat unit proof',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'unit-test',
            action: 'test-run',
            readback: 'test-assertion',
            safeForCommit: true,
          },
        ],
      },
      {
        platform: 'zhihu',
        choiceId: 'zhihu-clean-column',
        scope: 'style-choice',
        claimedEvidence: ['unit-tested'],
        artifacts: [
          {
            id: 'shared-pack-artifact-id',
            requirementId: 'unit-test-coverage',
            kind: 'test-log',
            label: 'zhihu unit proof',
            platform: 'zhihu',
            choiceId: 'zhihu-clean-column',
            channel: 'unit-test',
            action: 'test-run',
            readback: 'test-assertion',
            safeForCommit: true,
          },
        ],
      },
      {
        platform: 'wechat',
        choiceId: 'unknown-style-choice',
        scope: 'style-choice',
        claimedEvidence: [],
        artifacts: [],
      },
    ]

    const packReport = getStyleProofManifestPackReport(manifests)
    const issueIds = packReport.issues.map(issue => issue.id)

    expect(packReport.summary.manifestCount).toBe(3)
    expect(packReport.summary.usableManifestCount).toBe(2)
    expect(packReport.summary.duplicateArtifactIdCount).toBe(1)
    expect(packReport.duplicateArtifactIds).toEqual(['shared-pack-artifact-id'])
    expect(issueIds).toEqual(expect.arrayContaining([
      'style-proof-manifest-pack-artifact-id-duplicate',
      'style-proof-manifest-pack-choice-unknown',
      'style-proof-manifest-choice-unknown',
    ]))

    expect(packReport.platformReports.wechat.summary.choicesWithManifest).toBe(1)
    expect(packReport.platformReports.wechat.ignoredManifestCount).toBe(2)
    expect(packReport.platformReports.zhihu.summary.choicesWithManifest).toBe(1)
    expect(packReport.platformReports.zhihu.ignoredManifestCount).toBe(2)
    expect(packReport.platformReports.xiaohongshu.summary.choicesWithManifest).toBe(0)
    expect(packReport.platformReports.xiaohongshu.ignoredManifestCount).toBe(3)
    expect(packReport.manifests.find(manifest => manifest.choiceId === 'unknown-style-choice')?.usableForProgress)
      .toBe(false)
  })

  it('audits acceptance gates without inferring phone sync or publish proof from local manifests', () => {
    const manifests: StyleProofManifest[] = [
      {
        platform: 'wechat',
        choiceId: 'wechat-classic-inline',
        scope: 'style-choice',
        claimedEvidence: ['unit-tested', 'local-browser'],
        artifactFingerprint: 'sha256:redacted-classic-inline',
        artifacts: [
          {
            id: 'classic-audit-unit-proof',
            requirementId: 'unit-test-coverage',
            kind: 'test-log',
            label: 'redacted unit proof',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'unit-test',
            action: 'test-run',
            readback: 'test-assertion',
            artifactFingerprint: 'sha256:redacted-classic-inline',
            safeForCommit: true,
          },
          {
            id: 'classic-audit-local-proof',
            requirementId: 'local-browser-rendering',
            kind: 'browser-readback',
            label: 'redacted local browser proof',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'local-browser',
            action: 'local-render',
            readback: 'visual-and-dom',
            artifactFingerprint: 'sha256:redacted-classic-inline',
            safeForCommit: true,
          },
        ],
      },
    ]

    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', manifests)
    const requirementStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const cannotClaimIds = audit.cannotClaim.map(requirement => requirement.requirement.id)

    expect(audit.platform).toBe('wechat')
    expect(audit.progress.summary.choicesWithManifest).toBe(1)
    expect(audit.summary.cannotClaimRequirements).toBeGreaterThan(0)
    expect(audit.nextLocalSafeAction?.gate).toBe('local-evidence')
    expect(audit.nextPhoneAction?.gate).toBe('phone-preview')
    expect(audit.nextUnsafeToAutomateAction?.gate).toBe('authenticated-pc-editor')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('unsafe-to-automate')
    expect(requirementStatus.get('phone-preview-readback')).toBe('blocked-by-external')
    expect(requirementStatus.get('dark-mode-check')).toBe('blocked-by-external')
    expect(requirementStatus.get('cover-thumbnail-check')).toBe('blocked-by-external')
    expect(requirementStatus.get('sync-readback')).toBe('unsafe-to-automate')
    expect(requirementStatus.get('scheduled-send-readback')).toBe('unsafe-to-automate')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('unsafe-to-automate')
    expect(cannotClaimIds).toEqual(expect.arrayContaining([
      'pc-editor-paste-event',
      'phone-preview-readback',
      'dark-mode-check',
      'cover-thumbnail-check',
      'sync-readback',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
  })

  it('surfaces session and editor DOM issue ids in acceptance cannot-claim rows', () => {
    const manifests: StyleProofManifest[] = [
      {
        platform: 'wechat',
        choiceId: 'wechat-classic-inline',
        scope: 'style-choice',
        claimedEvidence: ['pc-editor-dom-readable'],
        artifactFingerprint: 'sha256:redacted-expired-session-dom',
        artifacts: [
          {
            id: 'expired-session-editor-url',
            requirementId: 'authenticated-editor-url',
            kind: 'browser-readback',
            label: 'expired session URL is not authenticated editor proof',
            evidenceLabel: 'pc-editor-dom-readable',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'platform-editor',
            action: 'authenticated-editor-opened',
            readback: 'dom',
            artifactFingerprint: 'sha256:redacted-expired-session-dom',
            safeForCommit: true,
          },
          {
            id: 'expired-session-editor-dom',
            requirementId: 'pc-editor-dom-readback',
            kind: 'browser-readback',
            label: 'expired session DOM is not verified editor body proof',
            evidenceLabel: 'pc-editor-dom-readable',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'platform-editor',
            action: 'pc-editor-dom-readback',
            readback: 'dom',
            artifactFingerprint: 'sha256:redacted-expired-session-dom',
            mojibakeFreeVerified: true,
            safeForCommit: true,
          },
          {
            id: 'expired-session-sensitive-hygiene',
            requirementId: 'no-sensitive-artifact',
            kind: 'hygiene-review',
            label: 'redacted sensitive hygiene proof',
            evidenceLabel: 'pc-editor-dom-readable',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'local-artifact',
            action: 'sensitive-hygiene-review',
            readback: 'hygiene-log',
            artifactFingerprint: 'sha256:redacted-expired-session-dom',
            safeForCommit: true,
          },
        ],
      },
    ]

    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', manifests)
    const authenticatedUrlAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'authenticated-editor-url',
    )
    const pcDomAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'pc-editor-dom-readback',
    )

    expect(authenticatedUrlAudit?.status).toBe('unsafe-to-automate')
    expect(authenticatedUrlAudit?.issueIds).toContain('style-proof-manifest-authenticated-session-not-verified')
    expect(pcDomAudit?.status).toBe('unsafe-to-automate')
    expect(pcDomAudit?.issueIds).toEqual(expect.arrayContaining([
      'style-proof-manifest-authenticated-session-not-verified',
      'style-proof-manifest-platform-editor-dom-not-verified',
    ]))
  })

  it('reports cross-platform acceptance gaps without leaking manifest proof between platforms', () => {
    const manifests: StyleProofManifest[] = [
      {
        platform: 'wechat',
        choiceId: 'wechat-click-reveal',
        scope: 'style-choice',
        claimedEvidence: ['pc-editor-paste', 'mobile-preview', 'credentialed-sync', 'published'],
        artifactFingerprint: 'sha256:redacted-weak-click',
        artifacts: [
          {
            id: 'weak-audit-phone-from-pc-dom',
            requirementId: 'phone-preview-readback',
            kind: 'editor-readback',
            label: 'PC DOM cannot prove phone preview',
            evidenceLabel: 'pc-editor-dom-readable',
            platform: 'wechat',
            choiceId: 'wechat-click-reveal',
            channel: 'platform-editor',
            action: 'pc-editor-dom-readback',
            readback: 'visual-and-dom',
            artifactFingerprint: 'sha256:redacted-weak-click',
            exactArtifact: true,
            safeForCommit: true,
          },
          {
            id: 'weak-audit-publish-from-pc-editor',
            requirementId: 'published-url-or-platform-preview',
            kind: 'published-preview',
            label: 'PC editor preview cannot prove published platform preview',
            evidenceLabel: 'pc-editor-paste',
            platform: 'wechat',
            choiceId: 'wechat-click-reveal',
            channel: 'platform-editor',
            action: 'published-preview',
            readback: 'visual-and-dom',
            artifactFingerprint: 'sha256:redacted-weak-click',
            safeForCommit: true,
          },
        ],
      },
      {
        platform: 'xiaohongshu',
        choiceId: 'xhs-clean-text',
        scope: 'style-choice',
        claimedEvidence: ['unit-tested'],
        artifacts: [
          {
            id: 'xhs-audit-unit-proof',
            requirementId: 'unit-test-coverage',
            kind: 'test-log',
            label: 'xhs unit proof',
            platform: 'xiaohongshu',
            choiceId: 'xhs-clean-text',
            channel: 'unit-test',
            action: 'test-run',
            readback: 'test-assertion',
            safeForCommit: true,
          },
        ],
      },
      {
        platform: 'zhihu',
        choiceId: 'zhihu-data-table',
        scope: 'style-choice',
        claimedEvidence: ['unit-tested'],
        artifacts: [
          {
            id: 'zhihu-audit-unit-proof',
            requirementId: 'unit-test-coverage',
            kind: 'test-log',
            label: 'zhihu unit proof',
            platform: 'zhihu',
            choiceId: 'zhihu-data-table',
            channel: 'unit-test',
            action: 'test-run',
            readback: 'test-assertion',
            safeForCommit: true,
          },
        ],
      },
    ]

    const audit = getStyleProofAcceptanceAuditReport(manifests)
    const wechatRequirementStatus = new Map(
      audit.platformReports.wechat.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const xhsRequirementStatus = new Map(
      audit.platformReports.xiaohongshu.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const zhihuRequirementStatus = new Map(
      audit.platformReports.zhihu.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(audit.summary.manifestCount).toBe(3)
    expect(audit.platformReports.wechat.progress.summary.choicesWithManifest).toBe(1)
    expect(audit.platformReports.wechat.progress.ignoredManifestCount).toBe(2)
    expect(audit.platformReports.xiaohongshu.progress.summary.choicesWithManifest).toBe(1)
    expect(audit.platformReports.xiaohongshu.progress.ignoredManifestCount).toBe(2)
    expect(audit.platformReports.zhihu.progress.summary.choicesWithManifest).toBe(1)
    expect(audit.platformReports.zhihu.progress.ignoredManifestCount).toBe(2)
    expect(wechatRequirementStatus.get('phone-preview-readback')).toBe('invalid')
    expect(wechatRequirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(xhsRequirementStatus.get('published-url-or-platform-preview')).toBe('unsafe-to-automate')
    expect(zhihuRequirementStatus.get('public-image-host')).toBe('blocked-by-external')
    expect(zhihuRequirementStatus.get('zhihu-artifact-manifest')).toBe('invalid')
    expect(audit.summary.cannotClaimRequirements).toBeGreaterThan(audit.summary.completedRequirements)
    expect(audit.summary.unsafeToAutomateRequirements).toBeGreaterThan(0)
    expect(audit.summary.blockedByExternalRequirements).toBeGreaterThan(0)
  })

  it('builds committed local evidence manifests without claiming external style proof gates', () => {
    const manifests = getCommittedStyleProofLocalEvidenceManifests()
    const secondRead = getCommittedStyleProofLocalEvidenceManifests()
    const choiceIds = manifests.map(manifest => manifest.choiceId)
    const artifactIds = manifests.flatMap(manifest => manifest.artifacts.map(artifact => artifact.id))
    const artifactRefs = manifests.flatMap(manifest =>
      manifest.artifacts.map(artifact => artifact.artifactRef).filter((ref): ref is string => Boolean(ref)),
    )

    expect(manifests).toHaveLength(4)
    expect(secondRead[0]).not.toBe(manifests[0])
    expect(secondRead[0]?.artifacts[0]).not.toBe(manifests[0]?.artifacts[0])
    expect(choiceIds).toEqual([
      'wechat-flagship-kiln',
      'wechat-flagship-tempera',
      'wechat-flagship-amber',
      'xhs-cover-carousel',
    ])
    expect(new Set(artifactIds).size).toBe(artifactIds.length)
    expect(manifests.every(manifest =>
      manifest.scope === 'style-choice'
      && manifest.claimedEvidence.includes('unit-tested')
      && manifest.claimedEvidence.includes('local-browser')
    )).toBe(true)
    expect(manifests.flatMap(manifest => manifest.artifacts).every(artifact =>
      artifact.committed === true && artifact.safeForCommit === true,
    )).toBe(true)
    expect(artifactRefs.every(ref => ref.startsWith('prompts/0601/evidence/'))).toBe(true)

    const packReport = getStyleProofManifestPackReport(manifests)
    const issueIds = packReport.issues.map(issue => issue.id)
    const wechatProgress = packReport.platformReports.wechat
    const kilnProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-flagship-kiln')
    const temperaProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-flagship-tempera')
    const amberProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')
    const kilnRequirementStatus = new Map(
      kilnProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )

    expect(packReport.summary).toMatchObject({
      manifestCount: 4,
      validManifestCount: 0,
      invalidManifestCount: 4,
      usableManifestCount: 4,
      artifactCount: 17,
      duplicateArtifactIdCount: 0,
    })
    expect(issueIds).not.toContain('style-proof-manifest-sensitive-artifact')
    expect(issueIds).not.toContain('style-proof-manifest-unsafe-commit-artifact')
    expect(issueIds).not.toContain('style-proof-manifest-pack-artifact-id-duplicate')
    expect(wechatProgress.ignoredManifestCount).toBe(1)
    expect(wechatProgress.summary.choicesWithManifest).toBe(3)
    expect(wechatProgress.summary.proofSatisfiedChoices).toBe(0)
    expect(wechatProgress.summary.proofInvalidChoices).toBeGreaterThan(0)

    expect(kilnProgress?.manifestCount).toBe(1)
    expect(kilnProgress?.status).toBe('missing')
    expect(kilnProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status).toBe('satisfied')
    expect(kilnProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status).toBe('satisfied')
    expect(kilnRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(kilnRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(kilnRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(kilnRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(kilnRequirementStatus.get('pc-editor-paste-event')).toBe('missing')
    expect(kilnRequirementStatus.get('phone-preview-readback')).toBe('missing')
    expect(kilnRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

    expect(temperaProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status).toBe('satisfied')
    expect(temperaProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status).toBe('satisfied')
    expect(amberProgress?.blockedByCatalog).toBe(true)
    expect(amberProgress?.status).toBe('invalid')
    expect(amberProgress?.report.issues.map(issue => issue.id)).toContain('style-proof-manifest-choice-blocked')

    const xhsProgress = packReport.platformReports.xiaohongshu
    const xhsCoverProgress = xhsProgress.choices.find(choice => choice.choice.id === 'xhs-cover-carousel')
    const xhsArtifactManifest = xhsCoverProgress?.manifest.artifacts.find(artifact =>
      artifact.requirementId === 'xhs-artifact-manifest'
    )
    const xhsRequirementStatus = new Map(
      xhsCoverProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )

    expect(xhsProgress.ignoredManifestCount).toBe(3)
    expect(xhsProgress.summary.choicesWithManifest).toBe(1)
    expect(xhsCoverProgress?.manifestCount).toBe(1)
    expect(xhsCoverProgress?.status).toBe('missing')
    expect(xhsCoverProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status).toBe('satisfied')
    expect(xhsCoverProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status).toBe('satisfied')
    expect(xhsCoverProgress?.gates.find(gate => gate.gate === 'platform-publish')?.status).toBe('missing')
    expect(xhsRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(xhsRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(xhsRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(xhsRequirementStatus.get('xhs-artifact-manifest')).toBe('satisfied')
    expect(xhsArtifactManifest?.artifactManifestValidated).toBe(true)
    expect(xhsRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(xhsRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

    const audit = getCommittedStyleProofLocalEvidenceAuditReport()
    const wechatAudit = audit.platformReports.wechat
    const xhsAudit = audit.platformReports.xiaohongshu
    const cannotClaimIds = wechatAudit.cannotClaim.map(requirement => requirement.requirement.id)
    const xhsCannotClaimIds = xhsAudit.cannotClaim.map(requirement => requirement.requirement.id)

    expect(audit.summary.manifestCount).toBe(4)
    expect(wechatAudit.progress.summary.choicesWithManifest).toBe(3)
    expect(xhsAudit.progress.summary.choicesWithManifest).toBe(1)
    expect(wechatAudit.summary.cannotClaimRequirements).toBeGreaterThan(0)
    expect(xhsAudit.summary.cannotClaimRequirements).toBeGreaterThan(0)
    expect(wechatAudit.nextPhoneAction?.gate).toBe('phone-preview')
    expect(wechatAudit.nextUnsafeToAutomateAction?.gate).toBe('authenticated-pc-editor')
    expect(xhsAudit.nextUnsafeToAutomateAction?.gate).toBe('platform-publish')
    expect(cannotClaimIds).toEqual(expect.arrayContaining([
      'pc-editor-paste-event',
      'phone-preview-readback',
      'dark-mode-check',
      'cover-thumbnail-check',
      'sync-readback',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
    expect(xhsCannotClaimIds).toContain('published-url-or-platform-preview')
  })

  it('builds style proof execution runbooks with exact external proof contracts', () => {
    const runbook = getPlatformStyleProofExecutionRunbook(
      'wechat',
      getCommittedStyleProofLocalEvidenceManifests(),
    )
    const pcPasteStep = runbook.steps.find(step => step.requirement.id === 'pc-editor-paste-event')
    const pcDomStep = runbook.steps.find(step => step.requirement.id === 'pc-editor-dom-readback')
    const phoneStep = runbook.steps.find(step => step.requirement.id === 'phone-preview-readback')
    const darkModeStep = runbook.steps.find(step => step.requirement.id === 'dark-mode-check')
    const coverStep = runbook.steps.find(step => step.requirement.id === 'cover-thumbnail-check')
    const credentialedStep = runbook.steps.find(step => step.requirement.id === 'credentialed-channel-response')
    const syncStep = runbook.steps.find(step => step.requirement.id === 'sync-readback')
    const scheduledSendStep = runbook.steps.find(step => step.requirement.id === 'scheduled-send-readback')
    const publishStep = runbook.steps.find(step => step.requirement.id === 'published-url-or-platform-preview')

    expect(runbook.platform).toBe('wechat')
    expect(runbook.summary.cannotClaimSteps).toBeGreaterThan(0)
    expect(runbook.nextPhoneStep?.gate).toBe('phone-preview')
    expect(runbook.nextUnsafeToAutomateStep?.gate).toBe('authenticated-pc-editor')
    expect(pcPasteStep?.status).toBe('unsafe-to-automate')
    expect(pcPasteStep?.boundary).toBe('authenticated-pc-editor')
    expect(pcPasteStep?.requiredArtifact.requiredChannels).toEqual(['platform-editor'])
    expect(pcPasteStep?.requiredArtifact.requiredActions).toEqual(['pc-paste'])
    expect(pcPasteStep?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'artifactFingerprint',
      'exactArtifact',
      'authenticatedSessionVerified',
      'platformEditorTargetVerified',
      'platformEditorSurfaceVerified',
      'platformEditorDomVerified',
      'ordinaryClipboardPasteVerified',
      'sameEditorTabVerified',
      'pasteInputEventVerified',
      'editorBodyMutationVerified',
      'mojibakeFreeVerified',
      'safeForCommit',
    ]))
    expect(pcPasteStep?.cannotClaimReason).toContain('cannot be claimed')
    expect(pcPasteStep?.redactionBoundary).toContain('account')
    expect(pcDomStep?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'authenticatedSessionVerified',
      'platformEditorTargetVerified',
      'platformEditorSurfaceVerified',
      'platformEditorDomVerified',
      'safeForCommit',
    ]))

    expect(phoneStep?.status).toBe('blocked-by-external')
    expect(phoneStep?.boundary).toBe('phone-preview')
    expect(phoneStep?.requiresPhone).toBe(true)
    expect(phoneStep?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'phonePreviewContentVerified',
      'exactArtifact',
    ]))
    expect(phoneStep?.failureSignals.join(' ')).toContain('PC editor DOM')
    expect(phoneStep?.failureSignals.join(' ')).toContain('Phone preview scan entries')
    expect(phoneStep?.failureSignals.join(' ')).toContain('PC preview shells')
    expect(darkModeStep?.requiredArtifact.requiredFields).toContain('darkModeEnabledVerified')
    expect(darkModeStep?.failureSignals.join(' ')).toContain('Dark Mode settings page')
    expect(darkModeStep?.failureSignals.join(' ')).toContain('mobile Dark Mode enabled')
    expect(coverStep?.requiredArtifact.requiredFields).toContain('coverThumbnailAccepted')
    expect(coverStep?.failureSignals.join(' ')).toContain('Cover crop panels')
    expect(coverStep?.failureSignals.join(' ')).toContain('phone share')
    expect(credentialedStep?.status).toBe('unsafe-to-automate')
    expect(credentialedStep?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'exactArtifact',
      'externalAccountAuthenticated',
    ]))
    expect(credentialedStep?.failureSignals.join(' ')).toContain('different artifact')
    expect(syncStep?.status).toBe('unsafe-to-automate')
    expect(syncStep?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'exactArtifact',
      'externalAccountAuthenticated',
    ]))
    expect(syncStep?.failureSignals.join(' ')).toContain('material readbacks')
    expect(scheduledSendStep?.status).toBe('unsafe-to-automate')
    expect(scheduledSendStep?.mutatesPlatform).toBe(true)
    expect(scheduledSendStep?.requiredArtifact.requiredActions).toEqual(['scheduled-send'])
    expect(scheduledSendStep?.requiredArtifact.requiredReadbacks).toEqual(expect.arrayContaining(['scheduled-send-state']))
    expect(scheduledSendStep?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'exactArtifact',
      'externalAccountAuthenticated',
      'scheduledSendVerified',
    ]))
    expect(scheduledSendStep?.failureSignals.join(' ')).toContain('Credentialed sync responses')
    expect(scheduledSendStep?.failureSignals.join(' ')).toContain('scheduled-send state')
    expect(publishStep?.status).toBe('unsafe-to-automate')
    expect(publishStep?.mutatesPlatform).toBe(true)
    expect(publishStep?.requiredArtifact.requiredReadbacks).toEqual(expect.arrayContaining(['published-url']))
  })

  it('builds committed WeChat PC evidence manifests without claiming phone or publish proof', () => {
    const manifests = getCommittedStyleProofWechatPcEvidenceManifests()
    const secondRead = getCommittedStyleProofWechatPcEvidenceManifests()
    const amberManifest = manifests.find(manifest => manifest.choiceId === 'wechat-flagship-amber')
    const temperaManifest = manifests.find(manifest => manifest.choiceId === 'wechat-flagship-tempera')

    expect(manifests).toHaveLength(2)
    expect(secondRead[0]).not.toBe(manifests[0])
    expect(secondRead[0]?.artifacts[0]).not.toBe(manifests[0]?.artifacts[0])
    expect(amberManifest?.platform).toBe('wechat')
    expect(temperaManifest?.platform).toBe('wechat')
    expect(amberManifest?.scope).toBe('style-choice')
    expect(temperaManifest?.scope).toBe('style-choice')
    expect(amberManifest?.artifactFingerprint).toBe(
      'sha256:09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d',
    )
    expect(temperaManifest?.artifactFingerprint).toBe(
      'sha256:f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878',
    )
    expect(amberManifest?.claimedEvidence).toEqual(['pc-editor-dom-readable', 'pc-editor-paste'])
    expect(temperaManifest?.claimedEvidence).toEqual(['pc-editor-dom-readable', 'pc-editor-paste'])

    for (const manifest of manifests) {
      const artifactIds = manifest.artifacts.map(artifact => artifact.id)
      expect(new Set(artifactIds).size).toBe(artifactIds.length)
      expect(manifest.artifacts.every(artifact =>
        artifact.committed === true
        && artifact.safeForCommit === true
        && artifact.artifactFingerprint === manifest.artifactFingerprint
      )).toBe(true)
    }
    expect(amberManifest?.artifacts.every(artifact =>
      artifact.artifactRef === 'prompts/0601/evidence/wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt'
    )).toBe(true)
    expect(temperaManifest?.artifacts.every(artifact =>
      artifact.artifactRef === 'prompts/0601/evidence/wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt'
    )).toBe(true)

    const packReport = getStyleProofManifestPackReport(manifests)
    const wechatProgress = packReport.platformReports.wechat
    const amberProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')
    const temperaProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-flagship-tempera')
    const amberRequirementStatus = new Map(
      amberProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )
    const temperaRequirementStatus = new Map(
      temperaProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )
    const issueIds = packReport.issues.map(issue => issue.id)
    const amberReportIssueIds = amberProgress?.report.issues.map(issue => issue.id) ?? []
    const temperaReportIssueIds = temperaProgress?.report.issues.map(issue => issue.id) ?? []

    expect(packReport.summary).toMatchObject({
      manifestCount: 2,
      usableManifestCount: 2,
      artifactCount: 12,
      duplicateArtifactIdCount: 0,
    })
    expect(issueIds).not.toContain('style-proof-manifest-pack-fingerprint-mismatch')
    expect(issueIds).not.toContain('style-proof-manifest-pack-artifact-id-duplicate')
    expect(amberReportIssueIds).toContain('style-proof-manifest-choice-blocked')
    expect(temperaReportIssueIds).not.toContain('style-proof-manifest-choice-blocked')
    expect([...amberReportIssueIds, ...temperaReportIssueIds]).not.toContain('style-proof-manifest-sensitive-artifact')
    expect([...amberReportIssueIds, ...temperaReportIssueIds]).not.toContain('style-proof-manifest-unsafe-commit-artifact')
    expect(wechatProgress.ignoredManifestCount).toBe(0)
    expect(wechatProgress.summary.choicesWithManifest).toBe(2)
    expect(amberProgress?.blockedByCatalog).toBe(true)
    expect(amberProgress?.status).toBe('invalid')
    expect(temperaProgress?.blockedByCatalog).toBe(false)
    expect(temperaProgress?.status).toBe('missing')
    expect(amberProgress?.gates.find(gate => gate.gate === 'authenticated-pc-editor')?.satisfied)
      .toBeGreaterThan(0)
    expect(temperaProgress?.gates.find(gate => gate.gate === 'authenticated-pc-editor')?.satisfied)
      .toBeGreaterThan(0)
    for (const requirementStatus of [amberRequirementStatus, temperaRequirementStatus]) {
      expect(requirementStatus.get('authenticated-editor-url')).toBe('satisfied')
      expect(requirementStatus.get('pc-editor-dom-readback')).toBe('satisfied')
      expect(requirementStatus.get('exact-artifact')).toBe('satisfied')
      expect(requirementStatus.get('safe-disposable-draft')).toBe('satisfied')
      expect(requirementStatus.get('pc-editor-paste-event')).toBe('satisfied')
      expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
      expect(requirementStatus.get('phone-preview-readback')).toBe('missing')
      expect(requirementStatus.get('dark-mode-check')).toBe('missing')
      expect(requirementStatus.get('cover-thumbnail-check')).toBe('missing')
      expect(requirementStatus.get('scheduled-send-readback')).toBe('missing')
      expect(requirementStatus.get('published-url-or-platform-preview')).toBe('missing')
    }

    const audit = getCommittedStyleProofWechatPcEvidenceAuditReport()
    const wechatAudit = audit.platformReports.wechat
    const cannotClaimIds = wechatAudit.cannotClaim.map(requirement => requirement.requirement.id)

    expect(audit.summary.manifestCount).toBe(2)
    expect(wechatAudit.progress.summary.choicesWithManifest).toBe(2)
    expect(wechatAudit.progress.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')?.status)
      .toBe('invalid')
    expect(wechatAudit.progress.choices.find(choice => choice.choice.id === 'wechat-flagship-tempera')?.status)
      .toBe('missing')
    expect(cannotClaimIds).toEqual(expect.arrayContaining([
      'phone-preview-readback',
      'dark-mode-check',
      'cover-thumbnail-check',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
  })

  it('keeps style proof execution runbooks isolated by platform and host gate', () => {
    const manifests: StyleProofManifest[] = [
      {
        platform: 'xiaohongshu',
        choiceId: 'xhs-clean-text',
        scope: 'style-choice',
        claimedEvidence: ['unit-tested'],
        artifacts: [
          {
            id: 'xhs-runbook-unit-proof',
            requirementId: 'unit-test-coverage',
            kind: 'test-log',
            label: 'xhs unit proof',
            platform: 'xiaohongshu',
            choiceId: 'xhs-clean-text',
            channel: 'unit-test',
            action: 'test-run',
            readback: 'test-assertion',
            safeForCommit: true,
          },
        ],
      },
    ]

    const runbook = getStyleProofExecutionRunbook(manifests)
    const wechatPcPaste = runbook.platformReports.wechat.steps.find(step =>
      step.requirement.id === 'pc-editor-paste-event'
    )
    const xhsPublish = runbook.platformReports.xiaohongshu.steps.find(step =>
      step.requirement.id === 'published-url-or-platform-preview'
    )
    const xhsArtifactManifest = runbook.platformReports.xiaohongshu.steps.find(step =>
      step.requirement.id === 'xhs-artifact-manifest'
    )
    const zhihuPublicHost = runbook.platformReports.zhihu.steps.find(step =>
      step.requirement.id === 'public-image-host'
    )
    const zhihuArtifactManifest = runbook.platformReports.zhihu.steps.find(step =>
      step.requirement.id === 'zhihu-artifact-manifest'
    )

    expect(runbook.summary.manifestCount).toBe(1)
    expect(runbook.platformReports.wechat.acceptance.progress.ignoredManifestCount).toBe(1)
    expect(runbook.platformReports.xiaohongshu.acceptance.progress.ignoredManifestCount).toBe(0)
    expect(wechatPcPaste?.status).toBe('unsafe-to-automate')
    expect(xhsPublish?.status).toBe('unsafe-to-automate')
    expect(xhsPublish?.boundary).toBe('platform-publish')
    expect(xhsArtifactManifest?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'artifactRef',
      'artifactManifestValidated',
      'safeForCommit',
    ]))
    expect(xhsArtifactManifest?.nextOperatorAction).toContain('validateXhsImageArtifactManifest()')
    expect(xhsArtifactManifest?.successCriteria.join(' ')).toContain('artifactManifestValidated:true')
    expect(xhsArtifactManifest?.failureSignals.join(' ')).toContain('validateXhsImageArtifactManifest()')
    expect(zhihuPublicHost?.status).toBe('blocked-by-external')
    expect(zhihuPublicHost?.boundary).toBe('public-host')
    expect(zhihuPublicHost?.requiredArtifact.acceptedHostStatuses).toEqual([
      'public-https',
      'platform-hosted',
    ])
    expect(zhihuPublicHost?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'artifactRef',
      'hostStatus',
      'safeForCommit',
    ]))
    expect(zhihuArtifactManifest?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'artifactRef',
      'artifactManifestValidated',
      'safeForCommit',
    ]))
    expect(zhihuArtifactManifest?.nextOperatorAction).toContain('validateZhihuImageArtifactManifest()')
    expect(zhihuArtifactManifest?.failureSignals.join(' ')).toContain('validateZhihuImageArtifactManifest()')
  })

  it('rejects missing required proof artifacts for claimed PC editor paste evidence', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-paste'],
      artifacts: [
        {
          id: 'pc-dom-only',
          requirementId: 'pc-editor-dom-readback',
          kind: 'editor-readback',
          label: 'read-only PC editor DOM probe',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-editor-dom-readback',
          readback: 'visual-and-dom',
          safeForCommit: true,
        },
      ],
    }
    const issues = validateStyleProofManifest(manifest)

    expect(issues.map(issue => issue.id)).toContain('style-proof-manifest-requirement-missing')
    expect(issues.map(issue => issue.location)).toEqual(expect.arrayContaining([
      'exact-artifact',
      'safe-disposable-draft',
      'pc-editor-paste-event',
      'no-sensitive-artifact',
    ]))

    const report = getStyleProofManifestReport(manifest)
    expect(report.valid).toBe(false)
    expect(report.summary.missing).toBe(4)
    expect(report.summary.invalid).toBe(1)
    expect(report.requirements.find(item =>
      item.requirement.id === 'pc-editor-dom-readback',
    )?.status).toBe('invalid')
    expect(report.requirements.find(item =>
      item.requirement.id === 'exact-artifact',
    )?.status).toBe('missing')
    expect(report.artifacts[0]?.status).toBe('invalid')
  })

  it('requires safe draft cleanup proof before accepting PC editor paste evidence', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-classic-paste',
      artifacts: [
        {
          id: 'classic-exact-artifact',
          requirementId: 'exact-artifact',
          kind: 'doc-reference',
          label: 'redacted exact artifact proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          exactArtifact: true,
          safeForCommit: true,
        },
        {
          id: 'classic-disposable-draft-without-cleanup',
          requirementId: 'safe-disposable-draft',
          kind: 'editor-readback',
          label: 'redacted disposable draft proof without cleanup',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'safe-disposable-draft',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          disposableDraft: true,
          safeForCommit: true,
        },
        {
          id: 'classic-pc-paste',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'redacted PC paste proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          exactArtifact: true,
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          platformEditorDomVerified: true,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: true,
          pasteInputEventVerified: true,
          editorBodyMutationVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
        {
          id: 'classic-pc-dom',
          requirementId: 'pc-editor-dom-readback',
          kind: 'editor-readback',
          label: 'redacted PC editor DOM proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-editor-dom-readback',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          platformEditorDomVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
        {
          id: 'classic-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted sensitive hygiene proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const safeDraftAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'safe-disposable-draft'
    )

    expect(report.valid).toBe(false)
    expect(report.summary.missing).toBe(0)
    expect(requirementStatus.get('safe-disposable-draft')).not.toBe('satisfied')
    expect(safeDraftAudit?.status).toBe('invalid')
    expect(safeDraftAudit?.issueIds).toContain('style-proof-manifest-cleanup-path-missing')
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-cleanup-path-missing')
    expect(report.issues.map(issue => issue.id)).not.toContain('style-proof-manifest-disposable-draft-missing')
  })

  it('rejects draftbox cleanup affordance notes as safe disposable draft proof', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-draftbox-affordance',
      artifacts: [
        {
          id: 'draftbox-delete-affordance-note',
          requirementId: 'safe-disposable-draft',
          kind: 'doc-reference',
          label: 'draftbox delete confirmation affordance is not cleanup proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'docs',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-draftbox-affordance',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)

    expect(report.valid).toBe(false)
    expect(requirementStatus.get('safe-disposable-draft')).not.toBe('satisfied')
    expect(issueIds).toContain('style-proof-manifest-disposable-draft-missing')
    expect(issueIds).toContain('style-proof-manifest-cleanup-path-missing')
  })

  it('rejects login or expired-session pages as authenticated editor reachability proof', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['authenticated-editor-reachable'],
      artifactFingerprint: 'sha256:redacted-session-expired',
      artifacts: [
        {
          id: 'wechat-relogin-page',
          requirementId: 'authenticated-editor-url',
          kind: 'browser-readback',
          label: 'WeChat relogin page is not authenticated editor reachability',
          evidenceLabel: 'authenticated-editor-reachable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-session-expired',
          safeForCommit: true,
        },
        {
          id: 'session-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted sensitive hygiene proof',
          evidenceLabel: 'authenticated-editor-reachable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-session-expired',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)

    expect(report.valid).toBe(false)
    expect(requirementStatus.get('authenticated-editor-url')).toBe('invalid')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(issueIds).toContain('style-proof-manifest-authenticated-session-not-verified')
  })

  it('rejects PC editor DOM-like proof without authenticated session and editor DOM verification flags', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-dom-readable'],
      artifactFingerprint: 'sha256:redacted-pc-dom-login-page',
      artifacts: [
        {
          id: 'wechat-editor-url-without-session',
          requirementId: 'authenticated-editor-url',
          kind: 'browser-readback',
          label: 'URL open without authenticated session cannot prove editor reachability',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-pc-dom-login-page',
          safeForCommit: true,
        },
        {
          id: 'wechat-editor-dom-without-verified-nodes',
          requirementId: 'pc-editor-dom-readback',
          kind: 'browser-readback',
          label: 'DOM readback without authenticated editor nodes cannot prove PC editor DOM',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-editor-dom-readback',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-pc-dom-login-page',
          safeForCommit: true,
        },
        {
          id: 'pc-dom-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted sensitive hygiene proof',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-pc-dom-login-page',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)

    expect(report.valid).toBe(false)
    expect(requirementStatus.get('authenticated-editor-url')).toBe('invalid')
    expect(requirementStatus.get('pc-editor-dom-readback')).toBe('invalid')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(issueIds).toContain('style-proof-manifest-authenticated-session-not-verified')
    expect(issueIds).toContain('style-proof-manifest-platform-editor-target-not-verified')
    expect(issueIds).toContain('style-proof-manifest-platform-editor-dom-not-verified')
  })

  it('rejects authenticated draftbox create-menu readback as article editor target proof', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-dom-readable'],
      artifactFingerprint: 'sha256:redacted-draftbox-create-menu',
      artifacts: [
        {
          id: 'draftbox-create-menu-authenticated-shell',
          requirementId: 'authenticated-editor-url',
          kind: 'browser-readback',
          label: 'authenticated draftbox create menu is not the article editor target',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-draftbox-create-menu',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: false,
          safeForCommit: true,
        },
        {
          id: 'draftbox-article-menu-no-editor-dom',
          requirementId: 'pc-editor-dom-readback',
          kind: 'browser-readback',
          label: 'article menu click attempts left editor selectors and contenteditable body absent',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-editor-dom-readback',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-draftbox-create-menu',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: false,
          platformEditorDomVerified: false,
          safeForCommit: true,
        },
        {
          id: 'draftbox-create-menu-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted sensitive hygiene proof',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-draftbox-create-menu',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)

    expect(report.valid).toBe(false)
    expect(requirementStatus.get('authenticated-editor-url')).toBe('invalid')
    expect(requirementStatus.get('pc-editor-dom-readback')).toBe('invalid')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(issueIds).not.toContain('style-proof-manifest-authenticated-session-not-verified')
    expect(issueIds).toContain('style-proof-manifest-platform-editor-target-not-verified')
    expect(issueIds).toContain('style-proof-manifest-platform-editor-dom-not-verified')
  })

  it('rejects PC editor DOM readback that never verifies the main editor body surface', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-dom-readable'],
      artifactFingerprint: 'sha256:redacted-title-or-hidden-frame-dom',
      artifacts: [
        {
          id: 'wechat-editor-url-with-authenticated-target',
          requirementId: 'authenticated-editor-url',
          kind: 'browser-readback',
          label: 'authenticated article editor route readback',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-title-or-hidden-frame-dom',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          safeForCommit: true,
        },
        {
          id: 'wechat-editor-dom-without-body-surface',
          requirementId: 'pc-editor-dom-readback',
          kind: 'browser-readback',
          label: 'editor DOM readback without main body ProseMirror surface proof',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-editor-dom-readback',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-title-or-hidden-frame-dom',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorDomVerified: true,
          safeForCommit: true,
        },
        {
          id: 'pc-dom-surface-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted sensitive hygiene proof',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-title-or-hidden-frame-dom',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)

    expect(report.valid).toBe(false)
    expect(requirementStatus.get('authenticated-editor-url')).toBe('satisfied')
    expect(requirementStatus.get('pc-editor-dom-readback')).toBe('invalid')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(issueIds).toContain('style-proof-manifest-platform-editor-surface-not-verified')
    expect(issueIds).not.toContain('style-proof-manifest-authenticated-session-not-verified')
    expect(issueIds).not.toContain('style-proof-manifest-platform-editor-target-not-verified')
    expect(issueIds).not.toContain('style-proof-manifest-platform-editor-dom-not-verified')
  })

  it('rejects OS click calibration diagnostics as safe draft or ordinary paste proof', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-os-click-calibration-abort',
      artifacts: [
        {
          id: 'os-click-calibration-exact-artifact',
          requirementId: 'exact-artifact',
          kind: 'doc-reference',
          label: 'redacted exact artifact reference',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-os-click-calibration-abort',
          exactArtifact: true,
          safeForCommit: true,
        },
        {
          id: 'os-click-calibration-authenticated-shell',
          requirementId: 'authenticated-editor-url',
          kind: 'browser-readback',
          label: 'OS click hit test reached an authenticated shell but not a verified article editor target',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-os-click-calibration-abort',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: false,
          safeForCommit: true,
        },
        {
          id: 'os-click-calibration-no-paste',
          requirementId: 'pc-editor-paste-event',
          kind: 'test-log',
          label: 'Win32 click calibration did not open editor, create draft, paste, or mutate body',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-os-click-calibration-abort',
          ordinaryClipboardPasteVerified: false,
          platformEditorTargetVerified: false,
          sameEditorTabVerified: false,
          pasteInputEventVerified: false,
          editorBodyMutationVerified: false,
          mojibakeFreeVerified: false,
          safeForCommit: true,
        },
        {
          id: 'os-click-calibration-no-safe-draft',
          requirementId: 'safe-disposable-draft',
          kind: 'test-log',
          label: 'Win32 click calibration did not create a disposable draft or verify cleanup',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'safe-disposable-draft',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-os-click-calibration-abort',
          disposableDraft: false,
          cleanupPathVerified: false,
          safeForCommit: true,
        },
        {
          id: 'os-click-calibration-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted sensitive hygiene proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-os-click-calibration-abort',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)

    expect(report.valid).toBe(false)
    expect(requirementStatus.get('safe-disposable-draft')).not.toBe('satisfied')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
    expect(requirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(issueIds).toContain('style-proof-manifest-platform-editor-target-not-verified')
    expect(issueIds).toContain('style-proof-manifest-disposable-draft-missing')
    expect(issueIds).toContain('style-proof-manifest-cleanup-path-missing')
    expect(issueIds).toContain('style-proof-manifest-ordinary-paste-not-verified')
    expect(issueIds).toContain('style-proof-manifest-paste-input-not-verified')
    expect(issueIds).toContain('style-proof-manifest-editor-body-not-mutated')
  })

  it('rejects programmatic ClipboardEvent proof as ordinary PC clipboard paste', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-classic-paste',
      artifacts: [
        {
          id: 'classic-exact-artifact',
          requirementId: 'exact-artifact',
          kind: 'doc-reference',
          label: 'redacted exact artifact proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          exactArtifact: true,
          safeForCommit: true,
        },
        {
          id: 'classic-disposable-draft',
          requirementId: 'safe-disposable-draft',
          kind: 'editor-readback',
          label: 'redacted disposable draft proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'safe-disposable-draft',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          disposableDraft: true,
          cleanupPathVerified: true,
          safeForCommit: true,
        },
        {
          id: 'programmatic-clipboardevent-paste',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'programmatic ClipboardEvent readback cannot prove ordinary Ctrl+V',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          exactArtifact: true,
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          platformEditorDomVerified: true,
          ordinaryClipboardPasteVerified: false,
          sameEditorTabVerified: true,
          pasteInputEventVerified: true,
          editorBodyMutationVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
        {
          id: 'classic-pc-dom',
          requirementId: 'pc-editor-dom-readback',
          kind: 'editor-readback',
          label: 'redacted PC editor DOM proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-editor-dom-readback',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          platformEditorDomVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
        {
          id: 'classic-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted sensitive hygiene proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint: 'sha256:redacted-classic-paste',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const pcPasteAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'pc-editor-paste-event'
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-ordinary-paste-not-verified')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
    expect(pcPasteAudit?.status).toBe('invalid')
    expect(pcPasteAudit?.issueIds).toContain('style-proof-manifest-ordinary-paste-not-verified')
    expect(requirementStatus.get('safe-disposable-draft')).toBe('satisfied')
    expect(requirementStatus.get('pc-editor-dom-readback')).toBe('satisfied')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
  })

  it('rejects local OS key probes without paste or input as ordinary PC clipboard paste', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-os-key-probe',
      artifacts: [
        {
          id: 'local-os-key-probe',
          requirementId: 'pc-editor-paste-event',
          kind: 'test-log',
          label: 'Win32 SendInput foreground and key count without paste/input/sentinel',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-os-key-probe',
          ordinaryClipboardPasteVerified: false,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-ordinary-paste-not-verified')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
  })

  it('keeps local keybd_event CF_HTML success separate from WeChat PC paste proof', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-local-keybd-cfhtml',
      artifacts: [
        {
          id: 'local-keybd-event-cfhtml-success',
          requirementId: 'pc-editor-paste-event',
          kind: 'test-log',
          label: 'local keybd_event Ctrl+V preserved CF_HTML SVG in controlled contenteditable',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-browser',
          action: 'pc-paste',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-local-keybd-cfhtml',
          exactArtifact: true,
          ordinaryClipboardPasteVerified: true,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-requirement-missing')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
  })

  it('rejects same-tab focused OS key evidence when no paste event or body mutation occurred', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-flagship-kiln-paste-safe',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-kiln-paste-safe-single-tab',
      artifacts: [
        {
          id: 'same-tab-no-paste-keybd-event',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'same-tab body-focused keybd_event left the WeChat body placeholder unchanged',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-flagship-kiln-paste-safe',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-kiln-paste-safe-single-tab',
          platformEditorTargetVerified: true,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: true,
          pasteInputEventVerified: false,
          editorBodyMutationVerified: false,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-paste-input-not-verified')
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-editor-body-not-mutated')
    expect(report.issues.map(issue => issue.id)).not.toContain('style-proof-manifest-platform-editor-target-not-verified')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
  })

  it('rejects wrong-tab or mojibake-damaged rich body readback as ordinary PC paste proof', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-flagship-kiln-paste-safe',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-kiln-paste-safe-wrong-tab',
      artifacts: [
        {
          id: 'wrong-tab-mojibake-readback',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'wrong visible tab received mojibake-damaged InkForge content',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-flagship-kiln-paste-safe',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-kiln-paste-safe-wrong-tab',
          platformEditorTargetVerified: false,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: false,
          pasteInputEventVerified: true,
          editorBodyMutationVerified: true,
          mojibakeFreeVerified: false,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-platform-editor-target-not-verified')
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-paste-editor-tab-not-verified')
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-paste-mojibake-not-ruled-out')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
  })

  it('rejects PC paste proof that never verifies the platform editor body surface', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-flagship-kiln-paste-safe',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-title-or-hidden-frame-paste',
      artifacts: [
        {
          id: 'title-or-hidden-frame-paste-readback',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'ordinary paste flags without main body ProseMirror surface proof',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-flagship-kiln-paste-safe',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-title-or-hidden-frame-paste',
          platformEditorTargetVerified: true,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: true,
          pasteInputEventVerified: true,
          editorBodyMutationVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-platform-editor-surface-not-verified')
    expect(report.issues.map(issue => issue.id)).not.toContain('style-proof-manifest-platform-editor-target-not-verified')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
  })

  it('rejects PC paste proof that lacks same-artifact exact auth and DOM binding', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-flagship-kiln-paste-safe',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-unbound-paste-proof',
      artifacts: [
        {
          id: 'unbound-paste-strong-flags',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'strong paste flags without exact authenticated DOM binding',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-flagship-kiln-paste-safe',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-unbound-paste-proof',
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: true,
          pasteInputEventVerified: true,
          editorBodyMutationVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)

    expect(report.valid).toBe(false)
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
    expect(issueIds).toContain('style-proof-manifest-exact-artifact-missing')
    expect(issueIds).toContain('style-proof-manifest-authenticated-session-not-verified')
    expect(issueIds).toContain('style-proof-manifest-platform-editor-dom-not-verified')
    expect(issueIds).not.toContain('style-proof-manifest-platform-editor-target-not-verified')
    expect(issueIds).not.toContain('style-proof-manifest-platform-editor-surface-not-verified')
    expect(issueIds).not.toContain('style-proof-manifest-ordinary-paste-not-verified')
    expect(issueIds).not.toContain('style-proof-manifest-paste-input-not-verified')
    expect(issueIds).not.toContain('style-proof-manifest-editor-body-not-mutated')
    expect(issueIds).not.toContain('style-proof-manifest-paste-mojibake-not-ruled-out')
    expect(issueIds).not.toContain('style-proof-manifest-safe-commit-not-verified')
  })

  it.each([
    ['authenticatedSessionVerified', 'style-proof-manifest-authenticated-session-not-verified'],
    ['platformEditorTargetVerified', 'style-proof-manifest-platform-editor-target-not-verified'],
    ['platformEditorSurfaceVerified', 'style-proof-manifest-platform-editor-surface-not-verified'],
    ['platformEditorDomVerified', 'style-proof-manifest-platform-editor-dom-not-verified'],
  ] as const)(
    'keeps PC paste proof missing %s invalid in acceptance audit',
    (field, issueId) => {
      const artifactFingerprint = `sha256:redacted-pc-paste-${field}`
      const manifest: StyleProofManifest = {
        platform: 'wechat',
        choiceId: 'wechat-classic-inline',
        scope: 'style-choice',
        claimedEvidence: ['pc-editor-paste'],
        artifactFingerprint,
        artifacts: [
          {
            id: `pc-paste-missing-${field}`,
            requirementId: 'pc-editor-paste-event',
            kind: 'editor-readback',
            label: `PC paste proof missing ${field}`,
            evidenceLabel: 'pc-editor-paste',
            platform: 'wechat',
            choiceId: 'wechat-classic-inline',
            channel: 'platform-editor',
            action: 'pc-paste',
            readback: 'visual-and-dom',
            artifactFingerprint,
            exactArtifact: true,
            authenticatedSessionVerified: true,
            platformEditorTargetVerified: true,
            platformEditorSurfaceVerified: true,
            platformEditorDomVerified: true,
            ordinaryClipboardPasteVerified: true,
            sameEditorTabVerified: true,
            pasteInputEventVerified: true,
            editorBodyMutationVerified: true,
            mojibakeFreeVerified: true,
            safeForCommit: true,
            [field]: false,
          },
        ],
      }

      const report = getStyleProofManifestReport(manifest)
      const issueIds = report.issues.map(issue => issue.id)
      const requirementStatus = new Map(
        report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
      )
      const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
      const auditStatus = new Map(
        audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
      )

      expect(issueIds).toContain(issueId)
      expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
      expect(auditStatus.get('pc-editor-paste-event')).toBe('invalid')
    },
  )

  it('rejects wrong-surface plain-text paste before phone preview can be claimed', () => {
    const artifactFingerprint = 'sha256:redacted-tempera-preview-precondition'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-flagship-tempera',
      scope: 'style-choice',
      claimedEvidence: ['pc-editor-paste', 'mobile-preview'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'tempera-title-surface-plain-text-paste',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'OS Ctrl+V reached a title-like ProseMirror while body probe stayed unchanged',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-flagship-tempera',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint,
          exactArtifact: true,
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: false,
          platformEditorDomVerified: true,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: true,
          pasteInputEventVerified: false,
          editorBodyMutationVerified: false,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
        {
          id: 'tempera-preview-entry-not-opened',
          requirementId: 'phone-preview-readback',
          kind: 'editor-readback',
          label: 'preview was not opened because exact rich body paste precondition failed',
          platform: 'wechat',
          choiceId: 'wechat-flagship-tempera',
          channel: 'phone-preview',
          action: 'phone-preview-entry-readback',
          readback: 'dom',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewBlocked: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const cannotClaimIds = audit.cannotClaim.map(requirement => requirement.requirement.id)

    expect(issueIds).toEqual(expect.arrayContaining([
      'style-proof-manifest-platform-editor-surface-not-verified',
      'style-proof-manifest-paste-input-not-verified',
      'style-proof-manifest-editor-body-not-mutated',
      'style-proof-manifest-phone-preview-blocked',
    ]))
    expect(issueIds).not.toContain('style-proof-manifest-ordinary-paste-not-verified')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
    expect(requirementStatus.get('phone-preview-readback')).toBe('invalid')
    expect(auditStatus.get('pc-editor-paste-event')).toBe('invalid')
    expect(auditStatus.get('phone-preview-readback')).toBe('invalid')
    expect(cannotClaimIds).toEqual(expect.arrayContaining([
      'pc-editor-paste-event',
      'phone-preview-readback',
      'phone-screenshot',
      'dark-mode-check',
      'cover-thumbnail-check',
      'published-url-or-platform-preview',
    ]))
  })

  it('rejects ordinary paste flags split across multiple PC paste artifacts', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-split-paste-proof',
      artifacts: [
        {
          id: 'split-paste-key-event',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'ordinary key event and same tab evidence only',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-split-paste-proof',
          exactArtifact: true,
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: true,
          safeForCommit: true,
        },
        {
          id: 'split-paste-body-readback',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'body mutation and mojibake-free evidence only',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-split-paste-proof',
          platformEditorDomVerified: true,
          pasteInputEventVerified: true,
          editorBodyMutationVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-paste-proof-not-bound')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
  })

  it('rejects market library selection when the central editor did not change', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      scope: 'style-choice',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['applied-editor-element'],
      artifacts: [
        {
          id: 'xiumi-library-selection',
          requirementId: 'market-applied-dom-readback',
          kind: 'editor-readback',
          label: 'Xiumi library item selected while central paper stayed unchanged',
          evidenceLabel: 'applied-editor-element',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'market-editor',
          action: 'applied-market-element',
          readback: 'visual-and-dom',
          centralEditorChanged: false,
          safeForCommit: true,
        },
        {
          id: 'market-source-hygiene',
          requirementId: 'no-proprietary-template-source',
          kind: 'hygiene-review',
          label: 'No copied market source',
          evidenceLabel: 'applied-editor-element',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'market-editor',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const marketAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'market-applied-dom-readback'
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-market-editor-not-applied')
    expect(requirementStatus.get('market-applied-dom-readback')).toBe('invalid')
    expect(marketAudit?.status).toBe('invalid')
    expect(marketAudit?.issueIds).toContain('style-proof-manifest-market-editor-not-applied')
    expect(requirementStatus.get('no-proprietary-template-source')).toBe('satisfied')
  })

  it('accepts applied-editor-element proof only after central editor readback changes', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      claimedEvidence: ['applied-editor-element'],
      artifacts: [
        {
          id: 'market-applied-center-readback',
          requirementId: 'market-applied-dom-readback',
          kind: 'editor-readback',
          label: 'Applied market style changed the central editor',
          evidenceLabel: 'applied-editor-element',
          platform: 'wechat',
          channel: 'market-editor',
          action: 'applied-market-element',
          readback: 'visual-and-dom',
          centralEditorChanged: true,
          safeForCommit: true,
        },
        {
          id: 'market-source-hygiene',
          requirementId: 'no-proprietary-template-source',
          kind: 'hygiene-review',
          label: 'No copied market source',
          evidenceLabel: 'applied-editor-element',
          platform: 'wechat',
          channel: 'market-editor',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          safeForCommit: true,
        },
      ],
    }

    expect(validateStyleProofManifest(manifest)).toEqual([])
    expect(getStyleProofManifestReport(manifest).valid).toBe(true)
  })

  it('does not let a style proof manifest promote blocked choices', () => {
    const amber = getStyleChoiceById('wechat-flagship-amber')
    expect(amber).toBeDefined()
    if (!amber) return

    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-flagship-amber',
      claimedEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
      artifacts: [
        {
          id: 'amber-claimed-paste',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'claimed paste proof cannot override runtime blocker',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-flagship-amber',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          exactArtifact: true,
          disposableDraft: true,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: true,
          pasteInputEventVerified: true,
          editorBodyMutationVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
      ],
    }
    const issues = validateStyleProofManifest(manifest)

    expect(issues.map(issue => issue.id)).toContain('style-proof-manifest-choice-blocked')
    expect(evaluateStyleChoiceAvailability(amber, ['pc-editor-paste', 'mobile-preview', 'published']).usable).toBe(false)
  })

  it('rejects weak local evidence for stronger mobile preview proof requirements', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      claimedEvidence: ['mobile-preview'],
      artifacts: [
        {
          id: 'local-browser-phone-claim',
          requirementId: 'phone-preview-readback',
          kind: 'browser-readback',
          label: 'local browser readback cannot prove phone preview',
          evidenceLabel: 'local-browser',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'phone',
          exactArtifact: true,
          safeForCommit: true,
        },
      ],
    }

    expect(validateStyleProofManifest(manifest).map(issue => issue.id)).toContain('style-proof-manifest-evidence-too-weak')
  })

  it('rejects phone preview entry or scan state without final article content readback', () => {
    const artifactFingerprint = 'sha256:redacted-phone-preview-entry'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      claimedEvidence: ['mobile-preview'],
      artifacts: [
        {
          id: 'phone-preview-entry-only',
          requirementId: 'phone-preview-readback',
          kind: 'phone-readback',
          label: 'phone preview entry is visible but article body was not read',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'phone',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewBlocked: true,
          phonePreviewContentVerified: false,
          safeForCommit: true,
        },
        {
          id: 'phone-preview-screenshot',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'redacted phone screenshot proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'phone-preview-dark-mode',
          requirementId: 'dark-mode-check',
          kind: 'screenshot',
          label: 'redacted dark mode proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'dark-mode-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewContentVerified: true,
          darkModeEnabledVerified: true,
          safeForCommit: true,
        },
        {
          id: 'phone-preview-cover',
          requirementId: 'cover-thumbnail-check',
          kind: 'screenshot',
          label: 'redacted cover thumbnail proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'cover-thumbnail-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          coverThumbnailAccepted: true,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-phone-preview-blocked')
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-phone-content-missing')
    expect(requirementStatus.get('phone-preview-readback')).toBe('invalid')
    expect(requirementStatus.get('phone-screenshot')).toBe('satisfied')
    expect(requirementStatus.get('dark-mode-check')).toBe('satisfied')
    expect(requirementStatus.get('cover-thumbnail-check')).toBe('satisfied')
  })

  it('keeps scan setup and PC preview shell readbacks out of every phone preview matrix row', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      claimedEvidence: ['mobile-preview'],
      artifactFingerprint: 'sha256:redacted-phone-preview-blocker',
      artifacts: [
        {
          id: 'phone-scan-entry-readback',
          requirementId: 'phone-preview-readback',
          kind: 'phone-readback',
          label: 'scan entry is visible but final phone article body is absent',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview-entry-readback',
          readback: 'phone',
          artifactFingerprint: 'sha256:redacted-phone-preview-blocker',
          exactArtifact: true,
          phonePreviewBlocked: true,
          phonePreviewContentVerified: false,
          safeForCommit: true,
        },
        {
          id: 'phone-setup-screenshot',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'setup screenshot cannot prove final phone article body',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview-entry-readback',
          readback: 'screenshot',
          artifactFingerprint: 'sha256:redacted-phone-preview-blocker',
          phonePreviewBlocked: true,
          phonePreviewContentVerified: false,
          safeForCommit: true,
        },
        {
          id: 'dark-mode-pc-preview-shell',
          requirementId: 'dark-mode-check',
          kind: 'screenshot',
          label: 'PC preview shell cannot prove mobile Dark Mode article content',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'dark-mode-check',
          readback: 'screenshot',
          artifactFingerprint: 'sha256:redacted-phone-preview-blocker',
          phonePreviewBlocked: true,
          phonePreviewContentVerified: false,
          darkModeEnabledVerified: true,
          safeForCommit: true,
        },
        {
          id: 'cover-setting-panel',
          requirementId: 'cover-thumbnail-check',
          kind: 'screenshot',
          label: 'cover setup panel cannot prove phone share or list entry acceptance',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'cover-thumbnail-check',
          readback: 'screenshot',
          artifactFingerprint: 'sha256:redacted-phone-preview-blocker',
          phonePreviewBlocked: true,
          coverThumbnailAccepted: true,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const phoneAuditStatus = new Map(
      audit.cannotClaim.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)

    expect(report.valid).toBe(false)
    expect(issueIds.filter(issueId =>
      issueId === 'style-proof-manifest-phone-preview-blocked',
    )).toHaveLength(4)
    expect(issueIds).toContain('style-proof-manifest-readback-missing')
    expect(issueIds).toContain('style-proof-manifest-phone-content-missing')
    expect(requirementStatus.get('phone-preview-readback')).toBe('invalid')
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(requirementStatus.get('dark-mode-check')).toBe('invalid')
    expect(requirementStatus.get('cover-thumbnail-check')).toBe('invalid')
    expect(phoneAuditStatus.get('phone-preview-readback')).toBe('invalid')
    expect(phoneAuditStatus.get('phone-screenshot')).toBe('invalid')
    expect(phoneAuditStatus.get('dark-mode-check')).toBe('invalid')
    expect(phoneAuditStatus.get('cover-thumbnail-check')).toBe('invalid')
  })

  it('requires exact artifact binding for phone preview screenshot Dark Mode and cover thumbnail proof rows', () => {
    const artifactFingerprint = 'sha256:redacted-phone-exact-binding'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      claimedEvidence: ['mobile-preview'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'local-exact-artifact-proof',
          requirementId: 'exact-artifact',
          kind: 'browser-readback',
          label: 'redacted local exact artifact proof',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'local-browser',
          action: 'local-render',
          readback: 'visual-and-dom',
          artifactFingerprint,
          exactArtifact: true,
          safeForCommit: true,
        },
        {
          id: 'phone-body-without-exact-binding',
          requirementId: 'phone-preview-readback',
          kind: 'phone-readback',
          label: 'phone article body is visible but not bound to exact artifact',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'phone',
          artifactFingerprint,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'phone-screenshot-without-exact-binding',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'phone screenshot captures content but is not bound to exact artifact',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          artifactFingerprint,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'dark-mode-without-exact-binding',
          requirementId: 'dark-mode-check',
          kind: 'screenshot',
          label: 'dark mode state is visible but not bound to exact artifact',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'dark-mode-check',
          readback: 'screenshot',
          artifactFingerprint,
          phonePreviewContentVerified: true,
          darkModeEnabledVerified: true,
          safeForCommit: true,
        },
        {
          id: 'cover-thumbnail-without-exact-binding',
          requirementId: 'cover-thumbnail-check',
          kind: 'screenshot',
          label: 'cover thumbnail is accepted but not bound to exact artifact',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'cover-thumbnail-check',
          readback: 'screenshot',
          artifactFingerprint,
          coverThumbnailAccepted: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const issueLocations = report.issues.map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const phoneAuditStatus = new Map(
      audit.cannotClaim.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(report.valid).toBe(false)
    expect(issueIds.filter(issueId =>
      issueId === 'style-proof-manifest-exact-artifact-missing',
    )).toHaveLength(4)
    expect(issueLocations).toEqual(expect.arrayContaining([
      'phone-preview-readback',
      'phone-screenshot',
      'dark-mode-check',
      'cover-thumbnail-check',
    ]))
    expect(requirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(requirementStatus.get('phone-preview-readback')).toBe('invalid')
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(requirementStatus.get('dark-mode-check')).toBe('invalid')
    expect(requirementStatus.get('cover-thumbnail-check')).toBe('invalid')
    expect(phoneAuditStatus.get('phone-preview-readback')).toBe('invalid')
    expect(phoneAuditStatus.get('phone-screenshot')).toBe('invalid')
    expect(phoneAuditStatus.get('dark-mode-check')).toBe('invalid')
    expect(phoneAuditStatus.get('cover-thumbnail-check')).toBe('invalid')
  })

  it('rejects Dark Mode and cover thumbnail proof without verified mobile states', () => {
    const artifactFingerprint = 'sha256:redacted-mobile-state'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      claimedEvidence: ['mobile-preview'],
      artifacts: [
        {
          id: 'phone-preview-body-readback',
          requirementId: 'phone-preview-readback',
          kind: 'phone-readback',
          label: 'redacted phone article body readback',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'phone',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'phone-preview-screenshot',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'redacted phone screenshot proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'dark-mode-screenshot-without-enabled-state',
          requirementId: 'dark-mode-check',
          kind: 'screenshot',
          label: 'ordinary screenshot cannot prove mobile Dark Mode',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'dark-mode-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          darkModeEnabledVerified: false,
          safeForCommit: true,
        },
        {
          id: 'cover-setting-screenshot-without-entry-acceptance',
          requirementId: 'cover-thumbnail-check',
          kind: 'screenshot',
          label: 'cover setup screenshot cannot prove preview entry acceptance',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'cover-thumbnail-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          coverThumbnailAccepted: false,
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(report.valid).toBe(false)
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-dark-mode-not-verified')
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-cover-thumbnail-not-accepted')
    expect(requirementStatus.get('phone-preview-readback')).toBe('satisfied')
    expect(requirementStatus.get('phone-screenshot')).toBe('satisfied')
    expect(requirementStatus.get('dark-mode-check')).toBe('invalid')
    expect(requirementStatus.get('cover-thumbnail-check')).toBe('invalid')
  })

  it('rejects Dark Mode proof that splits phone content and enabled-state flags across rows', () => {
    const artifactFingerprint = 'sha256:redacted-dark-mode-split'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      claimedEvidence: ['mobile-preview'],
      artifacts: [
        {
          id: 'dark-mode-phone-content-only',
          requirementId: 'dark-mode-check',
          kind: 'screenshot',
          label: 'dark mode proof with phone content only',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'dark-mode-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'dark-mode-state-only',
          requirementId: 'dark-mode-check',
          kind: 'screenshot',
          label: 'dark mode proof with enabled state only',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'dark-mode-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          darkModeEnabledVerified: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const darkModeIssues = report.issues
      .filter(issue => issue.location === 'dark-mode-check')
      .map(issue => issue.id)
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(darkModeIssues).toContain('style-proof-manifest-dark-mode-not-verified')
    expect(requirementStatus.get('dark-mode-check')).toBe('invalid')
    expect(auditStatus.get('dark-mode-check')).toBe('invalid')
  })

  it('keeps weak editor and browser evidence out of mobile sync publish and draft-safety gates', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      scope: 'style-choice',
      claimedEvidence: ['pc-editor-paste', 'mobile-preview', 'credentialed-sync', 'published'],
      artifactFingerprint: 'sha256:redacted-click-reveal',
      artifacts: [
        {
          id: 'weak-safe-draft-from-clipboardevent',
          requirementId: 'safe-disposable-draft',
          kind: 'editor-readback',
          label: 'PC ClipboardEvent readback cannot prove draft safety',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          disposableDraft: true,
          safeForCommit: true,
        },
        {
          id: 'weak-phone-from-pc-dom',
          requirementId: 'phone-preview-readback',
          kind: 'editor-readback',
          label: 'PC editor DOM readback cannot prove mobile preview',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'platform-editor',
          action: 'pc-editor-dom-readback',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          exactArtifact: true,
          safeForCommit: true,
        },
        {
          id: 'weak-phone-screenshot-from-local-browser',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'local browser screenshot cannot prove phone preview',
          evidenceLabel: 'local-browser',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'local-browser',
          action: 'local-render',
          readback: 'screenshot',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          safeForCommit: true,
        },
        {
          id: 'weak-cover-from-local-browser',
          requirementId: 'cover-thumbnail-check',
          kind: 'screenshot',
          label: 'local browser cover crop cannot prove platform phone thumbnail',
          evidenceLabel: 'local-browser',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'local-browser',
          action: 'cover-thumbnail-check',
          readback: 'screenshot',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          safeForCommit: true,
        },
        {
          id: 'weak-credentialed-from-auth-open',
          requirementId: 'credentialed-channel-response',
          kind: 'editor-readback',
          label: 'authenticated editor reachability cannot prove credentialed sync',
          evidenceLabel: 'authenticated-editor-reachable',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'api-response',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          safeForCommit: true,
        },
        {
          id: 'weak-sync-from-pc-dom',
          requirementId: 'sync-readback',
          kind: 'editor-readback',
          label: 'PC DOM readback cannot prove credentialed sync readback',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'platform-editor',
          action: 'sync-readback',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          safeForCommit: true,
        },
        {
          id: 'weak-scheduled-send-from-sync-response',
          requirementId: 'scheduled-send-readback',
          kind: 'channel-response',
          label: 'credentialed sync response cannot prove scheduled send state',
          evidenceLabel: 'credentialed-sync',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'credentialed-channel',
          action: 'scheduled-send',
          readback: 'api-response',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
        {
          id: 'weak-published-from-pc-editor',
          requirementId: 'published-url-or-platform-preview',
          kind: 'published-preview',
          label: 'PC editor preview cannot prove published platform preview',
          evidenceLabel: 'pc-editor-paste',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'platform-editor',
          action: 'published-preview',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          safeForCommit: true,
        },
      ],
    }
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const issueIds = report.issues.map(issue => issue.id)
    const issueLocations = report.issues.map(issue => issue.location)

    expect(report.valid).toBe(false)
    expect(issueIds).toContain('style-proof-manifest-evidence-too-weak')
    expect(issueIds).toContain('style-proof-manifest-requirement-missing')
    expect(issueIds).toContain('style-proof-manifest-cleanup-path-missing')
    expect(issueIds).toContain('style-proof-manifest-scheduled-send-not-verified')
    expect(requirementStatus.get('safe-disposable-draft')).toBe('invalid')
    expect(requirementStatus.get('phone-preview-readback')).toBe('invalid')
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(requirementStatus.get('cover-thumbnail-check')).toBe('invalid')
    expect(requirementStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(requirementStatus.get('sync-readback')).toBe('invalid')
    expect(requirementStatus.get('scheduled-send-readback')).toBe('invalid')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(issueLocations).toEqual(expect.arrayContaining([
      'safe-disposable-draft',
      'phone-preview-readback',
      'phone-screenshot',
      'cover-thumbnail-check',
      'credentialed-channel-response',
      'sync-readback',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))

    const progress = getPlatformStyleProofProgressReport('wechat', [manifest])
    const gateStatus = new Map(progress.gates.map(gate => [gate.gate, gate.status]))

    expect(gateStatus.get('authenticated-pc-editor')).toBe('invalid')
    expect(gateStatus.get('phone-preview')).toBe('invalid')
    expect(gateStatus.get('credentialed-channel')).toBe('invalid')
    expect(gateStatus.get('platform-publish')).toBe('invalid')
    expect(progress.summary.proofSatisfiedChoices).toBe(0)
  })

  it('rejects sensitive or non-committable proof artifact references', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['doc-only'],
      artifacts: [
        {
          id: 'unsafe-profile-ref',
          requirementId: 'catalog-source',
          kind: 'doc-reference',
          label: 'unsafe local proof reference',
          evidenceLabel: 'doc-only',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'docs',
          action: 'catalog-source',
          readback: 'none',
          artifactRef: 'redacted-profileDir-scan-qr.har',
          committed: true,
          safeForCommit: false,
        },
      ],
    }
    const issueIds = validateStyleProofManifest(manifest).map(issue => issue.id)

    expect(issueIds).toContain('style-proof-manifest-sensitive-artifact')
    expect(issueIds).toContain('style-proof-manifest-unsafe-commit-artifact')

    const report = getStyleProofManifestReport(manifest)
    expect(report.valid).toBe(false)
    expect(report.summary.sensitiveArtifactCount).toBe(1)
    expect(report.summary.unsafeCommitArtifactCount).toBe(1)
    expect(report.summary.acceptedArtifactCount).toBe(0)
    expect(report.artifacts[0]?.status).toBe('unsafe-commit')
    expect(report.requirements[0]?.status).toBe('invalid')
  })

  it('requires safeForCommit on matching proof contract rows across local editor and phone gates', () => {
    const artifactFingerprint = 'sha256:redacted-safe-contract'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['unit-tested', 'authenticated-editor-reachable', 'mobile-preview'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'unit-test-without-safe-commit',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'unit test proof without safe commit flag',
          evidenceLabel: 'unit-tested',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'unit-test',
          action: 'test-run',
          readback: 'test-assertion',
          safeForCommit: false,
        },
        {
          id: 'authenticated-editor-without-safe-commit',
          requirementId: 'authenticated-editor-url',
          kind: 'browser-readback',
          label: 'authenticated editor proof without safe commit flag',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'dom',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          safeForCommit: false,
        },
        {
          id: 'phone-screenshot-without-safe-commit',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'phone screenshot proof without safe commit flag',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: false,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const safeCommitIssueLocations = report.issues
      .filter(issue => issue.id === 'style-proof-manifest-safe-commit-not-verified')
      .map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(safeCommitIssueLocations).toEqual(expect.arrayContaining([
      'unit-test-coverage',
      'authenticated-editor-url',
      'phone-screenshot',
    ]))
    expect(requirementStatus.get('unit-test-coverage')).toBe('invalid')
    expect(requirementStatus.get('authenticated-editor-url')).toBe('invalid')
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(auditStatus.get('unit-test-coverage')).toBe('invalid')
    expect(auditStatus.get('authenticated-editor-url')).toBe('invalid')
    expect(auditStatus.get('phone-screenshot')).toBe('invalid')
  })

  it('requires artifactFingerprint on matching exact proof contract rows across phone sync and publish gates', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['mobile-preview', 'credentialed-sync', 'published'],
      artifacts: [
        {
          id: 'phone-screenshot-without-fingerprint',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'phone screenshot proof without artifact fingerprint',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'credentialed-sync-without-fingerprint',
          requirementId: 'credentialed-channel-response',
          kind: 'browser-readback',
          label: 'credentialed sync proof without artifact fingerprint',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'credentialed-channel',
          action: 'credentialed-sync',
          readback: 'api-response',
          exactArtifact: true,
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
        {
          id: 'scheduled-send-without-fingerprint',
          requirementId: 'scheduled-send-readback',
          kind: 'browser-readback',
          label: 'scheduled send proof without artifact fingerprint',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'credentialed-channel',
          action: 'scheduled-send',
          readback: 'scheduled-send-state',
          exactArtifact: true,
          externalAccountAuthenticated: true,
          scheduledSendVerified: true,
          safeForCommit: true,
        },
        {
          id: 'published-preview-without-fingerprint',
          requirementId: 'published-url-or-platform-preview',
          kind: 'browser-readback',
          label: 'published preview proof without artifact fingerprint',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'public-web',
          action: 'published-preview',
          readback: 'published-url',
          exactArtifact: true,
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const exactArtifactIssueLocations = report.issues
      .filter(issue => issue.id === 'style-proof-manifest-exact-artifact-missing')
      .map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(exactArtifactIssueLocations).toEqual(expect.arrayContaining([
      'phone-screenshot',
      'credentialed-channel-response',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(requirementStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(requirementStatus.get('scheduled-send-readback')).toBe('invalid')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(auditStatus.get('phone-screenshot')).toBe('invalid')
    expect(auditStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(auditStatus.get('scheduled-send-readback')).toBe('invalid')
    expect(auditStatus.get('published-url-or-platform-preview')).toBe('invalid')
  })

  it('requires exactArtifact on matching exact proof contract rows across phone sync and publish gates', () => {
    const artifactFingerprint = 'sha256:redacted-exact-contract'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['mobile-preview', 'credentialed-sync', 'published'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'phone-screenshot-without-exact-artifact',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'phone screenshot proof without exact artifact flag',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          artifactFingerprint,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'credentialed-sync-without-exact-artifact',
          requirementId: 'credentialed-channel-response',
          kind: 'browser-readback',
          label: 'credentialed sync proof without exact artifact flag',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'credentialed-channel',
          action: 'credentialed-sync',
          readback: 'api-response',
          artifactFingerprint,
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
        {
          id: 'scheduled-send-without-exact-artifact',
          requirementId: 'scheduled-send-readback',
          kind: 'browser-readback',
          label: 'scheduled send proof without exact artifact flag',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'credentialed-channel',
          action: 'scheduled-send',
          readback: 'scheduled-send-state',
          artifactFingerprint,
          externalAccountAuthenticated: true,
          scheduledSendVerified: true,
          safeForCommit: true,
        },
        {
          id: 'published-preview-without-exact-artifact',
          requirementId: 'published-url-or-platform-preview',
          kind: 'browser-readback',
          label: 'published preview proof without exact artifact flag',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'public-web',
          action: 'published-preview',
          readback: 'published-url',
          artifactFingerprint,
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const exactArtifactIssueLocations = report.issues
      .filter(issue => issue.id === 'style-proof-manifest-exact-artifact-missing')
      .map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(exactArtifactIssueLocations).toEqual(expect.arrayContaining([
      'phone-screenshot',
      'credentialed-channel-response',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(requirementStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(requirementStatus.get('scheduled-send-readback')).toBe('invalid')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(auditStatus.get('phone-screenshot')).toBe('invalid')
    expect(auditStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(auditStatus.get('scheduled-send-readback')).toBe('invalid')
    expect(auditStatus.get('published-url-or-platform-preview')).toBe('invalid')
  })

  it('does not let wrong readback rows satisfy required field contracts', () => {
    const artifactFingerprint = 'sha256:redacted-readback-field-contract'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['mobile-preview'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'phone-screenshot-without-trace-or-safe-commit',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'phone screenshot content proof without traceability fields',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          phonePreviewContentVerified: true,
          exactArtifact: true,
        },
        {
          id: 'phone-readback-cannot-backfill-screenshot-fields',
          requirementId: 'phone-screenshot',
          kind: 'phone-readback',
          label: 'phone readback cannot backfill screenshot required fields',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'phone',
          artifactFingerprint,
          phonePreviewContentVerified: true,
          exactArtifact: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const phoneScreenshotIssues = report.issues
      .filter(issue => issue.location === 'phone-screenshot')
      .map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(phoneScreenshotIssues).toEqual(expect.arrayContaining([
      'style-proof-manifest-exact-artifact-missing',
      'style-proof-manifest-safe-commit-not-verified',
    ]))
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(auditStatus.get('phone-screenshot')).toBe('invalid')
  })

  it('does not let matching readback rows split required fields across artifacts', () => {
    const artifactFingerprint = 'sha256:redacted-field-binding-contract'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['mobile-preview'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'phone-screenshot-content-exact-only',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'phone screenshot content proof without traceability fields',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          phonePreviewContentVerified: true,
          exactArtifact: true,
        },
        {
          id: 'phone-screenshot-trace-safe-only',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'phone screenshot traceability proof without content binding',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          artifactFingerprint,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const phoneScreenshotIssues = report.issues
      .filter(issue => issue.location === 'phone-screenshot')
      .map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(phoneScreenshotIssues).toContain('style-proof-manifest-proof-not-bound')
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(auditStatus.get('phone-screenshot')).toBe('invalid')
  })

  it('rejects forbidden fields on matching proof contract rows', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['applied-editor-element'],
      artifacts: [
        {
          id: 'proprietary-source-hygiene-sensitive',
          requirementId: 'no-proprietary-template-source',
          kind: 'hygiene-review',
          label: 'source hygiene row with forbidden sensitive field',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'market-editor',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          safeForCommit: true,
          sensitive: true,
        },
        {
          id: 'sensitive-hygiene-review-sensitive',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'sensitive hygiene row with forbidden sensitive field',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          safeForCommit: true,
          artifactRef: 'redacted://local/hygiene-summary',
          sensitive: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const sensitiveIssueLocations = report.issues
      .filter(issue => issue.id === 'style-proof-manifest-sensitive-artifact')
      .map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(sensitiveIssueLocations).toEqual(expect.arrayContaining([
      'no-proprietary-template-source',
      'no-sensitive-artifact',
      'proprietary-source-hygiene-sensitive',
      'sensitive-hygiene-review-sensitive',
    ]))
    expect(requirementStatus.get('no-proprietary-template-source')).toBe('invalid')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('invalid')
    expect(auditStatus.get('no-proprietary-template-source')).toBe('invalid')
    expect(auditStatus.get('no-sensitive-artifact')).toBe('invalid')
  })

  it('rejects proof rows whose channel or action does not match the execution contract', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['applied-editor-element'],
      artifacts: [
        {
          id: 'proprietary-source-hygiene-wrong-channel',
          requirementId: 'no-proprietary-template-source',
          kind: 'hygiene-review',
          label: 'source hygiene row on the wrong proof channel',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          safeForCommit: true,
        },
        {
          id: 'sensitive-hygiene-review-wrong-channel',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'sensitive hygiene row on the wrong proof channel',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const contractMismatchLocations = report.issues
      .filter(issue => issue.id === 'style-proof-manifest-contract-action-channel-mismatch')
      .map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(contractMismatchLocations).toEqual(expect.arrayContaining([
      'no-proprietary-template-source',
      'no-sensitive-artifact',
    ]))
    expect(requirementStatus.get('no-proprietary-template-source')).toBe('invalid')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('invalid')
    expect(auditStatus.get('no-proprietary-template-source')).toBe('invalid')
    expect(auditStatus.get('no-sensitive-artifact')).toBe('invalid')
  })

  it('does not let artifacts assigned to another requirement satisfy PC paste contracts', () => {
    const artifactFingerprint = 'sha256:redacted-paste-requirement-scope'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'pc-paste-proof-bound-to-authenticated-editor-requirement',
          requirementId: 'authenticated-editor-url',
          kind: 'editor-readback',
          label: 'complete PC paste fields assigned to the wrong requirement',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          artifactFingerprint,
          exactArtifact: true,
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          platformEditorDomVerified: true,
          ordinaryClipboardPasteVerified: true,
          sameEditorTabVerified: true,
          pasteInputEventVerified: true,
          editorBodyMutationVerified: true,
          mojibakeFreeVerified: true,
          safeForCommit: true,
        },
        {
          id: 'pc-paste-event-shell-without-proof-fields',
          requirementId: 'pc-editor-paste-event',
          kind: 'editor-readback',
          label: 'PC paste event shell without proof fields',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-paste',
          readback: 'visual-and-dom',
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const pcPasteIssues = report.issues
      .filter(issue => issue.location === 'pc-editor-paste-event')
      .map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(pcPasteIssues).toEqual(expect.arrayContaining([
      'style-proof-manifest-exact-artifact-missing',
      'style-proof-manifest-ordinary-paste-not-verified',
      'style-proof-manifest-paste-input-not-verified',
    ]))
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('invalid')
    expect(auditStatus.get('pc-editor-paste-event')).toBe('invalid')
  })

  it('requires accepted readback types on matching contract action and channel rows', () => {
    const artifactFingerprint = 'sha256:redacted-readback-contract'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['pc-editor-dom-readable'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'authenticated-editor-wrong-readback',
          requirementId: 'authenticated-editor-url',
          kind: 'browser-readback',
          label: 'authenticated editor row with wrong readback contract',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'hygiene-log',
          artifactFingerprint,
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueLocations = report.issues
      .filter(issue => issue.id === 'style-proof-manifest-readback-missing')
      .map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const authenticatedEditorAudit = audit.requirements.find(requirement =>
      requirement.requirement.id === 'authenticated-editor-url',
    )

    expect(issueLocations).toContain('authenticated-editor-url')
    expect(requirementStatus.get('authenticated-editor-url')).toBe('invalid')
    expect(auditStatus.get('authenticated-editor-url')).toBe('unsafe-to-automate')
    expect(authenticatedEditorAudit?.issueIds).toContain('style-proof-manifest-readback-missing')
  })

  it('rejects PC editor DOM readback with replacement-glyph damage as invalid fidelity proof', () => {
    const artifactFingerprint = 'sha256:redacted-wechat-editor-mojibake'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'evidence-label',
      claimedEvidence: ['pc-editor-dom-readable'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'mojibake-authenticated-editor',
          requirementId: 'authenticated-editor-url',
          kind: 'browser-readback',
          label: 'authenticated editor opened before mojibake readback',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'dom',
          artifactFingerprint,
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          safeForCommit: true,
        },
        {
          id: 'mojibake-pc-editor-dom',
          requirementId: 'pc-editor-dom-readback',
          kind: 'editor-readback',
          label: 'PC editor body readback with replacement glyphs redacted',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'pc-editor-dom-readback',
          readback: 'visual-and-dom',
          artifactFingerprint,
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          platformEditorSurfaceVerified: true,
          platformEditorDomVerified: true,
          safeForCommit: true,
        },
        {
          id: 'mojibake-hygiene-proof',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted editor readback hygiene proof',
          evidenceLabel: 'pc-editor-dom-readable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const pcDomAudit = audit.requirements.find(requirement =>
      requirement.requirement.id === 'pc-editor-dom-readback',
    )

    expect(issueIds).toContain('style-proof-manifest-editor-mojibake-not-ruled-out')
    expect(requirementStatus.get('authenticated-editor-url')).toBe('satisfied')
    expect(requirementStatus.get('pc-editor-dom-readback')).toBe('invalid')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(pcDomAudit?.issueIds).toContain('style-proof-manifest-editor-mojibake-not-ruled-out')
    expect(pcDomAudit?.status).toBe('invalid')
  })

  it('keeps phone screenshot proof with the wrong readback invalid in acceptance audit', () => {
    const artifactFingerprint = 'sha256:redacted-phone-readback-contract'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['mobile-preview'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'phone-screenshot-wrong-readback',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'phone screenshot proof with phone readback instead of screenshot',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'phone',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'phone-screenshot-exact-artifact',
          requirementId: 'exact-artifact',
          kind: 'artifact-manifest',
          label: 'redacted exact artifact proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'source-hygiene-review',
          readback: 'manifest',
          artifactFingerprint,
          exactArtifact: true,
          safeForCommit: true,
        },
        {
          id: 'phone-screenshot-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted hygiene proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(issueIds).toContain('style-proof-manifest-readback-missing')
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(auditStatus.get('phone-screenshot')).toBe('invalid')
  })

  it('requires platform and artifact consistency in style proof manifests', () => {
    const manifest: StyleProofManifest = {
      platform: 'zhihu',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['unit-tested'],
      artifacts: [
        {
          id: 'wrong-platform-test-log',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'wrong platform log',
          evidenceLabel: 'unit-tested',
          platform: 'xiaohongshu',
          choiceId: 'wechat-classic-inline',
          channel: 'unit-test',
          action: 'test-run',
          readback: 'test-assertion',
          safeForCommit: true,
        },
      ],
    }

    expect(validateStyleProofManifest(manifest).map(issue => issue.id)).toContain('style-proof-manifest-platform-mismatch')
  })

  it('requires Zhihu image fallback proof artifacts for full style-choice proof validation', () => {
    const manifest: StyleProofManifest = {
      platform: 'zhihu',
      choiceId: 'zhihu-data-table',
      scope: 'style-choice',
      claimedEvidence: ['unit-tested'],
      artifacts: [
        {
          id: 'zhihu-table-unit-log',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'semantic table unit proof',
          evidenceLabel: 'unit-tested',
          platform: 'zhihu',
          choiceId: 'zhihu-data-table',
          channel: 'unit-test',
          action: 'test-run',
          readback: 'test-assertion',
          safeForCommit: true,
        },
      ],
    }
    const issues = validateStyleProofManifest(manifest)

    expect(issues.map(issue => issue.location)).toEqual(expect.arrayContaining([
      'public-image-host',
      'zhihu-artifact-manifest',
    ]))
    expect(getPlatformStyleApplicationReport('zhihu').find(item =>
      item.availability.choice.id === 'zhihu-clean-column',
    )?.selectable).toBe(true)
  })

  it('requires platform artifact manifest validator proof and redacted report reference before satisfying XHS image artifact manifests', () => {
    const artifactFingerprint = 'xhs-cover-carousel-proof@sha256:validator-required'
    const manifest: StyleProofManifest = {
      platform: 'xiaohongshu',
      choiceId: 'xhs-cover-carousel',
      scope: 'style-choice',
      claimedEvidence: ['unit-tested', 'local-browser'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'xhs-validator-unit-proof',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'xhs validator unit proof',
          platform: 'xiaohongshu',
          choiceId: 'xhs-cover-carousel',
          channel: 'unit-test',
          action: 'test-run',
          readback: 'test-assertion',
          artifactFingerprint,
          safeForCommit: true,
        },
        {
          id: 'xhs-validator-browser-proof',
          requirementId: 'local-browser-rendering',
          kind: 'screenshot',
          label: 'xhs validator local render proof',
          platform: 'xiaohongshu',
          choiceId: 'xhs-cover-carousel',
          channel: 'local-browser',
          action: 'local-render',
          readback: 'visual',
          artifactFingerprint,
          safeForCommit: true,
        },
        {
          id: 'xhs-validator-exact-proof',
          requirementId: 'exact-artifact',
          kind: 'doc-reference',
          label: 'xhs validator exact artifact proof',
          platform: 'xiaohongshu',
          choiceId: 'xhs-cover-carousel',
          channel: 'local-artifact',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint,
          exactArtifact: true,
          safeForCommit: true,
        },
        {
          id: 'xhs-validator-manifest-proof',
          requirementId: 'xhs-artifact-manifest',
          kind: 'artifact-manifest',
          label: 'xhs validator manifest proof without validator result',
          platform: 'xiaohongshu',
          choiceId: 'xhs-cover-carousel',
          channel: 'local-artifact',
          action: 'artifact-manifest-validation',
          readback: 'manifest',
          artifactFingerprint,
          artifactRef: 'prompts/0601/evidence/xhs-image-manifest-gate-20260609.txt',
          safeForCommit: true,
        },
        {
          id: 'xhs-validator-hygiene-proof',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'xhs validator hygiene proof',
          platform: 'xiaohongshu',
          choiceId: 'xhs-cover-carousel',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint,
          safeForCommit: true,
        },
      ],
    }

    const issueIds = validateStyleProofManifest(manifest).map(issue => issue.id)
    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('xiaohongshu', [manifest])
    const artifactManifestAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'xhs-artifact-manifest'
    )

    expect(issueIds).toContain('style-proof-manifest-artifact-manifest-not-validated')
    expect(requirementStatus.get('xhs-artifact-manifest')).toBe('invalid')
    expect(artifactManifestAudit?.status).toBe('invalid')
    expect(artifactManifestAudit?.issueIds).toContain('style-proof-manifest-artifact-manifest-not-validated')
    expect(requirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(requirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(requirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')

    const missingRefManifest: StyleProofManifest = {
      ...manifest,
      artifacts: manifest.artifacts.map(artifact =>
        artifact.requirementId === 'xhs-artifact-manifest'
          ? { ...artifact, artifactManifestValidated: true, artifactRef: undefined }
          : artifact
      ),
    }
    const missingRefReport = getStyleProofManifestReport(missingRefManifest)
    const missingRefRequirementStatus = new Map(
      missingRefReport.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const missingRefIssueIds = missingRefReport.issues.map(issue => issue.id)

    expect(missingRefIssueIds).toContain('style-proof-manifest-artifact-ref-missing')
    expect(missingRefRequirementStatus.get('xhs-artifact-manifest')).toBe('invalid')

    const unsafeManifest: StyleProofManifest = {
      ...manifest,
      artifacts: manifest.artifacts.map(artifact =>
        artifact.requirementId === 'xhs-artifact-manifest'
          ? { ...artifact, artifactManifestValidated: true, safeForCommit: false }
          : artifact
      ),
    }
    const unsafeReport = getStyleProofManifestReport(unsafeManifest)
    const unsafeRequirementStatus = new Map(
      unsafeReport.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const unsafeIssueIds = unsafeReport.issues.map(issue => issue.id)

    expect(unsafeIssueIds).toContain('style-proof-manifest-safe-commit-not-verified')
    expect(unsafeRequirementStatus.get('xhs-artifact-manifest')).toBe('invalid')

    const splitBindingManifest: StyleProofManifest = {
      ...manifest,
      artifacts: [
        ...manifest.artifacts.filter(artifact => artifact.requirementId !== 'xhs-artifact-manifest'),
        {
          id: 'xhs-validator-manifest-ref-only',
          requirementId: 'xhs-artifact-manifest',
          kind: 'artifact-manifest',
          label: 'xhs validator manifest proof with ref only',
          platform: 'xiaohongshu',
          choiceId: 'xhs-cover-carousel',
          channel: 'local-artifact',
          action: 'artifact-manifest-validation',
          readback: 'manifest',
          artifactFingerprint,
          artifactRef: 'prompts/0601/evidence/xhs-image-manifest-gate-20260609.txt',
          safeForCommit: true,
        },
        {
          id: 'xhs-validator-manifest-validation-only',
          requirementId: 'xhs-artifact-manifest',
          kind: 'artifact-manifest',
          label: 'xhs validator manifest proof with validation only',
          platform: 'xiaohongshu',
          choiceId: 'xhs-cover-carousel',
          channel: 'local-artifact',
          action: 'artifact-manifest-validation',
          readback: 'manifest',
          artifactFingerprint,
          artifactManifestValidated: true,
          safeForCommit: true,
        },
      ],
    }
    const splitBindingReport = getStyleProofManifestReport(splitBindingManifest)
    const splitBindingRequirementStatus = new Map(
      splitBindingReport.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const splitBindingIssueIds = splitBindingReport.issues.map(issue => issue.id)
    const splitBindingAudit = getPlatformStyleProofAcceptanceAuditReport('xiaohongshu', [splitBindingManifest])
    const splitBindingArtifactManifestAudit = splitBindingAudit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'xhs-artifact-manifest'
    )

    expect(splitBindingIssueIds).toContain('style-proof-manifest-artifact-manifest-not-validated')
    expect(splitBindingRequirementStatus.get('xhs-artifact-manifest')).toBe('invalid')
    expect(splitBindingArtifactManifestAudit?.status).toBe('invalid')
    expect(splitBindingArtifactManifestAudit?.issueIds)
      .toContain('style-proof-manifest-artifact-manifest-not-validated')
  })

  it('rejects Xiaohongshu login-gate readback as upload preview or publish proof', () => {
    const artifactFingerprint = 'sha256:redacted-xhs-login-gate'
    const manifest: StyleProofManifest = {
      platform: 'xiaohongshu',
      choiceId: 'xhs-cover-carousel',
      scope: 'style-choice',
      claimedEvidence: ['published'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'xhs-login-gate-publish-readback',
          requirementId: 'published-url-or-platform-preview',
          kind: 'browser-readback',
          label: 'redacted xhs creator login gate readback',
          platform: 'xiaohongshu',
          choiceId: 'xhs-cover-carousel',
          channel: 'credentialed-channel',
          action: 'external-account-login-readback',
          readback: 'visual-and-dom',
          artifactFingerprint,
          externalAccountAuthenticated: false,
          externalAccountLoginBlocked: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('xiaohongshu', [manifest])
    const publishAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'published-url-or-platform-preview'
    )

    expect(report.valid).toBe(false)
    expect(issueIds).toContain('style-proof-manifest-external-account-login-blocked')
    expect(issueIds).toContain('style-proof-manifest-requirement-missing')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(report.artifacts.find(artifact =>
      artifact.artifact.id === 'xhs-login-gate-publish-readback',
    )?.status).toBe('invalid')
    expect(publishAudit?.status).toBe('invalid')
    expect(publishAudit?.issueIds).toContain('style-proof-manifest-external-account-login-blocked')
  })

  it('requires positive external account authentication for credentialed sync and published proof rows', () => {
    const artifactFingerprint = 'sha256:redacted-external-auth-missing'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      scope: 'style-choice',
      claimedEvidence: ['credentialed-sync', 'published'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'credentialed-response-without-auth',
          requirementId: 'credentialed-channel-response',
          kind: 'channel-response',
          label: 'credentialed response without authenticated account readback',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'credentialed-channel',
          action: 'credentialed-sync',
          readback: 'api-response',
          artifactFingerprint,
          safeForCommit: true,
        },
        {
          id: 'sync-readback-without-auth',
          requirementId: 'sync-readback',
          kind: 'editor-readback',
          label: 'sync readback without authenticated account readback',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'credentialed-channel',
          action: 'sync-readback',
          readback: 'visual-and-dom',
          artifactFingerprint,
          safeForCommit: true,
        },
        {
          id: 'public-url-without-auth',
          requirementId: 'published-url-or-platform-preview',
          kind: 'published-preview',
          label: 'public URL without authenticated account readback',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'public-web',
          action: 'published-preview',
          readback: 'published-url',
          artifactFingerprint,
          exactArtifact: true,
          safeForCommit: true,
        },
      ],
    }
    const phoneOnlyManifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      scope: 'style-choice',
      claimedEvidence: ['published'],
      artifactFingerprint: 'sha256:redacted-phone-publish-preview',
      artifacts: [
        {
          id: 'phone-preview-is-not-publish',
          requirementId: 'published-url-or-platform-preview',
          kind: 'published-preview',
          label: 'phone preview cannot prove public article or platform publish preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'published-preview',
          readback: 'visual-and-dom',
          artifactFingerprint: 'sha256:redacted-phone-publish-preview',
          exactArtifact: true,
          externalAccountAuthenticated: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const issueLocations = report.issues.map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const phoneOnlyReport = getStyleProofManifestReport(phoneOnlyManifest)
    const phoneOnlyIssueLocations = phoneOnlyReport.issues.map(issue => issue.location)
    const phoneOnlyRequirementStatus = new Map(
      phoneOnlyReport.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getStyleProofAcceptanceAuditReport([manifest]).platformReports.wechat
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )

    expect(issueIds.filter(issueId =>
      issueId === 'style-proof-manifest-external-account-auth-missing'
    )).toHaveLength(3)
    expect(issueLocations).toEqual(expect.arrayContaining([
      'credentialed-channel-response',
      'sync-readback',
      'published-url-or-platform-preview',
    ]))
    expect(requirementStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(requirementStatus.get('sync-readback')).toBe('invalid')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(auditStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(auditStatus.get('sync-readback')).toBe('invalid')
    expect(auditStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(phoneOnlyReport.issues.map(issue => issue.id)).toContain('style-proof-manifest-requirement-missing')
    expect(phoneOnlyIssueLocations).toContain('published-url-or-platform-preview')
    expect(phoneOnlyRequirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
  })

  it('keeps scheduled send proof without real scheduled state invalid in acceptance audit', () => {
    const artifactFingerprint = 'sha256:redacted-scheduled-state-missing'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      scope: 'style-choice',
      claimedEvidence: ['published'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'scheduled-send-without-scheduled-state',
          requirementId: 'scheduled-send-readback',
          kind: 'channel-response',
          label: 'scheduled send response without real send or schedule state',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'credentialed-channel',
          action: 'scheduled-send',
          readback: 'scheduled-send-state',
          artifactFingerprint,
          exactArtifact: true,
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getStyleProofAcceptanceAuditReport([manifest]).platformReports.wechat
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const gateStatus = new Map(
      audit.gates.map(gate => [gate.gate, gate.status]),
    )

    expect(issueIds).toContain('style-proof-manifest-scheduled-send-not-verified')
    expect(requirementStatus.get('scheduled-send-readback')).toBe('invalid')
    expect(auditStatus.get('scheduled-send-readback')).toBe('invalid')
    expect(gateStatus.get('platform-publish')).toBe('invalid')
  })

  it('requires exact artifact binding for credentialed sync proof rows', () => {
    const artifactFingerprint = 'sha256:redacted-credentialed-exact-artifact'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      scope: 'style-choice',
      claimedEvidence: ['credentialed-sync'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'credentialed-response-without-exact-artifact',
          requirementId: 'credentialed-channel-response',
          kind: 'channel-response',
          label: 'credentialed response without exact artifact binding',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'credentialed-channel',
          action: 'credentialed-sync',
          readback: 'api-response',
          artifactFingerprint,
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
        {
          id: 'sync-readback-without-exact-artifact',
          requirementId: 'sync-readback',
          kind: 'editor-readback',
          label: 'sync readback without exact artifact binding',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'credentialed-channel',
          action: 'sync-readback',
          readback: 'visual-and-dom',
          artifactFingerprint,
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
        {
          id: 'credentialed-sync-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted sync hygiene proof',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'local-artifact',
          action: 'sensitive-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const exactArtifactIssueLocations = report.issues
      .filter(issue => issue.id === 'style-proof-manifest-exact-artifact-missing')
      .map(issue => issue.location)

    expect(exactArtifactIssueLocations).toEqual(expect.arrayContaining([
      'credentialed-channel-response',
      'sync-readback',
    ]))
    expect(requirementStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(requirementStatus.get('sync-readback')).toBe('invalid')
  })

  it('requires exact artifact binding for published URL or platform preview proof', () => {
    const artifactFingerprint = 'sha256:redacted-publish-exact-artifact'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      scope: 'style-choice',
      claimedEvidence: ['published'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'published-url-without-exact-artifact',
          requirementId: 'published-url-or-platform-preview',
          kind: 'published-preview',
          label: 'redacted published URL without exact artifact binding',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'public-web',
          action: 'published-preview',
          readback: 'published-url',
          artifactFingerprint,
          externalAccountAuthenticated: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const issueLocations = report.issues.map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('wechat', [manifest])
    const publishAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'published-url-or-platform-preview'
    )

    expect(report.valid).toBe(false)
    expect(issueIds).toContain('style-proof-manifest-exact-artifact-missing')
    expect(issueLocations).toContain('published-url-or-platform-preview')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(publishAudit?.status).toBe('invalid')
    expect(publishAudit?.issueIds).toContain('style-proof-manifest-exact-artifact-missing')
  })

  it.each([
    [
      'externalAccountLoginBlocked',
      {
        action: 'published-preview' as const,
        externalAccountAuthenticated: true,
        externalAccountLoginBlocked: true,
      },
    ],
    [
      'externalAccountAuthenticated false',
      {
        action: 'published-preview' as const,
        externalAccountAuthenticated: false,
      },
    ],
    [
      'external-account-login-readback action',
      {
        action: 'external-account-login-readback' as const,
        externalAccountAuthenticated: true,
      },
    ],
  ])('rejects Xiaohongshu publish proof with single external account blocker: %s', (_label, blocker) => {
    const blockerSlug = _label.replace(/\s+/g, '-')
    const artifactFingerprint = `sha256:redacted-xhs-single-blocker-${blockerSlug}`
    const manifest: StyleProofManifest = {
      platform: 'xiaohongshu',
      choiceId: 'xhs-cover-carousel',
      scope: 'style-choice',
      claimedEvidence: ['published'],
      artifactFingerprint,
      artifacts: [
        {
          id: `xhs-single-blocker-${blockerSlug}`,
          requirementId: 'published-url-or-platform-preview',
          kind: 'browser-readback',
          label: 'redacted xhs external account blocker readback',
          platform: 'xiaohongshu',
          choiceId: 'xhs-cover-carousel',
          channel: 'credentialed-channel',
          readback: 'visual-and-dom',
          artifactFingerprint,
          safeForCommit: true,
          ...blocker,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('xiaohongshu', [manifest])
    const publishAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'published-url-or-platform-preview'
    )

    expect(report.valid).toBe(false)
    expect(issueIds).toContain('style-proof-manifest-external-account-login-blocked')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(publishAudit?.status).toBe('invalid')
    expect(publishAudit?.issueIds).toContain('style-proof-manifest-external-account-login-blocked')
  })

  it('rejects Zhihu sign-in readback as public host, upload manifest, or publish proof', () => {
    const artifactFingerprint = 'sha256:redacted-zhihu-login-gate'
    const manifest: StyleProofManifest = {
      platform: 'zhihu',
      choiceId: 'zhihu-data-table',
      scope: 'style-choice',
      claimedEvidence: ['published'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'zhihu-login-gate-public-host',
          requirementId: 'public-image-host',
          kind: 'browser-readback',
          label: 'redacted zhihu sign-in gate cannot prove public image host',
          platform: 'zhihu',
          choiceId: 'zhihu-data-table',
          channel: 'credentialed-channel',
          action: 'external-account-login-readback',
          readback: 'visual-and-dom',
          artifactFingerprint,
          externalAccountAuthenticated: false,
          externalAccountLoginBlocked: true,
          hostStatus: 'blocked',
          safeForCommit: true,
        },
        {
          id: 'zhihu-login-gate-upload-manifest',
          requirementId: 'zhihu-artifact-manifest',
          kind: 'browser-readback',
          label: 'redacted zhihu sign-in gate cannot prove upload manifest',
          platform: 'zhihu',
          choiceId: 'zhihu-data-table',
          channel: 'credentialed-channel',
          action: 'external-account-login-readback',
          readback: 'visual-and-dom',
          artifactFingerprint,
          externalAccountAuthenticated: false,
          externalAccountLoginBlocked: true,
          safeForCommit: true,
        },
        {
          id: 'zhihu-login-gate-publish-readback',
          requirementId: 'published-url-or-platform-preview',
          kind: 'browser-readback',
          label: 'redacted zhihu sign-in gate cannot prove publish preview',
          platform: 'zhihu',
          choiceId: 'zhihu-data-table',
          channel: 'credentialed-channel',
          action: 'external-account-login-readback',
          readback: 'visual-and-dom',
          artifactFingerprint,
          externalAccountAuthenticated: false,
          externalAccountLoginBlocked: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('zhihu', [manifest])
    const publicHostAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'public-image-host'
    )
    const manifestAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'zhihu-artifact-manifest'
    )
    const publishAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'published-url-or-platform-preview'
    )

    expect(report.valid).toBe(false)
    expect(issueIds.filter(issueId =>
      issueId === 'style-proof-manifest-external-account-login-blocked',
    )).toHaveLength(3)
    expect(requirementStatus.get('public-image-host')).toBe('invalid')
    expect(requirementStatus.get('zhihu-artifact-manifest')).toBe('invalid')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(publicHostAudit?.status).toBe('invalid')
    expect(manifestAudit?.status).toBe('invalid')
    expect(publishAudit?.status).toBe('invalid')
    expect(publicHostAudit?.issueIds).toContain('style-proof-manifest-external-account-login-blocked')
    expect(manifestAudit?.issueIds).toContain('style-proof-manifest-external-account-login-blocked')
    expect(publishAudit?.issueIds).toContain('style-proof-manifest-external-account-login-blocked')
  })

  it('keeps non-public image host proof invalid in acceptance audit', () => {
    const artifactFingerprint = 'sha256:redacted-zhihu-local-host'
    const manifest: StyleProofManifest = {
      platform: 'zhihu',
      choiceId: 'zhihu-data-table',
      scope: 'style-choice',
      claimedEvidence: ['published'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'zhihu-local-only-host-proof',
          requirementId: 'public-image-host',
          kind: 'image-host-check',
          label: 'local-only image host cannot prove public fallback hosting',
          platform: 'zhihu',
          choiceId: 'zhihu-data-table',
          channel: 'public-web',
          action: 'public-image-host-check',
          readback: 'manifest',
          artifactFingerprint,
          artifactRef: 'prompts/0601/evidence/zhihu-local-host-report-20260619.txt',
          hostStatus: 'local-only',
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('zhihu', [manifest])
    const publicHostAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'public-image-host'
    )

    expect(issueIds).toContain('style-proof-manifest-public-image-host-missing')
    expect(requirementStatus.get('public-image-host')).toBe('invalid')
    expect(publicHostAudit?.status).toBe('invalid')
    expect(publicHostAudit?.issueIds).toContain('style-proof-manifest-public-image-host-missing')
  })

  it('requires traceable artifactRef for public image host proof', () => {
    const artifactFingerprint = 'sha256:redacted-zhihu-public-host'
    const manifest: StyleProofManifest = {
      platform: 'zhihu',
      choiceId: 'zhihu-data-table',
      scope: 'style-choice',
      claimedEvidence: ['published'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'zhihu-public-host-without-artifact-ref',
          requirementId: 'public-image-host',
          kind: 'image-host-check',
          label: 'redacted public host check without traceable artifact ref',
          platform: 'zhihu',
          choiceId: 'zhihu-data-table',
          channel: 'public-web',
          action: 'public-image-host-check',
          readback: 'manifest',
          artifactFingerprint,
          hostStatus: 'public-https',
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const issueLocations = report.issues.map(issue => issue.location)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const audit = getPlatformStyleProofAcceptanceAuditReport('zhihu', [manifest])
    const publicHostAudit = audit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'public-image-host'
    )

    expect(report.valid).toBe(false)
    expect(issueIds).toContain('style-proof-manifest-artifact-ref-missing')
    expect(issueLocations).toContain('public-image-host')
    expect(requirementStatus.get('public-image-host')).toBe('invalid')
    expect(publicHostAudit?.status).toBe('invalid')
    expect(publicHostAudit?.issueIds).toContain('style-proof-manifest-artifact-ref-missing')

    const unsafeManifest: StyleProofManifest = {
      ...manifest,
      artifacts: manifest.artifacts.map(artifact => ({
        ...artifact,
        id: 'zhihu-public-host-without-safe-commit',
        artifactRef: 'prompts/0601/evidence/zhihu-public-host-report-20260619.txt',
        safeForCommit: false,
      })),
    }
    const unsafeReport = getStyleProofManifestReport(unsafeManifest)
    const unsafeIssueIds = unsafeReport.issues.map(issue => issue.id)
    const unsafeRequirementStatus = new Map(
      unsafeReport.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const unsafeAudit = getPlatformStyleProofAcceptanceAuditReport('zhihu', [unsafeManifest])
    const unsafePublicHostAudit = unsafeAudit.cannotClaim.find(requirement =>
      requirement.requirement.id === 'public-image-host'
    )

    expect(unsafeIssueIds).toContain('style-proof-manifest-safe-commit-not-verified')
    expect(unsafeRequirementStatus.get('public-image-host')).toBe('invalid')
    expect(unsafePublicHostAudit?.status).toBe('invalid')
    expect(unsafePublicHostAudit?.issueIds).toContain('style-proof-manifest-safe-commit-not-verified')
  })

  it('keeps blocked or unavailable market styles from being reported as usable', () => {
    const amber = getStyleChoiceById('wechat-flagship-amber')
    const clickReveal = getStyleChoiceById('wechat-click-reveal')
    const officialWidget = getStyleChoiceById('wechat-official-widget-checklist')
    expect(amber).toBeDefined()
    expect(clickReveal).toBeDefined()
    expect(officialWidget).toBeDefined()

    if (!amber || !clickReveal || !officialWidget) return

    const amberAvailability = evaluateStyleChoiceAvailability(amber, ['pc-editor-paste', 'mobile-preview'])
    expect(amberAvailability.usable).toBe(false)
    expect(amberAvailability.status).toBe('blocked')
    expect(amberAvailability.reason).toContain('plain text')

    const clickAvailability = evaluateStyleChoiceAvailability(clickReveal, ['local-browser'])
    expect(clickAvailability.usable).toBe(false)
    expect(clickAvailability.requiredEvidence).toBe('mobile-preview')

    const officialAvailability = evaluateStyleChoiceAvailability(officialWidget, ['credentialed-sync', 'published'])
    expect(officialAvailability.usable).toBe(false)
    expect(officialAvailability.status).toBe('unavailable')
  })

  it('keeps mobile-only plugin sync and H5 or design families behind explicit proof gates', () => {
    const mobileOnlyChoices = getStyleChoiceCatalog()
      .filter(choice => choice.motion === 'mobile-only')
    expect(mobileOnlyChoices.length).toBeGreaterThanOrEqual(2)

    for (const choice of mobileOnlyChoices) {
      const availability = evaluateStyleChoiceAvailability(choice, getDefaultStyleEvidence(choice.platform))
      expect(availability.usable, choice.id).toBe(false)
      expect(choice.status, choice.id).toBe('blocked')
      expect(choice.evidenceFloor, choice.id).toBe('mobile-preview')
      expect(choice.fallbackOutput, choice.id).not.toBe('unavailable')
    }

    const credentialedChoices = getStyleChoiceCatalog()
      .filter(choice => choice.evidenceFloor === 'credentialed-sync')
    expect(credentialedChoices.length).toBeGreaterThanOrEqual(3)

    for (const choice of credentialedChoices) {
      const availability = evaluateStyleChoiceAvailability(choice, getDefaultStyleEvidence(choice.platform))
      expect(availability.usable, choice.id).toBe(false)
      expect(availability.status, choice.id).toBe('unavailable')
      expect(choice.primaryOutput, choice.id).toBe('publish-checklist')
    }

    for (const choiceId of [
      'wechat-h5-design-boundary',
      'xhs-h5-design-import-boundary',
    ]) {
      const choice = getStyleChoiceById(choiceId)
      expect(choice).toBeDefined()
      if (!choice) continue

      const availability = evaluateStyleChoiceAvailability(choice, ['published'])
      expect(availability.usable, choiceId).toBe(false)
      expect(availability.status, choiceId).toBe('unavailable')
      expect(choice.primaryOutput, choiceId).toBe('publish-checklist')
    }
  })

  it('requires exact evidence floor before enabling available style choices', () => {
    const classic = getStyleChoiceById('wechat-classic-inline')
    const xhsCarousel = getStyleChoiceById('xhs-cover-carousel')
    const zhihuColumn = getStyleChoiceById('zhihu-clean-column')
    expect(classic).toBeDefined()
    expect(xhsCarousel).toBeDefined()
    expect(zhihuColumn).toBeDefined()

    if (!classic || !xhsCarousel || !zhihuColumn) return

    expect(evaluateStyleChoiceAvailability(classic, ['doc-only']).usable).toBe(false)
    expect(evaluateStyleChoiceAvailability(classic, ['applied-editor-element']).usable).toBe(false)
    expect(evaluateStyleChoiceAvailability(classic, ['unit-tested']).usable).toBe(true)

    const xhsWithoutBrowser = evaluateStyleChoiceAvailability(xhsCarousel, ['unit-tested', 'applied-editor-element'])
    expect(xhsWithoutBrowser.usable).toBe(false)
    expect(xhsWithoutBrowser.reason).toContain('local-browser')
    expect(evaluateStyleChoiceAvailability(xhsCarousel, ['local-browser']).usable).toBe(true)

    expect(evaluateStyleChoiceAvailability(zhihuColumn, ['unit-tested']).usable).toBe(true)
  })

  it('separates available style choices from selectable preset-backed actions', () => {
    const kiln = getStyleChoiceById('wechat-flagship-kiln')
    const kilnPasteSafe = getStyleChoiceById('wechat-flagship-kiln-paste-safe')
    const amber = getStyleChoiceById('wechat-flagship-amber')
    const toolbarMap = getStyleChoiceById('wechat-toolbar-parameter-map')
    const xhsCarousel = getStyleChoiceById('xhs-cover-carousel')
    const xhsClean = getStyleChoiceById('xhs-clean-text')
    const zhihuTable = getStyleChoiceById('zhihu-data-table')
    expect(kiln).toBeDefined()
    expect(kilnPasteSafe).toBeDefined()
    expect(amber).toBeDefined()
    expect(toolbarMap).toBeDefined()
    expect(xhsCarousel).toBeDefined()
    expect(xhsClean).toBeDefined()
    expect(zhihuTable).toBeDefined()

    if (!kiln || !kilnPasteSafe || !amber || !toolbarMap || !xhsCarousel || !xhsClean || !zhihuTable) return

    expect(getStyleChoiceApplication('wechat-flagship-kiln')?.presetId).toBe('flagship-kiln')
    expect(getStyleChoiceApplication('wechat-flagship-kiln-paste-safe')?.presetId).toBe('flagship-kiln-paste-safe')
    expect(evaluateStyleChoiceApplication(kiln, ['local-browser']).selectable).toBe(true)
    expect(evaluateStyleChoiceApplication(kilnPasteSafe, ['local-browser']).selectable).toBe(true)

    const amberApplication = evaluateStyleChoiceApplication(amber, ['pc-editor-paste', 'mobile-preview'])
    expect(amberApplication.application?.presetId).toBe('flagship-amber')
    expect(amberApplication.selectable).toBe(false)
    expect(amberApplication.reason).toContain('plain text')

    const toolbarApplication = evaluateStyleChoiceApplication(toolbarMap, ['local-browser'])
    expect(toolbarApplication.application).toBeNull()
    expect(toolbarApplication.selectable).toBe(false)
    expect(toolbarApplication.reason).toContain('no existing InkForge preset')

    const xhsCarouselApplication = evaluateStyleChoiceApplication(xhsCarousel, ['local-browser'])
    expect(xhsCarouselApplication.availability.usable).toBe(true)
    expect(xhsCarouselApplication.selectable).toBe(false)
    expect(xhsCarouselApplication.reason).toContain('no existing InkForge preset')

    expect(evaluateStyleChoiceApplication(xhsClean, ['unit-tested']).application?.presetId).toBe('xhs-fresh')
    expect(evaluateStyleChoiceApplication(xhsClean, ['unit-tested']).selectable).toBe(true)
    expect(evaluateStyleChoiceApplication(zhihuTable, ['unit-tested']).application?.presetId).toBe('zhihu-tech')
    expect(evaluateStyleChoiceApplication(zhihuTable, ['unit-tested']).selectable).toBe(true)
  })

  it('summarizes platform style availability without promoting blocked choices', () => {
    const wechatReport = getPlatformStyleAvailabilityReport('wechat')
    const xhsReport = getPlatformStyleAvailabilityReport('xiaohongshu')
    const zhihuReport = getPlatformStyleAvailabilityReport('zhihu')

    expect(getDefaultStyleEvidence('wechat')).toContain('local-browser')
    expect(wechatReport.stats.total).toBe(getPlatformStyleChoices('wechat').length)
    expect(wechatReport.stats.usable).toBeGreaterThan(0)
    expect(wechatReport.stats.blocked).toBeGreaterThan(0)
    expect(wechatReport.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')?.usable).toBe(false)
    expect(wechatReport.choices.find(choice => choice.choice.id === 'wechat-mobile-only-effect')?.usable).toBe(false)
    expect(wechatReport.choices.find(choice => choice.choice.id === 'wechat-plugin-transfer-checklist')?.usable).toBe(false)

    expect(xhsReport.choices.find(choice => choice.choice.id === 'xhs-cover-carousel')?.usable).toBe(true)
    expect(xhsReport.choices.find(choice => choice.choice.id === 'xhs-markdown-card-slicer')?.usable).toBe(true)
    expect(xhsReport.choices.find(choice => choice.choice.id === 'xhs-long-report')?.usable).toBe(false)
    expect(xhsReport.choices.find(choice => choice.choice.id === 'xhs-h5-design-import-boundary')?.usable).toBe(false)

    expect(zhihuReport.choices.find(choice => choice.choice.id === 'zhihu-clean-column')?.usable).toBe(true)
    expect(zhihuReport.choices.find(choice => choice.choice.id === 'zhihu-academic-latex-column')?.usable).toBe(true)
    expect(zhihuReport.choices.find(choice => choice.choice.id === 'zhihu-diagram-article')?.usable).toBe(false)
    expect(zhihuReport.choices.find(choice => choice.choice.id === 'zhihu-public-image-upload-checklist')?.usable).toBe(false)
  })

  it('reports selectable style actions only when a usable catalog choice has a real application mapping', () => {
    const wechatApplications = getPlatformStyleApplicationReport('wechat')
    const xhsApplications = getPlatformStyleApplicationReport('xiaohongshu')
    const zhihuApplications = getPlatformStyleApplicationReport('zhihu')

    expect(wechatApplications.find(item => item.availability.choice.id === 'wechat-flagship-kiln')?.selectable).toBe(true)
    expect(wechatApplications.find(item => item.availability.choice.id === 'wechat-flagship-kiln-paste-safe')?.selectable).toBe(true)
    expect(wechatApplications.find(item => item.availability.choice.id === 'wechat-flagship-amber')?.selectable).toBe(false)
    expect(wechatApplications.find(item => item.availability.choice.id === 'wechat-mobile-only-effect')?.selectable).toBe(false)
    expect(wechatApplications.find(item => item.availability.choice.id === 'wechat-toolbar-parameter-map')?.selectable).toBe(false)

    expect(xhsApplications.find(item => item.availability.choice.id === 'xhs-clean-text')?.selectable).toBe(true)
    expect(xhsApplications.find(item => item.availability.choice.id === 'xhs-cover-carousel')?.selectable).toBe(false)

    expect(zhihuApplications.find(item => item.availability.choice.id === 'zhihu-clean-column')?.selectable).toBe(true)
    expect(zhihuApplications.find(item => item.availability.choice.id === 'zhihu-diagram-article')?.selectable).toBe(false)
  })

  it('keeps WeChat HTML compatible with draft content sanitization and inline CSS rendering', () => {
    const preset = getDefaultPreset()
    const result = convertToWechatWithStats(
      [
        '<style>.bad{display:flex;gap:8px}</style>',
        '<section class="bad" style="display:flex;gap:8px;color:var(--md-primary-color)">',
        '<h1 style="margin-top:24px">发布验证</h1>',
        '<p onclick="evil()">正文<a href="javascript:alert(1)">坏链</a><a href="https://vite.dev">官网</a></p>',
        '<img class="hero" src="https://example.com/a.png" width="640" height="480" alt="架构图">',
        '<pre><code class="language-ts">const exported = true</code></pre>',
        '<table><tr><th>渠道</th><th>格式</th></tr><tr><td>微信</td><td>HTML</td></tr></table>',
        '<script>alert(1)</script><iframe></iframe>',
        '</section>',
      ].join(''),
      preset,
      { enableReadingTime: false, enableCiteStatus: true }
    )

    expect(result.html).not.toMatch(/<style\b/i)
    expect(result.html).not.toMatch(/<script\b|<iframe\b|<form\b|<input\b/i)
    expect(result.html).not.toMatch(/\sclass=/i)
    expect(result.html).not.toMatch(/javascript:/i)
    expect(result.html).not.toMatch(/onclick=/i)
    expect(result.html).not.toMatch(/display:\s*flex|gap:\s*8px|var\(/i)
    expect(result.html).toMatch(/style="[^"]+"/i)
    expect(result.html).toContain('max-width:100%')
    expect(result.html).toContain('border:1px solid #D8E2EC')
    expect(result.html).toContain('https://vite.dev')
  })

  it('prepares WeChat clipboard HTML with ASCII-only entities while preserving SVG structure', () => {
    const rawHtml = exportWechatPresetHtml('flagship-tempera')
    const preparedHtml = prepareWechatClipboardHtml(rawHtml)
    const preparedPlainText = prepareWechatClipboardPlainText(preparedHtml)

    const rawSvgCount = countPattern(rawHtml, /<svg\b/gi)
    const rawInkSvgCount = countPattern(rawHtml, /data-ink-svg\s*=/gi)
    const rawInkBlockCount = countPattern(rawHtml, /data-ink-block\s*=/gi)

    expect(hasNonAscii(rawHtml)).toBe(true)
    expect(hasNonAscii(preparedHtml)).toBe(false)
    expect(preparedHtml).toContain('&#')
    expect(countPattern(preparedHtml, /<svg\b/gi)).toBe(rawSvgCount)
    expect(countPattern(preparedHtml, /data-ink-svg\s*=/gi)).toBe(rawInkSvgCount)
    expect(countPattern(preparedHtml, /data-ink-block\s*=/gi)).toBe(rawInkBlockCount)
    expect(preparedHtml).not.toMatch(/<style\b|<script\b|<foreignObject\b/i)
    expect(preparedPlainText).toContain('微信排版视觉手测稿')
    expect(preparedPlainText).toContain('行动清单')
    expect(preparedPlainText).not.toContain('&#')
    expect(preparedPlainText).not.toMatch(/<svg\b|data-ink-svg\s*=/i)

    const doc = new DOMParser().parseFromString(`<body>${preparedHtml}</body>`, 'text/html')
    expect(doc.body.textContent).toContain('微信排版视觉手测稿')
    expect(doc.body.textContent).toContain('行动清单')
    expect(doc.body.textContent).not.toContain('&#')
    expect(doc.body.querySelectorAll('svg').length).toBe(rawSvgCount)
    expect(doc.body.querySelectorAll('[data-ink-svg]').length).toBe(rawInkSvgCount)
    expect(doc.body.querySelectorAll('[data-ink-block]').length).toBe(rawInkBlockCount)
  })

  it('keeps WeChat preset decorators as a single source of truth in final export HTML', () => {
    const thesisText = compactText(exportWechatPresetHtml('thesis'))
    expect(thesisText).toContain('第一章核心结论')
    expect(thesisText).toContain('§小节观察')
    expect(thesisText).toContain('···')
    expect(thesisText).not.toMatch(/第一章第[一二三四五六七八九十0-9]+章/)
    expect(thesisText).not.toContain('§§')

    const legalText = compactText(exportWechatPresetHtml('legal'))
    expect(legalText).toContain('§I.核心结论')
    expect(legalText).not.toContain('第一章')
    expect(legalText).not.toContain('““')
    expect(countText(legalText, '“')).toBe(1)

    const reportText = compactText(exportWechatPresetHtml('report'))
    expect(reportText).toContain('01核心结论')
    expect(reportText).toContain('01确认微信导出保留previewCSS')
    expect(reportText).not.toContain('0101核心结论')

    const commentaryText = compactText(exportWechatPresetHtml('commentary'))
    expect(commentaryText).toContain('◆')
    expect(commentaryText).not.toContain('““')
    expect(countText(commentaryText, '“')).toBe(1)
  })

  it('does not leak raw CSS unicode escape codes from any WeChat preset export', () => {
    for (const presetId of WECHAT_PRESET_IDS) {
      const html = exportWechatPresetHtml(presetId)
      expect(html, presetId).not.toMatch(/\b(?:201C|270F|2726)\b/i)
    }

    expect(compactText(exportWechatPresetHtml('notes'))).toContain('✏核心结论')
  })

  it('strips WeChat-unsupported CSS even when style values contain normal whitespace', () => {
    const html = postProcessForWechat(
      [
        '<section style="display: flex; gap: 8px; position: sticky; color:var(--md-primary-color);">',
        '<span style="background-clip: text; -webkit-text-fill-color: transparent;">文本</span>',
        '<div style="display: grid; grid-template-columns:1fr 1fr;">网格</div>',
        '</section>',
      ].join(''),
      '#123456'
    )

    expect(html).not.toMatch(/display:\s*(?:flex|grid)|gap:\s*8px|position:\s*sticky/i)
    expect(html).not.toMatch(/background-clip:\s*text|-webkit-text-fill-color:\s*transparent/i)
    expect(html).not.toMatch(/grid-template|var\(--md-primary-color\)/i)
    expect(html).toContain('color:#123456')
  })

  it('enforces WeChat image width policy during export, not only in quality warnings', () => {
    const result = convertToWechatWithStats(
      [
        '<section id="nice">',
        '<p><img alt="a > b" src="https://example.com/a.png" width="1200" height="900"></p>',
        '<p><img src="https://example.com/b.png" style="width:1280px;height:720px" alt="样式大图"></p>',
        '</section>',
      ].join(''),
      getDefaultPreset(),
      { enableReadingTime: false }
    )

    expect(result.html).not.toMatch(/\swidth=["']1200["']|\sheight=["']900["']/i)
    expect(result.html).not.toMatch(/width:\s*1200px|width:\s*1280px/i)
    expect(result.html.match(/width:640px/g)?.length).toBe(2)
    expect(result.html).toContain('alt="a > b"')
    expect(result.html).toContain('max-width:100%')
    expect(result.html).toContain('height:auto')
  })

  it('degrades WeChat LaTeX output to self-contained readable formula text', async () => {
    const markdown = ['# 公式验证', '行内公式 $E=mc^2$。', '', '$$a+b=c$$'].join('\n')
    const result = await convertToNativeFormat(markdown, 'wechat', {
      includeQualityReport: true,
      exportOptions: { enableReadingTime: false },
    })

    expect(result.content).toContain('公式：E=mc^2')
    expect(result.content).toContain('公式：a+b=c')
    expect(result.content).not.toMatch(/katex|MathML|<math\b|<annotation\b|\sclass=/i)
    expect(result.qualityReport?.issues.some(issue => issue.id === 'wechat-latex-degrade')).toBe(true)
  })

  it('reports WeChat Mermaid as image conversion work instead of SVG embedding', () => {
    const report = detectQuality(['```mermaid', 'graph TD', 'A-->B', '```'].join('\n'), 'wechat')
    const issue = report.issues.find(item => item.id === 'wechat-mermaid')

    expect(issue?.suggestion).toContain('PNG/JPG')
    expect(issue?.suggestion).not.toContain('SVG 嵌入')
    expect(report.issues.some(item => item.id === 'render-code-language-unsupported')).toBe(false)
  })

  it('reports WeChat official editor structure risks before export', () => {
    const report = detectQuality(
      [
        '<section style="width:1080px;line-height:0;text-align:start!important">',
        '<pre>这是一段普通正文，不是代码块，不应该放在 pre 中。</pre>',
        '<img src="https://example.com/a.png" style="opacity:0">',
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20"><animate attributeName="fill" begin="touchstart" values="#000;#fff"></animate></circle></svg>',
        '</section>',
      ].join(''),
      'wechat'
    )
    const ids = report.issues.map(issue => issue.id)

    expect(report.passed).toBe(false)
    expect(ids).toContain('wechat-line-height-zero')
    expect(ids).toContain('wechat-fixed-container-size')
    expect(ids).toContain('wechat-text-align-logical')
    expect(ids).toContain('wechat-pre-ordinary-text')
    expect(ids).toContain('wechat-transparent-image-svg-overlay')
    expect(ids).toContain('wechat-svg-touchstart-only')
    expect(ids).toContain('wechat-important-style')
    expect(report.issues.filter(issue => [
      'wechat-line-height-zero',
      'wechat-fixed-container-size',
      'wechat-text-align-logical',
      'wechat-pre-ordinary-text',
      'wechat-transparent-image-svg-overlay',
      'wechat-svg-touchstart-only',
    ].includes(issue.id)).every(issue => issue.severity === 'error')).toBe(true)
  })

  it('blocks generic WeChat unsafe HTML CSS SVG and formula runtime dependencies', () => {
    const report = detectQuality(
      [
        '<section id="layout" class="grid-shell" onclick="openPanel()" style="display:grid;gap:12px;position:absolute;filter:blur(1px);transition:all .2s;transform:scale(1);background:linear-gradient(#fff,#eee);width:100%;height:auto">',
        '<svg viewBox="0 0 100 100">',
        '<defs><linearGradient id="g"><stop offset="0%" stop-color="#fff"></stop></linearGradient></defs>',
        '<clipPath id="clip"><rect width="100" height="100"></rect></clipPath>',
        '<mask id="m"><rect width="100" height="100"></rect></mask>',
        '<filter id="shadow"><feDropShadow dx="1" dy="1"></feDropShadow></filter>',
        '<use href="#shape"></use>',
        '<rect fill="url(#g)" width="100" height="100"></rect>',
        '<image href="https://example.com/a.png" width="100" height="100"></image>',
        '</svg>',
        '<span class="katex-html"><math><annotation encoding="application/x-tex">E=mc^2</annotation></math></span>',
        '</section>',
      ].join(''),
      'wechat'
    )
    const ids = report.issues.map(issue => issue.id)

    expect(report.passed).toBe(false)
    expect(ids).toContain('wechat-event-handler')
    expect(ids).toContain('wechat-class-id-dependency')
    expect(ids).toContain('wechat-unsupported-css')
    expect(ids).toContain('wechat-unsafe-svg-construct')
    expect(ids).toContain('wechat-katex-html')
    expect(report.issues.find(issue => issue.id === 'wechat-unsupported-css')?.severity).toBe('error')
    expect(report.issues.find(issue => issue.id === 'wechat-unsafe-svg-construct')?.severity).toBe('error')
    expect(report.issues.find(issue => issue.id === 'wechat-katex-html')?.severity).toBe('error')
    expect(report.issues.find(issue => issue.id === 'wechat-class-id-dependency')?.severity).toBe('warning')
  })

  it('requires a WeChat layout report for free layers backgrounds crops and trigger areas', () => {
    const report = detectQuality(
      [
        '<section style="position:absolute;z-index:9;left:12px;top:-4px;width:375px;height:420px;overflow:hidden;background-image:url(https://example.com/bg.png);margin-top:-16px">',
        '<a href="https://example.com" style="opacity:0;pointer-events:auto">隐藏触发区</a>',
        '<p>这类自由布局必须先生成 layout report 或降级为图片。</p>',
        '</section>',
      ].join(''),
      'wechat'
    )
    const issue = report.issues.find(item => item.id === 'wechat-layout-report-required')

    expect(report.passed).toBe(false)
    expect(issue?.severity).toBe('error')
    expect(issue?.message).toContain('free positioning layer')
    expect(issue?.message).toContain('z-order layer')
    expect(issue?.message).toContain('background image layer')
    expect(issue?.message).toContain('cropped overflow')
    expect(issue?.message).toContain('manual offset')
    expect(issue?.message).toContain('negative overlap spacing')
    expect(issue?.message).toContain('invisible or custom hit area')
    expect(issue?.suggestion).toContain('layout report')
  })

  it('does not require a WeChat layout report for normal inline flow blocks', () => {
    const report = detectQuality(
      [
        '<section style="background-color:#f8f4ed;border-left:4px solid #8a4b2d;padding:16px;margin:18px 0;border-radius:4px">',
        '<p style="line-height:1.75;color:#2d2a26">普通自有色块保持自然 DOM 顺序。</p>',
        '</section>',
      ].join(''),
      'wechat'
    )

    expect(report.issues.some(item => item.id === 'wechat-layout-report-required')).toBe(false)
  })

  it('blocks copied 135 and Xiumi authoring residues from WeChat output', () => {
    const report = detectQuality(MARKET_EDITOR_RESIDUE_HTML, 'wechat')
    const issue = report.issues.find(item => item.id === 'wechat-market-editor-residue')

    expect(report.passed).toBe(false)
    expect(issue?.severity).toBe('error')
    expect(issue?.message).toContain('135 class/id authoring residue')
    expect(issue?.message).toContain('Xiumi tn-* authoring tree')
    expect(issue?.suggestion).toContain('InkForge 自有')
    expect(report.issues.some(item => item.id === 'wechat-unsupported-css' && item.severity === 'error')).toBe(true)
  })

  it('blocks market editor hosted background sources from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_BACKGROUND_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_BACKGROUND_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_BACKGROUND_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('market editor hosted background source')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('market editor hosted background source')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('market editor hosted background source')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks 135 applied-editor text slot metadata even without 135 wrapper classes', () => {
    const wechat = detectQuality(MARKET_EDITOR_SLOT_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_SLOT_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_SLOT_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 editable brush slot')
    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 automatic numbering marker')
    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 style-list metadata')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('135 editable brush slot')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('135 editable brush slot')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks 135 SVG builder canvas blocks from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_SVG_BUILDER_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_SVG_BUILDER_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_SVG_BUILDER_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 SVG builder effect data-name')
    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 SVG builder canvas residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('135 SVG builder effect data-name')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('135 SVG builder effect data-name')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks 135 SVG trigger canvas prompts from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_135_SVG_TRIGGER_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_135_SVG_TRIGGER_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_135_SVG_TRIGGER_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 SVG builder canvas residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('135 SVG builder canvas residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('135 SVG builder canvas residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi applied-editor runtime binding attributes from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_BINDING_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_BINDING_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_BINDING_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi runtime binding attribute')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi runtime binding attribute')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi runtime binding attribute')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi SVG carousel and flow-canvas authoring metadata from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_SVG_CAROUSEL_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_SVG_CAROUSEL_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_SVG_CAROUSEL_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi SVG carousel flow-canvas residue')
    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi text authoring metadata')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi SVG carousel flow-canvas residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi text authoring metadata')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi SVG carousel flow-canvas residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi text authoring metadata')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi Angular runtime controls and classes without tn-* markers', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_ANGULAR_RUNTIME_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_ANGULAR_RUNTIME_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_ANGULAR_RUNTIME_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Angular/Vue authoring attribute')
    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Angular authoring class')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Angular/Vue authoring attribute')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Angular authoring class')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Angular/Vue authoring attribute')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Angular authoring class')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks copied editor editable surfaces from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_EDITABLE_SURFACE_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_EDITABLE_SURFACE_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_EDITABLE_SURFACE_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('editor editable surface attribute')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('editor editable surface attribute')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('editor editable surface attribute')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('degrades rendered Mermaid SVG to a readable WeChat image placeholder', () => {
    const result = convertToWechatWithStats(
      '<div class="mermaid-rendered" data-source="graph TD A[流程 A] --> B[流程 B]"><svg><style>#x{font-family:sans-serif}@keyframes edge{}</style><text>流程 A</text><text>流程 B</text></svg></div>',
      getDefaultPreset(),
      { enableReadingTime: false }
    )

    expect(result.html).toContain('Mermaid 图表需转为 PNG/JPG')
    expect(result.html).toContain('graph TD A[流程 A] --&gt; B[流程 B]')
    expect(result.html).not.toContain('#x{font-family')
    expect(result.html).not.toContain('@keyframes edge')
    expect(result.html).not.toMatch(/<svg\b|<text\b|\sclass=/i)
  })

  it('routes WeChat markdown Mermaid through readable placeholder instead of code block output', async () => {
    const result = await markdownToWechatWithStats(
      ['# 图表', '', '```mermaid', 'graph TD', 'A[草稿] --> B[发布]', '```'].join('\n'),
      getDefaultPreset(),
      { enableReadingTime: false }
    )

    expect(result.html).toContain('Mermaid 图表需转为 PNG/JPG')
    expect(result.html).not.toMatch(/<pre\b|language-mermaid|<code\b/i)
  }, 30000)

  it('keeps WeChat reading header stats aligned with markdown AST stats after Mermaid degradation', async () => {
    const result = await markdownToWechatWithStats(
      [
        '# 微信导出实测',
        '',
        '```mermaid',
        'graph TD',
        'A[草稿] --> B[导出]',
        'B --> C[发布]',
        '```',
        '',
        '正文包含 Vue3 和 React18。',
      ].join('\n'),
      getDefaultPreset()
    )

    expect(result.stats.wordCount).toBeLessThan(80)
    expect(result.html).toMatch(new RegExp(`全文 ${result.stats.wordCount} 字`))
    expect(result.html).not.toMatch(/全文 [3-9]\d{2,} 字/)
  })

  it('applies WeChat style controls for primary color, font family, font size, and Mac code blocks', () => {
    const result = convertToWechatWithStats(
      [
        '<h2>样式验证</h2>',
        '<p>正文段落。</p>',
        '<blockquote>引用内容</blockquote>',
        '<pre><code class="language-ts">const styled = true</code></pre>',
        '<table><tr><th>列</th></tr><tr><td>值</td></tr></table>',
      ].join(''),
      getDefaultPreset(),
      {
        enableReadingTime: false,
        primaryColor: '#0F766E',
        fontFamily: 'monospace',
        fontSize: '17px',
        enableMacCodeBlock: true,
      }
    )

    expect(result.html).toContain('#0F766E')
    expect(result.html).toContain('font-size:17px')
    expect(result.html).toContain('JetBrains Mono')
    expect(result.html).toMatch(/background:#FF5F56/i)
    expect(result.html).not.toMatch(/<style\b|\sclass=|var\(|display:\s*flex/i)
  })

  it('ignores unsafe WeChat primary color overrides instead of injecting CSS', () => {
    const result = convertToWechatWithStats(
      '<h2>颜色安全</h2><p>正文</p>',
      getDefaultPreset(),
      {
        enableReadingTime: false,
        primaryColor: '#123456;background:url(javascript:alert(1))',
      }
    )

    expect(result.html).not.toContain('#123456;background')
    expect(result.html).not.toContain('javascript:')
    expect(result.html).toContain(getDefaultPreset().primaryColor)
  })

  // ─── P2-T6 WeChat platform-rules 接入 ─────────────────────────────
  // 注意: 故意把 CJK 与 Latin/digit 紧贴在一起以触发间距规则，间距规则会跳过
  // 已经有空白分隔的 token 对（thin-space 或常规空格）。
  const WECHAT_COMPLIANCE_HTML = [
    '<h2 style="color:#333">中文word与Vue3写代码</h2>',
    '<p>正文段落混排React18组件。</p>',
    '<blockquote style="background-color:#eee">引用区</blockquote>',
    '<pre><code>var x = 1</code></pre>',
    '<table><tr><th>列</th></tr><tr><td>值</td></tr></table>',
  ].join('')
  const THIN_SPACE = '\u202F'

  it('inserts U+202F thin space between CJK and Latin/digit on WeChat export by default', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
    })
    expect(result.html).toContain(`中文${THIN_SPACE}word`)
    expect(result.html).toContain(`Vue3${THIN_SPACE}写代码`)
    expect(result.html).toContain(`React18${THIN_SPACE}组件`)
  })

  it('clamps WeChat content to 677px wrapper by default with idempotent marker', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
    })
    expect(result.html).toContain('data-wechat-clamp="1"')
    expect(result.html).toContain('max-width:677px')
  })

  it('skips WeChat content-width clamp when maxContentWidth is null', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
      maxContentWidth: null,
    })
    expect(result.html).not.toContain('data-wechat-clamp="1"')
    expect(result.html).not.toContain('max-width:677px')
  })

  it('honors a custom maxContentWidth on WeChat export', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
      maxContentWidth: 800,
    })
    expect(result.html).toContain('max-width:800px')
  })

  it('injects WeChat dark-mode metadata on h2/blockquote/pre/code/td when enabled', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
      enableDarkMode: true,
    })
    expect(result.html).toMatch(/<h2[^>]*data-darkmode-color=/i)
    expect(result.html).toMatch(/<blockquote[^>]*data-darkmode-color=/i)
    expect(result.html).toMatch(/<pre[^>]*data-darkmode-color=/i)
    expect(result.html).toMatch(/<td[^>]*data-darkmode-color=/i)

    const defaultResult = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
    })
    expect(defaultResult.html).not.toContain('data-darkmode-color')
  })

  it('omits CJK thin-space when enableCjkSpacing is explicitly false', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
      enableCjkSpacing: false,
    })
    expect(result.html).not.toContain(THIN_SPACE)
    expect(result.html).toMatch(/中文word|Vue3写代码|React18组件/)
  })

  it('converts Xiaohongshu export to platform-native plain text without raw Markdown or HTML leakage', () => {
    const result = markdownToXiaohongshuText(REAL_EXPORT_MARKDOWN, {
      addSignature: false,
      autoSplitParagraphs: false,
      generateTags: true,
      injectEmojis: false,
    })

    // P2-T7: 图占位改用 platform-rules/buildImagePlaceholder（带 ratio + size）
    expect(result.text).toContain('[配图1: 架构图（3:4 @ 1080x1440 推荐）')
    expect(result.text).toContain('官网（检索关键词「官网」）')
    expect(result.text).toContain('[配图] Mermaid 图表建议转为图片')
    expect(result.text).toContain('[代码] 代码片段 (ts):')
    expect(result.text).toContain('[表格] 渠道 / 原生格式')
    expect(result.text).not.toMatch(/```|graph TD|<span|style=|class=|!\[|\]\(https?:/i)
    expect(result.overLimit).toBe(false)
    expect(result.suggestedTags.length).toBeGreaterThan(0)
    expect(result.suggestedTags.every(tag => /^#[^#]{2,20}$/.test(tag))).toBe(true)
  })

  it('keeps Zhihu export as clean Markdown while removing platform-hostile HTML and Mermaid source', () => {
    // 默认行为：LaTeX → equation img，表格 → HTML <table>，无 lang code 围栏 → text
    const result = markdownToZhihuClean([REAL_EXPORT_MARKDOWN, '', '$$E=mc^2$$'].join(String.fromCharCode(10)))

    expect(result.markdown).toContain('[官网](https://vite.dev)')
    expect(result.markdown).toContain('![架构图](https://example.com/arch.png)')
    // 默认 tableHandling='html'：GFM 表格转为知乎原生支持的 HTML <table>
    expect(result.markdown).not.toContain('| 渠道 | 原生格式 |')
    expect(result.markdown).toContain('<table>')
    expect(result.markdown).toContain('<th>渠道</th>')
    expect(result.markdown).toContain('<td>微信</td>')
    expect(result.markdown).not.toContain('> **表格 1**')
    expect(result.markdown).toContain('```ts')
    // 默认 convertLatexToImg=true：$$...$$ 被转为带 ee_img class 的 equation img
    expect(result.markdown).not.toContain('$$E=mc^2$$')
    expect(result.markdown).toMatch(
      /<img src="https:\/\/www\.zhihu\.com\/equation\?tex=E%3Dmc%5E2"[^>]*class="ee_img tr_noresize"[^>]*eeimg="1"/
    )
    expect(result.markdown).toContain('知乎不支持 Mermaid 渲染')
    // 不应残留平台敌对的 HTML/Mermaid 源；equation img 与 table 是受信白名单输出
    expect(result.markdown).not.toMatch(/```mermaid|graph TD|<span|style=/i)
    // 注：现存合法 class 仅限 ee_img tr_noresize（equation img 工业标准）
    const stripWhitelisted = result.markdown
      .replace(/class="ee_img tr_noresize"/g, '')
    expect(stripWhitelisted).not.toMatch(/class=/i)
    expect(result.cleanedHtmlTags).toContain('span')
    expect(result.mermaidCount).toBe(1)
    expect(result.latexCount).toBe(1)
    expect(result.latexBlocksConverted).toBe(1)
    expect(result.tablesConverted).toBe(1)

    const quality = detectQuality([REAL_EXPORT_MARKDOWN, '', '$$E=mc^2$$'].join(String.fromCharCode(10)), 'zhihu')
    expect(quality.issues.some(issue => issue.id === 'zhihu-latex-preview')).toBe(true)
  })

  it('blocks WeChat flagship decorations from XHS and Zhihu publishable outputs', () => {
    const decorated = [
      '<section data-ink-block="flagship-h2" style="background-color:#111;color:#fff">',
      '<svg data-ink-svg="divider-grid" viewBox="0 0 100 20"><path d="M0 0h100v20H0z"></path></svg>',
      '标题',
      '</section>',
    ].join('')

    const xhs = detectQuality(decorated, 'xiaohongshu')
    const zhihu = detectQuality(decorated, 'zhihu')

    expect(xhs.issues.some(issue => issue.id === 'xhs-wechat-decoration-leak' && issue.severity === 'error')).toBe(true)
    expect(zhihu.issues.some(issue => issue.id === 'zhihu-wechat-decoration-leak' && issue.severity === 'error')).toBe(true)
    expect(zhihu.issues.some(issue => issue.id === 'zhihu-inline-svg' && issue.severity === 'error')).toBe(true)
  })

  it('blocks copied market editor residues from Xiaohongshu and Zhihu publishable outputs', () => {
    const xhs = detectQuality(MARKET_EDITOR_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_RESIDUE_HTML, 'zhihu')

    expect(xhs.issues.some(issue => issue.id === 'xhs-market-editor-residue' && issue.severity === 'error')).toBe(true)
    expect(xhs.issues.some(issue => issue.id === 'xhs-html-tags' && issue.severity === 'error')).toBe(true)
    expect(xhs.passed).toBe(false)

    expect(zhihu.issues.some(issue => issue.id === 'zhihu-market-editor-residue' && issue.severity === 'error')).toBe(true)
    expect(zhihu.issues.some(issue => issue.id === 'zhihu-html-dependency' && issue.severity === 'error')).toBe(true)
    expect(zhihu.passed).toBe(false)
  })

  it('does not treat plain prose about market editors as copied residue', () => {
    const prose = '135编辑器、秀米和微信公众号后台只是排版规则参考来源，InkForge 不复制模板源码、会员素材或账号数据。'

    expect(detectQuality(prose, 'wechat').issues.some(issue => issue.id === 'wechat-market-editor-residue')).toBe(false)
    expect(detectQuality(prose, 'xiaohongshu').issues.some(issue => issue.id === 'xhs-market-editor-residue')).toBe(false)
    expect(detectQuality(prose, 'zhihu').issues.some(issue => issue.id === 'zhihu-market-editor-residue')).toBe(false)
  })

  it('flags stale Xiaohongshu image references and high image-count review', () => {
    const images = Array.from({ length: 19 }, (_value, index) => `![第${index + 1}张](https://example.com/${index + 1}.png)`)
    const report = detectQuality([
      '# 小红书图片包',
      '',
      ...images,
      '',
      '正文请见第20张图。',
    ].join('\n'), 'xiaohongshu')

    expect(report.issues.some(issue => issue.id === 'xhs-image-count-review' && issue.severity === 'warning')).toBe(true)
    expect(report.issues.some(issue => issue.id === 'xhs-image-page-count-limit' && issue.severity === 'error')).toBe(true)
    expect(report.issues.some(issue => issue.id === 'xhs-image-reference-mismatch' && issue.severity === 'error')).toBe(true)
    expect(report.passed).toBe(false)
  })

  it('blocks unsupported Xiaohongshu image artifact formats before reporting publishability', () => {
    const report = detectQuality([
      '# 小红书图片格式检测',
      '',
      '![动图](https://example.com/a.gif)',
      '![矢量图](https://example.com/b.svg?version=1)',
      '![下一代格式](https://example.com/c.webp)',
      '![内联图](data:image/avif;base64,AAAA)',
      '![可放行图](https://example.com/d.png)',
    ].join('\n'), 'xiaohongshu')

    const issue = report.issues.find(item => item.id === 'xhs-image-format-unsupported')
    expect(issue?.severity).toBe('error')
    expect(issue?.message).toContain('gif')
    expect(issue?.message).toContain('svg')
    expect(issue?.message).toContain('webp')
    expect(issue?.message).toContain('avif')
    expect(report.passed).toBe(false)
  })

  it('validates Xiaohongshu image artifact manifest before reporting local image-page readiness', () => {
    const issues = validateXhsImageArtifactManifest({
      kind: 'image-page',
      bodyReferences: [1, 3],
      pages: [
        {
          page: 2,
          fileName: 'cover.webp',
          src: 'inkforge-asset://cover',
          exists: false,
          width: 1000,
          height: 1000,
          ratio: '3:4',
          format: 'webp' as 'png',
          cover: true,
          referencedByBody: false,
          cropStatus: 'overflow',
        },
        {
          page: 2,
          fileName: 'detail.png',
          src: 'inkforge-asset://detail',
          exists: true,
          width: 1080,
          height: 1440,
          ratio: '3:4',
          format: 'png',
          bytes: 21 * 1024 * 1024,
          cover: true,
          referencedByBody: true,
          cropStatus: 'unknown',
        },
      ],
    })
    const ids = issues.map(issue => issue.id)

    expect(ids).toContain('xhs-image-manifest-page-order')
    expect(ids).toContain('xhs-image-manifest-missing-file')
    expect(ids).toContain('xhs-image-manifest-cover-duplicate')
    expect(ids).toContain('xhs-image-manifest-reference-mismatch')
    expect(ids).toContain('xhs-image-manifest-ratio-unsupported')
    expect(ids).toContain('xhs-image-manifest-format-unsupported')
    expect(ids).toContain('xhs-image-manifest-bytes-limit')
    expect(ids).toContain('xhs-image-manifest-crop-overflow')
    expect(issues.some(issue => issue.id === 'xhs-image-manifest-crop-overflow' && issue.severity === 'error')).toBe(true)
    expect(issues.some(issue => issue.id === 'xhs-image-manifest-crop-overflow' && issue.severity === 'warning')).toBe(true)
  })

  it('accepts a complete Xiaohongshu image artifact manifest as local preflight only', async () => {
    const manifest = {
      kind: 'image-page' as const,
      bodyReferences: [1],
      pages: [
        {
          page: 1,
          fileName: 'cover.png',
          src: 'inkforge-asset://cover',
          exists: true,
          width: 1080,
          height: 1440,
          ratio: '3:4' as const,
          format: 'png' as const,
          bytes: 120_000,
          cover: true,
          referencedByBody: true,
          cropStatus: 'ok' as const,
        },
      ],
    }

    expect(validateXhsImageArtifactManifest(manifest)).toEqual([])

    const result = await convertToNativeFormat('这是正文，请见第1张图。', 'xiaohongshu', {
      xiaohongshuImageManifest: manifest,
    })

    expect(result.format).toBe('text')
    expect(result.artifacts?.xiaohongshuImageManifest).toEqual(manifest)
    expect(result.qualityReport?.issues.some(issue => issue.id.startsWith('xhs-image-manifest-'))).toBe(false)
  })

  it('builds Xiaohongshu image manifests from raster metadata before native export', async () => {
    const manifest = createXhsImageArtifactManifestFromRaster({
      fileName: 'cover-grid.png',
      src: 'inkforge-asset://cover-grid',
      width: 1080,
      height: 1440,
      format: 'png',
      bytes: 99_114,
      exists: true,
      cropStatus: 'ok',
    })

    expect(validateXhsImageArtifactManifest(manifest)).toEqual([])

    const result = await convertToNativeFormat('这是正文，请见第1张图。', 'xiaohongshu', {
      xiaohongshuImageManifest: manifest,
    })

    expect(result.artifacts?.xiaohongshuImageManifest).toEqual(manifest)
    expect(result.qualityReport?.issues.some(issue => issue.id.startsWith('xhs-image-manifest-'))).toBe(false)
  })

  it('builds multi-page Xiaohongshu carousel manifests before native export', async () => {
    const manifest = createXhsImageArtifactManifestFromRasterArtifacts({
      artifacts: [
        {
          fileName: 'cover-grid-1.png',
          src: 'inkforge-asset://cover-grid-1',
          width: 1080,
          height: 1440,
          format: 'png',
          bytes: 99_114,
          exists: true,
          cropStatus: 'ok',
        },
        {
          fileName: 'cover-grid-2.png',
          src: 'inkforge-asset://cover-grid-2',
          width: 1080,
          height: 1440,
          format: 'png',
          bytes: 100_256,
          exists: true,
          cropStatus: 'ok',
        },
      ],
    })

    expect(manifest.pages.map(page => page.page)).toEqual([1, 2])
    expect(manifest.bodyReferences).toEqual([1, 2])
    expect(validateXhsImageArtifactManifest(manifest)).toEqual([])

    const result = await convertToNativeFormat('这是正文，请见第1张图和第2张图。', 'xiaohongshu', {
      xiaohongshuImageManifest: manifest,
    })

    expect(result.artifacts?.xiaohongshuImageManifest).toEqual(manifest)
    expect(result.qualityReport?.issues.some(issue => issue.id.startsWith('xhs-image-manifest-'))).toBe(false)
  })

  it('validates Zhihu image fallback artifact manifest before reporting host/upload readiness', () => {
    const issues = validateZhihuImageArtifactManifest({
      markdownReferences: [
        'https://picx.zhimg.com/v2-formula.png',
        'https://picx.zhimg.com/v2-missing.png',
      ],
      requirePlatformUpload: true,
      artifacts: [
        {
          id: 'diagram-1',
          kind: 'diagram-image',
          sourceSrc: 'inkforge-asset://diagram',
          finalSrc: 'data:image/png;base64,AAAA',
          fileName: 'diagram.webp',
          exists: false,
          uploaded: false,
          hostStatus: 'blocked',
          width: 0,
          height: 800,
          format: 'webp' as 'png',
          bytes: 0,
          alt: '',
          referencedByMarkdown: true,
        },
        {
          id: 'formula-1',
          kind: 'formula-image',
          sourceSrc: 'inkforge-asset://formula',
          finalSrc: 'https://picx.zhimg.com/v2-formula.png',
          fileName: 'formula.png',
          exists: true,
          uploaded: false,
          hostStatus: 'platform-hosted',
          width: 800,
          height: 200,
          format: 'png',
          bytes: 98_000,
          alt: '公式图',
          referencedByMarkdown: true,
        },
      ],
    })
    const ids = issues.map(issue => issue.id)

    expect(ids).toContain('zhihu-image-manifest-host-blocked')
    expect(ids).toContain('zhihu-image-manifest-upload-missing')
    expect(ids).toContain('zhihu-image-manifest-missing-file')
    expect(ids).toContain('zhihu-image-manifest-alt-missing')
    expect(ids).toContain('zhihu-image-manifest-caption-missing')
    expect(ids).toContain('zhihu-image-manifest-format-unsupported')
    expect(ids).toContain('zhihu-image-manifest-dimension-invalid')
    expect(ids).toContain('zhihu-image-manifest-bytes-invalid')
    expect(ids).toContain('zhihu-image-manifest-reference-mismatch')
    expect(issues.some(issue => issue.severity === 'error')).toBe(true)
  })

  it('accepts a complete Zhihu image artifact manifest as local preflight only', async () => {
    const imageUrl = 'https://picx.zhimg.com/v2-inkforge-diagram.png'
    const manifest = {
      artifacts: [
        {
          id: 'diagram-1',
          kind: 'diagram-image' as const,
          sourceSrc: 'inkforge-asset://diagram',
          finalSrc: imageUrl,
          fileName: 'diagram.png',
          uploaded: true,
          hostStatus: 'platform-hosted' as const,
          width: 1200,
          height: 720,
          format: 'png' as const,
          alt: '架构图',
          caption: '图 1: 架构图说明',
          referencedByMarkdown: true,
        },
      ],
    }
    const markdown = `![架构图](${imageUrl})\n\n图 1: 架构图说明`

    expect(validateZhihuImageArtifactManifest(manifest, markdown)).toEqual([])

    const result = await convertToNativeFormat(markdown, 'zhihu', {
      zhihuImageArtifactManifest: manifest,
    })

    expect(result.format).toBe('markdown')
    expect(result.artifacts?.zhihuImageArtifactManifest).toEqual(manifest)
    expect(result.qualityReport?.issues.some(issue => issue.id.startsWith('zhihu-image-manifest-'))).toBe(false)
  })

  it('builds Zhihu image artifact manifests from public host metadata before native export', async () => {
    const imageUrl = 'https://static.example.com/inkforge-chart.png'
    const manifest = createZhihuImageArtifactManifest({
      artifacts: [
        {
          id: 'chart-1',
          kind: 'diagram-image',
          sourceSrc: 'inkforge-asset://chart-1',
          finalSrc: imageUrl,
          fileName: 'inkforge-chart.png',
          exists: true,
          width: 1200,
          height: 720,
          bytes: 120_000,
          alt: '数据图表',
          caption: '图 1: 数据图表说明',
          referencedByMarkdown: true,
        },
      ],
    })
    const markdown = `![数据图表](${imageUrl})\n\n图 1: 数据图表说明`

    expect(validateZhihuImageArtifactManifest(manifest, markdown)).toEqual([])

    const result = await convertToNativeFormat(markdown, 'zhihu', {
      zhihuImageArtifactManifest: manifest,
    })

    expect(result.artifacts?.zhihuImageArtifactManifest).toEqual(manifest)
    expect(result.qualityReport?.issues.some(issue => issue.id.startsWith('zhihu-image-manifest-'))).toBe(false)
  })

  it('blocks raw Markdown controls from Xiaohongshu publishable text without rejecting hashtags', () => {
    const report = detectQuality([
      '# 小红书纯文本合同',
      '',
      '**重点** 不能直接粘贴为富文本。',
      '> 引用也需要转为普通说明。',
      '![示意图](https://example.com/a.png)',
      '',
      '| 渠道 | 规则 |',
      '| --- | --- |',
      '| 小红书 | 纯文本 |',
      '',
      '#InkForge #写作工具',
    ].join('\n'), 'xiaohongshu')

    const issue = report.issues.find(item => item.id === 'xhs-markdown-control-leak')
    expect(issue?.severity).toBe('error')
    expect(issue?.message).toContain('heading')
    expect(issue?.message).toContain('bold')
    expect(issue?.message).toContain('image')
    expect(issue?.message).toContain('quote')
    expect(issue?.message).toContain('table-separator')
    expect(report.passed).toBe(false)

    const hashtagOnly = detectQuality('今天继续打磨排版规则。\n\n#InkForge #写作工具', 'xiaohongshu')
    expect(hashtagOnly.issues.some(item => item.id === 'xhs-markdown-control-leak')).toBe(false)
  })

  it('warns on Xiaohongshu hashtag overload, long lists, and long plain-text lines', () => {
    const report = detectQuality([
      '小红书扫读检测',
      '',
      '#InkForge #微信公众号 #排版 #写作工具 #长图 #封面 #图文 #笔记 #设计 #知识 #效率',
      '',
      '1. 第一项',
      '2. 第二项',
      '3. 第三项',
      '4. 第四项',
      '5. 第五项',
      '6. 第六项',
      '7. 第七项',
      '8. 第八项',
      '',
      '这是一行故意写得非常长的小红书纯文本内容，用来验证导出质量检测器会提示作者主动拆段换行，避免在手机端出现难以扫读的整行长句，同时也提示 URL 或代码内容应该进入图片页、搜索关键词或文字摘要而不是直接堆在正文里面，并且需要额外补充足够多的正文片段来稳定超过一百二十字门槛。',
    ].join('\n'), 'xiaohongshu')

    const ids = report.issues.map(issue => issue.id)
    expect(ids).toContain('xhs-hashtag-count')
    expect(ids).toContain('xhs-list-length')
    expect(ids).toContain('xhs-long-line')
    expect(report.issues.filter(issue => [
      'xhs-hashtag-count',
      'xhs-list-length',
      'xhs-long-line',
    ].includes(issue.id)).every(issue => issue.severity === 'warning')).toBe(true)
    expect(report.issues.some(item => item.id === 'xhs-markdown-control-leak')).toBe(false)
  })

  it('flags Zhihu unsafe image hosts, missing alt, and raw diagram fences', () => {
    const report = detectQuality([
      '# 知乎图片和图表检测',
      '',
      '![本地图](./images/local.png)',
      '![](https://example.com/no-alt.png)',
      '![临时图](blob:https://example.com/asset)',
      '![内联图](data:image/png;base64,AAAA)',
      '![微信图](https://mmbiz.qpic.cn/mmbiz_png/demo/640)',
      '',
      '```graphviz',
      'digraph G { A -> B }',
      '```',
      '',
      '```plantuml',
      '@startuml',
      'A -> B',
      '@enduml',
      '```',
    ].join('\n'), 'zhihu')

    const ids = report.issues.map(issue => issue.id)
    expect(ids).toContain('zhihu-image-host-blocked')
    expect(ids).toContain('zhihu-image-alt-missing')
    expect(ids).toContain('zhihu-raw-diagram-fence')
    expect(ids).not.toContain('render-code-language-unsupported')
  })

  it('blocks Zhihu residual HTML dependencies, complex tables, and inferable unlabeled code', () => {
    const report = detectQuality([
      '# 知乎 clean Markdown 检测',
      '',
      '<section style="background:#fff" data-ink-block="flagship-h2">标题卡</section>',
      '<table style="width:100%"><tr><td><pre><code>const x = 1</code></pre></td></tr></table>',
      '',
      '| A | B | C | D | E | F | G |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      '| 1 | 2 | 3 | 4 | 5 | 6 | `code` |',
      '',
      '```',
      'const title: string = "clean markdown"',
      'export const ready = true',
      '```',
    ].join('\n'), 'zhihu')

    const ids = report.issues.map(issue => issue.id)
    expect(ids).toContain('zhihu-html-dependency')
    expect(ids).toContain('zhihu-complex-table')
    expect(ids).toContain('render-code-language-inferred')
    expect(report.issues.some(issue => issue.id === 'zhihu-html-dependency' && issue.severity === 'error')).toBe(true)
    expect(report.issues.some(issue => issue.id === 'zhihu-complex-table' && issue.severity === 'error')).toBe(true)
    expect(report.passed).toBe(false)
  })

  it('blocks invalid Zhihu markdown table separators and warns when semantic images miss captions', () => {
    const report = detectQuality([
      '# 知乎表格与图片语义检测',
      '',
      '| 列 A | 列 B | 列 C |',
      '| --- | - | --- |',
      '| 1 | 2 | 3 |',
      '',
      '![架构图](https://example.com/arch.png)',
      '',
      '![公式图](https://example.com/formula.png)',
      '公式说明：该图展示 E=mc^2 的等价关系。',
    ].join('\n'), 'zhihu')

    const ids = report.issues.map(issue => issue.id)
    expect(ids).toContain('zhihu-table-separator-invalid')
    expect(ids).toContain('zhihu-image-caption-missing')
    expect(report.issues.find(issue => issue.id === 'zhihu-table-separator-invalid')?.severity).toBe('error')
    expect(report.issues.find(issue => issue.id === 'zhihu-image-caption-missing')?.severity).toBe('warning')
    expect(report.issues.find(issue => issue.id === 'zhihu-image-caption-missing')?.message).toContain('1 张')
    expect(report.passed).toBe(false)
  })

  it('routes the unified native exporter to the correct real platform formats', async () => {
    const [wechat, xiaohongshu, zhihu] = await Promise.all([
      convertToNativeFormat(REAL_EXPORT_MARKDOWN, 'wechat', {
        includeQualityReport: false,
        exportOptions: { enableReadingTime: false },
      }),
      convertToNativeFormat(REAL_EXPORT_MARKDOWN, 'xiaohongshu', {
        includeQualityReport: false,
        xiaohongshuTextOptions: { addSignature: false, injectEmojis: false },
      }),
      convertToNativeFormat(REAL_EXPORT_MARKDOWN, 'zhihu', {
        includeQualityReport: false,
      }),
    ])

    expect(wechat.format).toBe('html')
    expect(wechat.content).toMatch(/<section[^>]+id="nice"/i)
    expect(wechat.content).not.toMatch(/<style\b|\sclass=|javascript:/i)

    expect(xiaohongshu.format).toBe('text')
    // P2-T7: 图占位行带 ratio + size 推荐
    expect(xiaohongshu.content).toContain('[配图1: 架构图（3:4 @ 1080x1440 推荐）')
    expect(xiaohongshu.content).not.toMatch(/```|<span|!\[/i)

    expect(zhihu.format).toBe('markdown')
    expect(zhihu.content).toContain('[官网](https://vite.dev)')
    expect(zhihu.content).not.toMatch(/<span|style=|class=/i)
  })
})
