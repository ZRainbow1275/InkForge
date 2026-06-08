import type { Platform } from './types'

export type StyleChoiceStatus = 'available' | 'blocked' | 'unavailable'

export type StyleEvidenceLabel =
  | 'doc-only'
  | 'applied-editor-element'
  | 'authenticated-editor-reachable'
  | 'pc-editor-dom-readable'
  | 'unit-tested'
  | 'local-browser'
  | 'pc-editor-paste'
  | 'mobile-preview'
  | 'credentialed-sync'
  | 'published'

export type StyleProofRequirementId =
  | 'catalog-source'
  | 'market-applied-dom-readback'
  | 'no-proprietary-template-source'
  | 'authenticated-editor-url'
  | 'pc-editor-dom-readback'
  | 'unit-test-coverage'
  | 'local-browser-rendering'
  | 'exact-artifact'
  | 'safe-disposable-draft'
  | 'pc-editor-paste-event'
  | 'phone-preview-readback'
  | 'phone-screenshot'
  | 'dark-mode-check'
  | 'cover-thumbnail-check'
  | 'credentialed-channel-response'
  | 'sync-readback'
  | 'published-url-or-platform-preview'
  | 'public-image-host'
  | 'xhs-artifact-manifest'
  | 'no-sensitive-artifact'

export interface StyleProofRequirement {
  id: StyleProofRequirementId
  label: string
  description: string
}

export type StyleVisualStrength = 'low' | 'medium' | 'medium-high' | 'high'
export type StyleMotionLevel = 'none' | 'static' | 'click-candidate' | 'mobile-only'

export type StyleArtifactType =
  | 'inline-html'
  | 'wechat-safe-svg'
  | 'plain-text'
  | 'image-page'
  | 'long-image'
  | 'clean-markdown'
  | 'image-fallback'
  | 'publish-checklist'
  | 'static-fallback'
  | 'unavailable'

export type StyleRuleGroup =
  | 'headline-system'
  | 'body-system'
  | 'card-system'
  | 'figure-system'
  | 'guide-system'
  | 'interactive-system'
  | 'fallback-system'
  | 'editor-workflow-system'
  | 'layout-and-layer-system'

export interface PlatformStyleChoice {
  id: string
  platform: Platform
  label: string
  ruleGroup: StyleRuleGroup
  contentBlocks: readonly string[]
  visualStrength: StyleVisualStrength
  motion: StyleMotionLevel
  primaryOutput: StyleArtifactType
  fallbackOutput: StyleArtifactType
  status: StyleChoiceStatus
  evidenceFloor: StyleEvidenceLabel
  publishEvidence: readonly StyleEvidenceLabel[]
  blockers: readonly string[]
  detectorBlockers: readonly string[]
}

export interface StyleChoiceAvailability {
  choice: PlatformStyleChoice
  usable: boolean
  status: StyleChoiceStatus
  requiredEvidence: StyleEvidenceLabel
  bestEvidence: StyleEvidenceLabel | null
  reason: string
}

export interface PlatformStyleAvailabilityReport {
  platform: Platform
  evidence: readonly StyleEvidenceLabel[]
  choices: readonly StyleChoiceAvailability[]
  stats: {
    total: number
    usable: number
    blocked: number
    unavailable: number
  }
}

export type StyleChoiceApplicationScope = 'styled-preview' | 'native-output' | 'styled-and-native'

export interface StyleChoiceApplication {
  choiceId: string
  platform: Platform
  presetId: string
  presetLabel: string
  scope: StyleChoiceApplicationScope
  note: string
}

export interface StyleChoiceApplicationAvailability {
  availability: StyleChoiceAvailability
  application: StyleChoiceApplication | null
  selectable: boolean
  reason: string
}

const EVIDENCE_RANK: Record<StyleEvidenceLabel, number> = {
  'doc-only': 0,
  'applied-editor-element': 1,
  'authenticated-editor-reachable': 1.5,
  'pc-editor-dom-readable': 1.75,
  'unit-tested': 2,
  'local-browser': 3,
  'pc-editor-paste': 4,
  'mobile-preview': 5,
  'credentialed-sync': 6,
  published: 7,
}

