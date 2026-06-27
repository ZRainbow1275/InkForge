/**
 * 三平台质量检测器
 *
 * 在导出前自动检测内容是否符合目标平台的要求，
 * 返回结构化的质量报告，帮助用户优化内容。
 *
 * 参考：
 * - docs/platform-rendering-rules/wechat-rules.md
 * - docs/platform-rendering-rules/xiaohongshu-rules.md
 * - docs/platform-rendering-rules/zhihu-rules.md
 */

import { SUPPORTED_CODE_LANGUAGES } from '@/extensions/codeLanguages'
import type {
  XhsImageArtifactManifest,
  XhsImageArtifactPage,
  ZhihuImageArtifact,
  ZhihuImageArtifactManifest,
} from './image-pipeline/types'
import type { Platform, QualityReport, QualityIssue, QualityIssueSeverity } from './types'

const XHS_IMAGE_PAGE_COUNT_LIMIT = 18
const XHS_IMAGE_COUNT_REVIEW_THRESHOLD = XHS_IMAGE_PAGE_COUNT_LIMIT
const XHS_IMAGE_ARTIFACT_MAX_BYTES = 20 * 1024 * 1024
const XHS_HASHTAG_REVIEW_LIMIT = 10
const XHS_LIST_ITEM_REVIEW_LIMIT = 7
const XHS_LONG_LINE_REVIEW_LIMIT = 120
const XHS_ALLOWED_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png'])
const XHS_ALLOWED_IMAGE_RATIOS = new Set(['3:4', '1:1'])
const ZHIHU_ALLOWED_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png', 'gif'])
const ZHIHU_SEMANTIC_IMAGE_ALT_PATTERN = /(?:公式|方程|图表|流程|架构|表格|数据|统计|截图|示意|diagram|chart|graph|mermaid|plantuml|vega|equation|formula|table|architecture|flow)/i
const DIAGRAM_FENCE_LANGUAGES = new Set([
  'mermaid',
  'graphviz',
  'dot',
  'plantuml',
  'puml',
  'vega',
  'vega-lite',
  'vegalite',
])
const MARKET_EDITOR_RESIDUE_RULES = [
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*(?:_135editor|135brush|135bg)[^"']*["']/i,
    label: '135 class/id authoring residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bdata-tools\s*=\s*["']135编辑器["']/i,
    label: '135 data-tools marker',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bdata-brushtype\s*=\s*["'][^"']+["']/i,
    label: '135 editable brush slot',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:\bclass\s*=\s*["'][^"']*\bautonum\b[^"']*["'][^>]*\bdata-num\s*=|\bdata-num\s*=\s*["']?\d+["']?[^>]*\bclass\s*=\s*["'][^"']*\bautonum\b[^"']*["'])/i,
    label: '135 automatic numbering marker',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bstyle_(?:id|name|price)\s*=/i,
    label: '135 style-list metadata',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bdata-name\s*=\s*["'](?:multiselectpopup|carouselslide|slidesectorclickredpacket|clickelementscaleimagesspread|coverclickmovewithspread|autobounceflipcard|multipletouchmovetodismissimgs|svgscrollswithgruopsslide|clickchangecoverwithscroll|clickredpakcetwithscroll)["']/i,
    label: '135 SVG builder effect data-name',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bdata-name\s*=\s*["'](?:devicephotos|clickopenverticalandretainimg|slidecardsexpand|scrollwithclickchangeimage|clickpalywithsacleimageandspread|clickspreadtrackchangeimage|clicktrackchangeimage|touchmoveshowimagewithleakagecarousel|autoshowimagewithleakagecarousel|clickshowimagewithleakagecarousel|marqueeclickpopimage|clickplaygifwithhorizontalscroll|clickslideandclickswitchpop|doubleclickimage|clickscaleremovechangeimgs|clickcoverandmoveimages|clickchooseonepopup|clickrotatechangeimgswithtopandbgchange|chooseonefromtwoclickimagewithcallback)["']/i,
    label: '135 SVG builder effect data-name',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*(?:block-img__trigger|edit-trigger(?:__switch)?|trigger__ajuster|trigger_tip|\bajuster\b)[^"']*["']/i,
    label: '135 SVG trigger hot-area overlay residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bant-switch(?:-(?:checked|inner|handle))?\b[^"']*["']/i,
    label: '135 SVG trigger switch control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*(?:app-content-canvas|block-img__content|block-img__default|edit-placeholder|placeholder__name|ant-tooltip-open)[^"']*["']/i,
    label: '135 SVG builder canvas residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*(?:(?:\bcontent-canvas\b(?=[^"']*\bcontent-(?:background|inner)\b))|(?:\bcontent-(?:background|inner)\b(?=[^"']*\bcontent-canvas\b))|\bblock-inner\b|\bblock-img\b|\bblock-img__inner\b|\bplaceholder__(?:help|icon)\b|\barticle-item__(?:inner|label|del)\b|\barticles_pop\b)[^"']*["']/i,
    label: '135 SVG editor shell residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bartilce-list\b[^"']*["']/i,
    label: '135 SVG editor article list wrapper residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\barticles-anchor\b[^"']*["']/i,
    label: '135 SVG editor articles anchor residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:block-spacing|block-gap|gap-item-wrapper|gap_input|article-item__editing|ant-slider-(?:track|handle))\b[^"']*["']/i,
    label: '135 SVG editor layout control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*(?:\b(?:editor-toolbar(?:__tool)?|toolbar-tool|delete-dropdown_entry|tool-dropdown_entry|team_btn)\b|\bbar-item(?:__label)?(?=[\s"']))[^"']*["']/i,
    label: '135 SVG editor toolbar residue',
  },
  {
    pattern: /(?:<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bheader__logo\b[^"']*["']|<a\b(?=[^>]*(?:class|id)\s*=\s*["'][^"']*\bheader__link\b[^"']*\bmenu\b[^"']*["'])(?=[^>]*\bhref\s*=\s*["']\/svgeditor\/["'])|<(?:img|source)\b[^>]*(?:src|data-src)\s*=\s*["'][^"']*\/?img\/logo_name\.[^"']+\.png["'])/i,
    label: '135 SVG header logo menu residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*(?:\bheader-user\b|\buser-info__(?:head|nickname)\b|\buser-info\b(?=[^"']*\bnoheader\b))[^"']*["']/i,
    label: '135 SVG user header chrome residue',
  },
  {
    pattern: /(?:<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bwork-title(?:__editing)?\b[^"']*["']|<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bedit-text__input\b[^"']*["'][^>]*\bplaceholder\s*=\s*["']作品标题["'])/i,
    label: '135 SVG work title edit control residue',
  },
  {
    pattern: /(?:<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bwork-tool(?:-signature)?\b[^"']*["']|<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:ant_btn_panel|idea-entry-quick|entry-popover)\b[^"']*["']|<button\b(?=[^>]*(?:class|id)\s*=\s*["'][^"']*\bbtn-entry\b)(?=[^>]*(?:class|id)\s*=\s*["'][^"']*\bant-btn\b))/i,
    label: '135 SVG work tool quick-entry residue',
  },
  {
    pattern: /(?:<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bside-tab-menu__icon(?:-box)?\b[^"']*["']|<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bside-bar-banner-wrap\b[^"']*["']|<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bsidebar-help\b(?=[^"']*\bblack\b)[^"']*["'])/i,
    label: '135 SVG sidebar icon/help residue',
  },
  {
    pattern: /<img\b[^>]*\bsrc\s*=\s*["']img\/sidebar-[a-z0-9-]+(?:\.[a-f0-9]+)?\.png["'][^>]*>/i,
    label: '135 SVG sidebar icon asset residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'](?:[^"']*\s)?(?:side-bar(?:-(?:wrap|menu-wrap|content-wrap))?|side_bar__wrap|side-tab-(?:menu(?:__(?:content|label))?|content)|side_tab__content|tab-special(?:__(?:header|searchbar|wrap|segs?|seg))?)(?=\s|["'])[^"']*["']/i,
    label: '135 SVG sidebar navigation residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:search__(?:wrap|input)|search-(?:area|input|hint))\b[^"']*["'][\s\S]{0,220}(?:placeholder\s*=\s*["']请输入关键词搜索["']|aria-label\s*=\s*["']icon:\s*(?:search|question-circle)["']|data-icon\s*=\s*["'](?:search|question-circle)["'])/i,
    label: '135 SVG material search control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bfile_path\s*=\s*["']sidebar\/tabs\/ItemElement["']/i,
    label: '135 SVG material component path residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:item-element(?:__(?:box|help|price|title)|_id)?|item-(?:tag_wrap|content__tag|summary-tag|collect-tag|line)|element-(?:actions|price)__wrap)\b[^"']*["']/i,
    label: '135 SVG material list item residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:menu-filter(?:__(?:container|group))?|menu-level__group|menu__warp_btn|level_entry|svg-types|tab-switch_btn|special-tags__(?:left|center|right|cover)|tab-visible_cat|preview-guide|usage-history|modal-entrance)\b[^"']*["']/i,
    label: '135 SVG material filter control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:tab-special__(?:functions|tags|tap|list)|tab_special_functions|tab-menufilter|filter_category|filter-list__fold|svgMubanYaoqingEnter|img-preview-hide)\b[^"']*["']/i,
    label: '135 SVG material category wrapper residue',
  },
  {
    pattern: /<img\b[^>]*\bsrc\s*=\s*["']img\/img-preview-(?:show|hide)(?:\.[a-z0-9]+)?\.svg["'][^>]*>/i,
    label: '135 SVG material preview asset residue',
  },
  {
    pattern: /(?:<img\b(?=[^>]*\bsrc\s*=\s*["']img\/message(?:\.[a-z0-9]+)?\.svg["'])[^>]*>[\s\S]{0,500}<img\b(?=[^>]*\bsrc\s*=\s*["']img\/collect(?:\.[a-z0-9]+)?\.svg["'])[^>]*>|<img\b(?=[^>]*\bsrc\s*=\s*["']img\/collect(?:\.[a-z0-9]+)?\.svg["'])[^>]*>[\s\S]{0,500}<img\b(?=[^>]*\bsrc\s*=\s*["']img\/message(?:\.[a-z0-9]+)?\.svg["'])[^>]*>)/i,
    label: '135 SVG material action asset residue',
  },
  {
    pattern: /(?:<img\b(?=[^>]*\bsrc\s*=\s*["']img\/hot(?:\.[a-z0-9]+)?\.png["'])[^>]*>[\s\S]{0,800}<img\b(?=[^>]*\bsrc\s*=\s*["']img\/icon-up2(?:\.[a-z0-9]+)?\.png["'])[^>]*>|<img\b(?=[^>]*\bsrc\s*=\s*["']img\/icon-up2(?:\.[a-z0-9]+)?\.png["'])[^>]*>[\s\S]{0,800}<img\b(?=[^>]*\bsrc\s*=\s*["']img\/hot(?:\.[a-z0-9]+)?\.png["'])[^>]*>)/i,
    label: '135 SVG material category helper asset residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:\bissvglist\s*=\s*["']true["']|(?:class|id)\s*=\s*["'][^"']*\blist-loader__(?:inner|load|loading(?:-inner)?)\b[^"']*["'])/i,
    label: '135 SVG material list loader residue',
  },
  {
    pattern: /(?:<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bdiscount-(?:instructions|desc)\b[^"']*["']|<button\b(?=[^>]*(?:class|id)\s*=\s*["'][^"']*\bbtn-buy\b)(?=[^>]*(?:class|id)\s*=\s*["'][^"']*\bant-btn\b)[^>]*>[\s\S]{0,120}(?:免费试用|立即购买))/i,
    label: '135 SVG material purchase control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:editor-bar(?:-inner|-body|-title|-nav|-pop-close|-pop-trigger)?|edit-bar-nav_opt|bar-template-name|editor-img(?:__block|__title)?|editor-spread(?:__edit)?|editor-background|editor-course(?:__detail|__opt|___tag)?|course__(?:title|intro|removal)|edit-image|edit-images|edit-add-(?:images|btn)|edit-add__title|image__(?:header|title-bar|title|tip|body|upload|handle)|image_help|edit-animate(?:__title|__opt)?|animate__dur)\b[^"']*["']/i,
    label: '135 SVG material panel residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bstyle\s*=\s*["'][^"']*\bsvg\s*:\s*135\b[^"']*["']/i,
    label: '135 SVG background style marker',
  },
  {
    pattern: /<section\b[^>]*\bstyle\s*=\s*["'][^"']*\bbackground-size\s*:\s*100\.1%\s+100\.1%[^"']*["'][\s\S]{0,400}<svg\b[^>]*\bviewBox\s*=\s*["']0 0 1080 \d{3,}["']/i,
    label: '135 SVG background-size shell marker',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:\bdata-id\s*=\s*["']\d{3,}["'][^>]*(?:_135editor|135brush|135bg|\bdata-tools\s*=\s*["']135编辑器["'])|(?:_135editor|135brush|135bg|\bdata-tools\s*=\s*["']135编辑器["'])[^>]*\bdata-id\s*=\s*["']\d{3,}["'])/i,
    label: '135 numeric style id on copied market block',
  },
  {
    pattern: /<(?:img|source|image)\b[^>]*(?:src|href|data-src|xlink:href)\s*=\s*["'](?:https?:)?\/\/[^"'\s<>]*(?:135editor\.com|bcn\.135editor\.com)\b/i,
    label: '135 third-party image source',
  },
  {
    pattern: /\burl\(\s*["']?(?:https?:)?\/\/[^)"'\s<>]*(?:135editor\.com|statics\.xiumi\.us|xiumi\.us\/(?:stc|mat))\b/i,
    label: 'market editor hosted background source',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-image-inst-wrapper\b[^"']*["']/i,
    label: 'Xiumi image instance wrapper residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-content-overlap\b[^"']*["']/i,
    label: 'Xiumi content-overlap state residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-overflow-hidden\b[^"']*["']/i,
    label: 'Xiumi overflow-hidden state residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-page-vessel\b[^"']*["']/i,
    label: 'Xiumi page vessel residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-group-sortable-box\b[^"']*["']/i,
    label: 'Xiumi group sortable box residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-sortable-pin\b[^"']*["']/i,
    label: 'Xiumi sortable pin residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:tn-quick-input(?:-block|-comp)?|tn-__quick_input__-inst)\b[^"']*["']/i,
    label: 'Xiumi quick input residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-state-(?:active|frozen)\b[^"']*["']/i,
    label: 'Xiumi state toggle residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-on-(?:editing|child-editing|son-editing|multi-select)\b[^"']*["']/i,
    label: 'Xiumi editing state residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-editing-cell-frozen-toggle-enabled\b[^"']*["']/i,
    label: 'Xiumi editing frozen-toggle residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-in-cell-state-active\b[^"']*["']/i,
    label: 'Xiumi in-cell active state residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-group-(?:box-wrapper|fixed-box)\b[^"']*["']/i,
    label: 'Xiumi group box wrapper residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:\bng-bind-html\s*=\s*["'][^"']*(?:renderer_accelerate|validateImageTypeInHtml)|\bng-class\s*=\s*["'][^"']*tpl2BoxClasses|\bng-click\s*=\s*["'][^"']*tplLib\.onTemplateClicked|\bng-switch\s*=\s*["'][^"']*tpl2PresentType|\btn-tpl-pose-fit-box\s*=)/i,
    label: 'Xiumi template renderer pipeline residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bop-loader\b[^"']*["']/i,
    label: 'Xiumi operation panel loader residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:op-dock|out-comp-(?:edit-dock|edit-panel|op)|op-ce-layout-[\w-]+|op-cp-(?:pose|paper-comps-assistant)|op-overlap-board|bg-group-edit-container|bg-group-panel|cell-group-edit-container|cell-group-panel|horizontal-layout-tip|general-option-panel|menu-style-input|svg-animation-assistant)\b[^"']*["']/i,
    label: 'Xiumi operator dock control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:(?:class|id)\s*=\s*["'][^"']*\b(?:tn-paper-aux-comps-tree(?:-assistant)?|paper-(?:comps-assistant|aux-comp-tree))\b[^"']*["']|\b(?:aux-tree-node-data|on-paper-aux-tree-node-(?:active-state-change|clicked))\s*=)/i,
    label: 'Xiumi paper auxiliary component tree residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:x3-nav-op-buttons|tn-op-btn-group|op-btn(?:-[\w-]+)?|op-more)\b[^"']*["']/i,
    label: 'Xiumi top operation button residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\b(?:uib-(?:dropdown(?:-(?:toggle|menu))?|tooltip|accordion(?:-[\w-]+)?|collapse|tab(?:set|-heading-transclude)?)|tooltip-(?:placement|popup-delay))\s*=/i,
    label: 'Xiumi UI Bootstrap control directive residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:op-bar-(?:menu|btn|icon)|shortcut-op-bar-panel|spacing-panel|format-panel|size-list-menu|insert-text-op-bar-panel)\b[^"']*["']/i,
    label: 'Xiumi operation bar dropdown residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:op-menu-(?:input|icon)|op-bar-item-icon)\b[^"']*["']/i,
    label: 'Xiumi menu input/icon control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:op-bar-input|op-bar-separator)\b[^"']*["']/i,
    label: 'Xiumi operation bar input/separator residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bop-ce-box-metrics\b[^"']*["']/i,
    label: 'Xiumi box metrics control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:(?:class|id)\s*=\s*["'][^"']*\b(?:color-selector-dropdown|op-theme-color-sec|text-color-btn|tn-color-circle|text-shadow-icon|text-fill-image-icon)\b[^"']*["']|\b(?:tn-color-selector(?:-x)?|hello-color-x|on-color-(?:choose|changing|choose-cancel)|support-color-category|fetch-color-from-template-panel|support-batch-change-color)\s*=)/i,
    label: 'Xiumi color selector control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:(?:class|id)\s*=\s*["'][^"']*\b(?:tn-global-format-dropdown|tn-basic-format-tabset|font-family-menu|font-family-list|stc-family-name-yzk--?\d+|text-format-brush|text-misc|size-input)\b[^"']*["']|\b(?:tn-list-locate-active-item|tn-number-input|tn-text-input-done|skim-(?:value-(?:prev|next)|change|end))\s*=)/i,
    label: 'Xiumi font and format control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'](?=[^"']*\bop-text-sec\b)(?=[^"']*\b(?:font-size|font-family|text-style|text-misc)\b)[^"']*["']/i,
    label: 'Xiumi text toolbar control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:x5-right-toolbar|right-toolbar-(?:container(?:-normal)?|switch(?:-container)?|arrow-(?:down|up))|content-statistics|page-assist-on-toolbar|zooming-selector|tn-viewport-zooming-panel)\b[^"']*["']/i,
    label: 'Xiumi right toolbar control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:page-comment-on-toolbar|tn-comment-(?:panel|list))\b[^"']*["']/i,
    label: 'Xiumi comment toolbar panel residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-page-toolbar\b[^"']*["']/i,
    label: 'Xiumi page toolbar residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:sidebar-panel|sidebar-style-normal|x3-tab-item|tn-tab-ctrl-pin)\b[^"']*["']/i,
    label: 'Xiumi sidebar tab control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:tn-meta-(?:container|panel)|toggle-green-gray)\b[^"']*["']/i,
    label: 'Xiumi meta panel control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:op-dc-(?:depot|slot|hidden)|(?:ce|cp)-dc|dc-(?:ce|cp|multi-cp)-[\w-]+|op-gl-dc-attr-bars|(?:cp-role|ce-type)-[\w-]+)\b[^"']*["']/i,
    label: 'Xiumi operator depot item residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-op-dc-item\s*=/i,
    label: 'Xiumi operator depot item residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:tn-attribute-board-entry|tn-attr-assemble-tabs|op-attr-(?:view-attr-assemble|assemble)(?:-[\w-]+)+)\b[^"']*["']/i,
    label: 'Xiumi attribute board control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:op-gen-link|op-cp-(?:background-audio|wx-miniprogram-link))\b[^"']*["']/i,
    label: 'Xiumi generated link control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bop-ce-wx-cover\b[^"']*["']/i,
    label: 'Xiumi WeChat cover control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bop-ce-scale\b[^"']*["']/i,
    label: 'Xiumi scale panel control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:full-screen-mask|brim-group|box-lines|box-handles)\b[^"']*["']/i,
    label: 'Xiumi selection overlay control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\b(?:hm-(?:recognizer-options|panstart|panend|panmove)|stop-propagation|tn-attach-to)\s*=/i,
    label: 'Xiumi selection overlay control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bcrop-(?:panel|attr-menu|ratio-item|image)\b[^"']*["']/i,
    label: 'Xiumi crop panel child control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:bg-attr-menu|bg-repeat-select|bg-attach-check|ce-op-background)\b[^"']*["']/i,
    label: 'Xiumi background attribute control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:op-worker-(?:surface|block-gesture)|crop-(?:mask|box|handle))\b[^"']*["']/i,
    label: 'Xiumi worker surface crop control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-image-presenter\b[^"']*["']/i,
    label: 'Xiumi image presenter residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-(?:page|layer)-slot\b[^"']*["']/i,
    label: 'Xiumi page layer slot residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-comp(?:-[\w-]+)?\b[^"']*["']/i,
    label: 'Xiumi component authoring tree residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-cell(?:-[\w-]+)?\b[^"']*["']/i,
    label: 'Xiumi cell container authoring residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-layer(?!-slot\b)(?:-[\w-]+)?\b[^"']*["']/i,
    label: 'Xiumi layer authoring tree residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-page(?!-(?:slot|vessel|toolbar)\b)(?:-[\w-]+)?\b[^"']*["']/i,
    label: 'Xiumi page authoring tree residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-tpl(?:-[\w-]+)?\b[^"']*["']/i,
    label: 'Xiumi template authoring tree residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-from-house(?:-[\w-]+)?\b[^"']*["']/i,
    label: 'Xiumi source-house authoring residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-theme-color-mask(?:-[\w-]+)?\b[^"']*["']/i,
    label: 'Xiumi theme color mask residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-paper-document-root\b[^"']*["']/i,
    label: 'Xiumi paper document root residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-bind-comp-(?:tpl-id|index)\s*=/i,
    label: 'Xiumi component template binding residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-uuid\s*=/i,
    label: 'Xiumi component identity metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-animate(?:-on-self)?\s*=/i,
    label: 'Xiumi animation binding metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-link\s*=/i,
    label: 'Xiumi link binding metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-image(?:-usage)?\s*=/i,
    label: 'Xiumi image binding metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-comp(?:-role|-index|-pose)?\s*=/i,
    label: 'Xiumi component structure binding metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-cell(?:-type)?\s*=/i,
    label: 'Xiumi cell binding metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-child-(?:position|orientation)\s*=/i,
    label: 'Xiumi child layout binding metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-page-(?:stage-size|view-box-editor-desktop|cache-gatherer)\s*=/i,
    label: 'Xiumi page binding metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-atom-context\s*=/i,
    label: 'Xiumi atom context binding metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:(?:class|id)\s*=\s*["'][^"']*\btn-atom-(?:dragging-source|dropping-sink)\b[^"']*["']|\b(?:tn-atom-(?:dragging-source|dropping-sink)|on-atom-drop)\s*=)/i,
    label: 'Xiumi atom drag-drop residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:(?:class|id)\s*=\s*["'][^"']*\btn-editing-dock\b[^"']*["']|\btn-editing-(?:dock|show-data|cube-index)\s*=)/i,
    label: 'Xiumi editing dock residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-bind-aux-prop\s*=/i,
    label: 'Xiumi auxiliary binding metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-[\w-]+(?:\s|=|>)/i,
    label: 'Xiumi tn-* attribute',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:\btn-svg-animation-[\w-]+(?=[\s"'=/>])|\btn-child-orientation\s*=\s*["']flow-canvas["']|\btn-(?:child-orientation|group-usage)-flow-canvas(?=[\s"'=/>]))/i,
    label: 'Xiumi SVG carousel flow-canvas residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-group-flow-canvas-for-svg-animation\b[^"']*["']/i,
    label: 'Xiumi flow-canvas animation wrapper residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\braw-image\b[^"']*["']/i,
    label: 'Xiumi raw image cell residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-child-(?:position-(?:absolute|static)|orientation-(?:fixed|flow-canvas))\b[^"']*["']/i,
    label: 'Xiumi child layer state residue',
  },
  {
    pattern: /<(?:svg|animate)\b[^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:svg-layout-content|root-svg|rect-content|fade-self-animation)\b[^"']*["']/i,
    label: 'Xiumi applied SVG content layer',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-placeholder(?=[\s"'=/>])/i,
    label: 'Xiumi placeholder metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\btn-yzk-font-[\w-]+(?=[\s"'=/>])/i,
    label: 'Xiumi yzk font metadata residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\btn-text\b[^"']*["']/i,
    label: 'Xiumi text cell class residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bstyle\s*=\s*["'](?=[^"']*\btouch-action\s*:)(?=[^"']*(?:-webkit-)?user-select\s*:)[^"']*["']/i,
    label: 'Xiumi interaction style residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bui-slider(?:-[\w-]+)?\b[^"']*["']/i,
    label: 'Xiumi UI slider control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\bui-sortable(?:-[\w-]+)?\b[^"']*["']/i,
    label: 'Xiumi sortable control residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bdisable-tn-[\w-]+\s*=/i,
    label: 'Xiumi disabled control binding residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bopera-tn-ra-comp\s*=/i,
    label: 'Xiumi component runtime path binding residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bopera-tn-ra-cell\s*=/i,
    label: 'Xiumi cell runtime path binding residue',
  },
  {
    pattern: /<[a-zA-Z][^>]*\b(?:(?:data-)?ng-(?:click|style|repeat|class|show|hide|if|switch|bind|model|include|controller|change|blur|focus|dblclick|options|disabled|value|submit)[\w-]*|v-(?:if|show|for|model|bind|on|html|text|cloak|slot)[\w-]*)\s*=/i,
    label: 'Angular/Vue authoring attribute',
  },
  {
    pattern: /<[a-zA-Z][^>]*(?:class|id)\s*=\s*["'][^"']*\b(?:ng-scope|ng-binding|ng-hide|ng-pristine|ng-untouched|ng-valid|ng-empty|ng-not-empty)\b[^"']*["']/i,
    label: 'Angular authoring class',
  },
  {
    pattern: /<[a-zA-Z][^>]*\bcontenteditable(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/i,
    label: 'editor editable surface attribute',
  },
  {
    pattern: /<(?:img|source|image)\b[^>]*(?:src|href|data-src|xlink:href)\s*=\s*["'](?:https?:)?\/\/[^"'\s<>]*(?:statics\.xiumi\.us|xiumi\.us\/(?:stc|mat))\b/i,
    label: 'Xiumi third-party image source',
  },
] as const

const WECHAT_LAYOUT_REPORT_RISK_RULES = [
  {
    pattern: /\bposition\s*:\s*(?:absolute|fixed|sticky)\b/i,
    label: 'free positioning layer',
  },
  {
    pattern: /\bz-index\s*:/i,
    label: 'z-order layer',
  },
  {
    pattern: /\bbackground(?:-image)?\s*:\s*[^;"']*url\s*\(/i,
    label: 'background image layer',
  },
  {
    pattern: /\boverflow(?:-[xy])?\s*:\s*(?:hidden|clip)\b/i,
    label: 'cropped overflow',
  },
  {
    pattern: /(?:^|[;"'\s])(?:width|height|min-width|min-height|max-width|max-height)\s*:\s*\d{3,}px\b/i,
    label: 'fixed geometry',
  },
  {
    pattern: /(?:^|[;"'\s])(?:left|top|right|bottom)\s*:\s*-?\d+(?:px|rpx|em|rem|%)\b/i,
    label: 'manual offset',
  },
  {
    pattern: /\bmargin(?:-(?:top|left|right|bottom))?\s*:\s*-\d+(?:px|rpx|em|rem|%)\b/i,
    label: 'negative overlap spacing',
  },
  {
    pattern: /\b(?:opacity\s*:\s*0(?:\.0+)?|visibility\s*:\s*hidden|pointer-events\s*:)/i,
    label: 'invisible or custom hit area',
  },
] as const

// ═══════════════════════════════════════════════════════════════════
// 统一入口
// ═══════════════════════════════════════════════════════════════════

/**
 * 对 Markdown 内容执行目标平台的质量检测
 *
 * @param markdown - 原始 Markdown 内容
 * @param platform - 目标平台
 * @returns 质量报告
 */
export function detectQuality(markdown: string, platform: Platform): QualityReport {
  const issues: QualityIssue[] = []

  switch (platform) {
    case 'wechat':
      detectWechatIssues(markdown, issues)
      break
    case 'xiaohongshu':
      detectXiaohongshuIssues(markdown, issues)
      break
    case 'zhihu':
      detectZhihuIssues(markdown, issues)
      break
    default: {
      const _exhaustiveCheck: never = platform
      throw new Error(`未支持的平台: ${_exhaustiveCheck}`)
    }
  }

  // 通用检测
  detectMarketEditorResidues(markdown, platform, issues)
  detectCommonIssues(markdown, platform, issues)
  detectRenderingCoreIssues(markdown, issues)

  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const suggestions = issues.filter(i => i.severity === 'suggestion').length

  return {
    platform,
    timestamp: Date.now(),
    passed: errors === 0,
    issues,
    stats: { errors, warnings, suggestions },
  }
}

export function validateXhsImageArtifactManifest(manifest: XhsImageArtifactManifest): QualityIssue[] {
  const issues: QualityIssue[] = []
  const pages = manifest.pages
  const maxPages = manifest.limits?.maxPages ?? XHS_IMAGE_PAGE_COUNT_LIMIT
  const maxBytes = manifest.limits?.maxBytes ?? XHS_IMAGE_ARTIFACT_MAX_BYTES
  const allowedRatios = new Set(manifest.limits?.allowedRatios ?? XHS_ALLOWED_IMAGE_RATIOS)
  const allowedFormats = new Set(manifest.limits?.allowedFormats ?? XHS_ALLOWED_IMAGE_FORMATS)

  if (pages.length === 0) {
    addIssue(issues, {
      id: 'xhs-image-manifest-count-mismatch',
      severity: 'error',
      message: '小红书图片 artifact manifest 没有任何图片页',
      suggestion: '生成图片页或长图前必须写入 manifest.pages，并标明页码、文件、尺寸、格式、封面和裁切状态',
    })
    return issues
  }

  if (pages.length > maxPages) {
    addIssue(issues, {
      id: 'xhs-image-manifest-count-mismatch',
      severity: 'error',
      message: `小红书图片 artifact manifest 包含 ${pages.length} 页，超过当前配置上限 ${maxPages} 页`,
      suggestion: '拆分图文包、降低页数，或在真实账号发布入口确认新的 page-count limit 后更新配置清单',
    })
  }

  const expectedPages = new Set(Array.from({ length: pages.length }, (_value, index) => index + 1))
  const actualPages = new Set(pages.map(page => page.page))
  if (actualPages.size !== pages.length || !setsAreEqual(expectedPages, actualPages)) {
    addIssue(issues, {
      id: 'xhs-image-manifest-page-order',
      severity: 'error',
      message: `小红书图片 artifact 页序不连续或有重复：${pages.map(page => page.page).join(', ')}`,
      suggestion: '按 1..N 重建 manifest 页码、文件名和正文“见第 N 张图”引用，避免发布顺序错位',
    })
  }

  const missingFiles = pages.filter(page => page.exists !== true)
  if (missingFiles.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-manifest-missing-file',
      severity: 'error',
      message: `小红书图片 artifact 缺少文件存在性证明：${formatXhsManifestPages(missingFiles)}`,
      suggestion: '导出前确认每个 manifest 文件真实存在并可读取；没有文件证明时只能标记为 blocked/unavailable',
    })
  }

  const coverPages = pages.filter(page => page.cover)
  if (coverPages.length === 0) {
    addIssue(issues, {
      id: 'xhs-image-manifest-cover-missing',
      severity: 'error',
      message: '小红书图片 artifact manifest 缺少 cover 页标记',
      suggestion: '第一张图默认承担封面职责；manifest 必须标明唯一 cover 页并校验缩略图可读性',
    })
  } else if (coverPages.length > 1) {
    addIssue(issues, {
      id: 'xhs-image-manifest-cover-duplicate',
      severity: 'error',
      message: `小红书图片 artifact manifest 出现多个 cover 页：${formatXhsManifestPages(coverPages)}`,
      suggestion: '只保留一个封面页；重排图片后同步更新 cover 标记和正文引用',
    })
  } else if (coverPages[0]?.page !== 1) {
    addIssue(issues, {
      id: 'xhs-image-manifest-page-order',
      severity: 'error',
      message: `小红书图片 artifact cover 页为第 ${coverPages[0]?.page} 页，不是第 1 页`,
      suggestion: '将封面页移到第 1 页，或在发布清单中明确重排后的首图封面证明',
    })
  }

  const invalidReferences = manifest.bodyReferences.filter(reference => !actualPages.has(reference))
  const pageReferenceMismatches = pages.filter(page => {
    if (typeof page.referencedByBody !== 'boolean') return false
    return page.referencedByBody !== manifest.bodyReferences.includes(page.page)
  })
  if (invalidReferences.length > 0 || pageReferenceMismatches.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-manifest-reference-mismatch',
      severity: 'error',
      message: [
        invalidReferences.length > 0 ? `正文引用了不存在的图片页：${invalidReferences.join(', ')}` : '',
        pageReferenceMismatches.length > 0 ? `manifest referencedByBody 与正文引用不一致：${formatXhsManifestPages(pageReferenceMismatches)}` : '',
      ].filter(Boolean).join('；'),
      suggestion: '同步重建正文“见第 N 张图”、manifest 页码、cover 标记和导出文件列表',
    })
  }

  const unsupportedRatios = pages.filter(page => !allowedRatios.has(page.ratio) || !matchesDeclaredXhsRatio(page))
  if (unsupportedRatios.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-manifest-ratio-unsupported',
      severity: 'error',
      message: `小红书图片 artifact 比例不符合当前配置或尺寸声明：${formatXhsManifestPages(unsupportedRatios)}`,
      suggestion: '将图片页裁切/重排为 3:4 或 1:1 等当前配置允许比例，并记录实际 width/height',
    })
  }

  const unsupportedFormats = pages.filter(page => !allowedFormats.has(page.format))
  if (unsupportedFormats.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-manifest-format-unsupported',
      severity: 'error',
      message: `小红书图片 artifact 格式不在当前允许列表：${unsupportedFormats.map(page => `${page.fileName || `page-${page.page}`}.${page.format}`).join(', ')}`,
      suggestion: '将图片页转换为当前配置允许的 JPG/PNG 等格式，再重新生成 manifest',
    })
  }

  const invalidBytes = pages.filter(page => typeof page.bytes !== 'number' || page.bytes <= 0 || page.bytes > maxBytes)
  if (invalidBytes.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-manifest-bytes-limit',
      severity: 'error',
      message: `小红书图片 artifact 缺少有效字节数或超过当前 ${maxBytes} bytes 限制：${formatXhsManifestPages(invalidBytes)}`,
      suggestion: '导出器必须记录每页真实 bytes；超限时压缩、分页或进入 publish checklist',
    })
  }

  const cropOverflowPages = pages.filter(page => page.cropStatus === 'overflow')
  if (cropOverflowPages.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-manifest-crop-overflow',
      severity: 'error',
      message: `小红书图片 artifact 存在裁切/溢出：${formatXhsManifestPages(cropOverflowPages)}`,
      suggestion: '重新排版图片页，确保标题、正文、图表和安全边距未被裁切',
    })
  }

  const cropUnprovenPages = pages.filter(page => page.cropStatus === 'warning' || page.cropStatus === 'unknown')
  if (cropUnprovenPages.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-manifest-crop-overflow',
      severity: 'warning',
      message: `小红书图片 artifact 裁切状态未完全证明：${formatXhsManifestPages(cropUnprovenPages)}`,
      suggestion: '在本地浏览器或导出器中完成 per-page crop check 后，再报告为本地 artifact 通过',
    })
  }

  return issues
}

export function validateZhihuImageArtifactManifest(
  manifest: ZhihuImageArtifactManifest,
  finalMarkdown?: string,
): QualityIssue[] {
  const issues: QualityIssue[] = []
  const artifacts = manifest.artifacts
  const allowedFormats = new Set(manifest.allowedFormats ?? ZHIHU_ALLOWED_IMAGE_FORMATS)
  const markdownReferences = new Set(
    finalMarkdown
      ? collectMarkdownImages(finalMarkdown).map(image => image.src)
      : manifest.markdownReferences ?? [],
  )

  if (artifacts.length === 0) {
    addIssue(issues, {
      id: 'zhihu-image-manifest-empty',
      severity: 'error',
      message: '知乎图片 artifact manifest 没有任何图片 fallback 记录',
      suggestion: '生成公式图、图表图、表格图或图片 fallback 前必须写入 manifest.artifacts，并标明最终图片地址、host 状态、alt/caption 和上传证明',
    })
    return issues
  }

  const blockedHosts = artifacts.filter(artifact =>
    !artifact.finalSrc.trim()
    || isBlockedZhihuImageSource(artifact.finalSrc)
    || artifact.hostStatus === 'local-only'
    || artifact.hostStatus === 'missing'
    || artifact.hostStatus === 'blocked'
    || (manifest.requirePlatformUpload === true && artifact.hostStatus !== 'platform-hosted')
  )
  if (blockedHosts.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-manifest-host-blocked',
      severity: 'error',
      message: `知乎图片 artifact 缺少可发布 host：${formatZhihuManifestArtifacts(blockedHosts)}`,
      suggestion: '最终 Markdown 图片必须是稳定公开 HTTPS，或真实知乎/目标发布入口上传后返回的平台图床地址；本地、blob/data、http、私网、微信 CDN 或缺失 finalSrc 都必须阻断',
    })
  }

  const missingUploadProof = artifacts.filter(artifact =>
    artifact.hostStatus === 'platform-hosted' && artifact.uploaded !== true,
  )
  if (missingUploadProof.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-manifest-upload-missing',
      severity: 'error',
      message: `知乎图片 artifact 标记为平台图床但缺少真实上传证明：${formatZhihuManifestArtifacts(missingUploadProof)}`,
      suggestion: '只有真实上传接口/编辑器返回的平台图片地址才能标记 uploaded:true；否则保持 blocked/unavailable',
    })
  }

  const missingFiles = artifacts.filter(artifact =>
    artifact.uploaded !== true && artifact.exists !== true,
  )
  if (missingFiles.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-manifest-missing-file',
      severity: 'error',
      message: `知乎图片 artifact 缺少本地文件存在性证明：${formatZhihuManifestArtifacts(missingFiles)}`,
      suggestion: '未上传到平台前必须证明本地 fallback 文件真实存在并可读取；否则不能报告本地 artifact 通过',
    })
  }

  const missingAlt = artifacts.filter(artifact => !artifact.alt.trim())
  if (missingAlt.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-manifest-alt-missing',
      severity: 'error',
      message: `知乎图片 artifact 缺少 alt 文本：${formatZhihuManifestArtifacts(missingAlt)}`,
      suggestion: '公式图、表格图、图表图、SVG fallback 和封面图都必须提供可理解的 alt 文本',
    })
  }

  const missingCaption = artifacts.filter(artifact =>
    isZhihuSemanticImageArtifact(artifact)
    && !artifact.caption?.trim()
    && artifact.textFallback !== true,
  )
  if (missingCaption.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-manifest-caption-missing',
      severity: 'error',
      message: `知乎语义图片 artifact 缺少 caption 或文字 fallback：${formatZhihuManifestArtifacts(missingCaption)}`,
      suggestion: '公式、图表、流程图和复杂表格图片化后必须保留邻近 caption 或正文解释，避免语义丢失',
    })
  }

  const unsupportedFormats = artifacts.filter(artifact => {
    const format = artifact.format ?? detectImageFormat(artifact.finalSrc)
    return !format || !allowedFormats.has(format)
  })
  if (unsupportedFormats.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-manifest-format-unsupported',
      severity: 'error',
      message: `知乎图片 artifact 格式缺失或不在当前允许列表：${formatZhihuManifestArtifacts(unsupportedFormats)}`,
      suggestion: '将图片 fallback 转换为 JPG/PNG/GIF 等当前允许格式，并记录真实 finalSrc 或 format',
    })
  }

  const invalidDimensions = artifacts.filter(artifact =>
    (artifact.width !== undefined && artifact.width <= 0)
    || (artifact.height !== undefined && artifact.height <= 0),
  )
  if (invalidDimensions.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-manifest-dimension-invalid',
      severity: 'error',
      message: `知乎图片 artifact 尺寸无效：${formatZhihuManifestArtifacts(invalidDimensions)}`,
      suggestion: '记录正数 width/height；无法获取尺寸时不要写 0 或负数',
    })
  }

  const invalidBytes = artifacts.filter(artifact =>
    artifact.uploaded !== true && (typeof artifact.bytes !== 'number' || artifact.bytes <= 0),
  )
  if (invalidBytes.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-manifest-bytes-invalid',
      severity: 'error',
      message: `知乎图片 artifact 缺少有效 bytes：${formatZhihuManifestArtifacts(invalidBytes)}`,
      suggestion: '本地 fallback 文件必须记录真实字节数；平台上传图可用 uploaded:true 和平台 URL 作为证明',
    })
  }

  if (markdownReferences.size > 0) {
    const artifactFinalSrcs = new Set(artifacts.map(artifact => artifact.finalSrc))
    const missingManifestItems = [...markdownReferences].filter(src => !artifactFinalSrcs.has(src))
    const unreferencedArtifacts = artifacts.filter(artifact => {
      if (typeof artifact.referencedByMarkdown === 'boolean') {
        return artifact.referencedByMarkdown !== markdownReferences.has(artifact.finalSrc)
      }
      return !markdownReferences.has(artifact.finalSrc)
    })
    if (missingManifestItems.length > 0 || unreferencedArtifacts.length > 0) {
      addIssue(issues, {
        id: 'zhihu-image-manifest-reference-mismatch',
        severity: 'error',
        message: [
          missingManifestItems.length > 0 ? `Markdown 引用了未登记 artifact 的图片：${missingManifestItems.join(', ')}` : '',
          unreferencedArtifacts.length > 0 ? `artifact 与 Markdown 引用状态不一致：${formatZhihuManifestArtifacts(unreferencedArtifacts)}` : '',
        ].filter(Boolean).join('；'),
        suggestion: '重写最终 Markdown 图片链接后，同步更新 manifest.finalSrc、referencedByMarkdown 和上传记录',
      })
    }
  }

  return issues
}

