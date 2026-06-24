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
  formatCommittedStyleProofExternalHandoffPacketMarkdown,
  getCommittedStyleProofEvidenceAuditReport,
  getCommittedStyleProofEvidenceExecutionRunbookReport,
  getCommittedStyleProofExternalBlockerAuditReport,
  getCommittedStyleProofExternalBlockerManifests,
  getCommittedStyleProofExternalHandoffReport,
  getCommittedStyleProofExternalHandoffPacket,
  getCommittedStyleProofExternalProofChecklistReport,
  getCommittedStyleProofLocalActionabilityReport,
  getCommittedStyleProofEvidenceReleaseGateReport,
  getCommittedStyleProofEvidenceManifests,
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
  getPlatformStyleMarketCapabilityReport,
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
  getStyleChoiceMarketCapabilities,
  getStyleChoiceProofRequirements,
  getStyleProofAcceptanceAuditReport,
  getStyleProofExecutionRunbook,
  getStyleProofManifestJsonIntakeReport,
  getStyleProofManifestIntakeReport,
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

const ZHIHU_ACADEMIC_LATEX_MARKDOWN = [
  '# 公式与代码的知乎专栏验收',
  '',
  '本文用于验证学术专栏在知乎 clean Markdown 通道里的公式、脚注、引用和代码块。',
  '',
  '## 公式段落',
  '',
  '能量关系使用块级公式表达：',
  '',
  '$$E=mc^2$$',
  '',
  '行内公式使用 $a^2+b^2=c^2$，并保留解释文本。',
  '',
  '> 公式必须可预览；如果平台不接受公式图片，后续必须走图片 fallback，不可直接宣称发布成功。',
  '',
  '## 脚注与代码',
  '',
  '这是一个带脚注的结论。[^note]',
  '',
  '```ts',
  'export const stable = true',
  '```',
  '',
  '[^note]: 本地 artifact 只证明 clean Markdown 输出，不证明知乎平台预览或发布。',
].join('\n')