export const STYLE_PROOF_REQUIREMENTS = [
  {
    id: 'catalog-source',
    label: 'cataloged source',
    description: 'The style or platform behavior is documented as a source rule only.',
  },
  {
    id: 'market-applied-dom-readback',
    label: 'market editor applied DOM readback',
    description: 'A concrete market editor element was applied visually and its DOM/controls were read.',
  },
  {
    id: 'no-proprietary-template-source',
    label: 'no proprietary template source',
    description: 'No third-party template source, paid asset, private SVG, account data, or CDN dependency is copied.',
  },
  {
    id: 'authenticated-editor-url',
    label: 'authenticated editor URL',
    description: 'The real target editor URL is reachable in the required authenticated browser profile.',
  },
  {
    id: 'pc-editor-dom-readback',
    label: 'PC editor DOM readback',
    description: 'The real PC editor title/body DOM is readable and visually confirmed.',
  },
  {
    id: 'unit-test-coverage',
    label: 'unit test coverage',
    description: 'Focused tests cover the renderer, detector, fallback, or catalog contract.',
  },
  {
    id: 'local-browser-rendering',
    label: 'local browser rendering',
    description: 'A real local browser or Tauri/WebView run proves visibility, sizing, and no overflow.',
  },
  {
    id: 'exact-artifact',
    label: 'exact artifact',
    description: 'The same exported InkForge artifact, preset, and channel under review are used as proof.',
  },
  {
    id: 'safe-disposable-draft',
    label: 'safe disposable draft',
    description: 'The target platform draft is disposable or has a verified cleanup path before mutation.',
  },
  {
    id: 'pc-editor-paste-event',
    label: 'PC editor paste event',
    description: 'The exact artifact is inserted through the real PC editor paste/channel path.',
  },
  {
    id: 'phone-preview-readback',
    label: 'phone preview readback',
    description: 'Phone preview shows the exact artifact after platform sanitizer and preview rendering.',
  },
  {
    id: 'phone-screenshot',
    label: 'phone screenshot',
    description: 'A phone-side screenshot or equivalent inspected preview evidence is captured safely.',
  },
  {
    id: 'dark-mode-check',
    label: 'Dark Mode check',
    description: 'Phone Dark Mode contrast and SVG/background behavior are inspected for the exact artifact.',
  },
  {
    id: 'cover-thumbnail-check',
    label: 'cover thumbnail check',
    description: 'Cover crop, thumbnail, and article card presentation are inspected separately.',
  },
  {
    id: 'credentialed-channel-response',
    label: 'credentialed channel response',
    description: 'A real credentialed sync, plugin, upload, or API channel returns a successful response.',
  },
  {
    id: 'sync-readback',
    label: 'sync readback',
    description: 'The synced draft/material is read back from the target platform, not inferred from request success.',
  },
  {
    id: 'published-url-or-platform-preview',
    label: 'published or platform preview',
    description: 'A final platform preview, publish result, or published page is inspected for the exact artifact.',
  },
  {
    id: 'public-image-host',
    label: 'public image host',
    description: 'Image fallback URLs are public HTTPS or platform-hosted, with alt/caption context.',
  },
  {
    id: 'xhs-artifact-manifest',
    label: 'XHS artifact manifest',
    description: 'Image page, long-image, cover, count, order, ratio, and reference manifest are consistent.',
  },
  {
    id: 'no-sensitive-artifact',
    label: 'no sensitive artifact',
    description: 'Cookies, credential strings, QR codes, local profile paths, account IDs, HTTP archives, and captured images are redacted or kept local.',
  },
] as const satisfies readonly StyleProofRequirement[]

const STYLE_PROOF_REQUIREMENT_BY_ID = new Map<StyleProofRequirementId, StyleProofRequirement>(
  STYLE_PROOF_REQUIREMENTS.map(requirement => [requirement.id, requirement]),
)

const EVIDENCE_PROOF_REQUIREMENT_IDS = {
  'doc-only': ['catalog-source'],
  'applied-editor-element': ['market-applied-dom-readback', 'no-proprietary-template-source'],
  'authenticated-editor-reachable': ['authenticated-editor-url', 'no-sensitive-artifact'],
  'pc-editor-dom-readable': ['authenticated-editor-url', 'pc-editor-dom-readback', 'no-sensitive-artifact'],
  'unit-tested': ['unit-test-coverage'],
  'local-browser': ['unit-test-coverage', 'local-browser-rendering'],
  'pc-editor-paste': [
    'exact-artifact',
    'safe-disposable-draft',
    'pc-editor-paste-event',
    'pc-editor-dom-readback',
    'no-sensitive-artifact',
  ],
  'mobile-preview': [
    'exact-artifact',
    'phone-preview-readback',
    'phone-screenshot',
    'dark-mode-check',
    'cover-thumbnail-check',
    'no-sensitive-artifact',
  ],
  'credentialed-sync': [
    'credentialed-channel-response',
    'sync-readback',
    'public-image-host',
    'xhs-artifact-manifest',
    'no-sensitive-artifact',
  ],
  published: [
    'exact-artifact',
    'published-url-or-platform-preview',
    'no-sensitive-artifact',
  ],
} as const satisfies Record<StyleEvidenceLabel, readonly StyleProofRequirementId[]>

export const DEFAULT_STYLE_EVIDENCE_BY_PLATFORM = {
  wechat: ['unit-tested', 'local-browser'],
  xiaohongshu: ['unit-tested', 'local-browser'],
  zhihu: ['unit-tested'],
} as const satisfies Record<Platform, readonly StyleEvidenceLabel[]>