// ═══════════════════════════════════════════════════════════════════
// 微信公众号质量检测
// ═══════════════════════════════════════════════════════════════════

function detectWechatIssues(markdown: string, issues: QualityIssue[]): void {
  // 1. 检测 CSS 变量（微信不支持）
  const cssVarMatches = markdown.match(/var\(--[\w-]+\)/g)
  if (cssVarMatches) {
    addIssue(issues, {
      id: 'wechat-css-var',
      severity: 'warning',
      message: `发现 ${cssVarMatches.length} 个 CSS 变量引用，微信不支持 CSS 变量`,
      suggestion: '导出时会自动替换为实际值，确保变量值已定义',
    })
  }

  // 2. 检测 SVG 图片
  const svgMatches = markdown.match(/!\[.*?\]\([^)]*\.svg[^)]*\)/gi)
  if (svgMatches) {
    addIssue(issues, {
      id: 'wechat-svg-image',
      severity: 'warning',
      message: `发现 ${svgMatches.length} 张 SVG 图片，微信编辑器中 SVG 需使用素材库链接`,
      suggestion: '建议将 SVG 转换为 PNG/JPG 后上传微信素材库',
    })
  }

  // 3. 检测外链
  const linkMatches = markdown.match(/\[([^\]]+)\]\((https?:\/\/(?!mp\.weixin\.qq\.com)[^)]+)\)/g)
  if (linkMatches && linkMatches.length > 0) {
    addIssue(issues, {
      id: 'wechat-external-links',
      severity: 'suggestion',
      message: `发现 ${linkMatches.length} 个外部链接，非微信域名链接会触发安全提醒弹窗`,
      suggestion: '导出时会自动转为文末脚注',
    })
  }

  // 4. 检测图片宽度建议
  const imgWithSize = markdown.match(/<img[^>]+width=["'](\d+)/gi)
  if (imgWithSize) {
    for (const img of imgWithSize) {
      const widthMatch = img.match(/width=["'](\d+)/)
      if (widthMatch && parseInt(widthMatch[1]) > 640) {
        addIssue(issues, {
          id: 'wechat-image-width',
          severity: 'suggestion',
          message: `检测到图片宽度 ${widthMatch[1]}px > 640px`,
          suggestion: '微信公众号建议图片宽度 ≤ 640px，导出时会自动降级到 640px 并保持自适应高度',
        })
        break // 只报告一次
      }
    }
  }

  // 5. 检测 <style> 标签
  if (/<style[\s>]/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-style-tag',
      severity: 'warning',
      message: '检测到 <style> 标签，微信会过滤掉 <style> 标签',
      suggestion: '导出时会自动内联 CSS，无需手动处理',
    })
  }

  // 6. 检测不支持的 HTML 标签
  const unsupportedTags = ['iframe', 'embed', 'object', 'form', 'input', 'button', 'select', 'audio', 'video', 'canvas', 'script']
  for (const tag of unsupportedTags) {
    const regex = new RegExp(`<${tag}[\\s>]`, 'i')
    if (regex.test(markdown)) {
      addIssue(issues, {
        id: `wechat-unsupported-tag-${tag}`,
        severity: 'warning',
        message: `检测到 <${tag}> 标签，微信不支持此标签`,
        suggestion: `移除或替换 <${tag}> 标签`,
      })
    }
  }

  // 7. 检测 Mermaid 图表
  const mermaidBlocks = markdown.match(/```mermaid/gi) ?? []
  if (mermaidBlocks.length > 0) {
    addIssue(issues, {
      id: 'wechat-mermaid',
      severity: 'suggestion',
      message: `发现 ${mermaidBlocks.length} 个 Mermaid 图表`,
      suggestion: '微信发布链不能依赖矢量节点直出；请先转为 PNG/JPG 并上传为微信正文图片，失败时保留文字摘要',
    })
  }

  // 8. 检测 LaTeX 公式。WeChat 不保留 KaTeX class/CSS，导出会降级为自包含可读公式文本。
  const latexBlocks = markdown.match(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g)
  if (latexBlocks) {
    addIssue(issues, {
      id: 'wechat-latex-degrade',
      severity: 'suggestion',
      message: `发现 ${latexBlocks.length} 个 LaTeX 公式，微信粘贴链不可靠保留 KaTeX 样式`,
      suggestion: '导出时会降级为自包含公式文本；如需公式图片，请接入真实素材上传链路',
    })
  }

  // 9. 微信官方编辑器规范：固定宽高、line-height:0、普通文本 pre、start/end 对齐等
  detectWechatOfficialEditorSpecIssues(markdown, issues)
}

function detectWechatOfficialEditorSpecIssues(markdown: string, issues: QualityIssue[]): void {
  const markupScan = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')

  if (/line-height\s*:\s*0(?:px|em|rem|;|")/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-line-height-zero',
      severity: 'error',
      message: '检测到 line-height:0，微信官方规范将其列为可读性和可见性风险',
      suggestion: '不要用 line-height:0 包裹可读文本；改用结构化 section/p/span 和正常行高',
    })
  }

  if (/<(?:section|div|p)\b[^>]*style=["'][^"']*(?:width|height)\s*:\s*\d{3,}px/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-fixed-container-size',
      severity: 'error',
      message: '检测到正文容器固定宽高，可能破坏微信移动端响应式呈现',
      suggestion: '正文容器使用 max-width、width:100% 或自然流布局；图片尺寸由导出器单独处理',
    })
  }

  if (/text-align\s*:\s*(?:start|end)\b/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-text-align-logical',
      severity: 'error',
      message: '检测到 text-align:start/end，不同终端表现可能不一致',
      suggestion: '改用 left、center 或 right',
    })
  }

  if (/<pre\b(?:(?!<\/pre>).)*<\/pre>/is.test(markdown)) {
    const preBlocks = markdown.match(/<pre\b[\s\S]*?<\/pre>/gi) ?? []
    const textPreBlocks = preBlocks.filter(block => !/<code[\s>]/i.test(block))
    if (textPreBlocks.length > 0) {
      addIssue(issues, {
        id: 'wechat-pre-ordinary-text',
        severity: 'error',
        message: `检测到 ${textPreBlocks.length} 个未包含 <code> 的 <pre> 块，普通段落不应使用 pre`,
        suggestion: '普通正文使用 <p> 或 <section>；仅代码块保留 <pre><code>',
      })
    }
  }

  if (/<img\b[^>]*style=["'][^"']*opacity\s*:\s*0/i.test(markdown) && /<svg[\s>]/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-transparent-image-svg-overlay',
      severity: 'error',
      message: '检测到透明图片叠加 SVG 的模式，发布后可能导致公众号后台无法编辑真实图片',
      suggestion: '不要隐藏真实图片再用 SVG 背景替代；将图片作为真实 <img> 输出，SVG 只做装饰',
    })
  }

  const touchstartOnlyAnimate = /<animate(?:Transform)?\b[^>]*\bbegin=["'][^"']*\btouchstart\b(?![^"']*\bclick\b)[^"']*["']/i
  if (touchstartOnlyAnimate.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-svg-touchstart-only',
      severity: 'error',
      message: '检测到 SVG 动画 begin 仅依赖 touchstart，PC 端微信编辑器可能无法触发',
      suggestion: '互动 SVG 必须 opt-in 并真实验证；需要触发时至少覆盖 click，默认避免 DOM 事件处理器',
    })
  }

  if (/<[a-zA-Z][^>]*\son[a-z]+\s*=/i.test(markupScan)) {
    addIssue(issues, {
      id: 'wechat-event-handler',
      severity: 'error',
      message: '检测到 HTML 事件处理器属性，微信正文输出不得依赖 DOM 事件',
      suggestion: '移除 onclick/onload 等 on* 属性；互动只能走 opt-in 的 WeChat-safe SVG 子集并保留静态 fallback',
    })
  }

  if (/<[a-zA-Z][^>]*\s(?:class|id)\s*=/i.test(markupScan)) {
    addIssue(issues, {
      id: 'wechat-class-id-dependency',
      severity: 'warning',
      message: '检测到 class/id 属性，微信粘贴链会剥离或改写这些依赖',
      suggestion: '最终微信 HTML 不应依赖 class/id selector；将样式内联到元素并用 data-* 仅作审计哨兵',
    })
  }

  const unsupportedCssRules = [
    [/display\s*:\s*(?:flex|grid)\b/i, 'display:flex/grid'],
    [/\bgap\s*:/i, 'gap'],
    [/\bposition\s*:\s*(?:absolute|fixed|sticky)\b/i, 'position:absolute/fixed/sticky'],
    [/\b(?:backdrop-)?filter\s*:/i, 'filter/backdrop-filter'],
    [/\banimation(?:-[\w-]+)?\s*:/i, 'animation'],
    [/\btransition(?:-[\w-]+)?\s*:/i, 'transition'],
    [/\b(?:linear|radial)-gradient\s*\(/i, 'gradient'],
    [/\bcalc\s*\(/i, 'calc'],
    [/\bvar\s*\(/i, 'var'],
    [/\btransform\s*:/i, 'style-transform'],
  ] as const
  const unsupportedCssFindings = unsupportedCssRules
    .filter(([pattern]) => pattern.test(markupScan))
    .map(([, label]) => label)
  if (unsupportedCssFindings.length > 0) {
    addIssue(issues, {
      id: 'wechat-unsupported-css',
      severity: 'error',
      message: `检测到微信高风险 CSS：${unsupportedCssFindings.join(', ')}`,
      suggestion: '改用自然流、inline-block/table/table-cell、纯色背景、显式尺寸归一化或 raster fallback',
    })
  }

  const layoutReportFindings = collectWechatLayoutReportFindings(markupScan)
  if (layoutReportFindings.length > 0) {
    addIssue(issues, {
      id: 'wechat-layout-report-required',
      severity: 'error',
      message: `检测到需要 layout report 的图层/自由布局风险：${layoutReportFindings.join(', ')}`,
      suggestion: '135/秀米式图层、背景图、自由定位、裁切和触发区必须改为可读 DOM 顺序的 InkForge 自有 HTML/SVG，或降级为 raster/long-image，并附 layout report（视觉顺序、DOM 顺序、文本 fallback、裁切/溢出、触发区和目标平台）。',
    })
  }

  const unsafeSvgRules = [
    [/<foreignObject\b/i, 'foreignObject'],
    [/<defs\b/i, 'defs'],
    [/<(?:linearGradient|radialGradient)\b/i, 'gradient'],
    [/<clipPath\b/i, 'clipPath'],
    [/<mask\b/i, 'mask'],
    [/<filter\b/i, 'filter'],
    [/<use\b/i, 'use'],
    [/\burl\(#/i, 'url(#...)'],
    [/<image\b[^>]*(?:\bhref|xlink:href)\s*=/i, 'external image href'],
    [/\bxlink:href\s*=/i, 'xlink:href'],
  ] as const
  const unsafeSvgFindings = unsafeSvgRules
    .filter(([pattern]) => pattern.test(markupScan))
    .map(([, label]) => label)
  if (unsafeSvgFindings.length > 0) {
    addIssue(issues, {
      id: 'wechat-unsafe-svg-construct',
      severity: 'error',
      message: `检测到 WeChat-safe SVG 子集外构造：${[...new Set(unsafeSvgFindings)].join(', ')}`,
      suggestion: '重写为 solid fill/stroke 的 inline SVG 基础图形，或转为图片/长图 fallback',
    })
  }

  if (/(?:katex-html|<math\b|<annotation\b|MathJax)/i.test(markupScan)) {
    addIssue(issues, {
      id: 'wechat-katex-html',
      severity: 'error',
      message: '检测到 KaTeX/MathJax/MathML HTML，微信最终输出不能依赖公式运行时或样式类',
      suggestion: '公式应降级为可读文本、WeChat-safe SVG 或 PNG/JPG 公式图片，并在发布前重新检测',
    })
  }

  if (/!important\b/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-important-style',
      severity: 'suggestion',
      message: '检测到 !important，可能干扰微信公共样式和 Dark Mode 修正',
      suggestion: '优先使用结构和明确 inline style，避免依赖 !important',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 小红书质量检测
// ═══════════════════════════════════════════════════════════════════

function detectXiaohongshuIssues(markdown: string, issues: QualityIssue[]): void {
  // 0. 计算纯文本字数（移除 Markdown 标记后）
  const plainText = stripMarkdownSyntax(markdown)
  const charCount = plainText.length

  // 1. 字数检测（硬限制 1000 字）
  if (charCount > 1000) {
    addIssue(issues, {
      id: 'xhs-char-limit',
      severity: 'error',
      message: `正文 ${charCount} 字，超过小红书 1000 字限制（差 ${charCount - 1000} 字）`,
      suggestion: '精简内容至 600-800 字为最佳阅读体验',
    })
  } else if (charCount > 800) {
    addIssue(issues, {
      id: 'xhs-char-warning',
      severity: 'suggestion',
      message: `正文 ${charCount} 字，接近 1000 字限制`,
      suggestion: '建议控制在 600-800 字以获得最佳阅读体验',
    })
  }

  // 2. 标题检测
  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    const titleLength = titleMatch[1].trim().length
    if (titleLength > 20) {
      addIssue(issues, {
        id: 'xhs-title-length',
        severity: 'warning',
        message: `标题 ${titleLength} 字，超过小红书 20 字限制`,
        suggestion: '缩短标题至 10-15 字，保留关键词与明确利益点',
      })
    }
  }

  // 3. 段落长度检测
  const paragraphs = markdown.split(/\n\s*\n/).filter(p => p.trim())
  const longParagraphs = paragraphs.filter(p => {
    const lines = p.trim().split('\n')
    return lines.length > 5
  })
  if (longParagraphs.length > 0) {
    addIssue(issues, {
      id: 'xhs-paragraph-length',
      severity: 'warning',
      message: `${longParagraphs.length} 个段落超过 5 行`,
      suggestion: '每段控制在 5 行以内，段间加空行提升可读性',
    })
  }

  detectXhsPlainTextReadabilityIssues(markdown, issues)

  // 4. 装饰层次检测
  const markerCount = countDecorativeMarkers(plainText)
  const markerDensity = charCount > 0 ? markerCount / charCount * 100 : 0
  if (markerDensity < 0.5 && charCount > 100) {
    addIssue(issues, {
      id: 'xhs-marker-sparse',
      severity: 'suggestion',
      message: `内容层次提示偏少（${markerCount} 处 / ${charCount} 字）`,
      suggestion: '建议通过标题、分隔线或简短提示词增强阅读锚点，导出时会自动补入基础装饰',
    })
  } else if (markerDensity > 3) {
    addIssue(issues, {
      id: 'xhs-marker-dense',
      severity: 'suggestion',
      message: `内容层次提示偏密（${markerCount} 处 / ${charCount} 字）`,
      suggestion: '建议减少重复分隔或装饰标记，避免视觉噪音',
    })
  }

  // 5. 检测不支持的元素
  if (/<[^>]+>/i.test(markdown)) {
    addIssue(issues, {
      id: 'xhs-html-tags',
      severity: 'error',
      message: '检测到 HTML 标签，小红书是纯文本平台',
      suggestion: '导出时会自动清理 HTML 标签',
    })
  }

  if (/data-ink-(?:block|svg)=|<svg[\s>]/i.test(markdown)) {
    addIssue(issues, {
      id: 'xhs-wechat-decoration-leak',
      severity: 'error',
      message: '检测到微信装饰块或 inline SVG，小红书正文不能承载微信富文本装饰',
      suggestion: '导出时必须降级为纯文本、图片页或长图，不得粘贴微信 HTML/SVG',
    })
  }

  // 6. 检测 raw Markdown 控制符泄漏
  detectXhsMarkdownControlLeakage(markdown, issues)

  // 7. 检测链接
  const links = markdown.match(/\[([^\]]+)\]\([^)]+\)/g)
  if (links && links.length > 0) {
    addIssue(issues, {
      id: 'xhs-links',
      severity: 'warning',
      message: `发现 ${links.length} 个超链接，小红书不支持点击跳转`,
      suggestion: '导出时会自动转为"搜索关键词"提示',
    })
  }

  // 8. 检测表格
  if (/\|[^\n]+\|/.test(markdown) && /\|[-: ]+\|/.test(markdown)) {
    addIssue(issues, {
      id: 'xhs-table',
      severity: 'warning',
      message: '检测到 Markdown 表格，小红书不支持表格',
      suggestion: '导出时会自动转为列表化描述',
    })
  }

  // 9. 检测代码块
  const codeBlocks = markdown.match(/```[\s\S]*?```/g)
  if (codeBlocks && codeBlocks.length > 0) {
    addIssue(issues, {
      id: 'xhs-code-blocks',
      severity: 'warning',
      message: `发现 ${codeBlocks.length} 个代码块，小红书不支持代码格式`,
      suggestion: '导出时短代码会保留为文本引用，长代码建议截图',
    })
  }

  // 10. 检测 LaTeX 公式
  const latexBlocks = markdown.match(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g)
  if (latexBlocks) {
    addIssue(issues, {
      id: 'xhs-latex',
      severity: 'warning',
      message: `发现 ${latexBlocks.length} 个 LaTeX 公式，小红书不支持数学公式`,
      suggestion: '导出时会转为文字描述',
    })
  }

  detectXhsImageReferenceIssues(markdown, issues)
  detectXhsImageArtifactIssues(markdown, issues)
}

// ═══════════════════════════════════════════════════════════════════
// 知乎质量检测
// ═══════════════════════════════════════════════════════════════════

function detectZhihuIssues(markdown: string, issues: QualityIssue[]): void {
  if (/data-ink-(?:block|svg)=|<mp(?:voice|video)\b/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-wechat-decoration-leak',
      severity: 'error',
      message: '检测到微信旗舰装饰块或微信专属媒体标签，知乎输出必须是 clean Markdown',
      suggestion: '将微信标题卡、阅读条、金句卡、SVG 分隔符和专属媒体组件降级为 Markdown 语义或图片 fallback',
    })
  }

  if (/<svg[\s>]/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-inline-svg',
      severity: 'error',
      message: '检测到 inline SVG，知乎正文不应依赖微信 SVG 装饰',
      suggestion: '将 SVG 降级为 PNG/JPG 或删除装饰，仅保留 Markdown 语义',
    })
  }

  // 1. 检测残留 HTML 标签
  const htmlTags = markdown.match(/<(?!\/?\s*(?:br|hr|img)\s*\/?)[a-zA-Z][^>]*>/g)
  if (htmlTags && htmlTags.length > 0) {
    const uniqueTags = [...new Set(htmlTags.map(t => {
      const match = t.match(/<\/?([a-zA-Z]+)/)
      return match ? match[1] : t
    }))]
    addIssue(issues, {
      id: 'zhihu-html-tags',
      severity: 'warning',
      message: `检测到 ${htmlTags.length} 个 HTML 标签（${uniqueTags.join(', ')}），知乎会过滤 HTML`,
      suggestion: '导出时会自动清理 HTML 标签，保留纯 Markdown',
    })
  }

  // 2. 检测内联样式
  if (/style="[^"]*"/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-inline-style',
      severity: 'warning',
      message: '检测到内联 style 属性，知乎会过滤 style',
      suggestion: '导出时会自动清理内联样式',
    })
  }

  detectZhihuResidualHtmlDependencyIssues(markdown, issues)
  detectZhihuInvalidTableSeparatorIssues(markdown, issues)
  detectZhihuComplexTableIssues(markdown, issues)

  // 3. 检测 Mermaid / Graphviz / PlantUML / Vega 等图表围栏
  const diagramFences = collectDiagramFenceLanguages(markdown)
  const mermaidBlocks = diagramFences.filter(language => language === 'mermaid')
  if (mermaidBlocks.length > 0) {
    addIssue(issues, {
      id: 'zhihu-mermaid',
      severity: 'warning',
      message: `发现 ${mermaidBlocks.length} 个 Mermaid 图表，知乎不支持 Mermaid 渲染`,
      suggestion: '建议将 Mermaid 图表截图后上传',
    })
  }
  const otherDiagramFences = diagramFences.filter(language => language !== 'mermaid')
  if (otherDiagramFences.length > 0) {
    addIssue(issues, {
      id: 'zhihu-raw-diagram-fence',
      severity: 'warning',
      message: `发现 ${otherDiagramFences.length} 个原始图表围栏（${[...new Set(otherDiagramFences)].join(', ')}）`,
      suggestion: '知乎发布前应转为 PNG/JPG 并提供 alt/caption，或保留文字说明，不直接发布 raw diagram block',
    })
  }

  // 4. 检测任务列表
  const taskLists = markdown.match(/^- \[([ x])\]/gm)
  if (taskLists) {
    addIssue(issues, {
      id: 'zhihu-task-list',
      severity: 'suggestion',
      message: `发现 ${taskLists.length} 个任务列表项，知乎不支持复选框`,
      suggestion: '导出时会自动转为“已完成 / 待处理”文本标记',
    })
  }

  // 5. 检测 LaTeX 语法错误和发布前预览提示
  detectLatexErrors(markdown, issues)

  const slash = String.fromCharCode(92)
  const dollar = String.fromCharCode(36)
  const latexPattern = `${slash}${dollar}${slash}${dollar}[${slash}s${slash}S]*?${slash}${dollar}${slash}${dollar}|${slash}${dollar}[^${dollar}${slash}n]+${slash}${dollar}`
  const latexBlocks = markdown.match(new RegExp(latexPattern, 'g'))
  if (latexBlocks) {
    addIssue(issues, {
      id: 'zhihu-latex-preview',
      severity: 'suggestion',
      message: `发现 ${latexBlocks.length} 个 LaTeX 公式，知乎不同导入入口的公式渲染表现可能不一致`,
      suggestion: '导出会保留 LaTeX 源格式；发布前请在知乎编辑器预览，若未渲染则转换为 equation 图片或截图后上传',
    })
  }

  // 6. 检测 SVG 图片（知乎不支持 SVG）
  const svgImages = markdown.match(/!\[.*?\]\([^)]*\.svg[^)]*\)/gi)
  if (svgImages) {
    addIssue(issues, {
      id: 'zhihu-svg-image',
      severity: 'warning',
      message: `发现 ${svgImages.length} 张 SVG 图片，知乎不支持 SVG 格式`,
      suggestion: '将 SVG 转换为 PNG/JPG',
    })
  }

  // 7. 检测超长代码行
  const codeBlockMatches = markdown.matchAll(/```\w*\n([\s\S]*?)```/g)
  for (const match of codeBlockMatches) {
    const code = match[1]
    const longLines = code.split('\n').filter(line => line.length > 120)
    if (longLines.length > 0) {
      addIssue(issues, {
        id: 'zhihu-long-code-line',
        severity: 'suggestion',
        message: `代码块中有 ${longLines.length} 行超过 120 字符`,
        suggestion: '可能影响阅读体验，建议适当换行',
      })
      break // 只报告一次
    }
  }

  // 8. 检测 class 属性
  if (/class="[^"]*"/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-class-attr',
      severity: 'warning',
      message: '检测到 class 属性，知乎会过滤 class',
      suggestion: '导出时会自动清理 class 属性',
    })
  }

  detectZhihuImageIssues(markdown, issues)
  detectZhihuImageCaptionIssues(markdown, issues)
}

// ═══════════════════════════════════════════════════════════════════
// 通用检测
// ═══════════════════════════════════════════════════════════════════

function detectCommonIssues(markdown: string, _platform: Platform, issues: QualityIssue[]): void {
  // 1. 检测 Base64 图片
  const base64Images = markdown.match(/!\[.*?\]\(data:image\/[^)]+\)/g)
  if (base64Images) {
    addIssue(issues, {
      id: 'common-base64-image',
      severity: 'warning',
      message: `发现 ${base64Images.length} 张 Base64 内嵌图片`,
      suggestion: '大多数平台不支持 Base64 图片，建议上传至图床',
    })
  }

  // 2. 检测空内容
  const trimmed = markdown.trim()
  if (!trimmed) {
    addIssue(issues, {
      id: 'common-empty-content',
      severity: 'error',
      message: '内容为空',
      suggestion: '请输入需要导出的内容',
    })
  }

  // 3. 检测图片可访问性（外链）
  const externalImages = markdown.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/g)
  if (externalImages && externalImages.length > 5) {
    addIssue(issues, {
      id: 'common-many-images',
      severity: 'suggestion',
      message: `文章包含 ${externalImages.length} 张外链图片`,
      suggestion: '较多外链图片可能导致加载缓慢，发布后请检查图片显示',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 渲染核心检测
// ═══════════════════════════════════════════════════════════════════

const CODE_LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'shell',
  zsh: 'shell',
  yml: 'yaml',
  md: 'markdown',
  cs: 'csharp',
  cplusplus: 'cpp',
  kt: 'kotlin',
}

const SPECIAL_RENDERER_BLOCK_LANGUAGES = DIAGRAM_FENCE_LANGUAGES

function normalizeCodeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase()
  return CODE_LANGUAGE_ALIASES[normalized] ?? normalized
}

function detectRenderingCoreIssues(markdown: string, issues: QualityIssue[]): void {
  const codeBlocks = collectFencedCodeBlocks(markdown)
  const unlabeledBlocks = codeBlocks.filter(block => !block.language).length
  const unsupportedLanguages = Array.from(new Set(
    codeBlocks
      .map(block => normalizeCodeLanguage(block.language))
      .filter(language => language
        && !SPECIAL_RENDERER_BLOCK_LANGUAGES.has(language)
        && !(SUPPORTED_CODE_LANGUAGES as readonly string[]).includes(language)),
  ))
  const inferredUnlabeledLanguages = Array.from(new Set(
    codeBlocks
      .filter(block => !block.language)
      .map(block => inferCodeBlockLanguage(block.code))
      .filter((language): language is string => Boolean(language)),
  ))

  if (unlabeledBlocks > 0) {
    addIssue(issues, {
      id: 'render-code-language-missing',
      severity: 'suggestion',
      message: `发现 ${unlabeledBlocks} 个未声明语言的代码块`,
      suggestion: '为代码块补充语言名，可启用语言标签与稳定语法高亮',
    })
  }

  if (inferredUnlabeledLanguages.length > 0) {
    addIssue(issues, {
      id: 'render-code-language-inferred',
      severity: 'warning',
      message: `发现可推断但未声明语言的代码块: ${inferredUnlabeledLanguages.join(', ')}`,
      suggestion: '当源文档、代码内容或扩展名能确定语言时，导出前应补全 fenced code language，避免知乎等平台高亮失效',
    })
  }

  if (unsupportedLanguages.length > 0) {
    addIssue(issues, {
      id: 'render-code-language-unsupported',
      severity: 'warning',
      message: `发现未覆盖的代码语言: ${unsupportedLanguages.join(', ')}`,
      suggestion: '改用已支持语言别名，或在渲染语言注册表中补充该语言',
    })
  }

  const blobImages = markdown.match(/!\[[^\]]*\]\(blob:[^)]+\)/g)
  if (blobImages) {
    addIssue(issues, {
      id: 'render-blob-image-source',
      severity: 'error',
      message: `发现 ${blobImages.length} 张使用临时 blob: URL 的图片`,
      suggestion: '图片必须通过资产管道写入 IndexedDB，并使用 inkforge-asset:// 稳定引用',
    })
  }

  const localAssetImages = markdown.match(/!\[[^\]]*\]\(inkforge-asset:\/\/[^)]+\)/g)
  if (localAssetImages && localAssetImages.length > 0) {
    addIssue(issues, {
      id: 'render-local-asset-image',
      severity: 'suggestion',
      message: `发现 ${localAssetImages.length} 张本地资产图片`,
      suggestion: '发布前请通过目标平台导出器解析本地资产，避免直接复制内部引用',
    })
  }

  const htmlTables = markdown.match(/<table[\s>]/gi)
  if (htmlTables) {
    addIssue(issues, {
      id: 'render-html-table',
      severity: 'suggestion',
      message: `发现 ${htmlTables.length} 个 HTML 表格`,
      suggestion: 'HTML 表格导出时需要内联样式；编辑器内建议使用原生表格节点以保留结构',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════

function detectMarketEditorResidues(markdown: string, platform: Platform, issues: QualityIssue[]): void {
  const residues = collectMarketEditorResidues(markdown)
  if (residues.length === 0) return

  addIssue(issues, {
    id: getMarketResidueIssueId(platform),
    severity: 'error',
    message: `检测到市场编辑器模板/创作态残留：${residues.join(', ')}`,
    suggestion: getMarketResidueSuggestion(platform),
  })
}

function collectMarketEditorResidues(markdown: string): string[] {
  const scan = stripCodeForTextScans(markdown)
  return Array.from(new Set(
    MARKET_EDITOR_RESIDUE_RULES
      .filter(rule => rule.pattern.test(scan))
      .map(rule => rule.label),
  ))
}

function collectWechatLayoutReportFindings(markupScan: string): string[] {
  return Array.from(new Set(
    WECHAT_LAYOUT_REPORT_RISK_RULES
      .filter(rule => rule.pattern.test(markupScan))
      .map(rule => rule.label),
  ))
}

function getMarketResidueIssueId(platform: Platform): string {
  switch (platform) {
    case 'wechat':
      return 'wechat-market-editor-residue'
    case 'xiaohongshu':
      return 'xhs-market-editor-residue'
    case 'zhihu':
      return 'zhihu-market-editor-residue'
    default: {
      const _exhaustiveCheck: never = platform
      return _exhaustiveCheck
    }
  }
}

function getMarketResidueSuggestion(platform: Platform): string {
  switch (platform) {
    case 'wechat':
      return '135/秀米结构只能作为规则输入；请重写为 InkForge 自有 inline HTML、WeChat-safe SVG、image manifest、layout report 或 raster fallback，不保留市场 class/id/data、authoring 属性或第三方 CDN。'
    case 'xiaohongshu':
      return '小红书正文不能承载市场编辑器 HTML/SVG；请降级为纯文本、图片页或长图 artifact，并重建图片 manifest 与正文图号引用。'
    case 'zhihu':
      return '知乎最终产物必须是 clean Markdown 或公开 HTTPS 图片 fallback；请清理 135/秀米 authoring DOM、style/class 依赖和第三方素材源。'
    default: {
      const _exhaustiveCheck: never = platform
      return _exhaustiveCheck
    }
  }
}

function detectXhsImageReferenceIssues(markdown: string, issues: QualityIssue[]): void {
  const imageCount = collectMarkdownImages(markdown).length
  if (imageCount > XHS_IMAGE_COUNT_REVIEW_THRESHOLD) {
    addIssue(issues, {
      id: 'xhs-image-count-review',
      severity: 'warning',
      message: `发现 ${imageCount} 张图片，超过当前小红书图文市场资料常见的 ${XHS_IMAGE_COUNT_REVIEW_THRESHOLD} 张上限`,
      suggestion: '不要硬编码平台上限；发布前通过真实入口确认当前账号允许数量，并同步重建图片 manifest 与正文图号引用',
    })
    addIssue(issues, {
      id: 'xhs-image-page-count-limit',
      severity: 'error',
      message: `发现 ${imageCount} 张图片，超过当前默认小红书图片页检查上限 ${XHS_IMAGE_PAGE_COUNT_LIMIT}`,
      suggestion: '将页面上限作为可配置发布清单项；超过默认上限时必须由真实发布入口确认或拆分为长图/多篇内容',
    })
  }

  const references = collectXhsImageReferences(markdown)
  if (references.length === 0) return

  const invalidReferences = references.filter(ref => ref < 1 || (imageCount > 0 && ref > imageCount))
  if (imageCount === 0 || invalidReferences.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-reference-mismatch',
      severity: 'error',
      message: imageCount === 0
        ? `正文引用了 ${references.length} 个“见第 N 张图”，但源内容没有可计数图片`
        : `正文引用的图片序号超出现有 ${imageCount} 张图片范围：${[...new Set(invalidReferences)].join(', ')}`,
      suggestion: '新增、删除或重排图片后必须重建 manifest、正文“见第 N 张图”引用、封面页和导出文件列表',
    })
  }
}

function detectXhsImageArtifactIssues(markdown: string, issues: QualityIssue[]): void {
  const images = [
    ...collectMarkdownImages(markdown),
    ...collectHtmlImages(markdown),
  ]
  const unsupportedFormats = Array.from(new Set(
    images
      .map(image => detectImageFormat(image.src))
      .filter((format): format is string => format !== null && !XHS_ALLOWED_IMAGE_FORMATS.has(format)),
  ))

  if (unsupportedFormats.length > 0) {
    addIssue(issues, {
      id: 'xhs-image-format-unsupported',
      severity: 'error',
      message: `发现非 JPG/PNG 图片格式：${unsupportedFormats.join(', ')}`,
      suggestion: '小红书图片页默认只放行 JPG/PNG；SVG/WebP/GIF/HEIC/AVIF 等必须先通过真实转换器生成可预览 artifact，再进入发布清单',
    })
  }
}

function formatXhsManifestPages(pages: XhsImageArtifactPage[]): string {
  return pages
    .map(page => `${page.fileName || `page-${page.page}`}#${page.page}`)
    .join(', ')
}

function formatZhihuManifestArtifacts(artifacts: ZhihuImageArtifact[]): string {
  return artifacts
    .map(artifact => artifact.fileName || artifact.id || artifact.finalSrc || 'unknown-artifact')
    .join(', ')
}

function isZhihuSemanticImageArtifact(artifact: ZhihuImageArtifact): boolean {
  return artifact.kind === 'formula-image'
    || artifact.kind === 'diagram-image'
    || artifact.kind === 'table-image'
    || ZHIHU_SEMANTIC_IMAGE_ALT_PATTERN.test(artifact.alt)
}

function matchesDeclaredXhsRatio(page: XhsImageArtifactPage): boolean {
  if (page.width <= 0 || page.height <= 0) return false

  const ratio = page.width / page.height
  if (page.ratio === '3:4') return Math.abs(ratio - 0.75) <= 0.02
  if (page.ratio === '1:1') return Math.abs(ratio - 1) <= 0.02
  return false
}

function setsAreEqual<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size !== right.size) return false
  for (const item of left) {
    if (!right.has(item)) return false
  }
  return true
}