const ZHIHU_WECHAT_ADAPTED_MARKDOWN = [
  '# 微信稿迁移到知乎的语义验收',
  '',
  '<section data-ink-block="flagship-h2" style="background:#111;color:#fff"><svg data-ink-svg="divider-grid" viewBox="0 0 100 20"><path d="M0 0h100v20H0z"></path></svg>迁移标题</section>',
  '',
  '> 原微信稿中的视觉卡片需要降级为知乎可读引用，而不是保留 SVG、style、class 或 data-ink 属性。',
  '',
  '## 可迁移结构',
  '',
  '- 标题层级保留为 Markdown。',
  '- 卡片正文转成普通段落。',
  '- 结尾署名保留文本，不保留装饰容器。',
  '',
  '<span class="legacy" style="color:red">这段旧 HTML 应被清理为文本。</span>',
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

const freshStyleProofCollectedAt = new Date().toISOString()
const createStaleStyleProofCollectedAt = (): string =>
  new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
const createFutureStyleProofCollectedAt = (): string =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

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

const MARKET_EDITOR_135_SVG_TRIGGER_OVERLAY_RESIDUE_HTML = [
  '<section style="margin:0;padding:0">',
  '<div class="block-img__trigger edit-trigger" style="display:none">',
  '<div class="trigger__ajuster" style="background-color:rgba(255,100,70,0.25);z-index:9;inset:0%"></div>',
  '<span class="edit-trigger__switch">显示触发热区</span>',
  '</div>',
  '</section>',
].join('')

const MARKET_EDITOR_135_SVG_SHELL_RESIDUE_HTML = [
  '<section class="content-canvas content-background content-inner">',
  '<div class="block"><div class="block-inner"><div class="block-img">',
  '<div class="block-img__inner"><span class="placeholder__help"><i class="placeholder__icon"></i></span></div>',
  '</div></div></div>',
  '<div class="article-item__inner"><span class="article-item__label">135 SVG editor shell</span></div>',
  '</section>',
].join('')

const MARKET_EDITOR_135_SVG_LAYOUT_CONTROL_RESIDUE_HTML = [
  '<section style="margin:0;padding:0">',
  '<div class="block-spacing" style="top:10px;left:0;display:none"></div>',
  '<div class="block-gap" style="top:10px;left:0;display:none"></div>',
  '<div class="gap-item-wrapper" style="display:none">',
  '<div class="ant-slider-track" style="left:0%;width:90%"></div>',
  '<div class="ant-slider-handle" style="left:90%;transform:translateX(-50%)"></div>',
  '</div>',
  '<input class="article-item__editing" style="display:none" value="135 SVG editor title">',
  '</section>',
].join('')

const MARKET_EDITOR_135_SVG_MATERIAL_PANEL_RESIDUE_HTML = [
  '<aside class="editor-bar open">',
  '<div class="editor-bar-inner">',
  '<div class="editor-bar-title">ID:1054 封面图点击移除并展开</div>',
  '<div class="editor-img editor">',
  '<div class="editor-img__block">封面图 图片 DIY设计图片 1080 x 1920</div>',
  '<button class="editor-spread__edit">编辑展开内容</button>',
  '<div class="editor-background editor">展开内容背景</div>',
  '</div>',
  '</div>',
  '</aside>',
].join('')

const MARKET_EDITOR_135_BACKGROUND_ONLY_SVG_RISK_HTML = [
  '<section style="font-size:0;line-height:0;background-size:100.1% 100.1%;margin-top:-1px;vertical-align:top;pointer-events:none">',
  '<svg viewBox="0 0 1080 1920" width="100%"></svg>',
  '</section>',
].join('')

const MARKET_EDITOR_135_SVG_BACKGROUND_STYLE_RESIDUE_HTML = [
  '<section style="font-size:0 !important;line-height:0 !important;margin:0;padding:0;text-align:center">',
  '<svg viewBox="0 0 1080 1920" style="background-attachment:scroll;background-position:center;background-repeat:no-repeat;background-size:100.1% 100.1%;display:inline-block;margin-top:-1px;pointer-events:none;svg:135;user-select:none;vertical-align:top;width:100%"></svg>',
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

const MARKET_EDITOR_XIUMI_OPERATION_PANEL_LOADER_HTML = [
  '<section style="margin:10px 0">',
  '<div class="op-loader">Xiumi operation panel loader residue</div>',
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

const MARKET_EDITOR_XIUMI_FLOW_CANVAS_ANIMATION_WRAPPER_HTML = [
  '<section style="margin:10px 0">',
  '<div class="tn-group-flow-canvas-for-svg-animation">',
  '<svg viewBox="0 0 1080 1441" style="display:block;width:100%"><rect width="1080" height="1441"></rect></svg>',
  '</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_LAYER_SLOT_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="tn-page-slot tn-layer-slot">',
  '<div class="tn-child-position-absolute tn-child-orientation-fixed raw-image">Layer slot image</div>',
  '</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_RAW_IMAGE_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="raw-image">Xiumi raw image cell residue</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_IMAGE_PRESENTER_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="tn-image-presenter">Xiumi image presenter residue</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_IMAGE_INSTANCE_WRAPPER_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="tn-image-inst-wrapper">Xiumi image instance wrapper residue</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_OVERFLOW_HIDDEN_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="tn-overflow-hidden">Xiumi overflow hidden residue</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_PAGE_VESSEL_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="tn-page-vessel">Xiumi page vessel residue</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_GROUP_SORTABLE_BOX_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="tn-group-sortable-box">Xiumi group sortable box residue</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_STATE_WRAPPER_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="tn-page-vessel tn-group-sortable-box tn-sortable-pin tn-state-active tn-on-child-editing">',
  '<div class="tn-image-inst-wrapper tn-overflow-hidden">Image slot copied from Xiumi SVG gallery</div>',
  '</div>',
  '<div class="tn-quick-input-block quick-input tn-state-frozen">Quick input placeholder</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_CONTENT_OVERLAP_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="tn-content-overlap">Xiumi content overlap state residue</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_COMPONENT_BINDING_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<article tn-bind-comp-tpl-id="edit_paper-cp:sys-edit/loader-multi-pages" tn-comp-role="cube" tn-comp="comp" tn-comp-pose="compConstraint.pose.tplPose || compAttr.pose" tn-uuid="cube-redacted" tn-animate="compAttr.anim">',
  '<div tn-cell-type="group" tn-child-position="absolute" tn-cell="layers" tn-animate-on-self="true">',
  '<section tn-link="cell.link" tn-page-stage-size="board_spread">Xiumi component binding shell</section>',
  '</div>',
  '</article>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_TEMPLATE_RENDERER_PIPELINE_RESIDUE_HTML = [
  '<li class="tn-tpl-item tn-lighting-box ng-scope" ng-repeat="tpl in tnDataList track by $id(tpl)" ng-click="tplLib.onTemplateClicked($event, tpl)" ng-switch="::tpl | tpl2PresentType:true">',
  '<div class="tn-tpl-comp-box lighting-hover with-ra ng-scope" ng-class="::tpl | tpl2BoxClasses">',
  '<div class="wrapper" tn-tpl-pose-fit-box="::tpl">',
  '<div class="tn-tpl-comp-item tn-tpl-ra-bind-box ng-binding" ng-bind-html="::tpl.renderer_accelerate | validateImageTypeInHtml | unsafe">点击蓝字 关注我们</div>',
  '</div>',
  '</div>',
  '</li>',
].join('')

const MARKET_EDITOR_XIUMI_VISIBLE_CARD_RESIDUE_HTML = [
  '<li class="tn-tpl-item tn-lighting-box ng-scope comp-feature-matched tn-tpl-comp tn-scene-paper tn-tpl-categ-paper-cp">',
  '<div class="tn-tpl-comp-box lighting-hover with-ra ng-scope">',
  '<div class="tn-tpl-comp-item tn-tpl-ra-bind-box ng-binding">',
  '<div class="tn-from-house-paper-cp tn-comp-anim-pin tn-comp" style="position:static;z-index:1">',
  '<section class="tn-comp-pin tn-comp-style-pin" style="display:flex;flex-flow:row;margin:10px 0;line-height:0">',
  '<section style="transform:rotateZ(12deg)">#1</section>',
  '<section style="opacity:0.79"><img src="//statics.xiumi.us/mat/i/demo-card.png" alt=""></section>',
  '</section>',
  '</div>',
  '</div>',
  '</div>',
  '</li>',
].join('')

const MARKET_EDITOR_XIUMI_PAPER_DOCUMENT_ROOT_HTML = [
  '<article class="tn-paper-document-root">',
  '<section style="margin:10px 0">Xiumi paper document root residue</section>',
  '</article>',
].join('')

const MARKET_EDITOR_XIUMI_TEXT_CELL_CLASS_HTML = [
  '<section style="margin:10px 0">',
  '<span class="tn-text">Xiumi editable text cell residue</span>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_UI_SLIDER_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="ui-slider ui-slider-horizontal"><span class="ui-slider-handle"></span></div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_UI_SORTABLE_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div class="ui-sortable">Xiumi sortable control residue</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_INTERACTION_STYLE_RESIDUE_HTML = [
  '<section style="margin:10px 0">',
  '<div style="touch-action:pan-y;user-select:none;-webkit-user-select:none">Xiumi interaction style residue</div>',
  '</section>',
].join('')

const MARKET_EDITOR_XIUMI_APPLIED_SVG_FOREIGN_OBJECT_HTML = [
  '<article class="tn-paper-document-root tn-comp-inst tn-cube-inst tn-comp" tn-uuid="cube-redacted" tn-animate="compAttr.anim">',
  '<section class="tn-comp-pin tn-comp-style-pin tn-on-child-editing">',
  '<section class="tn-comp-pin tn-comp-style-pin" style="text-align:center;display:flex;flex-flow:row;margin:10px 0">',
  '<svg class="svg-layout-content root-svg" viewBox="0 0 375 442.5" style="box-sizing:border-box;transform:rotateZ(0deg)">',
  '<svg class="rect-content"><rect width="100%" height="100%" style="box-sizing:border-box"></rect></svg>',
  '<svg class="text-content" style="vertical-align:middle;max-width:100%">',
  '<foreignObject width="100%" height="100%" style="pointer-events:none;color:rgb(35,135,206);font-size:142.13%;text-align:center">',
  '<p style="font-size:100.025%">Xiumi applied text label</p>',
  '</foreignObject>',
  '</svg>',
  '<svg style="display:block;width:100%;background-repeat:no-repeat;background-size:cover;background-image:url(//statics.xiumi.us/stc/images/templates-assets/tpl-paper/image/demo.gif)"></svg>',
  '<animate class="fade-self-animation" attributeName="opacity" begin="click" from="1" to="0" dur="0.4s" restart="never"></animate>',
  '</svg>',
  '</section>',
  '</section>',
  '</article>',
].join('')

const MARKET_EDITOR_XIUMI_APPLIED_SVG_CONTENT_LAYER_HTML = [
  '<section style="text-align:center">',
  '<svg class="svg-layout-content root-svg" viewBox="0 0 375 442.5">',
  '<svg class="rect-content"><rect width="100%" height="100%"></rect></svg>',
  '<svg class="text-content">',
  '<foreignObject width="100%" height="100%"><p>Applied SVG text layer</p></foreignObject>',
  '</svg>',
  '<animate class="fade-self-animation" attributeName="opacity" begin="click" from="1" to="0" dur="0.4s" restart="never"></animate>',
  '</svg>',
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
    expect(ids).toContain('wechat-market-svg-h5-fallback-matrix')
    expect(ids).toContain('wechat-plugin-transfer-checklist')
    expect(ids).toContain('xhs-cover-carousel')
    expect(ids).toContain('xhs-markdown-card-slicer')
    expect(ids).toContain('xhs-h5-design-import-boundary')
    expect(ids).toContain('xhs-market-rich-card-fallback')
    expect(ids).toContain('zhihu-academic-latex-column')
    expect(ids).toContain('zhihu-diagram-article')
    expect(ids).toContain('zhihu-public-image-upload-checklist')
    expect(ids).toContain('zhihu-market-rich-layout-fallback')

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
    expect(amberAvailability.usable).toBe(true)
    expect(amberAvailability.status).toBe('available')

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
    const zhihuDataTable = getStyleChoiceById('zhihu-data-table')
    const zhihuCleanColumn = getStyleChoiceById('zhihu-clean-column')
    const zhihuUpload = getStyleChoiceById('zhihu-public-image-upload-checklist')
    expect(zhihuDiagram).toBeDefined()
    expect(zhihuDataTable).toBeDefined()
    expect(zhihuCleanColumn).toBeDefined()
    expect(zhihuUpload).toBeDefined()
    if (!zhihuDiagram || !zhihuDataTable || !zhihuCleanColumn || !zhihuUpload) return

    expect(getStyleChoiceProofRequirements(zhihuDiagram).map(requirement => requirement.id)).toEqual(expect.arrayContaining([
      'local-browser-rendering',
      'public-image-host',
      'zhihu-artifact-manifest',
      'published-url-or-platform-preview',
    ]))
    expect(getStyleChoiceProofRequirements(zhihuDataTable).map(requirement => requirement.id)).toEqual(expect.arrayContaining([
      'unit-test-coverage',
      'published-url-or-platform-preview',
    ]))
    expect(getStyleChoiceProofRequirements(zhihuDataTable).map(requirement => requirement.id))
      .not.toContain('zhihu-artifact-manifest')
    expect(getStyleChoiceProofRequirements(zhihuDataTable).map(requirement => requirement.id))
      .not.toContain('public-image-host')
    expect(getStyleChoiceProofRequirements(zhihuCleanColumn).map(requirement => requirement.id))
      .not.toContain('zhihu-artifact-manifest')
    expect(getStyleChoiceProofRequirements(zhihuCleanColumn).map(requirement => requirement.id))
      .not.toContain('public-image-host')
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

  it('preflights unknown style proof manifest packs before semantic validation', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['unit-tested'],
      artifacts: [
        {
          id: 'style-proof-intake-unit-log',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'platform-export-rendering.test.ts intake assertion log',
          evidenceLabel: 'unit-tested',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'unit-test',
          action: 'test-run',
          readback: 'test-assertion',
          artifactRef: 'prompts/0601/evidence/style-proof-manifest-intake-20260623.txt',
          committed: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestIntakeReport({ manifests: [manifest] })

    expect(report.status).toBe('ready-for-review')
    expect(report.summary).toMatchObject({
      inputManifestCount: 1,
      acceptedManifestCount: 1,
      rejectedManifestCount: 0,
      schemaIssueCount: 0,
      schemaErrorCount: 0,
      schemaWarningCount: 0,
      semanticIssueCount: 0,
      artifactCount: 1,
    })
    expect(report.rejected).toEqual([])
    expect(report.manifests).toEqual([manifest])
    expect(report.packReport.summary).toMatchObject({
      manifestCount: 1,
      validManifestCount: 1,
      artifactCount: 1,
    })
    expect(report.acceptanceAudit.summary.manifestCount).toBe(1)
    expect(report.executionRunbook.summary.manifestCount).toBe(1)
    expect(report.canClaimComplete).toBe(false)
    expect(report.summary.cannotClaimRequirements).toBeGreaterThan(0)
  })

  it('parses JSON style proof manifest intake without requiring callers to throw on parse boundaries', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['unit-tested'],
      artifacts: [
        {
          id: 'style-proof-json-intake-unit-log',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'platform-export-rendering.test.ts JSON intake assertion log',
          evidenceLabel: 'unit-tested',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'unit-test',
          action: 'test-run',
          readback: 'test-assertion',
          artifactRef: 'prompts/0601/evidence/style-proof-manifest-json-intake-20260623.txt',
          committed: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestJsonIntakeReport(JSON.stringify({ manifests: [manifest] }))

    expect(report.status).toBe('ready-for-review')
    expect(report.summary.acceptedManifestCount).toBe(1)
    expect(report.summary.rejectedManifestCount).toBe(0)
    expect(report.summary.schemaErrorCount).toBe(0)
    expect(report.manifests).toEqual([manifest])
    expect(report.packReport.summary.validManifestCount).toBe(1)
    expect(report.canClaimComplete).toBe(false)
  })

  it('returns a schema-invalid report for malformed JSON style proof manifest intake', () => {
    const report = getStyleProofManifestJsonIntakeReport('{ "manifests": [')

    expect(report.status).toBe('schema-invalid')
    expect(report.summary).toMatchObject({
      inputManifestCount: 0,
      acceptedManifestCount: 0,
      rejectedManifestCount: 1,
      schemaIssueCount: 1,
      schemaErrorCount: 1,
      semanticIssueCount: 0,
      artifactCount: 0,
    })
    expect(report.rejected[0]?.index).toBeNull()
    expect(report.rejected[0]?.rawKind).toBe('json')
    expect(report.schemaIssues.map(issue => issue.id)).toEqual([
      'style-proof-manifest-intake-json-invalid',
    ])
    expect(report.packReport.summary.manifestCount).toBe(0)
    expect(report.acceptanceAudit.summary.manifestCount).toBe(0)
    expect(report.executionRunbook.summary.manifestCount).toBe(0)
    expect(report.canClaimComplete).toBe(false)
  })

  it('rejects oversized JSON style proof manifest intake before parsing', () => {
    const report = getStyleProofManifestJsonIntakeReport('x'.repeat(2_000_001))

    expect(report.status).toBe('schema-invalid')
    expect(report.summary).toMatchObject({
      inputManifestCount: 0,
      acceptedManifestCount: 0,
      rejectedManifestCount: 1,
      schemaIssueCount: 1,
      schemaErrorCount: 1,
      semanticIssueCount: 0,
      artifactCount: 0,
    })
    expect(report.schemaIssues.map(issue => issue.id)).toEqual([
      'style-proof-manifest-intake-json-too-large',
    ])
    expect(report.schemaIssues[0]?.location).toBe('json:length:2000001')
    expect(report.packReport.summary.manifestCount).toBe(0)
    expect(report.canClaimComplete).toBe(false)
  })

  it('rejects malformed external manifest packs without throwing or accepting partial proof', () => {
    const report = getStyleProofManifestIntakeReport({
      manifests: [
        {
          platform: 'wechat',
          claimedEvidence: 'unit-tested',
          artifacts: 'not-an-artifact-array',
        },
        {
          platform: 'wechat',
          claimedEvidence: ['unit-tested'],
          artifacts: [
            {
              id: 'style-proof-intake-incomplete-log',
              requirementId: 'unit-test-coverage',
              kind: 'test-log',
              label: 'incomplete artifact row',
              channel: 'unit-test',
            },
          ],
        },
      ],
    })

    expect(report.status).toBe('schema-invalid')
    expect(report.summary.inputManifestCount).toBe(2)
    expect(report.summary.acceptedManifestCount).toBe(0)
    expect(report.summary.rejectedManifestCount).toBe(2)
    expect(report.summary.schemaErrorCount).toBeGreaterThanOrEqual(4)
    expect(report.manifests).toEqual([])
    expect(report.rejected.map(item => item.index)).toEqual([0, 1])
    expect(report.schemaIssues.map(issue => issue.id)).toContain('style-proof-manifest-intake-field-invalid')
    expect(report.packReport.summary.manifestCount).toBe(0)
    expect(report.acceptanceAudit.summary.manifestCount).toBe(0)
    expect(report.executionRunbook.summary.manifestCount).toBe(0)
    expect(report.canClaimComplete).toBe(false)
  })

  it('rejects oversized style proof manifest packs before parsing entries', () => {
    const report = getStyleProofManifestIntakeReport({
      manifests: Array.from({ length: 129 }, () => ({
        platform: 'wechat',
        claimedEvidence: ['unit-tested'],
        artifacts: [],
      })),
    })

    expect(report.status).toBe('schema-invalid')
    expect(report.summary).toMatchObject({
      inputManifestCount: 0,
      acceptedManifestCount: 0,
      rejectedManifestCount: 1,
      schemaIssueCount: 1,
      schemaErrorCount: 1,
      semanticIssueCount: 0,
      artifactCount: 0,
    })
    expect(report.rejected[0]?.index).toBeNull()
    expect(report.schemaIssues.map(issue => issue.id)).toEqual([
      'style-proof-manifest-intake-manifest-count-too-large',
    ])
    expect(report.schemaIssues[0]?.location).toBe('root.manifests:length:129')
    expect(report.packReport.summary.manifestCount).toBe(0)
    expect(report.canClaimComplete).toBe(false)
  })

  it('rejects oversized style proof manifest artifact arrays before parsing entries', () => {
    const report = getStyleProofManifestIntakeReport({
      platform: 'wechat',
      claimedEvidence: ['unit-tested'],
      artifacts: Array.from({ length: 513 }, () => ({
        id: 'style-proof-oversized-artifact',
        requirementId: 'unit-test-coverage',
        kind: 'test-log',
        label: 'oversized artifact fixture',
        channel: 'unit-test',
        action: 'test-run',
        readback: 'test-assertion',
      })),
    })

    expect(report.status).toBe('schema-invalid')
    expect(report.summary).toMatchObject({
      inputManifestCount: 1,
      acceptedManifestCount: 0,
      rejectedManifestCount: 1,
      schemaIssueCount: 1,
      schemaErrorCount: 1,
      semanticIssueCount: 0,
      artifactCount: 0,
    })
    expect(report.rejected.map(item => item.index)).toEqual([0])
    expect(report.schemaIssues.map(issue => issue.id)).toEqual([
      'style-proof-manifest-intake-artifact-count-too-large',
    ])
    expect(report.schemaIssues[0]?.location).toBe('manifests[0].artifacts:length:513')
    expect(report.packReport.summary.manifestCount).toBe(0)
    expect(report.canClaimComplete).toBe(false)
  })

  it('rejects oversized style proof manifest string fields before semantic validation', () => {
    const report = getStyleProofManifestIntakeReport({
      platform: 'wechat',
      claimedEvidence: ['unit-tested'],
      artifacts: [
        {
          id: 'style-proof-oversized-label',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'x'.repeat(4_097),
          channel: 'unit-test',
          action: 'test-run',
          readback: 'test-assertion',
        },
      ],
    })

    expect(report.status).toBe('schema-invalid')
    expect(report.summary).toMatchObject({
      inputManifestCount: 1,
      acceptedManifestCount: 0,
      rejectedManifestCount: 1,
      schemaIssueCount: 1,
      schemaErrorCount: 1,
      semanticIssueCount: 0,
      artifactCount: 0,
    })
    expect(report.schemaIssues.map(issue => issue.id)).toEqual([
      'style-proof-manifest-intake-field-too-large',
    ])
    expect(report.schemaIssues[0]?.location).toBe('manifests[0].artifacts[0].label:length:4097')
    expect(report.packReport.summary.manifestCount).toBe(0)
    expect(report.canClaimComplete).toBe(false)
  })

  it('sanitizes unknown intake fields while preserving semantic safety blockers', () => {
    const report = getStyleProofManifestIntakeReport({
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['unit-tested'],
      operatorNote: 'redacted operator-only note',
      artifacts: [
        {
          id: 'style-proof-intake-unsafe-log',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'unsafe proof row',
          evidenceLabel: 'unit-tested',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'unit-test',
          action: 'test-run',
          readback: 'test-assertion',
          artifactRef: 'prompts/0601/evidence/style-proof-manifest-intake-20260623.txt',
          committed: false,
          safeForCommit: false,
          sensitive: true,
          extraField: 'discard me before semantic validation',
        },
      ],
    })

    expect(report.status).toBe('accepted-with-warnings')
    expect(report.summary.acceptedManifestCount).toBe(1)
    expect(report.summary.rejectedManifestCount).toBe(0)
    expect(report.summary.schemaErrorCount).toBe(0)
    expect(report.summary.schemaWarningCount).toBe(2)
    expect(report.schemaIssues.map(issue => issue.id)).toEqual([
      'style-proof-manifest-intake-unknown-field',
      'style-proof-manifest-intake-unknown-field',
    ])

    const acceptedManifest = report.manifests[0] as StyleProofManifest & Record<string, unknown>
    const acceptedArtifact = acceptedManifest.artifacts[0] as unknown as Record<string, unknown>
    expect(acceptedManifest.operatorNote).toBeUndefined()
    expect(acceptedArtifact.extraField).toBeUndefined()
    expect(acceptedArtifact.safeForCommit).toBe(false)
    expect(acceptedArtifact.sensitive).toBe(true)
    expect(report.packReport.issues.map(issue => issue.id)).toEqual(expect.arrayContaining([
      'style-proof-manifest-sensitive-artifact',
      'style-proof-manifest-safe-commit-not-verified',
    ]))
    expect(report.canClaimComplete).toBe(false)
  })

  it('keeps platform visible-text readbacks unclaimable until redaction review is verified', () => {
    const report = getStyleProofManifestIntakeReport({
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['authenticated-editor-reachable'],
      artifacts: [
        {
          id: 'wechat-visible-text-redaction-blocker',
          requirementId: 'authenticated-editor-url',
          kind: 'browser-readback',
          label: 'redacted platform visible text readback',
          evidenceLabel: 'authenticated-editor-reachable',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'platform-editor',
          action: 'authenticated-editor-opened',
          readback: 'dom',
          authenticatedSessionVerified: true,
          platformEditorTargetVerified: true,
          redactionReviewRequired: true,
          collectedAt: new Date().toISOString(),
          safeForCommit: true,
        },
      ],
    })
    const issueIds = report.packReport.issues.map(issue => issue.id)
    const acceptedManifest = report.manifests[0]
    const acceptedArtifact = acceptedManifest?.artifacts[0] as unknown as Record<string, unknown> | undefined
    const manifestReport = acceptedManifest ? getStyleProofManifestReport(acceptedManifest) : null
    const redactionArtifact = manifestReport?.artifacts.find(artifact =>
      artifact.artifact.id === 'wechat-visible-text-redaction-blocker'
    )

    expect(report.status).toBe('ready-for-review')
    expect(report.summary.schemaWarningCount).toBe(0)
    expect(acceptedArtifact?.redactionReviewRequired).toBe(true)
    expect(acceptedArtifact?.redactionVerified).toBeUndefined()
    expect(issueIds).toContain('style-proof-manifest-redaction-review-missing')
    expect(report.summary.semanticIssueCount).toBeGreaterThan(0)
    expect(redactionArtifact?.status).toBe('invalid')
    expect(report.acceptanceAudit.platformReports.wechat.cannotClaim.map(requirement =>
      requirement.requirement.id
    )).toContain('authenticated-editor-url')
    expect(report.canClaimComplete).toBe(false)
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
    expect(report.choiceStatus).toBe('available')
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
    expect(report.issues.map(issue => issue.id)).not.toContain('style-proof-manifest-choice-blocked')
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

    expect(amberReadiness.blockedByCatalog).toBe(false)
    expect(amberReadiness.report.choiceStatus).toBe('available')
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
    expect(amberSteps.every(step => !step.blockedByCatalog)).toBe(true)

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
    expect(amberProgress?.blockedByCatalog).toBe(false)
    expect(amberProgress?.report.choiceStatus).toBe('available')
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

  it('keeps synthetic Amber proof invalid without real external artifact refs and freshness', () => {
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
    expect(amberProgress?.report.issues.map(issue => issue.id)).not.toContain('style-proof-manifest-choice-blocked')
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

    expect(authenticatedUrlAudit?.status).toBe('invalid')
    expect(authenticatedUrlAudit?.issueIds).toEqual(expect.arrayContaining([
      'style-proof-manifest-authenticated-session-not-verified',
      'style-proof-manifest-collected-at-missing',
    ]))
    expect(pcDomAudit?.status).toBe('invalid')
    expect(pcDomAudit?.issueIds).toEqual(expect.arrayContaining([
      'style-proof-manifest-authenticated-session-not-verified',
      'style-proof-manifest-platform-editor-dom-not-verified',
      'style-proof-manifest-collected-at-missing',
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
    const classicManifest = manifests.find(manifest => manifest.choiceId === 'wechat-classic-inline')
    const quietManifest = manifests.find(manifest => manifest.choiceId === 'wechat-quiet-editorial')
    const toolbarParameterMapManifest = manifests.find(manifest =>
      manifest.choiceId === 'wechat-toolbar-parameter-map'
    )
    const coverSealDividerManifest = manifests.find(manifest => manifest.choiceId === 'wechat-cover-seal-divider')
    const cardRichManifest = manifests.find(manifest => manifest.choiceId === 'wechat-card-rich')
    const kilnPasteSafeManifest = manifests.find(manifest => manifest.choiceId === 'wechat-flagship-kiln-paste-safe')
    const temperaManifest = manifests.find(manifest => manifest.choiceId === 'wechat-flagship-tempera')
    const nonLocalBrowserChoiceIds = new Set([
      'wechat-classic-inline',
      'xhs-clean-text',
      'zhihu-clean-column',
      'zhihu-academic-latex-column',
      'zhihu-wechat-adapted',
    ])
    const xhsCleanManifest = manifests.find(manifest => manifest.choiceId === 'xhs-clean-text')
    const zhihuCleanManifest = manifests.find(manifest => manifest.choiceId === 'zhihu-clean-column')
    const zhihuAcademicManifest = manifests.find(manifest => manifest.choiceId === 'zhihu-academic-latex-column')
    const zhihuAdaptedManifest = manifests.find(manifest => manifest.choiceId === 'zhihu-wechat-adapted')
    const artifactIds = manifests.flatMap(manifest => manifest.artifacts.map(artifact => artifact.id))
    const artifactRefs = manifests.flatMap(manifest =>
      manifest.artifacts.map(artifact => artifact.artifactRef).filter((ref): ref is string => Boolean(ref)),
    )

    expect(manifests).toHaveLength(20)
    expect(secondRead[0]).not.toBe(manifests[0])
    expect(secondRead[0]?.artifacts[0]).not.toBe(manifests[0]?.artifacts[0])
    expect(choiceIds).toEqual([
      'wechat-classic-inline',
      'wechat-quiet-editorial',
      'wechat-toolbar-parameter-map',
      'wechat-cover-seal-divider',
      'wechat-card-rich',
      'wechat-flagship-kiln',
      'wechat-flagship-kiln-paste-safe',
      'wechat-flagship-tempera',
      'wechat-flagship-amber',
      'xhs-clean-text',
      'xhs-cover-carousel',
      'xhs-cover-hook',
      'xhs-markdown-card-slicer',
      'xhs-data-card',
      'xhs-long-report',
      'xhs-market-rich-card-fallback',
      'zhihu-clean-column',
      'zhihu-academic-latex-column',
      'zhihu-wechat-adapted',
      'zhihu-data-table',
    ])
    expect(new Set(artifactIds).size).toBe(artifactIds.length)
    expect(manifests.every(manifest =>
      manifest.scope === 'style-choice'
      && manifest.claimedEvidence.includes('unit-tested')
    )).toBe(true)
    expect(manifests
      .filter(manifest => !nonLocalBrowserChoiceIds.has(manifest.choiceId ?? ''))
      .every(manifest => manifest.claimedEvidence.includes('local-browser'))).toBe(true)
    expect(classicManifest?.claimedEvidence).toEqual(['unit-tested'])
    expect(quietManifest?.claimedEvidence).toEqual(['unit-tested', 'local-browser'])
    expect(toolbarParameterMapManifest?.claimedEvidence).toEqual(['unit-tested', 'local-browser'])
    expect(coverSealDividerManifest?.claimedEvidence).toEqual(['unit-tested', 'local-browser'])
    expect(cardRichManifest?.claimedEvidence).toEqual(['unit-tested', 'local-browser'])
    expect(kilnPasteSafeManifest?.claimedEvidence).toEqual(['unit-tested', 'local-browser'])
    expect(xhsCleanManifest?.claimedEvidence).toEqual(['unit-tested'])
    expect(zhihuCleanManifest?.claimedEvidence).toEqual(['unit-tested'])
    expect(zhihuAcademicManifest?.claimedEvidence).toEqual(['unit-tested'])
    expect(zhihuAdaptedManifest?.claimedEvidence).toEqual(['unit-tested'])
    expect(manifests.flatMap(manifest => manifest.artifacts).every(artifact =>
      artifact.committed === true && artifact.safeForCommit === true,
    )).toBe(true)
    expect(artifactRefs.every(ref => ref.startsWith('prompts/0601/evidence/'))).toBe(true)
    expect(temperaManifest?.artifactFingerprint).toBe(
      'sha256:f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878',
    )
    expect(temperaManifest?.artifacts.every(artifact =>
      artifact.artifactFingerprint === temperaManifest.artifactFingerprint
    )).toBe(true)

    const packReport = getStyleProofManifestPackReport(manifests)
    const issueIds = packReport.issues.map(issue => issue.id)
    const wechatProgress = packReport.platformReports.wechat
    const classicProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-classic-inline')
    const quietProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-quiet-editorial')
    const toolbarParameterMapProgress = wechatProgress.choices.find(choice =>
      choice.choice.id === 'wechat-toolbar-parameter-map'
    )
    const coverSealDividerProgress = wechatProgress.choices.find(choice =>
      choice.choice.id === 'wechat-cover-seal-divider'
    )
    const cardRichProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-card-rich')
    const kilnProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-flagship-kiln')
    const kilnPasteSafeProgress = wechatProgress.choices.find(choice =>
      choice.choice.id === 'wechat-flagship-kiln-paste-safe'
    )
    const temperaProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-flagship-tempera')
    const amberProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')
    const kilnRequirementStatus = new Map(
      kilnProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )
    const kilnPasteSafeRequirementStatus = new Map(
      kilnPasteSafeProgress?.report.requirements.map(requirement => [
        requirement.requirement.id,
        requirement.status,
      ]) ?? [],
    )
    const classicRequirementStatus = new Map(
      classicProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )
    const quietRequirementStatus = new Map(
      quietProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )
    const toolbarParameterMapRequirementStatus = new Map(
      toolbarParameterMapProgress?.report.requirements.map(requirement => [
        requirement.requirement.id,
        requirement.status,
      ]) ?? [],
    )
    const coverSealDividerRequirementStatus = new Map(
      coverSealDividerProgress?.report.requirements.map(requirement => [
        requirement.requirement.id,
        requirement.status,
      ]) ?? [],
    )
    const cardRichRequirementStatus = new Map(
      cardRichProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )

    expect(packReport.summary).toMatchObject({
      manifestCount: 20,
      validManifestCount: 0,
      invalidManifestCount: 20,
      usableManifestCount: 20,
      artifactCount: 81,
      duplicateArtifactIdCount: 0,
    })
    expect(issueIds).not.toContain('style-proof-manifest-sensitive-artifact')
    expect(issueIds).not.toContain('style-proof-manifest-unsafe-commit-artifact')
    expect(issueIds).not.toContain('style-proof-manifest-pack-artifact-id-duplicate')
    expect(wechatProgress.ignoredManifestCount).toBe(11)
    expect(wechatProgress.summary.choicesWithManifest).toBe(9)
    expect(wechatProgress.summary.proofSatisfiedChoices).toBe(0)
    expect(wechatProgress.summary.proofInvalidChoices).toBeGreaterThan(0)

    expect(classicProgress?.manifestCount).toBe(1)
    expect(classicProgress?.status).toBe('missing')
    expect(classicProgress?.blockedByCatalog).toBe(false)
    expect(classicProgress?.manifest.artifactFingerprint).toBe(
      'sha256:13531674720c5015b00b652e05c8127c75c01b6395922d0f1572726a5b030562',
    )
    expect(classicProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status).toBe('satisfied')
    expect(classicProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status).toBe('satisfied')
    expect(classicRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(classicRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(classicRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(classicRequirementStatus.get('pc-editor-paste-event')).toBe('missing')
    expect(classicRequirementStatus.get('phone-preview-readback')).toBe('missing')
    expect(classicRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

    expect(quietProgress?.manifestCount).toBe(1)
    expect(quietProgress?.status).toBe('missing')
    expect(quietProgress?.blockedByCatalog).toBe(false)
    expect(quietProgress?.manifest.artifactFingerprint).toBe(
      'sha256:1962d5ef8cd5a76c9b8b5ffe33b87f80bd59cf1cd284b05d529608e1fbd2255e',
    )
    expect(quietProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status).toBe('satisfied')
    expect(quietProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status).toBe('satisfied')
    expect(quietRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(quietRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(quietRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(quietRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(quietRequirementStatus.get('pc-editor-paste-event')).toBe('missing')
    expect(quietRequirementStatus.get('phone-preview-readback')).toBe('missing')
    expect(quietRequirementStatus.get('dark-mode-check')).toBe('missing')
    expect(quietRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

    expect(toolbarParameterMapProgress?.manifestCount).toBe(1)
    expect(toolbarParameterMapProgress?.status).toBe('missing')
    expect(toolbarParameterMapProgress?.blockedByCatalog).toBe(false)
    expect(toolbarParameterMapProgress?.manifest.artifactFingerprint).toBe(
      'sha256:f5e6487905e11bfc64e2998d553de45de29b372a87b584014076e38b49263e79',
    )
    expect(toolbarParameterMapProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(toolbarParameterMapProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(toolbarParameterMapRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(toolbarParameterMapRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(toolbarParameterMapRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(toolbarParameterMapRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(toolbarParameterMapRequirementStatus.get('pc-editor-paste-event')).toBe('missing')
    expect(toolbarParameterMapRequirementStatus.get('phone-preview-readback')).toBe('missing')
    expect(toolbarParameterMapRequirementStatus.get('dark-mode-check')).toBe('missing')
    expect(toolbarParameterMapRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

    expect(coverSealDividerProgress?.manifestCount).toBe(1)
    expect(coverSealDividerProgress?.status).toBe('missing')
    expect(coverSealDividerProgress?.blockedByCatalog).toBe(false)
    expect(coverSealDividerProgress?.manifest.artifactFingerprint).toBe(
      'sha256:e8537db3ddff4b51b5fc6cd189d92cc71fdc9dcc7b8beea7879c7dc96ecfcb2f',
    )
    expect(coverSealDividerProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(coverSealDividerProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(coverSealDividerRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(coverSealDividerRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(coverSealDividerRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(coverSealDividerRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(coverSealDividerRequirementStatus.get('pc-editor-paste-event')).toBe('missing')
    expect(coverSealDividerRequirementStatus.get('phone-preview-readback')).toBe('missing')
    expect(coverSealDividerRequirementStatus.get('dark-mode-check')).toBe('missing')
    expect(coverSealDividerRequirementStatus.get('cover-thumbnail-check')).toBe('missing')
    expect(coverSealDividerRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

    expect(cardRichProgress?.manifestCount).toBe(1)
    expect(cardRichProgress?.status).toBe('missing')
    expect(cardRichProgress?.blockedByCatalog).toBe(false)
    expect(cardRichProgress?.manifest.artifactFingerprint).toBe(
      'sha256:91a8c7ac75fc9a9359cc5cd6a6f9a407a7317bb300cf827403bc72e67e4d2990',
    )
    expect(cardRichProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status).toBe('satisfied')
    expect(cardRichProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status).toBe('satisfied')
    expect(cardRichRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(cardRichRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(cardRichRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(cardRichRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(cardRichRequirementStatus.get('pc-editor-paste-event')).toBe('missing')
    expect(cardRichRequirementStatus.get('phone-preview-readback')).toBe('missing')
    expect(cardRichRequirementStatus.get('dark-mode-check')).toBe('missing')
    expect(cardRichRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

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

    expect(kilnPasteSafeProgress?.manifestCount).toBe(1)
    expect(kilnPasteSafeProgress?.status).toBe('missing')
    expect(kilnPasteSafeProgress?.blockedByCatalog).toBe(false)
    expect(kilnPasteSafeProgress?.manifest.artifactFingerprint).toBe(
      'sha256:338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491',
    )
    expect(kilnPasteSafeProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(kilnPasteSafeProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(kilnPasteSafeRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(kilnPasteSafeRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(kilnPasteSafeRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(kilnPasteSafeRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(kilnPasteSafeRequirementStatus.get('pc-editor-paste-event')).toBe('missing')
    expect(kilnPasteSafeRequirementStatus.get('phone-preview-readback')).toBe('missing')
    expect(kilnPasteSafeRequirementStatus.get('dark-mode-check')).toBe('missing')
    expect(kilnPasteSafeRequirementStatus.get('cover-thumbnail-check')).toBe('missing')
    expect(kilnPasteSafeRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

    expect(temperaProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status).toBe('satisfied')
    expect(temperaProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status).toBe('satisfied')
    expect(amberProgress?.blockedByCatalog).toBe(false)
    expect(amberProgress?.status).toBe('missing')
    expect(amberProgress?.report.issues.map(issue => issue.id)).not.toContain('style-proof-manifest-choice-blocked')

    const xhsProgress = packReport.platformReports.xiaohongshu
    const xhsCleanProgress = xhsProgress.choices.find(choice => choice.choice.id === 'xhs-clean-text')
    const xhsCoverProgress = xhsProgress.choices.find(choice => choice.choice.id === 'xhs-cover-carousel')
    const xhsCoverHookProgress = xhsProgress.choices.find(choice => choice.choice.id === 'xhs-cover-hook')
    const xhsCardSlicerProgress = xhsProgress.choices.find(choice => choice.choice.id === 'xhs-markdown-card-slicer')
    const xhsDataCardProgress = xhsProgress.choices.find(choice => choice.choice.id === 'xhs-data-card')
    const xhsLongReportProgress = xhsProgress.choices.find(choice => choice.choice.id === 'xhs-long-report')
    const xhsMarketFallbackProgress = xhsProgress.choices.find(choice =>
      choice.choice.id === 'xhs-market-rich-card-fallback'
    )
    const xhsCleanRequirementStatus = new Map(
      xhsCleanProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )
    const xhsArtifactManifest = xhsCoverProgress?.manifest.artifacts.find(artifact =>
      artifact.requirementId === 'xhs-artifact-manifest'
    )
    const xhsCoverHookArtifactManifest = xhsCoverHookProgress?.manifest.artifacts.find(artifact =>
      artifact.requirementId === 'xhs-artifact-manifest'
    )
    const xhsCardSlicerArtifactManifest = xhsCardSlicerProgress?.manifest.artifacts.find(artifact =>
      artifact.requirementId === 'xhs-artifact-manifest'
    )
    const xhsDataCardArtifactManifest = xhsDataCardProgress?.manifest.artifacts.find(artifact =>
      artifact.requirementId === 'xhs-artifact-manifest'
    )
    const xhsLongReportArtifactManifest = xhsLongReportProgress?.manifest.artifacts.find(artifact =>
      artifact.requirementId === 'xhs-artifact-manifest'
    )
    const xhsMarketFallbackArtifactManifest = xhsMarketFallbackProgress?.manifest.artifacts.find(artifact =>
      artifact.requirementId === 'xhs-artifact-manifest'
    )
    const xhsRequirementStatus = new Map(
      xhsCoverProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )
    const xhsCoverHookRequirementStatus = new Map(
      xhsCoverHookProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status])
      ?? [],
    )
    const xhsCardSlicerRequirementStatus = new Map(
      xhsCardSlicerProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status])
      ?? [],
    )
    const xhsDataCardRequirementStatus = new Map(
      xhsDataCardProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status])
      ?? [],
    )
    const xhsLongReportRequirementStatus = new Map(
      xhsLongReportProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status])
      ?? [],
    )
    const xhsMarketFallbackRequirementStatus = new Map(
      xhsMarketFallbackProgress?.report.requirements.map(requirement => [
        requirement.requirement.id,
        requirement.status,
      ]) ?? [],
    )

    expect(xhsProgress.ignoredManifestCount).toBe(13)
    expect(xhsProgress.summary.choicesWithManifest).toBe(7)
    expect(xhsCleanProgress?.manifestCount).toBe(1)
    expect(xhsCleanProgress?.status).toBe('missing')
    expect(xhsCleanProgress?.manifest.artifactFingerprint).toBe(
      'sha256:e590d621cb09f988c76f76c7b4db87295bce7765bdd8300479dac2d80c4d4e68',
    )
    expect(xhsCleanProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status).toBe('satisfied')
    expect(xhsCleanProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status).toBe('satisfied')
    expect(xhsCleanProgress?.gates.find(gate => gate.gate === 'platform-publish')?.status).toBe('missing')
    expect(xhsCleanRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(xhsCleanRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(xhsCleanRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(xhsCleanRequirementStatus.get('scheduled-send-readback')).toBe('missing')
    expect(xhsCleanRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')
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
    expect(xhsCoverHookProgress?.manifestCount).toBe(1)
    expect(xhsCoverHookProgress?.status).toBe('missing')
    expect(xhsCoverHookProgress?.manifest.artifactFingerprint).toBe(
      'prompts/0601/evidence/xhs-raster/xhs-raster-cover-hook-browser-2026-06-21.png@sha256:c7200947079cda16ccafc51b5c56bfd840355da199da48b790b6725233af2d32',
    )
    expect(xhsCoverHookProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(xhsCoverHookProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(xhsCoverHookProgress?.gates.find(gate => gate.gate === 'platform-publish')?.status)
      .toBe('missing')
    expect(xhsCoverHookRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(xhsCoverHookRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(xhsCoverHookRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(xhsCoverHookRequirementStatus.get('xhs-artifact-manifest')).toBe('satisfied')
    expect(xhsCoverHookArtifactManifest?.artifactManifestValidated).toBe(true)
    expect(xhsCoverHookRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(xhsCoverHookRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')
    expect(xhsCardSlicerProgress?.manifestCount).toBe(1)
    expect(xhsCardSlicerProgress?.status).toBe('missing')
    expect(xhsCardSlicerProgress?.manifest.artifactFingerprint).toBe(
      'prompts/0601/evidence/xhs-raster/xhs-markdown-card-slicer-browser-2026-06-21.json@sha256:e3716eb5903b1b11a167b467c3c2aae4c6eff793ef5e0c29b39ddeb3b0da375c',
    )
    expect(xhsCardSlicerProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(xhsCardSlicerProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(xhsCardSlicerProgress?.gates.find(gate => gate.gate === 'platform-publish')?.status)
      .toBe('missing')
    expect(xhsCardSlicerRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(xhsCardSlicerRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(xhsCardSlicerRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(xhsCardSlicerRequirementStatus.get('xhs-artifact-manifest')).toBe('satisfied')
    expect(xhsCardSlicerArtifactManifest?.artifactManifestValidated).toBe(true)
    expect(xhsCardSlicerRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(xhsCardSlicerRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')
    expect(xhsDataCardProgress?.manifestCount).toBe(1)
    expect(xhsDataCardProgress?.status).toBe('missing')
    expect(xhsDataCardProgress?.blockedByCatalog).toBe(false)
    expect(xhsDataCardProgress?.manifest.artifactFingerprint).toBe(
      'prompts/0601/evidence/xhs-raster/xhs-data-card-browser-2026-06-21.json@sha256:bb78392d7b217251509eff0a9295ff3d601303747dd4eaa772e1b871c60bdc1a',
    )
    expect(xhsDataCardProgress?.report.issues.map(issue => issue.id))
      .not.toContain('style-proof-manifest-choice-blocked')
    expect(xhsDataCardProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(xhsDataCardProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(xhsDataCardProgress?.gates.find(gate => gate.gate === 'platform-publish')?.status)
      .toBe('missing')
    expect(xhsDataCardRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(xhsDataCardRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(xhsDataCardRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(xhsDataCardRequirementStatus.get('xhs-artifact-manifest')).toBe('satisfied')
    expect(xhsDataCardArtifactManifest?.artifactManifestValidated).toBe(true)
    expect(xhsDataCardRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(xhsDataCardRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')
    expect(xhsLongReportProgress?.manifestCount).toBe(1)
    expect(xhsLongReportProgress?.status).toBe('missing')
    expect(xhsLongReportProgress?.blockedByCatalog).toBe(false)
    expect(xhsLongReportProgress?.manifest.artifactFingerprint).toBe(
      'prompts/0601/evidence/xhs-raster/xhs-long-report-browser-2026-06-21.json@sha256:102dafef61c4d978f8fd4cb501f7469d714f4db5125e1943e940f77df59d2a9e',
    )
    expect(xhsLongReportProgress?.report.issues.map(issue => issue.id))
      .not.toContain('style-proof-manifest-choice-blocked')
    expect(xhsLongReportProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(xhsLongReportProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(xhsLongReportProgress?.gates.find(gate => gate.gate === 'platform-publish')?.status)
      .toBe('missing')
    expect(xhsLongReportRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(xhsLongReportRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(xhsLongReportRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(xhsLongReportRequirementStatus.get('xhs-artifact-manifest')).toBe('satisfied')
    expect(xhsLongReportArtifactManifest?.artifactManifestValidated).toBe(true)
    expect(xhsLongReportRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(xhsLongReportRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')
    expect(xhsMarketFallbackProgress?.manifestCount).toBe(1)
    expect(xhsMarketFallbackProgress?.status).toBe('missing')
    expect(xhsMarketFallbackProgress?.blockedByCatalog).toBe(false)
    expect(xhsMarketFallbackProgress?.manifest.artifactFingerprint).toBe(
      'prompts/0601/evidence/xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21.json@sha256:beefe00ac8ceaa97aaaf1ad27b72055e70a3967bc148372666cd1d9e3f6a1b7b',
    )
    expect(xhsMarketFallbackProgress?.report.issues.map(issue => issue.id))
      .not.toContain('style-proof-manifest-choice-blocked')
    expect(xhsMarketFallbackProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(xhsMarketFallbackProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(xhsMarketFallbackProgress?.gates.find(gate => gate.gate === 'platform-publish')?.status)
      .toBe('missing')
    expect(xhsMarketFallbackRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(xhsMarketFallbackRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(xhsMarketFallbackRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(xhsMarketFallbackRequirementStatus.get('xhs-artifact-manifest')).toBe('satisfied')
    expect(xhsMarketFallbackArtifactManifest?.artifactManifestValidated).toBe(true)
    expect(xhsMarketFallbackRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(xhsMarketFallbackRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

    const zhihuProgress = packReport.platformReports.zhihu
    const zhihuCleanProgress = zhihuProgress.choices.find(choice => choice.choice.id === 'zhihu-clean-column')
    const zhihuAcademicProgress = zhihuProgress.choices.find(choice =>
      choice.choice.id === 'zhihu-academic-latex-column'
    )
    const zhihuAdaptedProgress = zhihuProgress.choices.find(choice => choice.choice.id === 'zhihu-wechat-adapted')
    const zhihuDataProgress = zhihuProgress.choices.find(choice => choice.choice.id === 'zhihu-data-table')
    const zhihuCleanRequirementStatus = new Map(
      zhihuCleanProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status])
      ?? [],
    )
    const zhihuAcademicRequirementStatus = new Map(
      zhihuAcademicProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status])
      ?? [],
    )
    const zhihuAdaptedRequirementStatus = new Map(
      zhihuAdaptedProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status])
      ?? [],
    )
    const zhihuRequirementStatus = new Map(
      zhihuDataProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )

    expect(zhihuProgress.ignoredManifestCount).toBe(16)
    expect(zhihuProgress.summary.choicesWithManifest).toBe(4)
    expect(zhihuCleanProgress?.manifestCount).toBe(1)
    expect(zhihuCleanProgress?.status).toBe('missing')
    expect(zhihuCleanProgress?.manifest.artifactFingerprint).toBe(
      'sha256:eccc28007327ade6c6b05fd37567dd31632b9daada68b28aa7146afe8b64b329',
    )
    expect(zhihuCleanProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(zhihuCleanProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(zhihuCleanProgress?.gates.find(gate => gate.gate === 'platform-publish')?.status)
      .toBe('missing')
    expect(zhihuCleanRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(zhihuCleanRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(zhihuCleanRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(zhihuCleanRequirementStatus.get('scheduled-send-readback')).toBe('missing')
    expect(zhihuCleanRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')
    expect(zhihuAcademicProgress?.manifestCount).toBe(1)
    expect(zhihuAcademicProgress?.status).toBe('missing')
    expect(zhihuAcademicProgress?.manifest.artifactFingerprint).toBe(
      'sha256:0bed075e0f24a94f4ecb0a9bf410e42f5de6caaff560347e6b016757916a7ff9',
    )
    expect(zhihuAcademicProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(zhihuAcademicProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(zhihuAcademicRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(zhihuAcademicRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(zhihuAcademicRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(zhihuAcademicRequirementStatus.has('zhihu-artifact-manifest')).toBe(false)
    expect(zhihuAcademicRequirementStatus.has('public-image-host')).toBe(false)
    expect(zhihuAcademicRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')
    expect(zhihuAdaptedProgress?.manifestCount).toBe(1)
    expect(zhihuAdaptedProgress?.status).toBe('missing')
    expect(zhihuAdaptedProgress?.manifest.artifactFingerprint).toBe(
      'sha256:5aaf2834bcd50e8251b2d8e99deb72c550826909598dc17e3f80ec7ac3efba63',
    )
    expect(zhihuAdaptedProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(zhihuAdaptedProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(zhihuAdaptedRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(zhihuAdaptedRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(zhihuAdaptedRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(zhihuAdaptedRequirementStatus.has('zhihu-artifact-manifest')).toBe(false)
    expect(zhihuAdaptedRequirementStatus.has('public-image-host')).toBe(false)
    expect(zhihuAdaptedRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')
    expect(zhihuDataProgress?.manifestCount).toBe(1)
    expect(zhihuDataProgress?.status).toBe('missing')
    expect(zhihuDataProgress?.manifest.artifactFingerprint).toBe(
      'sha256:9e828ff7b50d642be8f59f4907dc5cd47fc9973f465e904446a21f6e79bccd8f',
    )
    expect(zhihuDataProgress?.gates.find(gate => gate.gate === 'sensitive-hygiene')?.status)
      .toBe('satisfied')
    expect(zhihuDataProgress?.gates.find(gate => gate.gate === 'local-evidence')?.status)
      .toBe('satisfied')
    expect(zhihuRequirementStatus.get('unit-test-coverage')).toBe('satisfied')
    expect(zhihuRequirementStatus.get('local-browser-rendering')).toBe('satisfied')
    expect(zhihuRequirementStatus.get('exact-artifact')).toBe('satisfied')
    expect(zhihuRequirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(zhihuRequirementStatus.has('zhihu-artifact-manifest')).toBe(false)
    expect(zhihuRequirementStatus.has('public-image-host')).toBe(false)
    expect(zhihuRequirementStatus.get('published-url-or-platform-preview')).toBe('missing')

    const audit = getCommittedStyleProofLocalEvidenceAuditReport()
    const wechatAudit = audit.platformReports.wechat
    const xhsAudit = audit.platformReports.xiaohongshu
    const zhihuAudit = audit.platformReports.zhihu
    const cannotClaimIds = wechatAudit.cannotClaim.map(requirement => requirement.requirement.id)
    const xhsCannotClaimIds = xhsAudit.cannotClaim.map(requirement => requirement.requirement.id)
    const zhihuCannotClaimIds = zhihuAudit.cannotClaim.map(requirement => requirement.requirement.id)

    expect(audit.summary.manifestCount).toBe(20)
    expect(wechatAudit.progress.summary.choicesWithManifest).toBe(9)
    expect(xhsAudit.progress.summary.choicesWithManifest).toBe(7)
    expect(zhihuAudit.progress.summary.choicesWithManifest).toBe(4)
    expect(wechatAudit.summary.cannotClaimRequirements).toBeGreaterThan(0)
    expect(xhsAudit.summary.cannotClaimRequirements).toBeGreaterThan(0)
    expect(zhihuAudit.summary.cannotClaimRequirements).toBeGreaterThan(0)
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
    expect(zhihuCannotClaimIds).toContain('zhihu-artifact-manifest')
    expect(zhihuCannotClaimIds).toContain('public-image-host')
    expect(zhihuCannotClaimIds).toContain('published-url-or-platform-preview')
  })

  it('builds style proof execution runbooks with exact external proof contracts', () => {
    const marketRunbook = getPlatformStyleProofExecutionRunbook('wechat', [{
      platform: 'wechat',
      scope: 'style-choice',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['applied-editor-element'],
      artifacts: [],
    }])
    const runbook = getPlatformStyleProofExecutionRunbook(
      'wechat',
      getCommittedStyleProofLocalEvidenceManifests(),
    )
    const pcPasteStep = runbook.steps.find(step => step.requirement.id === 'pc-editor-paste-event')
    const pcDomStep = runbook.steps.find(step => step.requirement.id === 'pc-editor-dom-readback')
    const marketStep = marketRunbook.steps.find(step => step.requirement.id === 'market-applied-dom-readback')
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
      'collectedAt',
      'safeForCommit',
    ]))
    expect(pcPasteStep?.requiresFreshCollectedAt).toBe(true)
    expect(pcPasteStep?.freshnessMaxDays).toBe(14)
    expect(pcPasteStep?.cannotClaimReason).toContain('cannot be claimed')
    expect(pcPasteStep?.redactionBoundary).toContain('account')
    expect(pcDomStep?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'authenticatedSessionVerified',
      'platformEditorTargetVerified',
      'platformEditorSurfaceVerified',
      'platformEditorDomVerified',
      'collectedAt',
      'safeForCommit',
    ]))
    expect(marketStep?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'centralEditorChanged',
      'marketAppliedContentVerified',
      'collectedAt',
      'safeForCommit',
    ]))
    expect(marketStep?.requiresFreshCollectedAt).toBe(true)
    expect(marketStep?.freshnessMaxDays).toBe(14)
    expect(marketStep?.freshnessIssueIds).toEqual([])
    expect(marketStep?.successCriteria.join(' ')).toContain('marketAppliedContentVerified:true')
    expect(marketStep?.successCriteria.join(' ')).toContain('non-placeholder')
    expect(marketStep?.successCriteria.join(' ')).toContain('within 14 days')
    expect(marketStep?.failureSignals.join(' ')).toContain('marketAppliedContentVerified:true')
    expect(marketStep?.failureSignals.join(' ')).toContain('older-than-14-days')

    expect(phoneStep?.status).toBe('blocked-by-external')
    expect(phoneStep?.boundary).toBe('phone-preview')
    expect(phoneStep?.requiresPhone).toBe(true)
    expect(phoneStep?.requiresFreshCollectedAt).toBe(true)
    expect(phoneStep?.freshnessMaxDays).toBe(14)
    expect(phoneStep?.requiredArtifact.requiredFields).toEqual(expect.arrayContaining([
      'phonePreviewContentVerified',
      'exactArtifact',
      'collectedAt',
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
    expect(amberReportIssueIds).not.toContain('style-proof-manifest-choice-blocked')
    expect(temperaReportIssueIds).not.toContain('style-proof-manifest-choice-blocked')
    expect([...amberReportIssueIds, ...temperaReportIssueIds]).not.toContain('style-proof-manifest-sensitive-artifact')
    expect([...amberReportIssueIds, ...temperaReportIssueIds]).not.toContain('style-proof-manifest-unsafe-commit-artifact')
    expect(wechatProgress.ignoredManifestCount).toBe(0)
    expect(wechatProgress.summary.choicesWithManifest).toBe(2)
    expect(amberProgress?.blockedByCatalog).toBe(false)
    expect(amberProgress?.status).toBe('missing')
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
      .toBe('missing')
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

  it('records committed WeChat login-state blocker evidence without upgrading PC proof', () => {
    const manifests = getCommittedStyleProofExternalBlockerManifests()
    const secondRead = getCommittedStyleProofExternalBlockerManifests()
    const manifest = manifests[0]

    expect(manifests).toHaveLength(1)
    expect(secondRead[0]).not.toBe(manifest)
    expect(secondRead[0]?.artifacts[0]).not.toBe(manifest?.artifacts[0])
    expect(manifest?.platform).toBe('wechat')
    expect(manifest?.scope).toBe('style-choice')
    expect(manifest?.choiceId).toBe('wechat-flagship-amber')
    expect(manifest?.claimedEvidence).toEqual(['pc-editor-dom-readable'])
    expect(manifest?.artifactFingerprint).toBe('sha256:redacted-wechat-login-state-readonly-20260625')
    expect(manifest?.artifacts).toHaveLength(3)
    expect(manifest?.artifacts.every(artifact =>
      artifact.committed === true
      && artifact.safeForCommit === true
      && artifact.artifactFingerprint === manifest.artifactFingerprint
      && artifact.artifactRef === 'prompts/0601/evidence/wechat-login-state-readonly-20260625.txt'
    )).toBe(true)
    expect(manifest?.artifacts.filter(artifact => artifact.externalAccountLoginBlocked === true).map(artifact => artifact.id))
      .toEqual([
        'wechat-flagship-amber-committed-login-state-editor-url-blocker',
        'wechat-flagship-amber-committed-login-state-pc-dom-blocker',
      ])
    expect(manifest?.artifacts.some(artifact => artifact.externalAccountAuthenticated === false)).toBe(true)
    expect(manifest?.artifacts.every(artifact => artifact.sensitive !== true)).toBe(true)

    const packReport = getStyleProofManifestPackReport(manifests)
    const packIssueIds = packReport.issues.map(issue => issue.id)
    const wechatProgress = packReport.platformReports.wechat
    const amberProgress = wechatProgress.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')
    const requirementStatus = new Map(
      amberProgress?.report.requirements.map(requirement => [requirement.requirement.id, requirement.status]) ?? [],
    )

    expect(packReport.summary).toMatchObject({
      manifestCount: 1,
      validManifestCount: 0,
      invalidManifestCount: 1,
      artifactCount: 3,
      duplicateArtifactIdCount: 0,
    })
    expect(amberProgress?.status).toBe('invalid')
    expect(requirementStatus.get('authenticated-editor-url')).toBe('invalid')
    expect(requirementStatus.get('pc-editor-dom-readback')).toBe('invalid')
    expect(requirementStatus.get('no-sensitive-artifact')).toBe('satisfied')
    expect(requirementStatus.get('exact-artifact')).toBe('missing')
    expect(requirementStatus.get('safe-disposable-draft')).toBe('missing')
    expect(requirementStatus.get('pc-editor-paste-event')).toBe('missing')
    expect(requirementStatus.get('phone-preview-readback')).toBe('missing')
    expect(requirementStatus.get('dark-mode-check')).toBe('missing')
    expect(requirementStatus.get('cover-thumbnail-check')).toBe('missing')
    expect(requirementStatus.get('scheduled-send-readback')).toBe('missing')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('missing')
    expect(packIssueIds).toEqual(expect.arrayContaining([
      'style-proof-manifest-external-account-login-blocked',
      'style-proof-manifest-authenticated-session-not-verified',
      'style-proof-manifest-platform-editor-target-not-verified',
      'style-proof-manifest-platform-editor-surface-not-verified',
      'style-proof-manifest-platform-editor-dom-not-verified',
      'style-proof-manifest-editor-mojibake-not-ruled-out',
    ]))
    expect(packIssueIds).not.toContain('style-proof-manifest-sensitive-artifact')
    expect(packIssueIds).not.toContain('style-proof-manifest-unsafe-commit-artifact')

    const audit = getCommittedStyleProofExternalBlockerAuditReport()
    const wechatAudit = audit.platformReports.wechat
    const cannotClaimIds = wechatAudit.cannotClaim.map(requirement => requirement.requirement.id)

    expect(audit.summary).toMatchObject({
      manifestCount: 1,
      validManifestCount: 0,
      invalidManifestCount: 1,
    })
    expect(wechatAudit.progress.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')?.status)
      .toBe('invalid')
    expect(cannotClaimIds).toEqual(expect.arrayContaining([
      'authenticated-editor-url',
      'pc-editor-dom-readback',
      'exact-artifact',
      'safe-disposable-draft',
      'pc-editor-paste-event',
      'phone-preview-readback',
      'dark-mode-check',
      'cover-thumbnail-check',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))

    expect(getCommittedStyleProofEvidenceManifests()).toHaveLength(22)
  })

  it('audits committed local and WeChat PC evidence together without merging exact-artifact claims', () => {
    const manifests = getCommittedStyleProofEvidenceManifests()
    const secondRead = getCommittedStyleProofEvidenceManifests()
    const artifactIds = manifests.flatMap(manifest => manifest.artifacts.map(artifact => artifact.id))
    const choiceIds = manifests.map(manifest => manifest.choiceId)

    expect(manifests).toHaveLength(22)
    expect(secondRead[0]).not.toBe(manifests[0])
    expect(secondRead[0]?.artifacts[0]).not.toBe(manifests[0]?.artifacts[0])
    expect(choiceIds).toEqual([
      'wechat-classic-inline',
      'wechat-quiet-editorial',
      'wechat-toolbar-parameter-map',
      'wechat-cover-seal-divider',
      'wechat-card-rich',
      'wechat-flagship-kiln',
      'wechat-flagship-kiln-paste-safe',
      'wechat-flagship-tempera',
      'wechat-flagship-amber',
      'xhs-clean-text',
      'xhs-cover-carousel',
      'xhs-cover-hook',
      'xhs-markdown-card-slicer',
      'xhs-data-card',
      'xhs-long-report',
      'xhs-market-rich-card-fallback',
      'zhihu-clean-column',
      'zhihu-academic-latex-column',
      'zhihu-wechat-adapted',
      'zhihu-data-table',
      'wechat-flagship-amber',
      'wechat-flagship-tempera',
    ])
    expect(new Set(artifactIds).size).toBe(artifactIds.length)

    const packReport = getStyleProofManifestPackReport(manifests)
    const packIssueIds = packReport.issues.map(issue => issue.id)
    const audit = getCommittedStyleProofEvidenceAuditReport()
    const combinedIssueIds = audit.combined.issues.map(issue => issue.id)
    const wechatAudit = audit.combined.platformReports.wechat
    const xhsAudit = audit.combined.platformReports.xiaohongshu
    const zhihuAudit = audit.combined.platformReports.zhihu
    const cannotClaimIds = wechatAudit.cannotClaim.map(requirement => requirement.requirement.id)
    const zhihuCannotClaimIds = zhihuAudit.cannotClaim.map(requirement => requirement.requirement.id)
    const amberProgress = wechatAudit.progress.choices.find(choice => choice.choice.id === 'wechat-flagship-amber')
    const temperaProgress = wechatAudit.progress.choices.find(choice => choice.choice.id === 'wechat-flagship-tempera')
    const kilnProgress = wechatAudit.progress.choices.find(choice => choice.choice.id === 'wechat-flagship-kiln')
    const amberIssueIds = amberProgress?.report.issues.map(issue => issue.id) ?? []
    const temperaIssueIds = temperaProgress?.report.issues.map(issue => issue.id) ?? []

    expect(packReport.summary).toMatchObject({
      manifestCount: 22,
      duplicateArtifactIdCount: 0,
    })
    expect(packIssueIds).not.toContain('style-proof-manifest-pack-fingerprint-mismatch')
    expect(packIssueIds).not.toContain('style-proof-manifest-pack-artifact-id-duplicate')
    expect(packIssueIds).not.toContain('style-proof-manifest-sensitive-artifact')
    expect(packIssueIds).not.toContain('style-proof-manifest-unsafe-commit-artifact')

    expect(audit.summary).toMatchObject({
      localManifestCount: 20,
      wechatPcManifestCount: 2,
      combinedManifestCount: 22,
      hasExactArtifactFingerprintConflicts: false,
    })
    expect(audit.summary.combinedIssueCount).toBeGreaterThan(0)
    expect(audit.summary.cannotClaimRequirements).toBeGreaterThan(0)
    expect(combinedIssueIds).not.toContain('style-proof-manifest-pack-fingerprint-mismatch')
    expect(wechatAudit.progress.ignoredManifestCount).toBe(11)
    expect(xhsAudit.progress.ignoredManifestCount).toBe(15)
    expect(zhihuAudit.progress.ignoredManifestCount).toBe(18)
    expect(wechatAudit.progress.summary.choicesWithManifest).toBe(9)
    expect(xhsAudit.progress.summary.choicesWithManifest).toBe(7)
    expect(zhihuAudit.progress.summary.choicesWithManifest).toBe(4)
    expect(kilnProgress?.manifestCount).toBe(1)
    expect(amberProgress?.manifestCount).toBe(2)
    expect(temperaProgress?.manifestCount).toBe(2)
    expect(amberIssueIds).not.toContain('style-proof-manifest-choice-blocked')
    expect(amberIssueIds).not.toContain('style-proof-manifest-pack-fingerprint-mismatch')
    expect(temperaIssueIds).not.toContain('style-proof-manifest-pack-fingerprint-mismatch')
    expect(cannotClaimIds).toEqual(expect.arrayContaining([
      'exact-artifact',
      'phone-preview-readback',
      'dark-mode-check',
      'cover-thumbnail-check',
      'sync-readback',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
    expect(zhihuCannotClaimIds).toContain('zhihu-artifact-manifest')
    expect(zhihuCannotClaimIds).toContain('public-image-host')
  })

  it('builds committed evidence execution runbook report without closing external gates', () => {
    const report = getCommittedStyleProofEvidenceExecutionRunbookReport()
    const wechatRunbook = report.combined.platformReports.wechat
    const xhsRunbook = report.combined.platformReports.xiaohongshu
    const zhihuRunbook = report.combined.platformReports.zhihu
    const combinedIssueIds = report.combined.issues.map(issue => issue.id)
    const wechatExactArtifactStep = wechatRunbook.cannotClaim.find(step =>
      step.requirement.id === 'exact-artifact'
    )
    const wechatPhoneStep = wechatRunbook.cannotClaim.find(step =>
      step.requirement.id === 'phone-preview-readback'
    )
    const wechatScheduledSendStep = wechatRunbook.cannotClaim.find(step =>
      step.requirement.id === 'scheduled-send-readback'
    )
    const xhsPublishStep = xhsRunbook.cannotClaim.find(step =>
      step.requirement.id === 'published-url-or-platform-preview'
    )
    const zhihuPublicHostStep = zhihuRunbook.cannotClaim.find(step =>
      step.requirement.id === 'public-image-host'
    )

    expect(report.local.summary.manifestCount).toBe(20)
    expect(report.wechatPc.summary.manifestCount).toBe(2)
    expect(report.combined.summary.manifestCount).toBe(22)
    expect(report.summary).toMatchObject({
      localManifestCount: 20,
      wechatPcManifestCount: 2,
      combinedManifestCount: 22,
      hasExactArtifactFingerprintConflicts: false,
    })
    expect(report.summary.combinedIssueCount).toBeGreaterThan(0)
    expect(combinedIssueIds).not.toContain('style-proof-manifest-pack-fingerprint-mismatch')
    expect(report.summary.cannotClaimSteps).toBe(report.combined.summary.cannotClaimSteps)
    expect(report.summary.phoneOpenSteps).toBeGreaterThan(0)
    expect(report.summary.externalDependencyOpenSteps).toBeGreaterThan(0)
    expect(report.summary.unsafeToAutomateOpenSteps).toBeGreaterThan(0)
    expect(report.summary.mutatingOpenSteps).toBeGreaterThan(0)

    expect(wechatExactArtifactStep?.status).toBe('invalid')
    expect(wechatPhoneStep?.status).toBe('blocked-by-external')
    expect(wechatPhoneStep?.boundary).toBe('phone-preview')
    expect(wechatPhoneStep?.cannotClaimReason).toContain('phone-side preview evidence')
    expect(wechatScheduledSendStep?.status).toBe('unsafe-to-automate')
    expect(wechatScheduledSendStep?.boundary).toBe('platform-publish')
    expect(xhsPublishStep?.status).toBe('unsafe-to-automate')
    expect(xhsPublishStep?.boundary).toBe('platform-publish')
    expect(zhihuPublicHostStep?.status).toBe('blocked-by-external')
    expect(zhihuPublicHostStep?.boundary).toBe('public-host')
  })

  it('blocks committed evidence release claims until external gates are actually proven', () => {
    const report = getCommittedStyleProofEvidenceReleaseGateReport()
    const blockerKinds = report.blockers.map(blocker => blocker.kind)
    const phoneBlocker = report.blockers.find(blocker => blocker.kind === 'phone-preview')
    const externalBlocker = report.blockers.find(blocker => blocker.kind === 'external-dependency')
    const unsafeBlocker = report.blockers.find(blocker => blocker.kind === 'unsafe-to-automate')
    const mutatingBlocker = report.blockers.find(blocker => blocker.kind === 'mutating-platform')
    const localConflictBlocker = report.blockers.find(blocker => blocker.kind === 'local-conflict')

    expect(report.canClaimComplete).toBe(false)
    expect(report.status).toBe('blocked-by-external')
    expect(report.summary).toMatchObject({
      localManifestCount: 20,
      combinedManifestCount: 22,
      hasExactArtifactFingerprintConflicts: false,
      combinedIssueCount: 11,
      cannotClaimSteps: expect.any(Number),
      phoneOpenSteps: expect.any(Number),
      externalDependencyOpenSteps: expect.any(Number),
      unsafeToAutomateOpenSteps: expect.any(Number),
      mutatingOpenSteps: expect.any(Number),
    })
    expect(report.summary.combinedIssueCount).toBeGreaterThan(0)
    expect(report.summary.cannotClaimSteps).toBeGreaterThan(0)
    expect(blockerKinds).toEqual(expect.arrayContaining([
      'phone-preview',
      'external-dependency',
      'unsafe-to-automate',
      'mutating-platform',
    ]))
    expect(blockerKinds).not.toContain('local-conflict')
    expect(report.summary.blockerCount).toBe(4)
    expect(localConflictBlocker).toBeUndefined()
    expect(phoneBlocker?.requirementIds).toContain('phone-preview-readback')
    expect(phoneBlocker?.stepCount).toBeGreaterThan(0)
    expect(phoneBlocker?.issueIds).toEqual(['style-proof-manifest-requirement-missing'])
    expect(phoneBlocker?.issueCount).toBe(4)
    expect(phoneBlocker?.platformStepCounts).toEqual([{ platform: 'wechat', stepCount: 4 }])
    expect(phoneBlocker?.requirementStepCounts).toEqual([
      { requirementId: 'cover-thumbnail-check', stepCount: 1 },
      { requirementId: 'dark-mode-check', stepCount: 1 },
      { requirementId: 'phone-preview-readback', stepCount: 1 },
      { requirementId: 'phone-screenshot', stepCount: 1 },
    ])
    expect(phoneBlocker?.nextOperatorActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        platforms: ['wechat'],
        requirementId: 'phone-preview-readback',
        gate: 'phone-preview',
        boundary: 'phone-preview',
        action: expect.stringContaining('target phone preview'),
      }),
    ]))
    expect(externalBlocker?.requirementIds).toEqual(expect.arrayContaining([
      'public-image-host',
      'sync-readback',
    ]))
    expect(externalBlocker?.platformStepCounts).toEqual([
      { platform: 'wechat', stepCount: 7 },
      { platform: 'xiaohongshu', stepCount: 2 },
      { platform: 'zhihu', stepCount: 5 },
    ])
    expect(externalBlocker?.requirementStepCounts).toEqual(expect.arrayContaining([
      { requirementId: 'public-image-host', stepCount: 1 },
      { requirementId: 'published-url-or-platform-preview', stepCount: 3 },
      { requirementId: 'scheduled-send-readback', stepCount: 3 },
    ]))
    expect(externalBlocker?.nextOperatorActions.some(action =>
      action.boundary === 'public-host' || action.action.includes('public host')
    )).toBe(true)
    expect(unsafeBlocker?.requirementIds).toEqual(expect.arrayContaining([
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
    expect(unsafeBlocker?.platformStepCounts).toEqual([
      { platform: 'wechat', stepCount: 7 },
      { platform: 'xiaohongshu', stepCount: 2 },
      { platform: 'zhihu', stepCount: 4 },
    ])
    expect(unsafeBlocker?.nextOperatorActions.some(action =>
      action.boundary === 'platform-publish' &&
      action.requirementId === 'published-url-or-platform-preview'
    )).toBe(true)
    expect(mutatingBlocker?.requirementIds).toEqual(expect.arrayContaining([
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
    expect(mutatingBlocker?.requirementStepCounts).toEqual(expect.arrayContaining([
      { requirementId: 'published-url-or-platform-preview', stepCount: 3 },
      { requirementId: 'scheduled-send-readback', stepCount: 3 },
    ]))
    expect(mutatingBlocker?.nextOperatorActions.some(action =>
      action.boundary === 'platform-publish'
    )).toBe(true)
  })

  it('builds committed external proof checklist without converting blockers into proof', () => {
    const report = getCommittedStyleProofExternalProofChecklistReport()
    const groupKinds = report.groups.map(group => group.kind)
    const wechatPhoneRow = report.rows.find(row =>
      row.platform === 'wechat' && row.requirementId === 'phone-preview-readback'
    )
    const xhsPublishRow = report.rows.find(row =>
      row.platform === 'xiaohongshu' && row.requirementId === 'published-url-or-platform-preview'
    )
    const zhihuPublicHostRow = report.rows.find(row =>
      row.platform === 'zhihu' && row.requirementId === 'public-image-host'
    )
    const phoneGroup = report.groups.find(group => group.kind === 'phone-preview')
    const externalGroup = report.groups.find(group => group.kind === 'external-dependency')

    expect(report.canClaimComplete).toBe(false)
    expect(report.status).toBe('blocked-by-external')
    expect(report.releaseGate.canClaimComplete).toBe(false)
    expect(groupKinds).toEqual([
      'phone-preview',
      'external-dependency',
      'unsafe-to-automate',
      'mutating-platform',
    ])
    expect(report.summary).toMatchObject({
      blockerCount: 4,
      groupCount: 4,
      groupRowCount: 44,
      uniqueChecklistRowCount: 18,
      phoneRows: 4,
      externalAccountRows: 13,
      publicHostRows: 1,
      mutatingRows: 13,
      unsafeToAutomateRows: 13,
      safeToAutomateRows: 0,
    })
    expect(report.rows.every(row => row.status !== 'completed')).toBe(true)
    expect(report.rows.every(row => row.safeToAutomate === false)).toBe(true)
    expect(report.rows.some(row => row.boundary === 'local-only')).toBe(false)

    expect(phoneGroup?.rowCount).toBe(4)
    expect(phoneGroup?.rows.every(row => row.requiresPhone)).toBe(true)
    expect(externalGroup?.rowCount).toBe(14)
    expect(externalGroup?.rows.some(row => row.boundary === 'public-host')).toBe(true)

    expect(wechatPhoneRow).toMatchObject({
      blockerKinds: ['phone-preview'],
      boundary: 'phone-preview',
      status: 'blocked-by-external',
      requiresPhone: true,
      mutatesPlatform: false,
      safeToAutomate: false,
      cannotClaim: true,
    })
    expect(wechatPhoneRow?.cannotClaimReason).toContain('phone-side preview evidence')
    expect(wechatPhoneRow?.artifactTemplate.requiredChannels).toEqual(['phone-preview'])
    expect(wechatPhoneRow?.artifactTemplate.requiredFields).toEqual(expect.arrayContaining([
      'artifactFingerprint',
      'exactArtifact',
      'phonePreviewContentVerified',
      'collectedAt',
      'safeForCommit',
    ]))
    expect(wechatPhoneRow?.artifactTemplate.forbiddenFields).toContain('phonePreviewBlocked')

    expect(xhsPublishRow).toMatchObject({
      blockerKinds: ['external-dependency', 'unsafe-to-automate', 'mutating-platform'],
      boundary: 'platform-publish',
      status: 'unsafe-to-automate',
      requiresExternalAccount: true,
      mutatesPlatform: true,
      safeToAutomate: false,
      cannotClaim: true,
    })
    expect(xhsPublishRow?.artifactTemplate.requiredActions).toContain('published-preview')
    expect(xhsPublishRow?.artifactTemplate.requiredReadbacks).toContain('published-url')
    expect(xhsPublishRow?.nextOperatorAction).toContain('real platform preview')

    expect(zhihuPublicHostRow).toMatchObject({
      blockerKinds: ['external-dependency'],
      boundary: 'public-host',
      status: 'blocked-by-external',
      requiresExternalAccount: false,
      mutatesPlatform: false,
      safeToAutomate: false,
      cannotClaim: true,
    })
    expect(zhihuPublicHostRow?.artifactTemplate.requiredFields).toEqual(expect.arrayContaining([
      'artifactRef',
      'hostStatus',
      'collectedAt',
      'safeForCommit',
    ]))
    expect(zhihuPublicHostRow?.artifactTemplate.acceptedHostStatuses).toEqual([
      'public-https',
      'platform-hosted',
    ])
  })

  it('separates committed local actionability from catalog-blocked and external proof rows', () => {
    const report = getCommittedStyleProofLocalActionabilityReport()
    const rowKeys = report.rows.map(row => `${row.platform}:${row.requirementId}`)
    const wechatCatalogRow = report.catalogBlockedRows.find(row =>
      row.platform === 'wechat' && row.requirementId === 'catalog-source'
    )
    const zhihuArtifactRow = report.catalogBlockedRows.find(row =>
      row.platform === 'zhihu' && row.requirementId === 'zhihu-artifact-manifest'
    )

    expect(report.canClaimComplete).toBe(false)
    expect(report.status).toBe('blocked-by-external')
    expect(report.releaseGate.canClaimComplete).toBe(false)
    expect(report.externalChecklist.summary.safeToAutomateRows).toBe(0)
    expect(report.summary).toMatchObject({
      blockerCount: 4,
      safeLocalOpenRows: 11,
      actionableLocalRows: 0,
      catalogBlockedLocalRows: 11,
      externalChecklistRows: 18,
      externalChecklistGroupRows: 44,
      phoneExternalRows: 4,
      unsafeExternalRows: 13,
      mutatingExternalRows: 13,
      safeExternalRows: 0,
    })

    expect(report.actionableRows).toEqual([])
    expect(report.nextLocalActionableRow).toBeNull()
    expect(report.nextCatalogBlockedRow).toMatchObject({
      actionability: 'catalog-blocked',
      catalogBlockedOnly: true,
      safeToAutomate: true,
      boundary: 'local-only',
      issueIds: ['style-proof-manifest-requirement-missing'],
    })
    expect(report.rows.every(row => row.safeToAutomate)).toBe(true)
    expect(report.rows.every(row => row.boundary === 'local-only')).toBe(true)
    expect(report.rows.every(row => row.actionability === 'catalog-blocked')).toBe(true)
    expect(report.rows.every(row => row.missing > 0 && row.missing <= row.blockedChoiceCount)).toBe(true)
    expect(rowKeys).toEqual(expect.arrayContaining([
      'wechat:catalog-source',
      'wechat:exact-artifact',
      'wechat:no-sensitive-artifact',
      'xiaohongshu:catalog-source',
      'xiaohongshu:exact-artifact',
      'xiaohongshu:no-sensitive-artifact',
      'zhihu:exact-artifact',
      'zhihu:local-browser-rendering',
      'zhihu:unit-test-coverage',
      'zhihu:zhihu-artifact-manifest',
      'zhihu:no-sensitive-artifact',
    ]))

    expect(wechatCatalogRow).toMatchObject({
      actionability: 'catalog-blocked',
      catalogBlockedOnly: true,
      platform: 'wechat',
      requirementId: 'catalog-source',
      missing: 1,
      blockedChoiceCount: 1,
      choiceIds: ['wechat-h5-design-boundary'],
      cannotClaim: true,
    })
    expect(zhihuArtifactRow).toMatchObject({
      actionability: 'catalog-blocked',
      catalogBlockedOnly: true,
      platform: 'zhihu',
      requirementId: 'zhihu-artifact-manifest',
      requiredArtifact: expect.objectContaining({
        requirementId: 'zhihu-artifact-manifest',
        requiredFields: expect.arrayContaining(['artifactRef', 'artifactManifestValidated', 'safeForCommit']),
      }),
      cannotClaim: true,
    })
    expect(zhihuArtifactRow?.nextOperatorAction).toContain('validateZhihuImageArtifactManifest()')
  })

  it('builds committed external handoff without turning blocked proof into local automation', () => {
    const report = getCommittedStyleProofExternalHandoffReport()

    expect(report.canClaimComplete).toBe(false)
    expect(report.status).toBe('blocked-by-external')
    expect(report.canContinueLocally).toBe(false)
    expect(report.requiresOperator).toBe(true)
    expect(report.requiresPhone).toBe(true)
    expect(report.requiresExternalAccount).toBe(true)
    expect(report.requiresPublicHost).toBe(true)
    expect(report.containsUnsafeToAutomateRows).toBe(true)
    expect(report.containsMutatingPlatformRows).toBe(true)
    expect(report.externalChecklist.summary.safeToAutomateRows).toBe(0)
    expect(report.localActionability.summary.actionableLocalRows).toBe(0)
    expect(report.summary).toMatchObject({
      blockerCount: 4,
      externalHandoffRows: 18,
      externalHandoffGroups: 4,
      actionableLocalRows: 0,
      catalogBlockedLocalRows: 11,
      safeLocalOpenRows: 11,
      phoneRows: 4,
      externalAccountRows: 13,
      publicHostRows: 1,
      unsafeToAutomateRows: 13,
      mutatingRows: 13,
      safeExternalRows: 0,
    })
    expect(report.nextLocalActionableRow).toBeNull()
    expect(report.nextPhoneRow).toMatchObject({
      platform: 'wechat',
      boundary: 'phone-preview',
      requiresPhone: true,
      safeToAutomate: false,
      cannotClaim: true,
    })
    expect(report.externalChecklist.rows.some(row =>
      row.platform === 'wechat' &&
      row.requirementId === 'phone-preview-readback' &&
      row.boundary === 'phone-preview' &&
      row.requiresPhone &&
      row.cannotClaim
    )).toBe(true)
    expect(report.nextExternalAccountRow).toMatchObject({
      requiresExternalAccount: true,
      safeToAutomate: false,
      cannotClaim: true,
    })
    expect(report.nextPublicHostRow).toMatchObject({
      platform: 'zhihu',
      requirementId: 'public-image-host',
      boundary: 'public-host',
      requiresExternalAccount: false,
      safeToAutomate: false,
      cannotClaim: true,
    })
    expect(report.nextUnsafeToAutomateRow).toMatchObject({
      status: 'unsafe-to-automate',
      safeToAutomate: false,
      cannotClaim: true,
    })
    expect(report.nextMutatingPlatformRow).toMatchObject({
      mutatesPlatform: true,
      safeToAutomate: false,
      cannotClaim: true,
    })
    expect(report.recommendedNextAction).toBe(report.nextPhoneRow?.nextOperatorAction)
    expect(report.cannotAutoCompleteReason).toContain('No safe external proof rows')
    expect(report.cannotAutoCompleteReason).toContain('no direct local proof rows')
  })

  it('formats committed external handoff as a redacted operator packet', () => {
    const packet = getCommittedStyleProofExternalHandoffPacket()
    const markdown = formatCommittedStyleProofExternalHandoffPacketMarkdown(packet)
    const forbiddenFragments = [
      'C:/Users',
      'C:\\Users',
      ['.codex/tools', 'cloakbrowser'].join('/'),
      ['profiles', ''].join('/'),
      ['profile', 'Dir'].join(''),
      ['session', 'id'].join(''),
      ['access', 'Token'].join(''),
      ['refresh', 'Token'].join(''),
      ['authorization', ':'].join(''),
      ['cookie', ':'].join(''),
      ['set', 'cookie'].join('-'),
      ['.', 'har'].join(''),
      ['qr', 'code'].join(''),
      ['scan', 'qr'].join('-'),
      ['mp.weixin.qq.com', 's/'].join('/'),
      ['xhs', 'link.com'].join(''),
      ['zhihu.com', 'p/'].join('/'),
    ]

    expect(packet.canClaimComplete).toBe(false)
    expect(packet.canContinueLocally).toBe(false)
    expect(packet.requiresOperator).toBe(true)
    expect(packet.requiresPhone).toBe(true)
    expect(packet.requiresExternalAccount).toBe(true)
    expect(packet.requiresPublicHost).toBe(true)
    expect(packet.summary).toMatchObject({
      externalHandoffRows: 18,
      safeExternalRows: 0,
      phoneRows: 4,
      externalAccountRows: 13,
      publicHostRows: 1,
      unsafeToAutomateRows: 13,
      mutatingRows: 13,
    })
    expect(packet.nextRowRefs.map(ref => ref.kind)).toEqual([
      'phone-preview',
      'external-account',
      'public-host',
      'unsafe-to-automate',
      'mutating-platform',
    ])
    expect(packet.nextRowRefs.every(ref => ref.row.cannotClaim)).toBe(true)
    expect(packet.nextRowRefs.every(ref => ref.row.safeToAutomate === false)).toBe(true)
    expect(packet.nextRows).toHaveLength(3)
    expect(new Set(packet.nextRows.map(row => row.id)).size).toBe(packet.nextRows.length)
    expect(packet.nextRows.every(row => row.cannotClaim)).toBe(true)
    expect(packet.nextRows.every(row => row.safeToAutomate === false)).toBe(true)
    expect(packet.nextRows.some(row => row.requiresPhone)).toBe(true)
    expect(packet.nextRows.some(row => row.requiresExternalAccount)).toBe(true)
    expect(packet.nextRows.some(row => row.boundary === 'public-host')).toBe(true)
    expect(packet.nextRows.some(row => row.status === 'unsafe-to-automate')).toBe(true)
    expect(packet.nextRows.some(row => row.mutatesPlatform)).toBe(true)
    expect(packet.rows.every(row => row.cannotClaim)).toBe(true)
    expect(packet.rows.every(row => row.safeToAutomate === false)).toBe(true)
    expect(packet.rows.some(row =>
      row.platform === 'wechat' &&
      row.requirementId === 'phone-preview-readback' &&
      row.artifactTemplate.requiredFields.includes('phonePreviewContentVerified')
    )).toBe(true)
    expect(packet.rows.some(row =>
      row.platform === 'xiaohongshu' &&
      row.requirementId === 'published-url-or-platform-preview' &&
      row.mutatesPlatform
    )).toBe(true)
    expect(packet.rows.some(row =>
      row.platform === 'zhihu' &&
      row.requirementId === 'public-image-host' &&
      row.artifactTemplate.acceptedHostStatuses.includes('public-https')
    )).toBe(true)

    expect(markdown).toContain('# Committed Style Proof External Handoff')
    expect(markdown).toContain('Can claim complete: no')
    expect(markdown).toContain('Safe external rows: 0')
    expect(markdown).toContain('wechat / phone-preview-readback / phone-preview')
    expect(markdown).toContain('xiaohongshu / published-url-or-platform-preview / platform-publish')
    expect(markdown).toContain('zhihu / public-image-host / public-host')
    expect(markdown).toContain('phone-preview: wechat / cover-thumbnail-check / phone-preview')
    expect(markdown).toContain('external-account: wechat / pc-editor-dom-readback / authenticated-pc-editor')
    expect(markdown).toContain('unsafe-to-automate: wechat / pc-editor-dom-readback / authenticated-pc-editor')
    expect(markdown).toContain('mutating-platform: wechat / pc-editor-dom-readback / authenticated-pc-editor')
    expect(markdown).toContain('Do not claim completion from local-only checks')
    expect(markdown).toContain('Forbidden evidence fields')
    expect(formatCommittedStyleProofExternalHandoffPacketMarkdown(packet)).toBe(markdown)
    for (const fragment of forbiddenFragments) {
      expect(markdown.toLowerCase()).not.toContain(fragment.toLowerCase())
    }
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          marketAppliedContentVerified: true,
          collectedAt: freshStyleProofCollectedAt,
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

  it('rejects placeholder-only market editor readback even when the center canvas changed', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      scope: 'style-choice',
      choiceId: 'wechat-classic-inline',
      claimedEvidence: ['applied-editor-element'],
      artifacts: [
        {
          id: 'market-placeholder-only-readback',
          requirementId: 'market-applied-dom-readback',
          kind: 'editor-readback',
          label: '135 SVG free-trial placeholder changed the canvas but did not materialize content',
          evidenceLabel: 'applied-editor-element',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
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
    expect(report.issues.map(issue => issue.id)).toContain('style-proof-manifest-market-editor-placeholder-only')
    expect(requirementStatus.get('market-applied-dom-readback')).toBe('invalid')
    expect(marketAudit?.status).toBe('invalid')
    expect(marketAudit?.issueIds).toContain('style-proof-manifest-market-editor-placeholder-only')
    expect(requirementStatus.get('no-proprietary-template-source')).toBe('satisfied')
  })

  it('does not let a style proof manifest promote blocked choices', () => {
    const mobileOnly = getStyleChoiceById('wechat-mobile-only-effect')
    expect(mobileOnly).toBeDefined()
    if (!mobileOnly) return

    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-mobile-only-effect',
      claimedEvidence: ['mobile-preview', 'published'],
      artifacts: [
        {
          id: 'mobile-only-claimed-phone',
          requirementId: 'phone-preview-readback',
          kind: 'phone-readback',
          label: 'claimed phone proof cannot override runtime blocker',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-mobile-only-effect',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'phone',
          exactArtifact: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
      ],
    }
    const issues = validateStyleProofManifest(manifest)

    expect(issues.map(issue => issue.id)).toContain('style-proof-manifest-choice-blocked')
    expect(evaluateStyleChoiceAvailability(mobileOnly, ['mobile-preview', 'published']).usable).toBe(false)
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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

  it('keeps phone preview blocker flags forbidden on otherwise complete phone success rows', () => {
    const artifactFingerprint = 'sha256:redacted-phone-blocker-forbidden'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      claimedEvidence: ['mobile-preview'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'blocked-phone-body-success-row',
          requirementId: 'phone-preview-readback',
          kind: 'phone-readback',
          label: 'blocked phone body row must not become final preview proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'phone',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewBlocked: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'blocked-phone-screenshot-success-row',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'blocked screenshot row must not become final phone screenshot proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewBlocked: true,
          phonePreviewContentVerified: true,
          safeForCommit: true,
        },
        {
          id: 'blocked-dark-mode-success-row',
          requirementId: 'dark-mode-check',
          kind: 'screenshot',
          label: 'blocked dark mode row must not become mobile Dark Mode proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'dark-mode-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewBlocked: true,
          phonePreviewContentVerified: true,
          darkModeEnabledVerified: true,
          safeForCommit: true,
        },
        {
          id: 'blocked-cover-success-row',
          requirementId: 'cover-thumbnail-check',
          kind: 'screenshot',
          label: 'blocked cover row must not become cover thumbnail proof',
          evidenceLabel: 'mobile-preview',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'phone-preview',
          action: 'cover-thumbnail-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewBlocked: true,
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
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const cannotClaimIds = audit.cannotClaim.map(requirement => requirement.requirement.id)
    const runbook = getPlatformStyleProofExecutionRunbook('wechat', [manifest])
    const phonePreviewStep = runbook.steps.find(step =>
      step.requirement.id === 'phone-preview-readback'
    )

    expect(report.valid).toBe(false)
    expect(issueIds.filter(issueId =>
      issueId === 'style-proof-manifest-phone-preview-blocked',
    )).toHaveLength(4)
    expect(issueIds.filter(issueId =>
      issueId === 'style-proof-manifest-forbidden-field-present',
    )).toHaveLength(4)
    expect(issueLocations).toEqual(expect.arrayContaining([
      'phone-preview-readback',
      'phone-screenshot',
      'dark-mode-check',
      'cover-thumbnail-check',
    ]))
    expect(requirementStatus.get('phone-preview-readback')).toBe('invalid')
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(requirementStatus.get('dark-mode-check')).toBe('invalid')
    expect(requirementStatus.get('cover-thumbnail-check')).toBe('invalid')
    expect(auditStatus.get('phone-preview-readback')).toBe('invalid')
    expect(auditStatus.get('phone-screenshot')).toBe('invalid')
    expect(auditStatus.get('dark-mode-check')).toBe('invalid')
    expect(auditStatus.get('cover-thumbnail-check')).toBe('invalid')
    expect(cannotClaimIds).toEqual(expect.arrayContaining([
      'phone-preview-readback',
      'phone-screenshot',
      'dark-mode-check',
      'cover-thumbnail-check',
    ]))
    expect(phonePreviewStep?.successCriteria.join(' ')).toContain('phonePreviewBlocked:true')
    expect(phonePreviewStep?.failureSignals.join(' ')).toContain('phonePreviewBlocked:true')
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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

  it('keeps WeChat route-discovery preflight blockers out of safe disposable draft proof', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      scope: 'style-choice',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-click-reveal',
      artifacts: [
        {
          id: 'wechat-create-menu-preflight-blocker',
          requirementId: 'safe-disposable-draft',
          kind: 'browser-readback',
          label: 'draftbox create menu preflight cannot prove safe draft',
          evidenceLabel: 'authenticated-editor-reachable',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'platform-editor',
          action: 'safe-disposable-draft',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          createRouteActionMetadataMissing: true,
          cleanupTargetAmbiguous: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const preflightArtifact = report.artifacts.find(artifact =>
      artifact.artifact.id === 'wechat-create-menu-preflight-blocker'
    )
    const intake = getStyleProofManifestIntakeReport(manifest)

    expect(report.valid).toBe(false)
    expect(issueIds).toEqual(expect.arrayContaining([
      'style-proof-manifest-create-route-action-missing',
      'style-proof-manifest-cleanup-target-ambiguous',
      'style-proof-manifest-disposable-draft-missing',
      'style-proof-manifest-cleanup-path-missing',
    ]))
    expect(requirementStatus.get('safe-disposable-draft')).toBe('invalid')
    expect(preflightArtifact?.status).toBe('invalid')
    expect(intake.summary.schemaWarningCount).toBe(0)
    expect(intake.summary.semanticIssueCount).toBeGreaterThan(0)
    expect(intake.acceptanceAudit.platformReports.wechat.cannotClaim.map(requirement =>
      requirement.requirement.id
    )).toContain('safe-disposable-draft')
  })

  it('keeps WeChat save-draft no-card blockers out of safe disposable draft proof', () => {
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      scope: 'style-choice',
      claimedEvidence: ['pc-editor-paste'],
      artifactFingerprint: 'sha256:redacted-click-reveal',
      artifacts: [
        {
          id: 'wechat-save-draft-no-card-blocker',
          requirementId: 'safe-disposable-draft',
          kind: 'browser-readback',
          label: 'save draft no-card preflight cannot prove safe draft',
          evidenceLabel: 'authenticated-editor-reachable',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'platform-editor',
          action: 'safe-disposable-draft',
          readback: 'dom',
          artifactFingerprint: 'sha256:redacted-click-reveal',
          saveDraftNoCard: true,
          safeForCommit: true,
        },
      ],
    }

    const report = getStyleProofManifestReport(manifest)
    const issueIds = report.issues.map(issue => issue.id)
    const requirementStatus = new Map(
      report.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const noCardArtifact = report.artifacts.find(artifact =>
      artifact.artifact.id === 'wechat-save-draft-no-card-blocker'
    )
    const intake = getStyleProofManifestIntakeReport(manifest)

    expect(report.valid).toBe(false)
    expect(issueIds).toEqual(expect.arrayContaining([
      'style-proof-manifest-save-draft-no-card',
      'style-proof-manifest-disposable-draft-missing',
      'style-proof-manifest-cleanup-path-missing',
    ]))
    expect(requirementStatus.get('safe-disposable-draft')).toBe('invalid')
    expect(noCardArtifact?.status).toBe('invalid')
    expect(intake.summary.schemaWarningCount).toBe(0)
    expect(intake.summary.semanticIssueCount).toBeGreaterThan(0)
    expect(intake.acceptanceAudit.platformReports.wechat.cannotClaim.map(requirement =>
      requirement.requirement.id
    )).toContain('safe-disposable-draft')
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

  it('requires fresh collectedAt timestamps for external proof rows', () => {
    const artifactFingerprint = 'sha256:redacted-external-proof-freshness'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-classic-inline',
      scope: 'style-choice',
      claimedEvidence: ['mobile-preview'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'freshness-local-exact-artifact',
          requirementId: 'exact-artifact',
          kind: 'doc-reference',
          label: 'redacted exact local artifact binding',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'local-artifact',
          action: 'source-hygiene-review',
          readback: 'hygiene-log',
          artifactFingerprint,
          exactArtifact: true,
          safeForCommit: true,
        },
        {
          id: 'freshness-phone-body-without-collected-at',
          requirementId: 'phone-preview-readback',
          kind: 'phone-readback',
          label: 'phone body proof missing collectedAt',
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
          id: 'freshness-phone-screenshot-future-collected-at',
          requirementId: 'phone-screenshot',
          kind: 'screenshot',
          label: 'phone screenshot proof with future collectedAt',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'phone-preview',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewContentVerified: true,
          collectedAt: createFutureStyleProofCollectedAt(),
          safeForCommit: true,
        },
        {
          id: 'freshness-dark-mode-stale-collected-at',
          requirementId: 'dark-mode-check',
          kind: 'screenshot',
          label: 'dark mode proof with stale collectedAt',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'dark-mode-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          phonePreviewContentVerified: true,
          darkModeEnabledVerified: true,
          collectedAt: createStaleStyleProofCollectedAt(),
          safeForCommit: true,
        },
        {
          id: 'freshness-cover-thumbnail-fresh-collected-at',
          requirementId: 'cover-thumbnail-check',
          kind: 'screenshot',
          label: 'cover thumbnail proof with fresh collectedAt',
          platform: 'wechat',
          choiceId: 'wechat-classic-inline',
          channel: 'phone-preview',
          action: 'cover-thumbnail-check',
          readback: 'screenshot',
          artifactFingerprint,
          exactArtifact: true,
          coverThumbnailAccepted: true,
          collectedAt: freshStyleProofCollectedAt,
          safeForCommit: true,
        },
        {
          id: 'freshness-sensitive-hygiene',
          requirementId: 'no-sensitive-artifact',
          kind: 'hygiene-review',
          label: 'redacted sensitive hygiene proof',
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
    const runbook = getPlatformStyleProofExecutionRunbook('wechat', [manifest])
    const phoneStep = runbook.steps.find(step => step.requirement.id === 'phone-preview-readback')
    const phoneScreenshotStep = runbook.steps.find(step => step.requirement.id === 'phone-screenshot')
    const darkModeStep = runbook.steps.find(step => step.requirement.id === 'dark-mode-check')
    const coverStep = runbook.steps.find(step => step.requirement.id === 'cover-thumbnail-check')
    const exactArtifactStep = runbook.steps.find(step => step.requirement.id === 'exact-artifact')

    expect(issueIds).toEqual(expect.arrayContaining([
      'style-proof-manifest-collected-at-missing',
      'style-proof-manifest-collected-at-invalid',
      'style-proof-manifest-proof-stale',
    ]))
    expect(requirementStatus.get('phone-preview-readback')).toBe('invalid')
    expect(requirementStatus.get('phone-screenshot')).toBe('invalid')
    expect(requirementStatus.get('dark-mode-check')).toBe('invalid')
    expect(requirementStatus.get('cover-thumbnail-check')).toBe('satisfied')
    expect(auditStatus.get('phone-preview-readback')).toBe('invalid')
    expect(auditStatus.get('phone-screenshot')).toBe('invalid')
    expect(auditStatus.get('dark-mode-check')).toBe('invalid')
    expect(audit.cannotClaim.map(requirement => requirement.requirement.id)).toEqual(expect.arrayContaining([
      'phone-preview-readback',
      'phone-screenshot',
      'dark-mode-check',
    ]))
    expect(phoneStep?.requiresFreshCollectedAt).toBe(true)
    expect(phoneStep?.freshnessMaxDays).toBe(14)
    expect(phoneStep?.freshnessIssueIds).toEqual(['style-proof-manifest-collected-at-missing'])
    expect(phoneStep?.cannotClaimReason).toContain('lacks collectedAt')
    expect(phoneStep?.nextOperatorAction).toContain('Recapture')
    expect(phoneStep?.nextOperatorAction).toContain('within 14 days')
    expect(phoneStep?.successCriteria.join(' ')).toContain('collection time')
    expect(phoneStep?.failureSignals.join(' ')).toContain('timestamp-free')
    expect(phoneScreenshotStep?.freshnessIssueIds).toEqual(['style-proof-manifest-collected-at-invalid'])
    expect(phoneScreenshotStep?.cannotClaimReason).toContain('future-dated')
    expect(darkModeStep?.freshnessIssueIds).toEqual(['style-proof-manifest-proof-stale'])
    expect(darkModeStep?.cannotClaimReason).toContain('freshness window')
    expect(coverStep?.status).toBe('blocked-by-external')
    expect(coverStep?.requiresFreshCollectedAt).toBe(true)
    expect(coverStep?.freshnessIssueIds).toEqual([])
    expect(exactArtifactStep?.requiresFreshCollectedAt).toBe(false)
    expect(exactArtifactStep?.freshnessMaxDays).toBeNull()
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
          collectedAt: freshStyleProofCollectedAt,
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
      choiceId: 'zhihu-diagram-article',
      scope: 'style-choice',
      claimedEvidence: ['unit-tested'],
      artifacts: [
        {
          id: 'zhihu-diagram-unit-log',
          requirementId: 'unit-test-coverage',
          kind: 'test-log',
          label: 'diagram fallback unit proof',
          evidenceLabel: 'unit-tested',
          platform: 'zhihu',
          choiceId: 'zhihu-diagram-article',
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

  it('keeps external account blockers forbidden on otherwise complete credentialed and publish rows', () => {
    const artifactFingerprint = 'sha256:redacted-external-blocker-forbidden'
    const manifest: StyleProofManifest = {
      platform: 'wechat',
      choiceId: 'wechat-click-reveal',
      scope: 'style-choice',
      claimedEvidence: ['credentialed-sync', 'published'],
      artifactFingerprint,
      artifacts: [
        {
          id: 'blocked-credentialed-response-success-row',
          requirementId: 'credentialed-channel-response',
          kind: 'channel-response',
          label: 'blocked credentialed response must not become sync proof',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'credentialed-channel',
          action: 'credentialed-sync',
          readback: 'api-response',
          artifactFingerprint,
          exactArtifact: true,
          externalAccountAuthenticated: true,
          externalAccountLoginBlocked: true,
          safeForCommit: true,
        },
        {
          id: 'blocked-sync-readback-success-row',
          requirementId: 'sync-readback',
          kind: 'editor-readback',
          label: 'blocked sync readback must not become artifact sync proof',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'credentialed-channel',
          action: 'sync-readback',
          readback: 'visual-and-dom',
          artifactFingerprint,
          exactArtifact: true,
          externalAccountAuthenticated: true,
          externalAccountLoginBlocked: true,
          safeForCommit: true,
        },
        {
          id: 'blocked-scheduled-send-success-row',
          requirementId: 'scheduled-send-readback',
          kind: 'channel-response',
          label: 'blocked scheduled-send row must not become send-state proof',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'credentialed-channel',
          action: 'scheduled-send',
          readback: 'scheduled-send-state',
          artifactFingerprint,
          exactArtifact: true,
          externalAccountAuthenticated: true,
          externalAccountLoginBlocked: true,
          scheduledSendVerified: true,
          safeForCommit: true,
        },
        {
          id: 'blocked-published-preview-success-row',
          requirementId: 'published-url-or-platform-preview',
          kind: 'published-preview',
          label: 'blocked platform preview must not become published proof',
          platform: 'wechat',
          choiceId: 'wechat-click-reveal',
          channel: 'public-web',
          action: 'published-preview',
          readback: 'published-url',
          artifactFingerprint,
          exactArtifact: true,
          externalAccountAuthenticated: true,
          externalAccountLoginBlocked: true,
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
    const auditStatus = new Map(
      audit.requirements.map(requirement => [requirement.requirement.id, requirement.status]),
    )
    const cannotClaimIds = audit.cannotClaim.map(requirement => requirement.requirement.id)
    const runbook = getPlatformStyleProofExecutionRunbook('wechat', [manifest])
    const publishStep = runbook.steps.find(step =>
      step.requirement.id === 'published-url-or-platform-preview'
    )

    expect(report.valid).toBe(false)
    expect(issueIds.filter(issueId =>
      issueId === 'style-proof-manifest-external-account-login-blocked',
    )).toHaveLength(4)
    expect(issueIds.filter(issueId =>
      issueId === 'style-proof-manifest-forbidden-field-present',
    )).toHaveLength(4)
    expect(issueLocations).toEqual(expect.arrayContaining([
      'credentialed-channel-response',
      'sync-readback',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
    expect(requirementStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(requirementStatus.get('sync-readback')).toBe('invalid')
    expect(requirementStatus.get('scheduled-send-readback')).toBe('invalid')
    expect(requirementStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(auditStatus.get('credentialed-channel-response')).toBe('invalid')
    expect(auditStatus.get('sync-readback')).toBe('invalid')
    expect(auditStatus.get('scheduled-send-readback')).toBe('invalid')
    expect(auditStatus.get('published-url-or-platform-preview')).toBe('invalid')
    expect(cannotClaimIds).toEqual(expect.arrayContaining([
      'credentialed-channel-response',
      'sync-readback',
      'scheduled-send-readback',
      'published-url-or-platform-preview',
    ]))
    expect(publishStep?.successCriteria.join(' ')).toContain('externalAccountLoginBlocked:true')
    expect(publishStep?.failureSignals.join(' ')).toContain('externalAccountLoginBlocked:true')
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
      choiceId: 'zhihu-diagram-article',
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
          choiceId: 'zhihu-diagram-article',
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
          choiceId: 'zhihu-diagram-article',
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
          choiceId: 'zhihu-diagram-article',
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
      choiceId: 'zhihu-diagram-article',
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
          choiceId: 'zhihu-diagram-article',
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
      choiceId: 'zhihu-diagram-article',
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
          choiceId: 'zhihu-diagram-article',
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
    const mobileOnly = getStyleChoiceById('wechat-mobile-only-effect')
    const clickReveal = getStyleChoiceById('wechat-click-reveal')
    const officialWidget = getStyleChoiceById('wechat-official-widget-checklist')
    expect(mobileOnly).toBeDefined()
    expect(clickReveal).toBeDefined()
    expect(officialWidget).toBeDefined()

    if (!mobileOnly || !clickReveal || !officialWidget) return

    const mobileOnlyAvailability = evaluateStyleChoiceAvailability(mobileOnly, ['mobile-preview'])
    expect(mobileOnlyAvailability.usable).toBe(false)
    expect(mobileOnlyAvailability.status).toBe('blocked')

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

  it('keeps unproven market-inspired SVG and rich-layout fallback choices blocked until exact artifact proof exists', () => {
    const blockedMarketFallbackIds = [
      'wechat-market-svg-h5-fallback-matrix',
      'zhihu-market-rich-layout-fallback',
    ] as const

    for (const choiceId of blockedMarketFallbackIds) {
      const choice = getStyleChoiceById(choiceId)
      expect(choice).toBeDefined()
      if (!choice) continue

      const marketResidueBlockerByPlatform = {
        wechat: 'wechat-market-editor-residue',
        xiaohongshu: 'xhs-market-editor-residue',
        zhihu: 'zhihu-market-editor-residue',
      } as const
      const availability = evaluateStyleChoiceAvailability(choice, getDefaultStyleEvidence(choice.platform))
      const requirementIds = getStyleChoiceProofRequirements(choice).map(requirement => requirement.id)

      expect(choice.status, choiceId).toBe('blocked')
      expect(availability.usable, choiceId).toBe(false)
      expect(availability.status, choiceId).toBe('blocked')
      expect(getStyleChoiceApplication(choiceId), choiceId).toBeNull()
      expect(choice.detectorBlockers, choiceId).toContain(marketResidueBlockerByPlatform[choice.platform])

      if (choice.platform === 'wechat') {
        expect(choice.evidenceFloor).toBe('mobile-preview')
        expect(choice.motion).toBe('mobile-only')
        expect(choice.contentBlocks).toEqual(expect.arrayContaining([
          'background SVG shell',
          'click show/hide',
          'click switch',
          'slide trigger',
          'card/title/divider/cover structures',
          'text marquee',
          'quiz/game',
          'image-slot manifest',
          'trigger-zone manifest',
          'external H5 handoff boundary',
        ]))
        expect(choice.blockers).toEqual(expect.arrayContaining([
          '135 background SVG shells require layout reports, typed image slots, normalized trigger zones, and static/raster fallback before any export claim',
          'Xiumi SVG/title/card samples are authoring wrappers or image/layer/action trees; center inline-SVG absence cannot become WeChat SVG proof',
          'external H5 pages, vendor H5 packages, and plugin/sync handoffs stay publish-checklist states until the exact InkForge artifact has platform preview or publish proof',
        ]))
        expect(choice.detectorBlockers).toEqual(expect.arrayContaining([
          'wechat-line-height-zero',
          'wechat-class-id-dependency',
          'wechat-layout-report-required',
        ]))
        expect(requirementIds).toEqual(expect.arrayContaining([
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ]))
      }

      if (choice.platform === 'zhihu') {
        expect(choice.primaryOutput).toBe('image-fallback')
        expect(requirementIds).toEqual(expect.arrayContaining([
          'local-browser-rendering',
          'public-image-host',
          'zhihu-artifact-manifest',
          'published-url-or-platform-preview',
        ]))
        expect(requirementIds).not.toContain('xhs-artifact-manifest')
      }
    }

    const xhsMarketFallback = getStyleChoiceById('xhs-market-rich-card-fallback')
    expect(xhsMarketFallback).toBeDefined()
    if (!xhsMarketFallback) return

    const xhsMarketAvailability = evaluateStyleChoiceAvailability(
      xhsMarketFallback,
      getDefaultStyleEvidence('xiaohongshu'),
    )
    const xhsMarketRequirementIds = getStyleChoiceProofRequirements(xhsMarketFallback)
      .map(requirement => requirement.id)

    expect(xhsMarketFallback.status).toBe('available')
    expect(xhsMarketAvailability.usable).toBe(true)
    expect(xhsMarketAvailability.status).toBe('available')
    expect(getStyleChoiceApplication('xhs-market-rich-card-fallback')?.presetId).toBe('xhs-nature')
    expect(xhsMarketFallback.detectorBlockers).toContain('xhs-market-editor-residue')
    expect(xhsMarketFallback.primaryOutput).toBe('image-page')
    expect(xhsMarketRequirementIds).toEqual(expect.arrayContaining([
      'local-browser-rendering',
      'xhs-artifact-manifest',
      'published-url-or-platform-preview',
    ]))
    expect(xhsMarketRequirementIds).not.toContain('phone-preview-readback')
  })

  it('exposes market-derived capability metadata without promoting platform proof', () => {
    const wechatReport = getPlatformStyleMarketCapabilityReport('wechat')
    const wechatMatrix = wechatReport.choices.find(entry =>
      entry.choice.id === 'wechat-market-svg-h5-fallback-matrix'
    )

    expect(wechatMatrix).toBeDefined()
    if (!wechatMatrix) return

    const capabilityFamilies = wechatMatrix.capabilities.map(capability => capability.family)
    expect(capabilityFamilies).toEqual(expect.arrayContaining([
      'background-svg-shell',
      'image-carousel',
      'click-expand',
      'click-switch',
      'path-animation',
      'parallax-motion',
      'long-press-switch',
      'region-trigger',
      'ratio-image-layer',
      'h5-handoff',
      'static-raster-fallback',
    ]))
    expect(wechatReport.stats.choicesWithCapabilities).toBeGreaterThanOrEqual(1)
    expect(wechatReport.stats.blockedUntilProof).toBeGreaterThanOrEqual(1)

    const carousel = wechatMatrix.capabilities.find(capability => capability.family === 'image-carousel')
    expect(carousel).toBeDefined()
    expect(carousel?.sources).toEqual(expect.arrayContaining(['135-svg-editor', 'xiumi-v5-paper']))
    expect(carousel?.triggerMode).toBe('slide')
    expect(carousel?.imageRatio).toBe('1080x720')
    expect(carousel?.status).toBe('blocked-until-proof')
    expect(carousel?.requiredProof).toEqual(expect.arrayContaining([
      'market-applied-dom-readback',
      'phone-preview-readback',
      'phone-screenshot',
      'published-url-or-platform-preview',
    ]))

    const ratioLayer = wechatMatrix.capabilities.find(capability => capability.family === 'ratio-image-layer')
    expect(ratioLayer).toBeDefined()
    expect(ratioLayer?.sources).toContain('xiumi-v5-paper')
    expect(ratioLayer?.renderPattern).toBe('component-tree')
    expect(ratioLayer?.status).toBe('fallback-only')
    expect(ratioLayer?.degradable).toBe(true)

    const choice = getStyleChoiceById('wechat-market-svg-h5-fallback-matrix')
    expect(choice).toBeDefined()
    if (!choice) return

    const availability = evaluateStyleChoiceAvailability(choice, getDefaultStyleEvidence('wechat'))
    expect(availability.usable).toBe(false)
    expect(getStyleChoiceApplication(choice.id)).toBeNull()
    expect(getStyleChoiceMarketCapabilities(choice.id).length).toBe(wechatMatrix.capabilities.length)
    expect(getStyleChoiceMarketCapabilities('wechat-classic-inline')).toEqual([])

    const xhsMarket = getPlatformStyleMarketCapabilityReport('xiaohongshu')
      .choices.find(entry => entry.choice.id === 'xhs-market-rich-card-fallback')
    expect(xhsMarket?.capabilities.map(capability => capability.family)).toEqual(expect.arrayContaining([
      'image-carousel',
      'title-card-layout',
      'static-raster-fallback',
    ]))
    expect(xhsMarket?.capabilities.every(capability => capability.status !== 'blocked-until-proof')).toBe(true)

    const zhihuMarket = getPlatformStyleMarketCapabilityReport('zhihu')
      .choices.find(entry => entry.choice.id === 'zhihu-market-rich-layout-fallback')
    const publicImageFallback = zhihuMarket?.capabilities.find(capability =>
      capability.family === 'public-image-fallback'
    )
    expect(publicImageFallback).toBeDefined()
    expect(publicImageFallback?.requiredProof).toEqual(expect.arrayContaining([
      'public-image-host',
      'zhihu-artifact-manifest',
      'published-url-or-platform-preview',
    ]))
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
    const xhsDataCard = getStyleChoiceById('xhs-data-card')
    const xhsLongReport = getStyleChoiceById('xhs-long-report')
    const xhsMarketFallback = getStyleChoiceById('xhs-market-rich-card-fallback')
    const zhihuTable = getStyleChoiceById('zhihu-data-table')
    expect(kiln).toBeDefined()
    expect(kilnPasteSafe).toBeDefined()
    expect(amber).toBeDefined()
    expect(toolbarMap).toBeDefined()
    expect(xhsCarousel).toBeDefined()
    expect(xhsClean).toBeDefined()
    expect(xhsDataCard).toBeDefined()
    expect(xhsLongReport).toBeDefined()
    expect(xhsMarketFallback).toBeDefined()
    expect(zhihuTable).toBeDefined()

    if (
      !kiln || !kilnPasteSafe || !amber || !toolbarMap || !xhsCarousel || !xhsClean
      || !xhsDataCard || !xhsLongReport || !xhsMarketFallback || !zhihuTable
    ) return

    expect(getStyleChoiceApplication('wechat-flagship-kiln')?.presetId).toBe('flagship-kiln')
    expect(getStyleChoiceApplication('wechat-flagship-kiln-paste-safe')?.presetId).toBe('flagship-kiln-paste-safe')
    expect(evaluateStyleChoiceApplication(kiln, ['local-browser']).selectable).toBe(true)
    expect(evaluateStyleChoiceApplication(kilnPasteSafe, ['local-browser']).selectable).toBe(true)

    const amberApplication = evaluateStyleChoiceApplication(amber, ['pc-editor-paste', 'mobile-preview'])
    expect(amberApplication.application?.presetId).toBe('flagship-amber')
    expect(amberApplication.selectable).toBe(true)

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
    expect(evaluateStyleChoiceApplication(xhsDataCard, ['local-browser']).application?.presetId).toBe('xhs-tech')
    expect(evaluateStyleChoiceApplication(xhsDataCard, ['local-browser']).selectable).toBe(true)
    expect(evaluateStyleChoiceApplication(xhsLongReport, ['local-browser']).application?.presetId).toBe('xhs-simple')
    expect(evaluateStyleChoiceApplication(xhsLongReport, ['local-browser']).selectable).toBe(true)
    expect(evaluateStyleChoiceApplication(xhsMarketFallback, ['local-browser']).application?.presetId).toBe('xhs-nature')
    expect(evaluateStyleChoiceApplication(xhsMarketFallback, ['local-browser']).selectable).toBe(true)
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
    expect(xhsReport.choices.find(choice => choice.choice.id === 'xhs-data-card')?.usable).toBe(true)
    expect(xhsReport.choices.find(choice => choice.choice.id === 'xhs-long-report')?.usable).toBe(true)
    expect(xhsReport.choices.find(choice => choice.choice.id === 'xhs-market-rich-card-fallback')?.usable).toBe(true)
    expect(xhsReport.choices.find(choice => choice.choice.id === 'xhs-h5-design-import-boundary')?.usable).toBe(false)
    expect(xhsReport.stats).toMatchObject({
      total: 8,
      usable: 7,
      blocked: 0,
      unavailable: 1,
    })

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
    expect(xhsApplications.find(item => item.availability.choice.id === 'xhs-data-card')?.selectable).toBe(true)
    expect(xhsApplications.find(item => item.availability.choice.id === 'xhs-long-report')?.selectable).toBe(true)
    expect(xhsApplications.find(item =>
      item.availability.choice.id === 'xhs-market-rich-card-fallback'
    )?.selectable).toBe(true)
    expect(xhsApplications.find(item => item.availability.choice.id === 'xhs-data-card')?.application?.presetId)
      .toBe('xhs-tech')
    expect(xhsApplications.find(item => item.availability.choice.id === 'xhs-long-report')?.application?.presetId)
      .toBe('xhs-simple')
    expect(xhsApplications.find(item =>
      item.availability.choice.id === 'xhs-market-rich-card-fallback'
    )?.application?.presetId).toBe('xhs-nature')

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

  it('blocks 135 SVG trigger hot-area overlay residue without relying on canvas ids', () => {
    const wechat = detectQuality(MARKET_EDITOR_135_SVG_TRIGGER_OVERLAY_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_135_SVG_TRIGGER_OVERLAY_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_135_SVG_TRIGGER_OVERLAY_RESIDUE_HTML, 'zhihu')

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

  it('blocks 135 SVG editor shell wrappers from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_135_SVG_SHELL_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_135_SVG_SHELL_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_135_SVG_SHELL_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 SVG editor shell residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('135 SVG editor shell residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('135 SVG editor shell residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks 135 SVG editor layout controls from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_135_SVG_LAYOUT_CONTROL_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_135_SVG_LAYOUT_CONTROL_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_135_SVG_LAYOUT_CONTROL_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 SVG editor layout control residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('135 SVG editor layout control residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('135 SVG editor layout control residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks 135 SVG material and expanded-content parameter panels from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_135_SVG_MATERIAL_PANEL_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_135_SVG_MATERIAL_PANEL_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_135_SVG_MATERIAL_PANEL_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 SVG material panel residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('135 SVG material panel residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('135 SVG material panel residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks 135 background-only SVG compatibility risks without vendor residue markers', () => {
    const wechat = detectQuality(MARKET_EDITOR_135_BACKGROUND_ONLY_SVG_RISK_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_135_BACKGROUND_ONLY_SVG_RISK_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_135_BACKGROUND_ONLY_SVG_RISK_HTML, 'zhihu')
    const wechatIds = wechat.issues.map(issue => issue.id)
    const xhsIds = xhs.issues.map(issue => issue.id)
    const zhihuIds = zhihu.issues.map(issue => issue.id)

    expect(wechatIds).toContain('wechat-line-height-zero')
    expect(wechatIds).toContain('wechat-layout-report-required')
    expect(wechat.issues.find(issue => issue.id === 'wechat-layout-report-required')?.message)
      .toContain('negative overlap spacing')
    expect(wechat.issues.find(issue => issue.id === 'wechat-layout-report-required')?.message)
      .toContain('invisible or custom hit area')
    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 SVG background-size shell marker')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('135 SVG background-size shell marker')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('135 SVG background-size shell marker')
    expect(xhsIds).toContain('xhs-html-tags')
    expect(xhsIds).toContain('xhs-wechat-decoration-leak')
    expect(zhihuIds).toContain('zhihu-inline-svg')
    expect(zhihuIds).toContain('zhihu-html-tags')
    expect(zhihuIds).toContain('zhihu-inline-style')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks 135 SVG background style markers copied from the live free-trial editor', () => {
    const wechat = detectQuality(MARKET_EDITOR_135_SVG_BACKGROUND_STYLE_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_135_SVG_BACKGROUND_STYLE_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_135_SVG_BACKGROUND_STYLE_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('135 SVG background style marker')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('135 SVG background style marker')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('135 SVG background style marker')
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

  it('blocks Xiumi flow-canvas animation wrapper classes after runtime cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_FLOW_CANVAS_ANIMATION_WRAPPER_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_FLOW_CANVAS_ANIMATION_WRAPPER_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_FLOW_CANVAS_ANIMATION_WRAPPER_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi flow-canvas animation wrapper residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi flow-canvas animation wrapper residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi flow-canvas animation wrapper residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi SVG layer slot and raw-image residues without broad tn wrappers', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_LAYER_SLOT_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_LAYER_SLOT_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_LAYER_SLOT_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi SVG layer slot residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi SVG layer slot residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi SVG layer slot residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi raw image cells after layer cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_RAW_IMAGE_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_RAW_IMAGE_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_RAW_IMAGE_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi raw image cell residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi raw image cell residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi raw image cell residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi image-presenter classes after layer cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_IMAGE_PRESENTER_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_IMAGE_PRESENTER_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_IMAGE_PRESENTER_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi image presenter residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi image presenter residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi image presenter residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi image instance wrappers after gallery cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_IMAGE_INSTANCE_WRAPPER_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_IMAGE_INSTANCE_WRAPPER_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_IMAGE_INSTANCE_WRAPPER_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi image instance wrapper residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi image instance wrapper residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi image instance wrapper residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi overflow-hidden state wrappers after gallery cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_OVERFLOW_HIDDEN_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_OVERFLOW_HIDDEN_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_OVERFLOW_HIDDEN_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi overflow-hidden state residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi overflow-hidden state residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi overflow-hidden state residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi page vessel wrappers after gallery cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_PAGE_VESSEL_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_PAGE_VESSEL_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_PAGE_VESSEL_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi page vessel residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi page vessel residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi page vessel residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi group sortable boxes after gallery cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_GROUP_SORTABLE_BOX_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_GROUP_SORTABLE_BOX_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_GROUP_SORTABLE_BOX_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi group sortable box residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi group sortable box residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi group sortable box residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi SVG gallery state wrappers from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_STATE_WRAPPER_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_STATE_WRAPPER_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_STATE_WRAPPER_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi SVG gallery state wrapper residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi SVG gallery state wrapper residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi SVG gallery state wrapper residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi content-overlap state after wrapper cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_CONTENT_OVERLAP_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_CONTENT_OVERLAP_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_CONTENT_OVERLAP_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi content-overlap state residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi content-overlap state residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi content-overlap state residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi component binding attributes from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_COMPONENT_BINDING_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_COMPONENT_BINDING_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_COMPONENT_BINDING_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi component binding attribute residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi component binding attribute residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi component binding attribute residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi template renderer pipeline residues from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_TEMPLATE_RENDERER_PIPELINE_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_TEMPLATE_RENDERER_PIPELINE_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_TEMPLATE_RENDERER_PIPELINE_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi template renderer pipeline residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi template renderer pipeline residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi template renderer pipeline residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi visible template card section trees from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_VISIBLE_CARD_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_VISIBLE_CARD_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_VISIBLE_CARD_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi tn-* authoring tree')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi tn-* authoring tree')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi tn-* authoring tree')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi paper document root classes after component cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_PAPER_DOCUMENT_ROOT_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_PAPER_DOCUMENT_ROOT_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_PAPER_DOCUMENT_ROOT_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi paper document root residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi paper document root residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi paper document root residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi text cell classes after editable-cell cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_TEXT_CELL_CLASS_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_TEXT_CELL_CLASS_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_TEXT_CELL_CLASS_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi text cell class residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi text cell class residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi text cell class residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi UI slider controls after authoring wrapper cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_UI_SLIDER_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_UI_SLIDER_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_UI_SLIDER_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi UI slider control residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi UI slider control residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi UI slider control residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi sortable controls after Angular class cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_UI_SORTABLE_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_UI_SORTABLE_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_UI_SORTABLE_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi sortable control residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi sortable control residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi sortable control residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi interaction style residues after class cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_INTERACTION_STYLE_RESIDUE_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_INTERACTION_STYLE_RESIDUE_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_INTERACTION_STYLE_RESIDUE_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi interaction style residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi interaction style residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi interaction style residue')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi applied SVG foreignObject and SMIL rows from publishable outputs', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_APPLIED_SVG_FOREIGN_OBJECT_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_APPLIED_SVG_FOREIGN_OBJECT_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_APPLIED_SVG_FOREIGN_OBJECT_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi tn-* authoring tree')
    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('market editor hosted background source')
    expect(wechat.issues.find(issue => issue.id === 'wechat-unsafe-svg-construct')?.message)
      .toContain('foreignObject')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi tn-* authoring tree')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi tn-* authoring tree')
    expect(wechat.passed).toBe(false)
    expect(xhs.passed).toBe(false)
    expect(zhihu.passed).toBe(false)
  })

  it('blocks Xiumi applied SVG content-layer classes after wrapper cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_APPLIED_SVG_CONTENT_LAYER_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_APPLIED_SVG_CONTENT_LAYER_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_APPLIED_SVG_CONTENT_LAYER_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi applied SVG content layer')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi applied SVG content layer')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi applied SVG content layer')
    expect(wechat.issues.find(issue => issue.id === 'wechat-unsafe-svg-construct')?.message)
      .toContain('foreignObject')
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

  it('blocks Xiumi operation panel loader classes after Angular cleanup', () => {
    const wechat = detectQuality(MARKET_EDITOR_XIUMI_OPERATION_PANEL_LOADER_HTML, 'wechat')
    const xhs = detectQuality(MARKET_EDITOR_XIUMI_OPERATION_PANEL_LOADER_HTML, 'xiaohongshu')
    const zhihu = detectQuality(MARKET_EDITOR_XIUMI_OPERATION_PANEL_LOADER_HTML, 'zhihu')

    expect(wechat.issues.find(issue => issue.id === 'wechat-market-editor-residue')?.message)
      .toContain('Xiumi operation panel loader residue')
    expect(xhs.issues.find(issue => issue.id === 'xhs-market-editor-residue')?.message)
      .toContain('Xiumi operation panel loader residue')
    expect(zhihu.issues.find(issue => issue.id === 'zhihu-market-editor-residue')?.message)
      .toContain('Xiumi operation panel loader residue')
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

  it('converts Zhihu academic LaTeX source into equation-image Markdown without raw formula fences', () => {
    const result = markdownToZhihuClean(ZHIHU_ACADEMIC_LATEX_MARKDOWN)

    expect(result.latexCount).toBe(2)
    expect(result.latexBlocksConverted).toBe(1)
    expect(result.cleanedHtmlTags).toEqual([])
    expect(result.markdown).toContain('https://www.zhihu.com/equation?tex=E%3Dmc%5E2')
    expect(result.markdown).toContain('https://www.zhihu.com/equation?tex=a%5E2%2Bb%5E2%3Dc%5E2')
    expect(result.markdown).toContain('```ts')
    expect(result.markdown).toContain('[^note]: 本地 artifact 只证明 clean Markdown 输出，不证明知乎平台预览或发布。')
    expect(result.markdown).not.toContain('$$E=mc^2$$')
    expect(result.markdown).not.toContain('$a^2+b^2=c^2$')
  })

  it('strips WeChat decorative residue when adapting a WeChat-style article to Zhihu clean Markdown', () => {
    const result = markdownToZhihuClean(ZHIHU_WECHAT_ADAPTED_MARKDOWN)

    expect(result.cleanedHtmlTags).toEqual(['section', 'svg', 'path', 'span'])
    expect(result.markdown).toContain('迁移标题')
    expect(result.markdown).toContain('这段旧 HTML 应被清理为文本。')
    expect(result.markdown).not.toMatch(/data-ink-|<svg|<section|<span|style=|class=/i)
    expect(detectQuality(result.markdown, 'zhihu').passed).toBe(true)
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