const STYLE_CHOICE_APPLICATIONS = [
  {
    choiceId: 'wechat-classic-inline',
    platform: 'wechat',
    presetId: 'report',
    presetLabel: '行业研报',
    scope: 'styled-and-native',
    note: 'uses the existing default WeChat inline HTML preset and current export options',
  },
  {
    choiceId: 'wechat-quiet-editorial',
    platform: 'wechat',
    presetId: 'flagship-tempera',
    presetLabel: '铜绿旗舰',
    scope: 'styled-and-native',
    note: 'uses the flagship editorial decorator chain for lede, reading bar, pullquote, and footer blocks',
  },
  {
    choiceId: 'wechat-cover-seal-divider',
    platform: 'wechat',
    presetId: 'flagship-kiln',
    presetLabel: '赤陶旗舰',
    scope: 'styled-and-native',
    note: 'uses the existing WeChat-safe SVG cover and divider renderer in the Kiln flagship preset',
  },
  {
    choiceId: 'wechat-card-rich',
    platform: 'wechat',
    presetId: 'flagship-tempera',
    presetLabel: '铜绿旗舰',
    scope: 'styled-and-native',
    note: 'uses the current flagship marker/card decorator chain without enabling unproven interactive output',
  },
  {
    choiceId: 'wechat-flagship-kiln',
    platform: 'wechat',
    presetId: 'flagship-kiln',
    presetLabel: '赤陶旗舰',
    scope: 'styled-and-native',
    note: 'direct mapping to the existing Kiln flagship export preset',
  },
  {
    choiceId: 'wechat-flagship-tempera',
    platform: 'wechat',
    presetId: 'flagship-tempera',
    presetLabel: '铜绿旗舰',
    scope: 'styled-and-native',
    note: 'direct mapping to the existing Tempera flagship export preset',
  },
  {
    choiceId: 'wechat-flagship-amber',
    platform: 'wechat',
    presetId: 'flagship-amber',
    presetLabel: '黄铜旗舰',
    scope: 'styled-and-native',
    note: 'kept mapped but disabled until the real WeChat paste gate is no longer blocked',
  },
  {
    choiceId: 'xhs-clean-text',
    platform: 'xiaohongshu',
    presetId: 'xhs-fresh',
    presetLabel: '清新少女',
    scope: 'styled-and-native',
    note: 'uses the current Xiaohongshu plain-text native exporter and matching preview preset',
  },
  {
    choiceId: 'zhihu-clean-column',
    platform: 'zhihu',
    presetId: 'zhihu-academic',
    presetLabel: '学术论文',
    scope: 'styled-and-native',
    note: 'uses the clean Markdown native exporter and existing Zhihu academic preview preset',
  },
  {
    choiceId: 'zhihu-academic-latex-column',
    platform: 'zhihu',
    presetId: 'zhihu-academic',
    presetLabel: '学术论文',
    scope: 'styled-and-native',
    note: 'uses the clean Markdown native exporter with the academic preview preset',
  },
  {
    choiceId: 'zhihu-wechat-adapted',
    platform: 'zhihu',
    presetId: 'zhihu-insight',
    presetLabel: '深度评论',
    scope: 'styled-and-native',
    note: 'uses the existing semantic cleanup path plus the insight preview preset',
  },
  {
    choiceId: 'zhihu-data-table',
    platform: 'zhihu',
    presetId: 'zhihu-tech',
    presetLabel: '技术博客',
    scope: 'styled-and-native',
    note: 'uses semantic Markdown table output and the existing Zhihu tech preview preset',
  },
] as const satisfies readonly StyleChoiceApplication[]