function detectXhsPlainTextReadabilityIssues(markdown: string, issues: QualityIssue[]): void {
  const hashtags = collectXhsHashtags(markdown)
  if (hashtags.length > XHS_HASHTAG_REVIEW_LIMIT) {
    addIssue(issues, {
      id: 'xhs-hashtag-count',
      severity: 'warning',
      message: `发现 ${hashtags.length} 个话题标签，超过小红书正文建议上限 ${XHS_HASHTAG_REVIEW_LIMIT}`,
      suggestion: '保留 3-8 个高度相关话题；超过 10 个时容易稀释主题，发布前应按当前账号入口复核',
    })
  }

  const maxListRun = countMaxPlainTextListRun(markdown)
  if (maxListRun > XHS_LIST_ITEM_REVIEW_LIMIT) {
    addIssue(issues, {
      id: 'xhs-list-length',
      severity: 'warning',
      message: `发现连续 ${maxListRun} 项列表，超过小红书正文建议的 ${XHS_LIST_ITEM_REVIEW_LIMIT} 项`,
      suggestion: '把长清单拆成多段，或转为图片页/长图以保持手机端扫读节奏',
    })
  }

  const longLineCount = countXhsLongPlainTextLines(markdown)
  if (longLineCount > 0) {
    addIssue(issues, {
      id: 'xhs-long-line',
      severity: 'warning',
      message: `发现 ${longLineCount} 行纯文本超过 ${XHS_LONG_LINE_REVIEW_LIMIT} 字`,
      suggestion: '小红书正文应主动换行和拆段；URL、代码或长句建议转为图片页、搜索关键词或文字摘要',
    })
  }
}

function detectXhsMarkdownControlLeakage(markdown: string, issues: QualityIssue[]): void {
  const leakedControls = [
    [/^#{1,6}\s+\S/m, 'heading'],
    [/\*\*[^*\n][\s\S]*?[^*\n]\*\*/, 'bold'],
    [/(?:^|\s)_[^_\n][^_\n]+_(?:\s|$)/, 'italic'],
    [/!\[[^\]]*\]\([^)]+\)/, 'image'],
    [/^>\s+\S/m, 'quote'],
    [/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/m, 'table-separator'],
    [/```/, 'fenced-code'],
  ] as const
  const detected = leakedControls
    .filter(([pattern]) => pattern.test(markdown))
    .map(([, label]) => label)

  if (detected.length > 0) {
    addIssue(issues, {
      id: 'xhs-markdown-control-leak',
      severity: 'error',
      message: `检测到小红书正文不可直接承载的 Markdown 控制符：${detected.join(', ')}`,
      suggestion: '小红书正文必须是纯文本；标题、加粗、引用、图片和表格等 Markdown 控制符应由导出器清理为文本说明或图片页/长图 artifact',
    })
  }
}

function detectZhihuInvalidTableSeparatorIssues(markdown: string, issues: QualityIssue[]): void {
  const invalidLines = collectInvalidMarkdownTableSeparatorLines(markdown)
  if (invalidLines.length > 0) {
    addIssue(issues, {
      id: 'zhihu-table-separator-invalid',
      severity: 'error',
      message: `检测到 ${invalidLines.length} 个不合法的 Markdown 表格分隔行`,
      suggestion: `表格分隔行必须与表头列数一致，且每列至少使用 ---；请修正第 ${invalidLines.join(', ')} 行后再导出知乎`,
    })
  }
}

function detectZhihuImageIssues(markdown: string, issues: QualityIssue[]): void {
  const markdownImages = collectMarkdownImages(markdown)
  const htmlImages = collectHtmlImages(markdown)
  const blockedSources = [
    ...markdownImages.map(image => image.src),
    ...htmlImages.map(image => image.src),
  ].filter(isBlockedZhihuImageSource)

  if (blockedSources.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-host-blocked',
      severity: 'error',
      message: `发现 ${blockedSources.length} 个不适合作为知乎最终产物的图片地址`,
      suggestion: '知乎最终 Markdown 图片必须使用稳定公开 HTTPS 地址，或真实知乎/目标发布入口上传后返回的平台图床地址；本地、blob/data、私网、http 和微信专用 CDN 必须重写或阻断',
    })
  }

  const missingAlt = [
    ...markdownImages.filter(image => !image.alt.trim()),
    ...htmlImages.filter(image => !image.alt.trim()),
  ]
  if (missingAlt.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-alt-missing',
      severity: 'warning',
      message: `发现 ${missingAlt.length} 张图片缺少 alt 文本`,
      suggestion: '知乎图片 fallback、公式图、表格图和图表图必须保留 alt；图片替代语义内容时还应保留 caption 或文字说明',
    })
  }
}

function detectZhihuImageCaptionIssues(markdown: string, issues: QualityIssue[]): void {
  const semanticImages = collectImageRefsWithLine(markdown)
    .filter(image => ZHIHU_SEMANTIC_IMAGE_ALT_PATTERN.test(image.alt))
    .filter(image => !hasNearbyZhihuCaption(markdown, image.lineIndex))

  if (semanticImages.length > 0) {
    addIssue(issues, {
      id: 'zhihu-image-caption-missing',
      severity: 'warning',
      message: `发现 ${semanticImages.length} 张公式/图表/表格类图片缺少邻近 caption 或文字说明`,
      suggestion: '知乎图片 fallback 应同时提供 alt 与 caption/text fallback，确保公式、表格或图表图片化后仍可理解',
    })
  }
}

function detectZhihuResidualHtmlDependencyIssues(markdown: string, issues: QualityIssue[]): void {
  const htmlDependencyTags = Array.from(markdown.matchAll(/<[a-zA-Z][^>]*>/g))
    .map(match => match[0])
    .filter(tag => {
      const name = tag.match(/^<\s*([a-zA-Z0-9-]+)/)?.[1]?.toLowerCase() ?? ''
      if (name === 'img' && isAllowedZhihuEquationImgTag(tag)) return false
      if (['section', 'div', 'article', 'aside', 'figure', 'figcaption'].includes(name)) return true
      if (/^mp(?:voice|video)$/.test(name)) return true
      return /\s(?:style|class)=|data-ink-(?:block|svg)=/i.test(tag)
    })

  if (htmlDependencyTags.length > 0) {
    addIssue(issues, {
      id: 'zhihu-html-dependency',
      severity: 'error',
      message: `检测到 ${htmlDependencyTags.length} 个依赖 HTML/CSS/微信包装的节点`,
      suggestion: '知乎最终 Markdown 不能依赖 section/div、style/class、微信 wrapper 或微信专属媒体标签；请清理为语义 Markdown 或图片 fallback',
    })
  }
}

function detectZhihuComplexTableIssues(markdown: string, issues: QualityIssue[]): void {
  const htmlTables = markdown.match(/<table\b[\s\S]*?<\/table>/gi) ?? []
  const complexHtmlTables = htmlTables.filter(table =>
    /\s(?:style|class|rowspan|colspan)=/i.test(table)
    || /<(?:section|div|p|ul|ol|pre|code)\b/i.test(table),
  )
  const markdownTables = collectMarkdownTableBlocks(markdown)
  const complexMarkdownTables = markdownTables.filter(table => {
    const columnCount = countMarkdownTableColumns(table)
    return columnCount > 6
      || /<br\s*\/?>|<(?:section|div|p|ul|ol|pre|code)\b|`[^`]+`/i.test(table)
  })
  const total = complexHtmlTables.length + complexMarkdownTables.length

  if (total > 0) {
    addIssue(issues, {
      id: 'zhihu-complex-table',
      severity: 'error',
      message: `检测到 ${total} 个复杂表格，可能无法作为知乎 clean Markdown 稳定发布`,
      suggestion: '将多段落/列表/代码单元格、宽表格或依赖 HTML 属性的表格简化为语义 Markdown 表格，或图片化并保留 alt/caption',
    })
  }
}