export const PLATFORM_STYLE_CHOICES = [
  {
    id: 'wechat-classic-inline',
    platform: 'wechat',
    label: 'Classic WeChat inline preset',
    ruleGroup: 'body-system',
    contentBlocks: ['headings', 'paragraphs', 'quotes', 'tables', 'code'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'inline-html',
    fallbackOutput: 'static-fallback',
    status: 'available',
    evidenceFloor: 'unit-tested',
    publishEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
    blockers: ['WeChat sanitizer changed for inline styles', 'target article requires official-only widgets'],
    detectorBlockers: ['wechat-unsupported-css', 'wechat-event-handler', 'wechat-katex-html'],
  },
  {
    id: 'wechat-quiet-editorial',
    platform: 'wechat',
    label: 'Quiet Press editorial blocks',
    ruleGroup: 'card-system',
    contentBlocks: ['lede', 'reading bar', 'pullquote', 'footer'],
    visualStrength: 'medium',
    motion: 'static',
    primaryOutput: 'inline-html',
    fallbackOutput: 'static-fallback',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
    blockers: ['fixed readable containers', 'Dark Mode contrast not inspected'],
    detectorBlockers: ['wechat-fixed-container-size', 'wechat-line-height-zero', 'wechat-text-align-logical'],
  },
  {
    id: 'wechat-toolbar-parameter-map',
    platform: 'wechat',
    label: 'Toolbar typography parameter map',
    ruleGroup: 'body-system',
    contentBlocks: ['font size', 'line spacing', 'letter spacing', 'indent', 'side padding'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'inline-html',
    fallbackOutput: 'static-fallback',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
    blockers: ['toolbar parameters must compile through the existing WeChat renderer', 'Dark Mode preview not inspected'],
    detectorBlockers: ['wechat-unsupported-css', 'wechat-line-height-zero', 'wechat-text-align-logical'],
  },
  {
    id: 'wechat-cover-seal-divider',
    platform: 'wechat',
    label: 'Static cover seal and divider SVG',
    ruleGroup: 'headline-system',
    contentBlocks: ['cover motif', 'section divider', 'endmark seal'],
    visualStrength: 'high',
    motion: 'static',
    primaryOutput: 'wechat-safe-svg',
    fallbackOutput: 'image-fallback',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
    blockers: ['fresh WeChat PC paste missing for this exact artifact', 'cover thumbnail not separately proven'],
    detectorBlockers: ['wechat-unsafe-svg-construct', 'wechat-class-id-dependency', 'wechat-fixed-container-size'],
  },
  {
    id: 'wechat-card-rich',
    platform: 'wechat',
    label: 'Rich cards and timeline blocks',
    ruleGroup: 'card-system',
    contentBlocks: ['pullquote', 'data card', 'comparison card', 'timeline', 'checklist'],
    visualStrength: 'medium-high',
    motion: 'static',
    primaryOutput: 'inline-html',
    fallbackOutput: 'static-fallback',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
    blockers: ['fixed containers or invisible image overlays must be rejected', 'mobile Dark Mode proof missing'],
    detectorBlockers: ['wechat-fixed-container-size', 'wechat-transparent-image-svg-overlay', 'wechat-important-style'],
  },
  {
    id: 'wechat-flagship-kiln',
    platform: 'wechat',
    label: 'Kiln creative flagship',
    ruleGroup: 'headline-system',
    contentBlocks: ['cover', 'chapter headers', 'dividers', 'quote cards', 'endmark'],
    visualStrength: 'high',
    motion: 'static',
    primaryOutput: 'wechat-safe-svg',
    fallbackOutput: 'image-fallback',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
    blockers: ['fresh mobile WeChat preview missing', 'cover thumbnail not separately proven'],
    detectorBlockers: ['wechat-unsafe-svg-construct', 'wechat-unsupported-css', 'wechat-class-id-dependency'],
  },
  {
    id: 'wechat-flagship-tempera',
    platform: 'wechat',
    label: 'Tempera academic flagship',
    ruleGroup: 'headline-system',
    contentBlocks: ['cover', 'toc', 'chapter headers', 'figure frames', 'footer'],
    visualStrength: 'medium-high',
    motion: 'static',
    primaryOutput: 'wechat-safe-svg',
    fallbackOutput: 'image-fallback',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
    blockers: ['fresh mobile WeChat preview missing', 'Dark Mode phone proof missing'],
    detectorBlockers: ['wechat-unsafe-svg-construct', 'wechat-unsupported-css', 'wechat-katex-html'],
  },
  {
    id: 'wechat-flagship-amber',
    platform: 'wechat',
    label: 'Amber business flagship',
    ruleGroup: 'headline-system',
    contentBlocks: ['cover', 'business cards', 'timeline', 'comparison', 'footer'],
    visualStrength: 'medium-high',
    motion: 'static',
    primaryOutput: 'wechat-safe-svg',
    fallbackOutput: 'static-fallback',
    status: 'blocked',
    evidenceFloor: 'pc-editor-paste',
    publishEvidence: ['mobile-preview', 'published'],
    blockers: ['2026-06-08 real WeChat PC paste reduced the rich HTML artifact to plain text', 'mobile preview proof missing'],
    detectorBlockers: ['wechat-unsafe-svg-construct', 'wechat-unsupported-css', 'wechat-event-handler'],
  },
  {
    id: 'wechat-click-reveal',
    platform: 'wechat',
    label: 'Click reveal SVG candidate',
    ruleGroup: 'interactive-system',
    contentBlocks: ['interactive cards', 'progressive disclosure'],
    visualStrength: 'high',
    motion: 'click-candidate',
    primaryOutput: 'wechat-safe-svg',
    fallbackOutput: 'static-fallback',
    status: 'blocked',
    evidenceFloor: 'mobile-preview',
    publishEvidence: ['mobile-preview', 'published'],
    blockers: ['SMIL/click behavior must be proven on phone WeChat before availability'],
    detectorBlockers: ['wechat-svg-touchstart-only', 'wechat-event-handler', 'wechat-unsafe-svg-construct'],
  },
  {
    id: 'wechat-mobile-only-effect',
    platform: 'wechat',
    label: 'Mobile-only SVG effect candidate',
    ruleGroup: 'interactive-system',
    contentBlocks: ['long press', 'mobile trigger', 'region trigger', 'touch-only reveal'],
    visualStrength: 'high',
    motion: 'mobile-only',
    primaryOutput: 'wechat-safe-svg',
    fallbackOutput: 'static-fallback',
    status: 'blocked',
    evidenceFloor: 'mobile-preview',
    publishEvidence: ['mobile-preview', 'published'],
    blockers: ['market labels say the effect only triggers on mobile', 'phone WeChat before/after evidence missing'],
    detectorBlockers: ['wechat-svg-touchstart-only', 'wechat-event-handler', 'wechat-unsafe-svg-construct'],
  },
  {
    id: 'wechat-carousel-switch',
    platform: 'wechat',
    label: 'Carousel and switch SVG candidate',
    ruleGroup: 'interactive-system',
    contentBlocks: ['image carousel', 'click switch', 'sequence frame', 'slide trigger'],
    visualStrength: 'high',
    motion: 'mobile-only',
    primaryOutput: 'wechat-safe-svg',
    fallbackOutput: 'image-fallback',
    status: 'blocked',
    evidenceFloor: 'mobile-preview',
    publishEvidence: ['mobile-preview', 'published'],
    blockers: ['carousel/switch behavior must be read back on phone WeChat', 'static or image fallback required before export success'],
    detectorBlockers: ['wechat-unsafe-svg-construct', 'wechat-svg-touchstart-only', 'wechat-class-id-dependency'],
  },
  {
    id: 'wechat-official-widget-checklist',
    platform: 'wechat',
    label: 'Official widget publish checklist',
    ruleGroup: 'guide-system',
    contentBlocks: ['mini program cards', 'polls', 'video account', 'audio', 'cover'],
    visualStrength: 'low',
    motion: 'none',
    primaryOutput: 'publish-checklist',
    fallbackOutput: 'unavailable',
    status: 'unavailable',
    evidenceFloor: 'credentialed-sync',
    publishEvidence: ['credentialed-sync', 'published'],
    blockers: ['requires real official-account permission or editor/API state'],
    detectorBlockers: ['wechat-unsupported-tag-form', 'wechat-unsupported-tag-video', 'wechat-unsupported-tag-audio'],
  },
  {
    id: 'wechat-plugin-transfer-checklist',
    platform: 'wechat',
    label: 'Plugin transfer channel checklist',
    ruleGroup: 'editor-workflow-system',
    contentBlocks: ['browser plugin', 'copy-to-wechat channel', 'format-loss readback'],
    visualStrength: 'low',
    motion: 'none',
    primaryOutput: 'publish-checklist',
    fallbackOutput: 'unavailable',
    status: 'unavailable',
    evidenceFloor: 'credentialed-sync',
    publishEvidence: ['credentialed-sync', 'mobile-preview', 'published'],
    blockers: ['plugin transfer was observed as a market workflow only, not executed in InkForge', 'channel-specific DOM readback missing'],
    detectorBlockers: ['wechat-unsupported-css', 'wechat-unsafe-svg-construct', 'wechat-class-id-dependency'],
  },
  {
    id: 'wechat-sync-draft-checklist',
    platform: 'wechat',
    label: 'Credentialed draft sync checklist',
    ruleGroup: 'editor-workflow-system',
    contentBlocks: ['authorized account', 'draft creation', 'image transfer', 'sync readback'],
    visualStrength: 'low',
    motion: 'none',
    primaryOutput: 'publish-checklist',
    fallbackOutput: 'unavailable',
    status: 'unavailable',
    evidenceFloor: 'credentialed-sync',
    publishEvidence: ['credentialed-sync', 'mobile-preview', 'published'],
    blockers: ['requires real account authorization and sync response', 'sync does not prove mobile preview or publish'],
    detectorBlockers: ['wechat-external-links', 'wechat-svg-image', 'wechat-image-width'],
  },
  {
    id: 'wechat-h5-design-boundary',
    platform: 'wechat',
    label: 'H5 and design artifact boundary',
    ruleGroup: 'editor-workflow-system',
    contentBlocks: ['H5 page', 'design image', 'enhanced media', 'PDF/video export'],
    visualStrength: 'low',
    motion: 'none',
    primaryOutput: 'publish-checklist',
    fallbackOutput: 'unavailable',
    status: 'unavailable',
    evidenceFloor: 'doc-only',
    publishEvidence: ['credentialed-sync', 'published'],
    blockers: ['H5/design/media exports are separate artifact families, not WeChat article body rendering'],
    detectorBlockers: ['wechat-unsupported-tag-video', 'wechat-unsupported-tag-audio', 'wechat-unsupported-css'],
  },
  {
    id: 'xhs-clean-text',
    platform: 'xiaohongshu',
    label: 'Clean Xiaohongshu note text',
    ruleGroup: 'body-system',
    contentBlocks: ['title', 'short paragraphs', 'plain lists', 'hashtags'],
    visualStrength: 'low',
    motion: 'none',
    primaryOutput: 'plain-text',
    fallbackOutput: 'plain-text',
    status: 'available',
    evidenceFloor: 'unit-tested',
    publishEvidence: ['published'],
    blockers: ['raw HTML/SVG/Markdown control leakage'],
    detectorBlockers: ['xhs-html-tags', 'xhs-wechat-decoration-leak', 'xhs-markdown-control-leak'],
  },
  {
    id: 'xhs-cover-carousel',
    platform: 'xiaohongshu',
    label: 'Cover and carousel image pages',
    ruleGroup: 'figure-system',
    contentBlocks: ['cover', 'steps', 'cards', 'figures'],
    visualStrength: 'high',
    motion: 'none',
    primaryOutput: 'image-page',
    fallbackOutput: 'long-image',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    blockers: ['manifest count mismatch', 'unsupported image format', 'page count limit requires current account check'],
    detectorBlockers: ['xhs-image-reference-mismatch', 'xhs-image-format-unsupported', 'xhs-image-page-count-limit'],
  },
  {
    id: 'xhs-cover-hook',
    platform: 'xiaohongshu',
    label: 'Cover hook image page',
    ruleGroup: 'headline-system',
    contentBlocks: ['cover title', 'subtitle', 'brand hook', 'topic cue'],
    visualStrength: 'high',
    motion: 'none',
    primaryOutput: 'image-page',
    fallbackOutput: 'plain-text',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    blockers: ['cover crop and mobile thumbnail proof must match the exported page', 'manifest cover flag required'],
    detectorBlockers: ['xhs-image-count-review', 'xhs-image-reference-mismatch', 'xhs-image-format-unsupported'],
  },
  {
    id: 'xhs-markdown-card-slicer',
    platform: 'xiaohongshu',
    label: 'Markdown to carousel card slicer',
    ruleGroup: 'figure-system',
    contentBlocks: ['H2 sections', 'manual page breaks', 'lists', 'code cards'],
    visualStrength: 'medium-high',
    motion: 'none',
    primaryOutput: 'image-page',
    fallbackOutput: 'long-image',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    blockers: ['page order and body references must be regenerated after edits', 'overflow pages must be split before export success'],
    detectorBlockers: ['xhs-image-page-count-limit', 'xhs-image-reference-mismatch', 'xhs-markdown-control-leak'],
  },
  {
    id: 'xhs-data-card',
    platform: 'xiaohongshu',
    label: 'Data and table image card',
    ruleGroup: 'card-system',
    contentBlocks: ['data table', 'comparison rows', 'metric card', 'chart summary'],
    visualStrength: 'medium-high',
    motion: 'none',
    primaryOutput: 'image-page',
    fallbackOutput: 'long-image',
    status: 'blocked',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    blockers: ['dense table/card layouts need per-page overflow and mobile readability proof'],
    detectorBlockers: ['xhs-table', 'xhs-long-line', 'xhs-image-reference-mismatch'],
  },
  {
    id: 'xhs-long-report',
    platform: 'xiaohongshu',
    label: 'Long report image artifact',
    ruleGroup: 'fallback-system',
    contentBlocks: ['long article', 'wide table', 'multi-section report'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'long-image',
    fallbackOutput: 'image-page',
    status: 'blocked',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    blockers: ['long-image crop and file-size proof must be collected per artifact'],
    detectorBlockers: ['xhs-long-line', 'xhs-image-format-unsupported', 'xhs-image-reference-mismatch'],
  },
  {
    id: 'xhs-h5-design-import-boundary',
    platform: 'xiaohongshu',
    label: 'H5 and design import boundary',
    ruleGroup: 'editor-workflow-system',
    contentBlocks: ['H5 page', 'design poster', 'video/PDF export', 'sticker article'],
    visualStrength: 'low',
    motion: 'none',
    primaryOutput: 'publish-checklist',
    fallbackOutput: 'unavailable',
    status: 'unavailable',
    evidenceFloor: 'doc-only',
    publishEvidence: ['published'],
    blockers: ['H5/design/video/PDF artifacts must materialize as XHS image pages or plain text before export'],
    detectorBlockers: ['xhs-html-tags', 'xhs-wechat-decoration-leak', 'xhs-markdown-control-leak'],
  },
  {
    id: 'zhihu-clean-column',
    platform: 'zhihu',
    label: 'Clean Zhihu Markdown column',
    ruleGroup: 'body-system',
    contentBlocks: ['headings', 'paragraphs', 'quotes', 'lists', 'code'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'clean-markdown',
    fallbackOutput: 'clean-markdown',
    status: 'available',
    evidenceFloor: 'unit-tested',
    publishEvidence: ['published'],
    blockers: ['residual WeChat wrapper or inline CSS dependency'],
    detectorBlockers: ['zhihu-wechat-decoration-leak', 'zhihu-html-dependency', 'zhihu-inline-svg'],
  },
  {
    id: 'zhihu-academic-latex-column',
    platform: 'zhihu',
    label: 'Academic LaTeX and code column',
    ruleGroup: 'body-system',
    contentBlocks: ['LaTeX', 'footnotes', 'code fences', 'citations'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'clean-markdown',
    fallbackOutput: 'image-fallback',
    status: 'available',
    evidenceFloor: 'unit-tested',
    publishEvidence: ['published'],
    blockers: ['unmatched formula delimiters', 'formula preview or image fallback missing'],
    detectorBlockers: ['zhihu-latex-unmatched-block', 'zhihu-latex-unmatched-inline', 'render-code-language-missing'],
  },
  {
    id: 'zhihu-wechat-adapted',
    platform: 'zhihu',
    label: 'WeChat article semantic cleanup',
    ruleGroup: 'fallback-system',
    contentBlocks: ['WeChat headings', 'quotes', 'cards', 'lists', 'footer'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'clean-markdown',
    fallbackOutput: 'image-fallback',
    status: 'available',
    evidenceFloor: 'unit-tested',
    publishEvidence: ['published'],
    blockers: ['data-ink wrappers or inline style dependencies must be removed'],
    detectorBlockers: ['zhihu-wechat-decoration-leak', 'zhihu-html-dependency', 'zhihu-inline-svg'],
  },
  {
    id: 'zhihu-diagram-article',
    platform: 'zhihu',
    label: 'Diagram and formula image fallback',
    ruleGroup: 'figure-system',
    contentBlocks: ['formula images', 'diagram images', 'table images'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'image-fallback',
    fallbackOutput: 'clean-markdown',
    status: 'blocked',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    blockers: ['public HTTPS or platform-host image URL proof missing', 'alt/caption must be present'],
    detectorBlockers: ['zhihu-image-host-blocked', 'zhihu-image-alt-missing', 'zhihu-image-caption-missing', 'zhihu-raw-diagram-fence'],
  },
  {
    id: 'zhihu-complex-table-fallback',
    platform: 'zhihu',
    label: 'Complex table image fallback',
    ruleGroup: 'card-system',
    contentBlocks: ['wide table', 'multi-paragraph cell', 'table screenshot', 'caption'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'image-fallback',
    fallbackOutput: 'clean-markdown',
    status: 'blocked',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    blockers: ['wide/complex table needs raster artifact and public image-host proof'],
    detectorBlockers: ['zhihu-complex-table', 'zhihu-image-host-blocked', 'zhihu-image-caption-missing'],
  },
  {
    id: 'zhihu-data-table',
    platform: 'zhihu',
    label: 'Semantic Markdown table',
    ruleGroup: 'card-system',
    contentBlocks: ['simple tables', 'data summaries', 'comparison rows'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'clean-markdown',
    fallbackOutput: 'image-fallback',
    status: 'available',
    evidenceFloor: 'unit-tested',
    publishEvidence: ['published'],
    blockers: [
      'invalid separator row',
      'complex table needs simplification or public image fallback with alt/caption',
    ],
    detectorBlockers: [
      'zhihu-table-separator-invalid',
      'zhihu-complex-table',
      'zhihu-image-host-blocked',
      'zhihu-image-alt-missing',
      'zhihu-image-caption-missing',
    ],
  },
  {
    id: 'zhihu-public-image-upload-checklist',
    platform: 'zhihu',
    label: 'Public image upload checklist',
    ruleGroup: 'editor-workflow-system',
    contentBlocks: ['platform image upload', 'public HTTPS rewrite', 'alt text', 'caption'],
    visualStrength: 'low',
    motion: 'none',
    primaryOutput: 'publish-checklist',
    fallbackOutput: 'unavailable',
    status: 'unavailable',
    evidenceFloor: 'credentialed-sync',
    publishEvidence: ['credentialed-sync', 'published'],
    blockers: ['requires real Zhihu or public-host upload response before image fallback can be publishable'],
    detectorBlockers: ['zhihu-image-host-blocked', 'zhihu-image-alt-missing', 'zhihu-image-caption-missing'],
  },
] as const satisfies readonly PlatformStyleChoice[]

export function getStyleChoiceCatalog(): readonly PlatformStyleChoice[] {
  return PLATFORM_STYLE_CHOICES
}

export function getPlatformStyleChoices(platform: Platform): readonly PlatformStyleChoice[] {
  return PLATFORM_STYLE_CHOICES.filter(choice => choice.platform === platform)
}

export function getStyleChoiceById(choiceId: string): PlatformStyleChoice | undefined {
  return PLATFORM_STYLE_CHOICES.find(choice => choice.id === choiceId)
}

export function getStyleChoiceApplication(choiceId: string): StyleChoiceApplication | null {
  return STYLE_CHOICE_APPLICATIONS.find(application => application.choiceId === choiceId) ?? null
}

export function getDefaultStyleEvidence(platform: Platform): readonly StyleEvidenceLabel[] {
  return DEFAULT_STYLE_EVIDENCE_BY_PLATFORM[platform]
}

export function isEvidenceAtLeast(actual: StyleEvidenceLabel, required: StyleEvidenceLabel): boolean {
  return EVIDENCE_RANK[actual] >= EVIDENCE_RANK[required]
}

export function getBestEvidence(labels: readonly StyleEvidenceLabel[]): StyleEvidenceLabel | null {
  if (labels.length === 0) return null

  return labels.reduce<StyleEvidenceLabel>((best, label) =>
    EVIDENCE_RANK[label] > EVIDENCE_RANK[best] ? label : best,
  labels[0])
}

export function getEvidenceProofRequirements(label: StyleEvidenceLabel): readonly StyleProofRequirement[] {
  return EVIDENCE_PROOF_REQUIREMENT_IDS[label]
    .map(requirementId => {
      const requirement = STYLE_PROOF_REQUIREMENT_BY_ID.get(requirementId)
      if (!requirement) throw new Error(`Unknown style proof requirement: ${requirementId}`)
      return requirement
    })
}

export function getStyleChoiceProofRequirements(choice: PlatformStyleChoice): readonly StyleProofRequirement[] {
  const requirementIds = new Set<StyleProofRequirementId>()

  for (const label of [choice.evidenceFloor, ...choice.publishEvidence]) {
    for (const requirementId of EVIDENCE_PROOF_REQUIREMENT_IDS[label]) {
      requirementIds.add(requirementId)
    }
  }

  return Array.from(requirementIds, requirementId => {
    const requirement = STYLE_PROOF_REQUIREMENT_BY_ID.get(requirementId)
    if (!requirement) throw new Error(`Unknown style proof requirement: ${requirementId}`)
    return requirement
  })
}

export function evaluateStyleChoiceAvailability(
  choice: PlatformStyleChoice,
  evidence: readonly StyleEvidenceLabel[] = [],
): StyleChoiceAvailability {
  const bestEvidence = getBestEvidence(evidence)

  if (choice.status !== 'available') {
    return {
      choice,
      usable: false,
      status: choice.status,
      requiredEvidence: choice.evidenceFloor,
      bestEvidence,
      reason: choice.blockers[0] ?? `style choice is ${choice.status}`,
    }
  }

  if (!bestEvidence || !isEvidenceAtLeast(bestEvidence, choice.evidenceFloor)) {
    return {
      choice,
      usable: false,
      status: 'blocked',
      requiredEvidence: choice.evidenceFloor,
      bestEvidence,
      reason: `requires ${choice.evidenceFloor} evidence before use`,
    }
  }

  return {
    choice,
    usable: true,
    status: 'available',
    requiredEvidence: choice.evidenceFloor,
    bestEvidence,
    reason: 'style choice has enough evidence for its current artifact state',
  }
}

export function evaluateStyleChoiceApplication(
  choice: PlatformStyleChoice,
  evidence: readonly StyleEvidenceLabel[] = [],
): StyleChoiceApplicationAvailability {
  const availability = evaluateStyleChoiceAvailability(choice, evidence)
  const application = getStyleChoiceApplication(choice.id)

  if (!application) {
    return {
      availability,
      application: null,
      selectable: false,
      reason: 'no existing InkForge preset or export option maps this style choice yet',
    }
  }

  if (application.platform !== choice.platform) {
    return {
      availability,
      application,
      selectable: false,
      reason: 'style application platform does not match the catalog choice',
    }
  }

  if (!availability.usable) {
    return {
      availability,
      application,
      selectable: false,
      reason: availability.reason,
    }
  }

  return {
    availability,
    application,
    selectable: true,
    reason: `selects preset ${application.presetId} through the existing export pipeline`,
  }
}

export function getPlatformStyleApplicationReport(
  platform: Platform,
  evidence: readonly StyleEvidenceLabel[] = getDefaultStyleEvidence(platform),
): readonly StyleChoiceApplicationAvailability[] {
  return getPlatformStyleChoices(platform)
    .map(choice => evaluateStyleChoiceApplication(choice, evidence))
}

export function getPlatformStyleAvailabilityReport(
  platform: Platform,
  evidence: readonly StyleEvidenceLabel[] = getDefaultStyleEvidence(platform),
): PlatformStyleAvailabilityReport {
  const choices = getPlatformStyleChoices(platform)
    .map(choice => evaluateStyleChoiceAvailability(choice, evidence))

  return {
    platform,
    evidence,
    choices,
    stats: {
      total: choices.length,
      usable: choices.filter(choice => choice.usable).length,
      blocked: choices.filter(choice => choice.status === 'blocked').length,
      unavailable: choices.filter(choice => choice.status === 'unavailable').length,
    },
  }
}