function collectDiagramFenceLanguages(markdown: string): string[] {
  return Array.from(markdown.matchAll(/^```([^\s`]*)/gmi))
    .map(match => normalizeCodeLanguage(match[1] ?? ''))
    .filter(language => DIAGRAM_FENCE_LANGUAGES.has(language))
}

interface MarkdownImageRef {
  alt: string
  src: string
}

interface FencedCodeBlock {
  language: string
  code: string
}

function collectFencedCodeBlocks(markdown: string): FencedCodeBlock[] {
  return Array.from(markdown.matchAll(/^```([^\s`]*)[^\n]*\n([\s\S]*?)^```/gm))
    .map(match => ({
      language: match[1] ?? '',
      code: match[2] ?? '',
    }))
}

function collectMarkdownImages(markdown: string): MarkdownImageRef[] {
  return Array.from(markdown.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g))
    .map(match => ({
      alt: match[1] ?? '',
      src: match[2] ?? '',
    }))
}

function collectHtmlImages(markdown: string): MarkdownImageRef[] {
  return Array.from(markdown.matchAll(/<img\b[^>]*>/gi))
    .map(match => ({
      alt: getHtmlAttribute(match[0], 'alt'),
      src: getHtmlAttribute(match[0], 'src'),
    }))
    .filter(image => image.src)
}

function detectImageFormat(src: string): string | null {
  const normalized = src.trim().toLowerCase()
  const dataFormat = normalized.match(/^data:image\/([a-z0-9.+-]+)/i)?.[1]
  if (dataFormat) return normalizeImageFormat(dataFormat)

  const pathWithoutQuery = normalized.split(/[?#]/, 1)[0]
  const ext = pathWithoutQuery.match(/\.([a-z0-9]+)$/i)?.[1]
  return ext ? normalizeImageFormat(ext) : null
}

function normalizeImageFormat(format: string): string {
  const normalized = format.toLowerCase()
  if (normalized === 'jpg' || normalized === 'jpeg') return normalized
  if (normalized === 'svg+xml') return 'svg'
  return normalized
}

function isAllowedZhihuEquationImgTag(tag: string): boolean {
  return /^<img\b/i.test(tag)
    && /\bclass=["']ee_img tr_noresize["']/i.test(tag)
    && /\beeimg=["']?1["']?/i.test(tag)
}

function collectMarkdownTableBlocks(markdown: string): string[] {
  const lines = markdown.split('\n')
  const blocks: string[] = []
  const separatorPattern = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/

  for (let i = 1; i < lines.length; i++) {
    if (!separatorPattern.test(lines[i])) continue

    let start = i - 1
    while (start > 0 && lines[start - 1].includes('|') && lines[start - 1].trim()) {
      start--
    }

    let end = i + 1
    while (end < lines.length && lines[end].includes('|') && lines[end].trim()) {
      end++
    }

    blocks.push(lines.slice(start, end).join('\n'))
    i = end
  }

  return blocks
}

function countMarkdownTableColumns(table: string): number {
  const header = table.split('\n').find(line => line.includes('|')) ?? ''
  return countMarkdownTableLineColumns(header)
}

function countMarkdownTableLineColumns(line: string): number {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed ? trimmed.split('|').length : 0
}

function collectInvalidMarkdownTableSeparatorLines(markdown: string): number[] {
  const lines = stripFencedCodeBlocksPreservingLines(markdown).split('\n')
  const separatorLikePattern = /^\s*\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)+\|?\s*$/
  const validSeparatorPattern = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/
  const invalidLines: number[] = []

  for (let i = 1; i < lines.length; i++) {
    const separator = lines[i]
    const header = lines[i - 1]
    if (!header.includes('|') || !separatorLikePattern.test(separator)) continue

    const headerColumnCount = countMarkdownTableLineColumns(header)
    const separatorColumnCount = countMarkdownTableLineColumns(separator)
    if (!validSeparatorPattern.test(separator) || headerColumnCount !== separatorColumnCount) {
      invalidLines.push(i + 1)
    }
  }

  return invalidLines
}

function inferCodeBlockLanguage(code: string): string | null {
  const trimmed = code.trim()
  if (!trimmed) return null
  const looksLikeJsonContainer = (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  if (looksLikeJsonContainer && /"[^"]+"\s*:/.test(trimmed)) return 'json'
  if (/\b(?:import|export)\b[\s\S]*\bfrom\b|\b(?:const|let|interface|type)\s+\w+|:\s*(?:string|number|boolean)\b/.test(trimmed)) {
    return 'typescript'
  }
  if (/^\s*(?:def|class)\s+\w+|^\s*from\s+\w+\s+import\b|^\s*import\s+\w+/m.test(trimmed)) return 'python'
  if (/\bSELECT\b[\s\S]+\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\b[\s\S]+\bSET\b/i.test(trimmed)) return 'sql'
  if (/^\s*(?:curl|npm|pnpm|git|docker|cd|export)\b/m.test(trimmed)) return 'shell'
  return null
}

function getHtmlAttribute(tag: string, name: string): string {
  const pattern = new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, 'i')
  return tag.match(pattern)?.[2] ?? ''
}

interface ImageRefWithLine extends MarkdownImageRef {
  lineIndex: number
}

function collectImageRefsWithLine(markdown: string): ImageRefWithLine[] {
  const lines = markdown.split('\n')
  const images: ImageRefWithLine[] = []

  lines.forEach((line, lineIndex) => {
    for (const match of line.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g)) {
      images.push({
        alt: match[1] ?? '',
        src: match[2] ?? '',
        lineIndex,
      })
    }

    for (const match of line.matchAll(/<img\b[^>]*>/gi)) {
      const src = getHtmlAttribute(match[0], 'src')
      if (!src) continue
      images.push({
        alt: getHtmlAttribute(match[0], 'alt'),
        src,
        lineIndex,
      })
    }
  })

  return images
}

function hasNearbyZhihuCaption(markdown: string, imageLineIndex: number): boolean {
  const lines = markdown.split('\n')
  const captionPattern = /^(?:图|表|公式|说明|注|备注|caption|figure|table)\s*[\d一二三四五六七八九十A-Za-z.-]*\s*[:：.、-]/i
  for (const offset of [-2, -1, 1, 2]) {
    const line = lines[imageLineIndex + offset]?.trim()
    if (!line || /!\[[^\]]*\]\([^)]+\)|<img\b/i.test(line)) continue
    if (captionPattern.test(line) || /(?:图注|表注|公式说明|图表说明|文字说明|text fallback)/i.test(line)) {
      return true
    }
  }
  return false
}

function stripCodeForTextScans(markdown: string): string {
  return stripFencedCodeBlocksPreservingLines(markdown).replace(/`[^`]+`/g, '')
}

function stripFencedCodeBlocksPreservingLines(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, block => block.replace(/[^\n]/g, ''))
}

function collectXhsHashtags(markdown: string): string[] {
  return Array.from(stripCodeForTextScans(markdown).matchAll(/(^|[\s,，。；;、])#([\p{L}\p{N}_-]{1,30})(?=$|[\s,，。；;、.!?！？])/gu))
    .map(match => match[2] ?? '')
}

function countMaxPlainTextListRun(markdown: string): number {
  const lines = stripCodeForTextScans(markdown).split('\n')
  let maxRun = 0
  let currentRun = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (/^(?:[-*+]\s+\S|\d{1,2}[.)、]\s*\S|[（(]\d{1,2}[）)]\s*\S|\[(?:要点|提示|清单|步骤)\])/.test(trimmed)) {
      currentRun += 1
      maxRun = Math.max(maxRun, currentRun)
    } else {
      currentRun = 0
    }
  }

  return maxRun
}

function countXhsLongPlainTextLines(markdown: string): number {
  return stripCodeForTextScans(markdown)
    .split('\n')
    .map(line => stripMarkdownSyntax(line).trim())
    .filter(line => line.length > XHS_LONG_LINE_REVIEW_LIMIT)
    .length
}

function collectXhsImageReferences(markdown: string): number[] {
  return Array.from(markdown.matchAll(/见第\s*([0-9一二三四五六七八九十]+)\s*张图/g))
    .map(match => parseChineseOrArabicNumber(match[1] ?? ''))
    .filter((value): value is number => value !== null)
}

function parseChineseOrArabicNumber(raw: string): number | null {
  if (/^\d+$/.test(raw)) return parseInt(raw, 10)

  const digitMap: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }
  if (raw === '十') return 10
  if (raw.startsWith('十')) {
    const ones = digitMap[raw.slice(1)] ?? 0
    return 10 + ones
  }
  if (raw.endsWith('十')) {
    const tens = digitMap[raw.slice(0, -1)]
    return tens === undefined ? null : tens * 10
  }
  if (raw.includes('十')) {
    const [tensRaw, onesRaw] = raw.split('十')
    const tens = digitMap[tensRaw]
    const ones = digitMap[onesRaw] ?? 0
    return tens === undefined ? null : tens * 10 + ones
  }

  return digitMap[raw] ?? null
}

function isBlockedZhihuImageSource(src: string): boolean {
  const normalized = src.trim()
  const lower = normalized.toLowerCase()
  if (!normalized) return true
  if (/^(?:blob:|data:|file:)/i.test(normalized)) return true
  if (/^(?:\.{1,2}\/|\/|[a-z]:\\|[a-z]:\/)/i.test(normalized)) return true
  if (/^http:\/\//i.test(normalized)) return true
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)/i.test(normalized)) return true
  if (/^https?:\/\/(?:mmbiz\.qpic\.cn|mmbiz\.qlogo\.cn|res\.wx\.qq\.com)\//i.test(normalized)) return true
  return !lower.startsWith('https://')
}

/** 检测 LaTeX 语法错误（不匹配的 $） */
function detectLatexErrors(text: string, issues: QualityIssue[]): void {
  // 先移除代码块内容，避免误检
  const withoutCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')

  // 检查块级 $$ 是否匹配
  const blockDelimiters = withoutCode.match(/\$\$/g)
  if (blockDelimiters && blockDelimiters.length % 2 !== 0) {
    addIssue(issues, {
      id: 'zhihu-latex-unmatched-block',
      severity: 'error',
      message: '检测到不匹配的 $$ 块级公式定界符',
      suggestion: '确保每个 $$ 都有对应的闭合 $$',
    })
  }

  // 检查行内 $ 是否匹配（粗略检查）
  const lines = withoutCode.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 跳过 $$ 行
    if (line.trim().startsWith('$$')) continue
    // 统计独立 $ 数量
    const matches = line.match(/(?<!\$)\$(?!\$)/g)
    if (matches && matches.length % 2 !== 0) {
      addIssue(issues, {
        id: 'zhihu-latex-unmatched-inline',
        severity: 'error',
        message: `第 ${i + 1} 行检测到不匹配的 $ 行内公式定界符`,
        suggestion: '确保每个 $ 都有对应的闭合 $，或使用 \\$ 转义',
        location: `Line ${i + 1}`,
      })
      break // 只报告第一个
    }
  }
}

/** 添加质量问题到列表 */
function addIssue(issues: QualityIssue[], issue: QualityIssue): void {
  issues.push(issue)
}

/** 去除 Markdown 语法标记，返回近似纯文本长度 */
function stripMarkdownSyntax(markdown: string): string {
  let text = markdown
  // 代码块
  text = text.replace(/```[\s\S]*?```/g, '')
  // 行内代码
  text = text.replace(/`[^`]+`/g, (m) => m.slice(1, -1))
  // 图片
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  // 链接
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // 标题标记
  text = text.replace(/^#{1,6}\s+/gm, '')
  // 加粗/斜体
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/__(.+?)__/g, '$1')
  text = text.replace(/\*(.+?)\*/g, '$1')
  text = text.replace(/_(.+?)_/g, '$1')
  // 删除线
  text = text.replace(/~~(.+?)~~/g, '$1')
  // 列表标记
  text = text.replace(/^[\s]*[-*+]\s+/gm, '')
  text = text.replace(/^[\s]*\d+\.\s+/gm, '')
  // 引用
  text = text.replace(/^>\s*/gm, '')
  // 水平线
  text = text.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '')
  // 表格分隔行
  text = text.replace(/^\|[-: |]+\|$/gm, '')
  // 表格管道符
  text = text.replace(/\|/g, ' ')
  // HTML 标签
  text = text.replace(/<[^>]+>/g, '')
  // 连续空行
  text = text.replace(/\n{2,}/g, '\n')

  return text.trim()
}

/** 统计装饰标记数量 */
function countDecorativeMarkers(text: string): number {
  const markerPattern = /(?:^|\s)(?:【|〔|◆|◇|▫|○|▸|·|要点：|说明：|提示：|摘录：|片段：|检索关键词|查找关键词|\[代码\]|\[配图\]|\[图片\]|\[示意图\]|\[公式\]|\[表格\]|\[数据\])/gm
  const matches = text.match(markerPattern)
  return matches ? matches.length : 0
}

// ═══════════════════════════════════════════════════════════════════
// 批量检测
// ═══════════════════════════════════════════════════════════════════

/**
 * 同时对 Markdown 执行所有平台的质量检测
 * 适用于用户还没选定平台时的预览场景
 */
export function detectQualityAll(markdown: string): Record<Platform, QualityReport> {
  return {
    wechat: detectQuality(markdown, 'wechat'),
    xiaohongshu: detectQuality(markdown, 'xiaohongshu'),
    zhihu: detectQuality(markdown, 'zhihu'),
  }
}

/**
 * 快速检测：仅返回是否通过，不含详细信息
 */
export function quickCheck(markdown: string, platform: Platform): boolean {
  return detectQuality(markdown, platform).passed
}

/**
 * 获取指定严重度的问题
 */
export function filterIssues(
  report: QualityReport,
  severity: QualityIssueSeverity
): QualityIssue[] {
  return report.issues.filter(i => i.severity === severity)
}
