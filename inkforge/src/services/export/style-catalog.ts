import type { Platform, QualityIssue } from './types'

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
  | 'scheduled-send-readback'
  | 'published-url-or-platform-preview'
  | 'public-image-host'
  | 'xhs-artifact-manifest'
  | 'zhihu-artifact-manifest'
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

export type StyleMarketCapabilitySource =
  | '135-svg-editor'
  | 'xiumi-v5-paper'
  | 'public-wechat-svg-practice'
  | 'doocs-md'
  | 'inkforge-owned'

export type StyleMarketCapabilityFamily =
  | 'background-svg-shell'
  | 'image-carousel'
  | 'click-expand'
  | 'click-show-hide'
  | 'click-switch'
  | 'path-animation'
  | 'parallax-motion'
  | 'slide-trigger'
  | 'long-press-switch'
  | 'region-trigger'
  | 'text-marquee'
  | 'quiz-game'
  | 'flip-zoom'
  | 'click-popup'
  | 'click-print-jump-play'
  | 'falling-motion'
  | 'click-plus-auto'
  | 'title-card-layout'
  | 'ratio-image-layer'
  | 'h5-handoff'
  | 'static-raster-fallback'
  | 'public-image-fallback'

export type StyleMarketTriggerMode =
  | 'none'
  | 'auto'
  | 'click'
  | 'slide'
  | 'long-press'
  | 'region'
  | 'mobile-touch'
  | 'plugin-sync'
  | 'public-host'

export type StyleMarketRenderPattern =
  | 'gap-safe-inline-svg'
  | 'component-tree'
  | 'ratio-image-layer'
  | 'static-raster'
  | 'clean-markdown'
  | 'publish-checklist'

export type StyleMarketCapabilityStatus =
  | 'source-owned'
  | 'fallback-only'
  | 'blocked-until-proof'
  | 'external-handoff'

export interface StyleMarketCapability {
  family: StyleMarketCapabilityFamily
  label: string
  sources: readonly StyleMarketCapabilitySource[]
  triggerMode: StyleMarketTriggerMode
  renderPattern: StyleMarketRenderPattern
  output: StyleArtifactType
  status: StyleMarketCapabilityStatus
  degradable: boolean
  requiredProof: readonly StyleProofRequirementId[]
  imageRatio?: string
  notes: readonly string[]
}

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
  marketCapabilities?: readonly StyleMarketCapability[]
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

export interface PlatformStyleMarketCapabilityChoice {
  choice: PlatformStyleChoice
  capabilities: readonly StyleMarketCapability[]
  application: StyleChoiceApplication | null
  proofRequirements: readonly StyleProofRequirement[]
}

export interface PlatformStyleMarketCapabilityReport {
  platform: Platform
  choices: readonly PlatformStyleMarketCapabilityChoice[]
  families: readonly StyleMarketCapabilityFamily[]
  stats: {
    totalChoices: number
    choicesWithCapabilities: number
    capabilities: number
    sourceOwned: number
    fallbackOnly: number
    blockedUntilProof: number
    externalHandoff: number
  }
}

export type StyleProofManifestScope = 'evidence-label' | 'style-choice'

export type StyleProofArtifactKind =
  | 'doc-reference'
  | 'test-log'
  | 'browser-readback'
  | 'editor-readback'
  | 'phone-readback'
  | 'screenshot'
  | 'channel-response'
  | 'published-preview'
  | 'image-host-check'
  | 'artifact-manifest'
  | 'hygiene-review'

export type StyleProofChannel =
  | 'docs'
  | 'unit-test'
  | 'local-browser'
  | 'tauri-webview'
  | 'market-editor'
  | 'platform-editor'
  | 'phone-preview'
  | 'credentialed-channel'
  | 'public-web'
  | 'local-artifact'

export type StyleProofAction =
  | 'catalog-source'
  | 'applied-market-element'
  | 'authenticated-editor-opened'
  | 'pc-editor-dom-readback'
  | 'safe-disposable-draft'
  | 'test-run'
  | 'local-render'
  | 'pc-paste'
  | 'phone-preview'
  | 'phone-preview-entry-readback'
  | 'dark-mode-check'
  | 'cover-thumbnail-check'
  | 'external-account-login-readback'
  | 'credentialed-sync'
  | 'sync-readback'
  | 'scheduled-send'
  | 'published-preview'
  | 'public-image-host-check'
  | 'artifact-manifest-validation'
  | 'source-hygiene-review'
  | 'sensitive-hygiene-review'

export type StyleProofReadback =
  | 'none'
  | 'dom'
  | 'visual'
  | 'visual-and-dom'
  | 'phone'
  | 'screenshot'
  | 'api-response'
  | 'scheduled-send-state'
  | 'published-url'
  | 'manifest'
  | 'test-assertion'
  | 'hygiene-log'

export type StyleProofHostStatus =
  | 'public-https'
  | 'platform-hosted'
  | 'local-only'
  | 'blocked'
  | 'missing'

const STYLE_PROOF_PLATFORMS = ['wechat', 'xiaohongshu', 'zhihu'] as const satisfies readonly Platform[]

const STYLE_EVIDENCE_LABELS = [
  'doc-only',
  'applied-editor-element',
  'authenticated-editor-reachable',
  'pc-editor-dom-readable',
  'unit-tested',
  'local-browser',
  'pc-editor-paste',
  'mobile-preview',
  'credentialed-sync',
  'published',
] as const satisfies readonly StyleEvidenceLabel[]

const STYLE_PROOF_MANIFEST_SCOPES = [
  'evidence-label',
  'style-choice',
] as const satisfies readonly StyleProofManifestScope[]

const STYLE_PROOF_ARTIFACT_KINDS = [
  'doc-reference',
  'test-log',
  'browser-readback',
  'editor-readback',
  'phone-readback',
  'screenshot',
  'channel-response',
  'published-preview',
  'image-host-check',
  'artifact-manifest',
  'hygiene-review',
] as const satisfies readonly StyleProofArtifactKind[]

const STYLE_PROOF_CHANNELS = [
  'docs',
  'unit-test',
  'local-browser',
  'tauri-webview',
  'market-editor',
  'platform-editor',
  'phone-preview',
  'credentialed-channel',
  'public-web',
  'local-artifact',
] as const satisfies readonly StyleProofChannel[]

const STYLE_PROOF_ACTIONS = [
  'catalog-source',
  'applied-market-element',
  'authenticated-editor-opened',
  'pc-editor-dom-readback',
  'safe-disposable-draft',
  'test-run',
  'local-render',
  'pc-paste',
  'phone-preview',
  'phone-preview-entry-readback',
  'dark-mode-check',
  'cover-thumbnail-check',
  'external-account-login-readback',
  'credentialed-sync',
  'sync-readback',
  'scheduled-send',
  'published-preview',
  'public-image-host-check',
  'artifact-manifest-validation',
  'source-hygiene-review',
  'sensitive-hygiene-review',
] as const satisfies readonly StyleProofAction[]

const STYLE_PROOF_READBACKS = [
  'none',
  'dom',
  'visual',
  'visual-and-dom',
  'phone',
  'screenshot',
  'api-response',
  'scheduled-send-state',
  'published-url',
  'manifest',
  'test-assertion',
  'hygiene-log',
] as const satisfies readonly StyleProofReadback[]

const STYLE_PROOF_HOST_STATUSES = [
  'public-https',
  'platform-hosted',
  'local-only',
  'blocked',
  'missing',
] as const satisfies readonly StyleProofHostStatus[]

export interface StyleProofArtifact {
  id: string
  requirementId: StyleProofRequirementId
  kind: StyleProofArtifactKind
  label: string
  evidenceLabel?: StyleEvidenceLabel
  platform?: Platform
  choiceId?: string
  channel: StyleProofChannel
  action: StyleProofAction
  readback: StyleProofReadback
  artifactFingerprint?: string
  artifactRef?: string
  exactArtifact?: boolean
  authenticatedSessionVerified?: boolean
  externalAccountAuthenticated?: boolean
  externalAccountLoginBlocked?: boolean
  platformEditorTargetVerified?: boolean
  platformEditorSurfaceVerified?: boolean
  platformEditorDomVerified?: boolean
  centralEditorChanged?: boolean
  marketAppliedContentVerified?: boolean
  ordinaryClipboardPasteVerified?: boolean
  sameEditorTabVerified?: boolean
  pasteInputEventVerified?: boolean
  editorBodyMutationVerified?: boolean
  mojibakeFreeVerified?: boolean
  phonePreviewContentVerified?: boolean
  phonePreviewBlocked?: boolean
  darkModeEnabledVerified?: boolean
  coverThumbnailAccepted?: boolean
  scheduledSendVerified?: boolean
  disposableDraft?: boolean
  cleanupPathVerified?: boolean
  createRouteActionMetadataMissing?: boolean
  cleanupTargetAmbiguous?: boolean
  saveDraftNoCard?: boolean
  artifactManifestValidated?: boolean
  redactionReviewRequired?: boolean
  redactionVerified?: boolean
  collectedAt?: string
  safeForCommit?: boolean
  committed?: boolean
  sensitive?: boolean
  hostStatus?: StyleProofHostStatus
}

export type StyleProofManifestIssueId =
  | 'style-proof-manifest-choice-unknown'
  | 'style-proof-manifest-platform-mismatch'
  | 'style-proof-manifest-choice-blocked'
  | 'style-proof-manifest-evidence-too-weak'
  | 'style-proof-manifest-requirement-missing'
  | 'style-proof-manifest-artifact-mismatch'
  | 'style-proof-manifest-sensitive-artifact'
  | 'style-proof-manifest-unsafe-commit-artifact'
  | 'style-proof-manifest-exact-artifact-missing'
  | 'style-proof-manifest-market-editor-not-applied'
  | 'style-proof-manifest-market-editor-placeholder-only'
  | 'style-proof-manifest-authenticated-session-not-verified'
  | 'style-proof-manifest-external-account-login-blocked'
  | 'style-proof-manifest-external-account-auth-missing'
  | 'style-proof-manifest-platform-editor-target-not-verified'
  | 'style-proof-manifest-platform-editor-surface-not-verified'
  | 'style-proof-manifest-platform-editor-dom-not-verified'
  | 'style-proof-manifest-editor-mojibake-not-ruled-out'
  | 'style-proof-manifest-ordinary-paste-not-verified'
  | 'style-proof-manifest-paste-editor-tab-not-verified'
  | 'style-proof-manifest-paste-input-not-verified'
  | 'style-proof-manifest-editor-body-not-mutated'
  | 'style-proof-manifest-paste-mojibake-not-ruled-out'
  | 'style-proof-manifest-paste-proof-not-bound'
  | 'style-proof-manifest-proof-not-bound'
  | 'style-proof-manifest-contract-action-channel-mismatch'
  | 'style-proof-manifest-forbidden-field-present'
  | 'style-proof-manifest-safe-commit-not-verified'
  | 'style-proof-manifest-collected-at-missing'
  | 'style-proof-manifest-collected-at-invalid'
  | 'style-proof-manifest-proof-stale'
  | 'style-proof-manifest-phone-preview-blocked'
  | 'style-proof-manifest-phone-content-missing'
  | 'style-proof-manifest-dark-mode-not-verified'
  | 'style-proof-manifest-cover-thumbnail-not-accepted'
  | 'style-proof-manifest-scheduled-send-not-verified'
  | 'style-proof-manifest-disposable-draft-missing'
  | 'style-proof-manifest-cleanup-path-missing'
  | 'style-proof-manifest-create-route-action-missing'
  | 'style-proof-manifest-cleanup-target-ambiguous'
  | 'style-proof-manifest-save-draft-no-card'
  | 'style-proof-manifest-redaction-review-missing'
  | 'style-proof-manifest-platform-action-missing'
  | 'style-proof-manifest-readback-missing'
  | 'style-proof-manifest-public-image-host-missing'
  | 'style-proof-manifest-validation-missing'
  | 'style-proof-manifest-artifact-manifest-not-validated'
  | 'style-proof-manifest-artifact-ref-missing'
  | 'style-proof-manifest-pack-choice-unknown'
  | 'style-proof-manifest-pack-platform-mismatch'
  | 'style-proof-manifest-pack-artifact-id-duplicate'
  | 'style-proof-manifest-pack-fingerprint-mismatch'

const STYLE_PROOF_MANIFEST_ISSUE_IDS = [
  'style-proof-manifest-choice-unknown',
  'style-proof-manifest-platform-mismatch',
  'style-proof-manifest-choice-blocked',
  'style-proof-manifest-evidence-too-weak',
  'style-proof-manifest-requirement-missing',
  'style-proof-manifest-artifact-mismatch',
  'style-proof-manifest-sensitive-artifact',
  'style-proof-manifest-unsafe-commit-artifact',
  'style-proof-manifest-exact-artifact-missing',
  'style-proof-manifest-market-editor-not-applied',
  'style-proof-manifest-market-editor-placeholder-only',
  'style-proof-manifest-authenticated-session-not-verified',
  'style-proof-manifest-external-account-login-blocked',
  'style-proof-manifest-external-account-auth-missing',
  'style-proof-manifest-platform-editor-target-not-verified',
  'style-proof-manifest-platform-editor-surface-not-verified',
  'style-proof-manifest-platform-editor-dom-not-verified',
  'style-proof-manifest-editor-mojibake-not-ruled-out',
  'style-proof-manifest-ordinary-paste-not-verified',
  'style-proof-manifest-paste-editor-tab-not-verified',
  'style-proof-manifest-paste-input-not-verified',
  'style-proof-manifest-editor-body-not-mutated',
  'style-proof-manifest-paste-mojibake-not-ruled-out',
  'style-proof-manifest-paste-proof-not-bound',
  'style-proof-manifest-proof-not-bound',
  'style-proof-manifest-contract-action-channel-mismatch',
  'style-proof-manifest-forbidden-field-present',
  'style-proof-manifest-safe-commit-not-verified',
  'style-proof-manifest-collected-at-missing',
  'style-proof-manifest-collected-at-invalid',
  'style-proof-manifest-proof-stale',
  'style-proof-manifest-phone-preview-blocked',
  'style-proof-manifest-phone-content-missing',
  'style-proof-manifest-dark-mode-not-verified',
  'style-proof-manifest-cover-thumbnail-not-accepted',
  'style-proof-manifest-scheduled-send-not-verified',
  'style-proof-manifest-disposable-draft-missing',
  'style-proof-manifest-cleanup-path-missing',
  'style-proof-manifest-create-route-action-missing',
  'style-proof-manifest-cleanup-target-ambiguous',
  'style-proof-manifest-save-draft-no-card',
  'style-proof-manifest-redaction-review-missing',
  'style-proof-manifest-platform-action-missing',
  'style-proof-manifest-readback-missing',
  'style-proof-manifest-public-image-host-missing',
  'style-proof-manifest-validation-missing',
  'style-proof-manifest-artifact-manifest-not-validated',
  'style-proof-manifest-artifact-ref-missing',
  'style-proof-manifest-pack-choice-unknown',
  'style-proof-manifest-pack-platform-mismatch',
  'style-proof-manifest-pack-artifact-id-duplicate',
  'style-proof-manifest-pack-fingerprint-mismatch',
] as const satisfies readonly StyleProofManifestIssueId[]

const STYLE_PROOF_FRESHNESS_ISSUE_IDS: readonly StyleProofManifestIssueId[] = [
  'style-proof-manifest-collected-at-missing',
  'style-proof-manifest-collected-at-invalid',
  'style-proof-manifest-proof-stale',
]

const STYLE_PROOF_MANIFEST_ISSUE_ID_SET = new Set<string>(STYLE_PROOF_MANIFEST_ISSUE_IDS)

function isStyleProofManifestIssueId(issueId: string): issueId is StyleProofManifestIssueId {
  return STYLE_PROOF_MANIFEST_ISSUE_ID_SET.has(issueId)
}

export interface StyleProofManifest {
  platform: Platform
  claimedEvidence: readonly StyleEvidenceLabel[]
  scope?: StyleProofManifestScope
  choiceId?: string
  artifactFingerprint?: string
  artifacts: readonly StyleProofArtifact[]
}

export interface StyleProofManifestDraftOptions {
  platform: Platform
  claimedEvidence?: readonly StyleEvidenceLabel[]
  scope?: StyleProofManifestScope
  choiceId?: string
  artifactFingerprint?: string
}

export type StyleProofRequirementReportStatus = 'satisfied' | 'missing' | 'invalid'
export type StyleProofArtifactReportStatus = 'accepted' | 'invalid' | 'sensitive' | 'unsafe-commit'

export interface StyleProofRequirementReport {
  requirement: StyleProofRequirement
  evidenceLabel?: StyleEvidenceLabel
  status: StyleProofRequirementReportStatus
  artifactIds: readonly string[]
  issues: readonly QualityIssue[]
}

export interface StyleProofArtifactReport {
  artifact: StyleProofArtifact
  status: StyleProofArtifactReportStatus
  sensitive: boolean
  unsafeForCommit: boolean
  issues: readonly QualityIssue[]
}

export interface StyleProofManifestReport {
  platform: Platform
  scope: StyleProofManifestScope
  choiceId?: string
  choiceStatus?: StyleChoiceStatus
  valid: boolean
  issues: readonly QualityIssue[]
  requirements: readonly StyleProofRequirementReport[]
  artifacts: readonly StyleProofArtifactReport[]
  summary: {
    required: number
    satisfied: number
    missing: number
    invalid: number
    artifactCount: number
    acceptedArtifactCount: number
    sensitiveArtifactCount: number
    unsafeCommitArtifactCount: number
    issueCount: number
  }
}

export interface StyleChoiceProofReadiness {
  choice: PlatformStyleChoice
  draft: StyleProofManifest
  report: StyleProofManifestReport
  blockedByCatalog: boolean
  missingRequirementIds: readonly StyleProofRequirementId[]
  invalidRequirementIds: readonly StyleProofRequirementId[]
}

export interface PlatformStyleProofReadinessReport {
  platform: Platform
  choices: readonly StyleChoiceProofReadiness[]
  summary: {
    total: number
    valid: number
    blockedByCatalog: number
    missingRequirements: number
    invalidRequirements: number
  }
}

export type StyleProofCollectionGate =
  | 'local-evidence'
  | 'market-editor'
  | 'authenticated-pc-editor'
  | 'phone-preview'
  | 'credentialed-channel'
  | 'public-host'
  | 'platform-publish'
  | 'sensitive-hygiene'

export type StyleProofCollectionStatus = 'missing' | 'invalid'

export interface StyleProofCollectionStep {
  choice: PlatformStyleChoice
  requirement: StyleProofRequirement
  status: StyleProofCollectionStatus
  gate: StyleProofCollectionGate
  order: number
  blockedByCatalog: boolean
  mutatesPlatform: boolean
  requiresExternalAccount: boolean
  requiresPhone: boolean
  safeToAutomate: boolean
  note: string
}

export interface PlatformStyleProofCollectionPlan {
  platform: Platform
  steps: readonly StyleProofCollectionStep[]
  summary: {
    total: number
    localEvidence: number
    marketEditor: number
    authenticatedPcEditor: number
    phonePreview: number
    credentialedChannel: number
    publicHost: number
    platformPublish: number
    sensitiveHygiene: number
    blockedChoices: number
    mutatingSteps: number
    externalAccountSteps: number
    phoneSteps: number
    safeToAutomate: number
  }
}

export interface StyleProofCollectionGateGroup {
  gate: StyleProofCollectionGate
  order: number
  note: string
  steps: readonly StyleProofCollectionStep[]
  choiceIds: readonly string[]
  stepCount: number
  blockedChoiceCount: number
  mutatingSteps: number
  externalAccountSteps: number
  phoneSteps: number
  safeToAutomateSteps: number
}

export interface PlatformStyleProofCollectionQueue {
  platform: Platform
  groups: readonly StyleProofCollectionGateGroup[]
  nextGate: StyleProofCollectionGate | null
  nextSafeGate: StyleProofCollectionGate | null
  summary: {
    totalSteps: number
    totalGates: number
    totalChoices: number
    blockedChoices: number
    safeToAutomateSteps: number
    mutatingSteps: number
    externalAccountSteps: number
    phoneSteps: number
  }
}

export type StyleProofProgressStatus = 'satisfied' | 'missing' | 'invalid'

export interface StyleProofGateProgress {
  gate: StyleProofCollectionGate
  order: number
  note: string
  status: StyleProofProgressStatus
  requirementIds: readonly StyleProofRequirementId[]
  choiceIds: readonly string[]
  required: number
  satisfied: number
  missing: number
  invalid: number
  artifactCount: number
  acceptedArtifactCount: number
  sensitiveArtifactCount: number
  unsafeCommitArtifactCount: number
  issueCount: number
  blockedChoiceCount: number
  mutatingRequirements: number
  externalAccountRequirements: number
  phoneRequirements: number
  safeToAutomateRequirements: number
}

export interface StyleChoiceProofProgress {
  choice: PlatformStyleChoice
  manifest: StyleProofManifest
  manifestCount: number
  report: StyleProofManifestReport
  blockedByCatalog: boolean
  status: StyleProofProgressStatus
  gates: readonly StyleProofGateProgress[]
  summary: {
    required: number
    satisfied: number
    missing: number
    invalid: number
    artifactCount: number
    acceptedArtifactCount: number
    sensitiveArtifactCount: number
    unsafeCommitArtifactCount: number
    issueCount: number
  }
}

export interface PlatformStyleProofProgressReport {
  platform: Platform
  choices: readonly StyleChoiceProofProgress[]
  gates: readonly StyleProofGateProgress[]
  nextGate: StyleProofCollectionGate | null
  nextSafeGate: StyleProofCollectionGate | null
  ignoredManifestCount: number
  summary: {
    totalChoices: number
    choicesWithManifest: number
    proofSatisfiedChoices: number
    proofMissingChoices: number
    proofInvalidChoices: number
    blockedChoices: number
    required: number
    satisfied: number
    missing: number
    invalid: number
    artifactCount: number
    acceptedArtifactCount: number
    sensitiveArtifactCount: number
    unsafeCommitArtifactCount: number
    issueCount: number
    totalGates: number
    mutatingRequirements: number
    externalAccountRequirements: number
    phoneRequirements: number
    safeToAutomateRequirements: number
  }
}

export interface StyleProofManifestPackManifestSummary {
  index: number
  platform: Platform
  choiceId?: string
  artifactCount: number
  valid: boolean
  usableForProgress: boolean
  issueCount: number
}

export interface StyleProofManifestPackReport {
  manifests: readonly StyleProofManifestPackManifestSummary[]
  platformReports: Record<Platform, PlatformStyleProofProgressReport>
  issues: readonly QualityIssue[]
  duplicateArtifactIds: readonly string[]
  summary: {
    manifestCount: number
    validManifestCount: number
    invalidManifestCount: number
    usableManifestCount: number
    unboundManifestCount: number
    artifactCount: number
    duplicateArtifactIdCount: number
    issueCount: number
  }
}

export type StyleProofManifestIntakeStatus =
  | 'empty'
  | 'schema-invalid'
  | 'accepted-with-warnings'
  | 'ready-for-review'

export interface StyleProofManifestIntakeRejectedItem {
  index: number | null
  rawKind: string
  issues: readonly QualityIssue[]
}

export interface StyleProofManifestIntakeReport {
  status: StyleProofManifestIntakeStatus
  manifests: readonly StyleProofManifest[]
  rejected: readonly StyleProofManifestIntakeRejectedItem[]
  schemaIssues: readonly QualityIssue[]
  packReport: StyleProofManifestPackReport
  acceptanceAudit: StyleProofAcceptanceAuditReport
  executionRunbook: StyleProofExecutionRunbook
  canClaimComplete: boolean
  summary: {
    inputManifestCount: number
    acceptedManifestCount: number
    rejectedManifestCount: number
    schemaIssueCount: number
    schemaErrorCount: number
    schemaWarningCount: number
    semanticIssueCount: number
    artifactCount: number
    cannotClaimRequirements: number
    cannotClaimSteps: number
    safeToAutomateOpenSteps: number
    externalDependencyOpenSteps: number
    phoneOpenSteps: number
    mutatingOpenSteps: number
    unsafeToAutomateOpenSteps: number
  }
}

export type StyleProofAcceptanceAuditStatus =
  | 'completed'
  | 'missing'
  | 'invalid'
  | 'blocked-by-external'
  | 'unsafe-to-automate'

export interface StyleProofAcceptanceNextAction {
  gate: StyleProofCollectionGate
  status: StyleProofAcceptanceAuditStatus
  requirementIds: readonly StyleProofRequirementId[]
  choiceIds: readonly string[]
  note: string
}

export interface StyleProofAcceptanceGateAudit {
  gate: StyleProofCollectionGate
  order: number
  note: string
  status: StyleProofAcceptanceAuditStatus
  requirementIds: readonly StyleProofRequirementId[]
  choiceIds: readonly string[]
  required: number
  satisfied: number
  missing: number
  invalid: number
  artifactCount: number
  acceptedArtifactCount: number
  sensitiveArtifactCount: number
  unsafeCommitArtifactCount: number
  issueCount: number
  blockedChoiceCount: number
  mutatingRequirements: number
  externalAccountRequirements: number
  phoneRequirements: number
  safeToAutomateRequirements: number
  cannotClaim: boolean
}

export interface StyleProofAcceptanceRequirementAudit {
  requirement: StyleProofRequirement
  gate: StyleProofCollectionGate
  order: number
  note: string
  status: StyleProofAcceptanceAuditStatus
  choiceIds: readonly string[]
  required: number
  satisfied: number
  missing: number
  invalid: number
  artifactCount: number
  acceptedArtifactCount: number
  sensitiveArtifactCount: number
  unsafeCommitArtifactCount: number
  issueCount: number
  issueIds: readonly StyleProofManifestIssueId[]
  blockedChoiceCount: number
  mutatesPlatform: boolean
  requiresExternalAccount: boolean
  requiresPhone: boolean
  safeToAutomate: boolean
  cannotClaim: boolean
}

export interface PlatformStyleProofAcceptanceAuditReport {
  platform: Platform
  progress: PlatformStyleProofProgressReport
  gates: readonly StyleProofAcceptanceGateAudit[]
  requirements: readonly StyleProofAcceptanceRequirementAudit[]
  cannotClaim: readonly StyleProofAcceptanceRequirementAudit[]
  nextLocalSafeAction: StyleProofAcceptanceNextAction | null
  nextExternalAccountAction: StyleProofAcceptanceNextAction | null
  nextPhoneAction: StyleProofAcceptanceNextAction | null
  nextUnsafeToAutomateAction: StyleProofAcceptanceNextAction | null
  summary: {
    totalGates: number
    completedGates: number
    missingGates: number
    invalidGates: number
    blockedByExternalGates: number
    unsafeToAutomateGates: number
    totalRequirements: number
    completedRequirements: number
    missingRequirements: number
    invalidRequirements: number
    blockedByExternalRequirements: number
    unsafeToAutomateRequirements: number
    cannotClaimRequirements: number
    safeToAutomateOpenRequirements: number
    externalAccountOpenRequirements: number
    phoneOpenRequirements: number
    mutatingOpenRequirements: number
  }
}

export interface StyleProofAcceptanceAuditReport {
  manifests: readonly StyleProofManifestPackManifestSummary[]
  platformReports: Record<Platform, PlatformStyleProofAcceptanceAuditReport>
  issues: readonly QualityIssue[]
  duplicateArtifactIds: readonly string[]
  summary: {
    manifestCount: number
    validManifestCount: number
    invalidManifestCount: number
    usableManifestCount: number
    duplicateArtifactIdCount: number
    issueCount: number
    completedGates: number
    openGates: number
    completedRequirements: number
    cannotClaimRequirements: number
    blockedByExternalRequirements: number
    unsafeToAutomateRequirements: number
    safeToAutomateOpenRequirements: number
  }
}

export interface CommittedStyleProofEvidenceAuditReport {
  local: StyleProofAcceptanceAuditReport
  wechatPc: StyleProofAcceptanceAuditReport
  combined: StyleProofAcceptanceAuditReport
  summary: {
    localManifestCount: number
    wechatPcManifestCount: number
    combinedManifestCount: number
    combinedIssueCount: number
    hasExactArtifactFingerprintConflicts: boolean
    cannotClaimRequirements: number
  }
}

export type StyleProofArtifactVerificationField =
  | 'artifactFingerprint'
  | 'artifactRef'
  | 'exactArtifact'
  | 'authenticatedSessionVerified'
  | 'externalAccountAuthenticated'
  | 'externalAccountLoginBlocked'
  | 'platformEditorTargetVerified'
  | 'platformEditorSurfaceVerified'
  | 'platformEditorDomVerified'
  | 'centralEditorChanged'
  | 'marketAppliedContentVerified'
  | 'ordinaryClipboardPasteVerified'
  | 'sameEditorTabVerified'
  | 'pasteInputEventVerified'
  | 'editorBodyMutationVerified'
  | 'mojibakeFreeVerified'
  | 'phonePreviewContentVerified'
  | 'phonePreviewBlocked'
  | 'darkModeEnabledVerified'
  | 'coverThumbnailAccepted'
  | 'scheduledSendVerified'
  | 'disposableDraft'
  | 'cleanupPathVerified'
  | 'saveDraftNoCard'
  | 'artifactManifestValidated'
  | 'redactionVerified'
  | 'collectedAt'
  | 'safeForCommit'
  | 'committed'
  | 'sensitive'
  | 'hostStatus'

export type StyleProofExecutionBoundary =
  | 'local-only'
  | 'market-editor-account'
  | 'authenticated-pc-editor'
  | 'phone-preview'
  | 'public-host'
  | 'credentialed-channel'
  | 'platform-publish'

export interface StyleProofExecutionArtifactContract {
  requirementId: StyleProofRequirementId
  requiredChannels: readonly StyleProofChannel[]
  requiredActions: readonly StyleProofAction[]
  requiredReadbacks: readonly StyleProofReadback[]
  requiredFields: readonly StyleProofArtifactVerificationField[]
  forbiddenFields?: readonly StyleProofArtifactVerificationField[]
  acceptedHostStatuses?: readonly StyleProofHostStatus[]
  maxFreshnessDays?: number
}

export interface StyleProofExecutionRunbookStep {
  platform: Platform
  requirement: StyleProofRequirement
  gate: StyleProofCollectionGate
  order: number
  status: StyleProofAcceptanceAuditStatus
  boundary: StyleProofExecutionBoundary
  choiceIds: readonly string[]
  issueIds: readonly StyleProofManifestIssueId[]
  required: number
  satisfied: number
  missing: number
  invalid: number
  artifactCount: number
  acceptedArtifactCount: number
  blockedChoiceCount: number
  mutatesPlatform: boolean
  requiresExternalAccount: boolean
  requiresPhone: boolean
  safeToAutomate: boolean
  requiresFreshCollectedAt: boolean
  freshnessMaxDays: number | null
  freshnessIssueIds: readonly StyleProofManifestIssueId[]
  cannotClaim: boolean
  cannotClaimReason: string | null
  nextOperatorAction: string
  requiredArtifact: StyleProofExecutionArtifactContract
  successCriteria: readonly string[]
  failureSignals: readonly string[]
  redactionBoundary: string
}

export interface PlatformStyleProofExecutionRunbook {
  platform: Platform
  acceptance: PlatformStyleProofAcceptanceAuditReport
  steps: readonly StyleProofExecutionRunbookStep[]
  openSteps: readonly StyleProofExecutionRunbookStep[]
  cannotClaim: readonly StyleProofExecutionRunbookStep[]
  nextLocalSafeStep: StyleProofExecutionRunbookStep | null
  nextExternalDependencyStep: StyleProofExecutionRunbookStep | null
  nextPhoneStep: StyleProofExecutionRunbookStep | null
  nextUnsafeToAutomateStep: StyleProofExecutionRunbookStep | null
  summary: {
    totalSteps: number
    completedSteps: number
    openSteps: number
    cannotClaimSteps: number
    safeToAutomateOpenSteps: number
    externalDependencyOpenSteps: number
    phoneOpenSteps: number
    mutatingOpenSteps: number
    unsafeToAutomateOpenSteps: number
  }
}

export interface StyleProofExecutionRunbook {
  platformReports: Record<Platform, PlatformStyleProofExecutionRunbook>
  issues: readonly QualityIssue[]
  duplicateArtifactIds: readonly string[]
  summary: {
    manifestCount: number
    validManifestCount: number
    invalidManifestCount: number
    usableManifestCount: number
    duplicateArtifactIdCount: number
    issueCount: number
    totalSteps: number
    completedSteps: number
    openSteps: number
    cannotClaimSteps: number
    safeToAutomateOpenSteps: number
    externalDependencyOpenSteps: number
    phoneOpenSteps: number
    mutatingOpenSteps: number
    unsafeToAutomateOpenSteps: number
  }
}

export interface CommittedStyleProofExecutionRunbookReport {
  local: StyleProofExecutionRunbook
  wechatPc: StyleProofExecutionRunbook
  combined: StyleProofExecutionRunbook
  summary: {
    localManifestCount: number
    wechatPcManifestCount: number
    combinedManifestCount: number
    combinedIssueCount: number
    hasExactArtifactFingerprintConflicts: boolean
    cannotClaimSteps: number
    phoneOpenSteps: number
    externalDependencyOpenSteps: number
    unsafeToAutomateOpenSteps: number
    mutatingOpenSteps: number
  }
}

export type CommittedStyleProofReleaseGateStatus =
  | 'ready'
  | 'blocked-by-local-conflict'
  | 'blocked-by-external'
  | 'unsafe-to-automate'

export type CommittedStyleProofReleaseGateBlockerKind =
  | 'local-conflict'
  | 'phone-preview'
  | 'external-dependency'
  | 'unsafe-to-automate'
  | 'mutating-platform'

export interface CommittedStyleProofReleaseFingerprintConflict {
  platform: Platform
  choiceId: string
  fingerprints: readonly string[]
}

export interface CommittedStyleProofReleaseNextOperatorAction {
  platforms: readonly Platform[]
  requirementId?: StyleProofRequirementId
  gate?: StyleProofCollectionGate
  boundary?: StyleProofExecutionBoundary
  action: string
}

export interface CommittedStyleProofReleasePlatformStepCount {
  platform: Platform
  stepCount: number
}

export interface CommittedStyleProofReleaseRequirementStepCount {
  requirementId: StyleProofRequirementId
  stepCount: number
}

export interface CommittedStyleProofReleaseIssueCount {
  issueId: StyleProofManifestIssueId
  count: number
}

export interface CommittedStyleProofReleaseGateBlocker {
  kind: CommittedStyleProofReleaseGateBlockerKind
  status: StyleProofAcceptanceAuditStatus | 'issue'
  platforms: readonly Platform[]
  requirementIds: readonly StyleProofRequirementId[]
  issueIds: readonly StyleProofManifestIssueId[]
  issueCount: number
  stepCount: number
  platformStepCounts: readonly CommittedStyleProofReleasePlatformStepCount[]
  requirementStepCounts: readonly CommittedStyleProofReleaseRequirementStepCount[]
  issueCounts: readonly CommittedStyleProofReleaseIssueCount[]
  message: string
  nextOperatorActions: readonly CommittedStyleProofReleaseNextOperatorAction[]
  fingerprintConflicts?: readonly CommittedStyleProofReleaseFingerprintConflict[]
}

export interface CommittedStyleProofReleaseGateReport {
  source: CommittedStyleProofExecutionRunbookReport
  canClaimComplete: boolean
  status: CommittedStyleProofReleaseGateStatus
  blockers: readonly CommittedStyleProofReleaseGateBlocker[]
  summary: CommittedStyleProofExecutionRunbookReport['summary'] & {
    blockerCount: number
    manualDeferredOpenSteps: number
    manualDeferredPlatformStepCounts: readonly CommittedStyleProofReleasePlatformStepCount[]
    releaseBlockingOpenSteps: number
    releaseBlockingPhoneOpenSteps: number
    releaseBlockingExternalDependencyOpenSteps: number
    releaseBlockingUnsafeToAutomateOpenSteps: number
    releaseBlockingMutatingOpenSteps: number
  }
}

export type CommittedStyleProofExternalProofChecklistBlockerKind =
  Exclude<CommittedStyleProofReleaseGateBlockerKind, 'local-conflict'>

export interface CommittedStyleProofExternalProofArtifactTemplate {
  requirementId: StyleProofRequirementId
  requiredChannels: readonly StyleProofChannel[]
  requiredActions: readonly StyleProofAction[]
  requiredReadbacks: readonly StyleProofReadback[]
  requiredFields: readonly StyleProofArtifactVerificationField[]
  forbiddenFields: readonly StyleProofArtifactVerificationField[]
  acceptedHostStatuses: readonly StyleProofHostStatus[]
  maxFreshnessDays: number | null
  redactionBoundary: string
  successCriteria: readonly string[]
  failureSignals: readonly string[]
}

export interface CommittedStyleProofExternalProofChecklistRow {
  id: string
  blockerKinds: readonly CommittedStyleProofExternalProofChecklistBlockerKind[]
  platform: Platform
  choiceIds: readonly string[]
  requirementId: StyleProofRequirementId
  requirementLabel: string
  gate: StyleProofCollectionGate
  boundary: StyleProofExecutionBoundary
  order: number
  status: StyleProofAcceptanceAuditStatus
  issueIds: readonly StyleProofManifestIssueId[]
  required: number
  satisfied: number
  missing: number
  invalid: number
  artifactCount: number
  acceptedArtifactCount: number
  blockedChoiceCount: number
  mutatesPlatform: boolean
  requiresExternalAccount: boolean
  requiresPhone: boolean
  safeToAutomate: boolean
  requiresFreshCollectedAt: boolean
  freshnessMaxDays: number | null
  freshnessIssueIds: readonly StyleProofManifestIssueId[]
  cannotClaim: boolean
  cannotClaimReason: string | null
  nextOperatorAction: string
  artifactTemplate: CommittedStyleProofExternalProofArtifactTemplate
}

export interface CommittedStyleProofExternalProofChecklistGroup {
  kind: CommittedStyleProofExternalProofChecklistBlockerKind
  status: StyleProofAcceptanceAuditStatus | 'issue'
  message: string
  platforms: readonly Platform[]
  requirementIds: readonly StyleProofRequirementId[]
  issueIds: readonly StyleProofManifestIssueId[]
  issueCount: number
  stepCount: number
  rowCount: number
  platformStepCounts: readonly CommittedStyleProofReleasePlatformStepCount[]
  requirementStepCounts: readonly CommittedStyleProofReleaseRequirementStepCount[]
  issueCounts: readonly CommittedStyleProofReleaseIssueCount[]
  nextOperatorActions: readonly CommittedStyleProofReleaseNextOperatorAction[]
  rows: readonly CommittedStyleProofExternalProofChecklistRow[]
}

export interface CommittedStyleProofExternalProofChecklistReport {
  releaseGate: CommittedStyleProofReleaseGateReport
  canClaimComplete: boolean
  status: CommittedStyleProofReleaseGateStatus
  rows: readonly CommittedStyleProofExternalProofChecklistRow[]
  groups: readonly CommittedStyleProofExternalProofChecklistGroup[]
  summary: CommittedStyleProofReleaseGateReport['summary'] & {
    groupCount: number
    groupRowCount: number
    uniqueChecklistRowCount: number
    phoneRows: number
    externalAccountRows: number
    publicHostRows: number
    mutatingRows: number
    unsafeToAutomateRows: number
    safeToAutomateRows: number
  }
}

export type CommittedStyleProofLocalActionabilityStatus =
  | 'actionable-local'
  | 'catalog-blocked'

export interface CommittedStyleProofLocalActionabilityRow {
  id: string
  actionability: CommittedStyleProofLocalActionabilityStatus
  catalogBlockedOnly: boolean
  platform: Platform
  choiceIds: readonly string[]
  requirementId: StyleProofRequirementId
  requirementLabel: string
  gate: StyleProofCollectionGate
  boundary: StyleProofExecutionBoundary
  order: number
  status: StyleProofAcceptanceAuditStatus
  issueIds: readonly StyleProofManifestIssueId[]
  required: number
  satisfied: number
  missing: number
  invalid: number
  artifactCount: number
  acceptedArtifactCount: number
  blockedChoiceCount: number
  safeToAutomate: boolean
  cannotClaim: boolean
  cannotClaimReason: string | null
  nextOperatorAction: string
  requiredArtifact: StyleProofExecutionArtifactContract
  successCriteria: readonly string[]
  failureSignals: readonly string[]
  redactionBoundary: string
}

export interface CommittedStyleProofLocalActionabilityReport {
  releaseGate: CommittedStyleProofReleaseGateReport
  externalChecklist: CommittedStyleProofExternalProofChecklistReport
  canClaimComplete: boolean
  status: CommittedStyleProofReleaseGateStatus
  rows: readonly CommittedStyleProofLocalActionabilityRow[]
  actionableRows: readonly CommittedStyleProofLocalActionabilityRow[]
  catalogBlockedRows: readonly CommittedStyleProofLocalActionabilityRow[]
  nextLocalActionableRow: CommittedStyleProofLocalActionabilityRow | null
  nextCatalogBlockedRow: CommittedStyleProofLocalActionabilityRow | null
  summary: CommittedStyleProofReleaseGateReport['summary'] & {
    safeLocalOpenRows: number
    actionableLocalRows: number
    catalogBlockedLocalRows: number
    externalChecklistRows: number
    externalChecklistGroupRows: number
    phoneExternalRows: number
    unsafeExternalRows: number
    mutatingExternalRows: number
    safeExternalRows: number
  }
}

export interface CommittedStyleProofExternalHandoffReport {
  releaseGate: CommittedStyleProofReleaseGateReport
  externalChecklist: CommittedStyleProofExternalProofChecklistReport
  localActionability: CommittedStyleProofLocalActionabilityReport
  canClaimComplete: boolean
  status: CommittedStyleProofReleaseGateStatus
  canContinueLocally: boolean
  requiresOperator: boolean
  requiresPhone: boolean
  requiresExternalAccount: boolean
  requiresPublicHost: boolean
  containsUnsafeToAutomateRows: boolean
  containsMutatingPlatformRows: boolean
  nextLocalActionableRow: CommittedStyleProofLocalActionabilityRow | null
  nextCatalogBlockedRow: CommittedStyleProofLocalActionabilityRow | null
  nextPhoneRow: CommittedStyleProofExternalProofChecklistRow | null
  nextExternalAccountRow: CommittedStyleProofExternalProofChecklistRow | null
  nextPublicHostRow: CommittedStyleProofExternalProofChecklistRow | null
  nextUnsafeToAutomateRow: CommittedStyleProofExternalProofChecklistRow | null
  nextMutatingPlatformRow: CommittedStyleProofExternalProofChecklistRow | null
  recommendedNextAction: string | null
  cannotAutoCompleteReason: string | null
  summary: CommittedStyleProofLocalActionabilityReport['summary'] & {
    externalHandoffRows: number
    externalHandoffGroups: number
    phoneRows: number
    externalAccountRows: number
    publicHostRows: number
    unsafeToAutomateRows: number
    mutatingRows: number
  }
}

export type CommittedStyleProofExternalHandoffNextRowKind =
  | 'phone-preview'
  | 'external-account'
  | 'public-host'
  | 'unsafe-to-automate'
  | 'mutating-platform'

export interface CommittedStyleProofExternalHandoffNextRowRef {
  kind: CommittedStyleProofExternalHandoffNextRowKind
  row: CommittedStyleProofExternalProofChecklistRow
}

export interface CommittedStyleProofExternalHandoffPacket {
  canClaimComplete: boolean
  status: CommittedStyleProofReleaseGateStatus
  canContinueLocally: boolean
  requiresOperator: boolean
  requiresPhone: boolean
  requiresExternalAccount: boolean
  requiresPublicHost: boolean
  containsUnsafeToAutomateRows: boolean
  containsMutatingPlatformRows: boolean
  recommendedNextAction: string | null
  cannotAutoCompleteReason: string | null
  summary: CommittedStyleProofExternalHandoffReport['summary']
  groups: readonly CommittedStyleProofExternalProofChecklistGroup[]
  rows: readonly CommittedStyleProofExternalProofChecklistRow[]
  nextRowRefs: readonly CommittedStyleProofExternalHandoffNextRowRef[]
  nextRows: readonly CommittedStyleProofExternalProofChecklistRow[]
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
    description: 'The target platform test draft is disposable and has a verified cleanup path before mutation.',
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
    id: 'scheduled-send-readback',
    label: 'scheduled send readback',
    description: 'The exact artifact is scheduled or sent through the real platform workflow and the resulting send/schedule state is read back.',
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
    id: 'zhihu-artifact-manifest',
    label: 'Zhihu artifact manifest',
    description: 'Image fallback host, upload proof, local file, alt/caption, format, dimensions, bytes, and Markdown references are consistent.',
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
    'no-sensitive-artifact',
  ],
  published: [
    'exact-artifact',
    'scheduled-send-readback',
    'published-url-or-platform-preview',
    'no-sensitive-artifact',
  ],
} as const satisfies Record<StyleEvidenceLabel, readonly StyleProofRequirementId[]>

const SENSITIVE_ARTIFACT_TEXT_PATTERNS = [
  /\baccessToken\b/i,
  /\brefreshToken\b/i,
  /\bauthorization\b/i,
  /\bbearer\s+[a-z0-9._-]+/i,
  /\bcookie\b/i,
  /\bset-cookie\b/i,
  /\bpassword\b/i,
  /\bsecret\b/i,
  /\bapi[_-]?key\b/i,
  /\bsessionid\b/i,
  /\.har\b/i,
  /\bhar\b/i,
  /\bqr(?:code)?\b/i,
  /\bscan-qr\b/i,
  /\b(?:account|backend|creator|editor|logged[-_\s]*in)[-_\s]*(?:screenshot|screen|capture|avatar|name|ui)\b/i,
  /\b(?:screenshot|screen|capture|ui)[-_\s]*(?:with[-_\s]*)?(?:account|backend|creator|editor|logged[-_\s]*in)\b/i,
  /\bprofileDir\b/i,
  /\buserDataDir\b/i,
  /[a-z]:\\users\\/i,
  /[a-z]:\/users\//i,
  /cloakbrowser.*profiles/i,
  /(?:^|[/\\])wechat-paste[/\\][^/\\]*(?:scan|qr|cover|account|backend|vessel)[^/\\]*(?:\.png|\.jpe?g|\.webp)$/i,
  /(?:^|[/\\])wechat-(?:preview|cover)[^/\\]*(?:scan|qr|vessel|account|backend)[^/\\]*(?:\.png|\.jpe?g|\.webp)$/i,
] as const

const STYLE_PROOF_COLLECTION_GATE_BY_REQUIREMENT = {
  'catalog-source': 'local-evidence',
  'market-applied-dom-readback': 'market-editor',
  'no-proprietary-template-source': 'local-evidence',
  'authenticated-editor-url': 'authenticated-pc-editor',
  'pc-editor-dom-readback': 'authenticated-pc-editor',
  'unit-test-coverage': 'local-evidence',
  'local-browser-rendering': 'local-evidence',
  'exact-artifact': 'local-evidence',
  'safe-disposable-draft': 'authenticated-pc-editor',
  'pc-editor-paste-event': 'authenticated-pc-editor',
  'phone-preview-readback': 'phone-preview',
  'phone-screenshot': 'phone-preview',
  'dark-mode-check': 'phone-preview',
  'cover-thumbnail-check': 'phone-preview',
  'credentialed-channel-response': 'credentialed-channel',
  'sync-readback': 'credentialed-channel',
  'scheduled-send-readback': 'platform-publish',
  'published-url-or-platform-preview': 'platform-publish',
  'public-image-host': 'public-host',
  'xhs-artifact-manifest': 'local-evidence',
  'zhihu-artifact-manifest': 'local-evidence',
  'no-sensitive-artifact': 'sensitive-hygiene',
} as const satisfies Record<StyleProofRequirementId, StyleProofCollectionGate>

const STYLE_PROOF_COLLECTION_ORDER: Record<StyleProofCollectionGate, number> = {
  'local-evidence': 10,
  'sensitive-hygiene': 20,
  'market-editor': 30,
  'authenticated-pc-editor': 40,
  'phone-preview': 50,
  'public-host': 60,
  'credentialed-channel': 70,
  'platform-publish': 80,
}

const STYLE_PROOF_COLLECTION_GATE_SEQUENCE: readonly StyleProofCollectionGate[] = [
  'local-evidence',
  'sensitive-hygiene',
  'market-editor',
  'authenticated-pc-editor',
  'phone-preview',
  'public-host',
  'credentialed-channel',
  'platform-publish',
]

const STYLE_PROOF_DEFAULT_MAX_FRESHNESS_DAYS = 14
const STYLE_PROOF_MANIFEST_INTAKE_MAX_ARTIFACTS = 512
const STYLE_PROOF_MANIFEST_INTAKE_MAX_MANIFESTS = 128
const STYLE_PROOF_MANIFEST_INTAKE_MAX_STRING_LENGTH = 4_096
const STYLE_PROOF_MANIFEST_JSON_MAX_LENGTH = 2_000_000
const STYLE_PROOF_MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

const STYLE_PROOF_COLLECTION_NOTES = {
  'local-evidence': 'Collect a redacted local artifact, test log, manifest, or local browser/Tauri proof before touching a real platform.',
  'sensitive-hygiene': 'Review proof references for tokens, cookies, QR codes, HAR files, browser profiles, account screenshots, and local credential paths.',
  'market-editor': 'Use CloakBrowser to apply a concrete market editor element, visually confirm insertion, and record DOM/controls without copying template source.',
  'authenticated-pc-editor': 'Use a real authenticated PC editor only after exact-artifact proof is ready; record authenticatedSessionVerified:true, platformEditorTargetVerified:true, platformEditorSurfaceVerified:true, platformEditorDomVerified:true, safe disposable-draft cleanup, and ordinary paste readback before claiming this gate.',
  'phone-preview': 'Use the target phone preview for readback, screenshots, Dark Mode, cover thumbnail, and interaction checks; PC DOM proof is not enough.',
  'public-host': 'Verify public HTTPS or platform-hosted image URLs with alt/caption context before reporting image fallback readiness.',
  'credentialed-channel': 'Use a real credentialed sync, plugin, upload, or API channel and read back the created draft/material; login or sign-in pages must stay blocked evidence.',
  'platform-publish': 'Inspect a real platform preview or published result for the exact artifact; do not infer this from editor paste, sync success, or login-route readback.',
} as const satisfies Record<StyleProofCollectionGate, string>

const STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS = {
  'catalog-source': {
    requirementId: 'catalog-source',
    requiredChannels: ['local-artifact'],
    requiredActions: ['catalog-source'],
    requiredReadbacks: ['none'],
    requiredFields: ['safeForCommit'],
  },
  'market-applied-dom-readback': {
    requirementId: 'market-applied-dom-readback',
    requiredChannels: ['market-editor'],
    requiredActions: ['applied-market-element'],
    requiredReadbacks: ['dom', 'visual', 'visual-and-dom'],
    requiredFields: ['centralEditorChanged', 'marketAppliedContentVerified', 'collectedAt', 'safeForCommit'],
  },
  'no-proprietary-template-source': {
    requirementId: 'no-proprietary-template-source',
    requiredChannels: ['local-artifact', 'market-editor'],
    requiredActions: ['source-hygiene-review'],
    requiredReadbacks: ['hygiene-log'],
    requiredFields: ['safeForCommit'],
    forbiddenFields: ['sensitive'],
  },
  'authenticated-editor-url': {
    requirementId: 'authenticated-editor-url',
    requiredChannels: ['platform-editor'],
    requiredActions: ['authenticated-editor-opened'],
    requiredReadbacks: ['dom', 'visual', 'visual-and-dom'],
    requiredFields: ['authenticatedSessionVerified', 'platformEditorTargetVerified', 'collectedAt', 'safeForCommit'],
  },
  'pc-editor-dom-readback': {
    requirementId: 'pc-editor-dom-readback',
    requiredChannels: ['platform-editor'],
    requiredActions: ['pc-editor-dom-readback'],
    requiredReadbacks: ['dom', 'visual', 'visual-and-dom'],
    requiredFields: [
      'authenticatedSessionVerified',
      'platformEditorTargetVerified',
      'platformEditorSurfaceVerified',
      'platformEditorDomVerified',
      'mojibakeFreeVerified',
      'collectedAt',
      'safeForCommit',
    ],
  },
  'unit-test-coverage': {
    requirementId: 'unit-test-coverage',
    requiredChannels: ['unit-test'],
    requiredActions: ['test-run'],
    requiredReadbacks: ['test-assertion'],
    requiredFields: ['safeForCommit'],
  },
  'local-browser-rendering': {
    requirementId: 'local-browser-rendering',
    requiredChannels: ['local-browser', 'tauri-webview'],
    requiredActions: ['local-render'],
    requiredReadbacks: ['visual', 'visual-and-dom', 'screenshot'],
    requiredFields: ['safeForCommit'],
  },
  'exact-artifact': {
    requirementId: 'exact-artifact',
    requiredChannels: ['local-artifact', 'local-browser'],
    requiredActions: ['local-render', 'source-hygiene-review'],
    requiredReadbacks: ['manifest', 'visual-and-dom', 'hygiene-log'],
    requiredFields: ['artifactFingerprint', 'exactArtifact', 'safeForCommit'],
  },
  'safe-disposable-draft': {
    requirementId: 'safe-disposable-draft',
    requiredChannels: ['platform-editor'],
    requiredActions: ['safe-disposable-draft'],
    requiredReadbacks: ['dom', 'visual-and-dom', 'hygiene-log'],
    requiredFields: ['disposableDraft', 'cleanupPathVerified', 'collectedAt', 'safeForCommit'],
  },
  'pc-editor-paste-event': {
    requirementId: 'pc-editor-paste-event',
    requiredChannels: ['platform-editor'],
    requiredActions: ['pc-paste'],
    requiredReadbacks: ['visual-and-dom'],
    requiredFields: [
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
    ],
  },
  'phone-preview-readback': {
    requirementId: 'phone-preview-readback',
    requiredChannels: ['phone-preview'],
    requiredActions: ['phone-preview'],
    requiredReadbacks: ['phone', 'visual', 'visual-and-dom', 'screenshot'],
    requiredFields: ['artifactFingerprint', 'exactArtifact', 'phonePreviewContentVerified', 'collectedAt', 'safeForCommit'],
    forbiddenFields: ['phonePreviewBlocked'],
  },
  'phone-screenshot': {
    requirementId: 'phone-screenshot',
    requiredChannels: ['phone-preview'],
    requiredActions: ['phone-preview'],
    requiredReadbacks: ['screenshot'],
    requiredFields: ['artifactFingerprint', 'exactArtifact', 'phonePreviewContentVerified', 'collectedAt', 'safeForCommit'],
    forbiddenFields: ['phonePreviewBlocked'],
  },
  'dark-mode-check': {
    requirementId: 'dark-mode-check',
    requiredChannels: ['phone-preview'],
    requiredActions: ['dark-mode-check'],
    requiredReadbacks: ['phone', 'visual', 'visual-and-dom', 'screenshot'],
    requiredFields: [
      'artifactFingerprint',
      'exactArtifact',
      'phonePreviewContentVerified',
      'darkModeEnabledVerified',
      'collectedAt',
      'safeForCommit',
    ],
    forbiddenFields: ['phonePreviewBlocked'],
  },
  'cover-thumbnail-check': {
    requirementId: 'cover-thumbnail-check',
    requiredChannels: ['phone-preview'],
    requiredActions: ['cover-thumbnail-check'],
    requiredReadbacks: ['phone', 'visual', 'visual-and-dom', 'screenshot'],
    requiredFields: ['artifactFingerprint', 'exactArtifact', 'coverThumbnailAccepted', 'collectedAt', 'safeForCommit'],
    forbiddenFields: ['phonePreviewBlocked'],
  },
  'credentialed-channel-response': {
    requirementId: 'credentialed-channel-response',
    requiredChannels: ['credentialed-channel'],
    requiredActions: ['credentialed-sync'],
    requiredReadbacks: ['api-response'],
    requiredFields: ['artifactFingerprint', 'exactArtifact', 'externalAccountAuthenticated', 'collectedAt', 'safeForCommit'],
    forbiddenFields: ['externalAccountLoginBlocked'],
  },
  'sync-readback': {
    requirementId: 'sync-readback',
    requiredChannels: ['credentialed-channel'],
    requiredActions: ['sync-readback'],
    requiredReadbacks: ['dom', 'api-response', 'visual-and-dom'],
    requiredFields: ['artifactFingerprint', 'exactArtifact', 'externalAccountAuthenticated', 'collectedAt', 'safeForCommit'],
    forbiddenFields: ['externalAccountLoginBlocked'],
  },
  'scheduled-send-readback': {
    requirementId: 'scheduled-send-readback',
    requiredChannels: ['credentialed-channel'],
    requiredActions: ['scheduled-send'],
    requiredReadbacks: ['api-response', 'dom', 'visual-and-dom', 'scheduled-send-state'],
    requiredFields: ['artifactFingerprint', 'exactArtifact', 'externalAccountAuthenticated', 'scheduledSendVerified', 'collectedAt', 'safeForCommit'],
    forbiddenFields: ['externalAccountLoginBlocked'],
  },
  'published-url-or-platform-preview': {
    requirementId: 'published-url-or-platform-preview',
    requiredChannels: ['public-web', 'credentialed-channel'],
    requiredActions: ['published-preview'],
    requiredReadbacks: ['published-url', 'visual', 'visual-and-dom', 'screenshot'],
    requiredFields: ['artifactFingerprint', 'exactArtifact', 'externalAccountAuthenticated', 'collectedAt', 'safeForCommit'],
    forbiddenFields: ['externalAccountLoginBlocked'],
  },
  'public-image-host': {
    requirementId: 'public-image-host',
    requiredChannels: ['public-web'],
    requiredActions: ['public-image-host-check'],
    requiredReadbacks: ['visual', 'dom', 'manifest'],
    requiredFields: ['artifactRef', 'hostStatus', 'collectedAt', 'safeForCommit'],
    acceptedHostStatuses: ['public-https', 'platform-hosted'],
  },
  'xhs-artifact-manifest': {
    requirementId: 'xhs-artifact-manifest',
    requiredChannels: ['local-artifact'],
    requiredActions: ['artifact-manifest-validation'],
    requiredReadbacks: ['manifest'],
    requiredFields: ['artifactRef', 'artifactManifestValidated', 'safeForCommit'],
  },
  'zhihu-artifact-manifest': {
    requirementId: 'zhihu-artifact-manifest',
    requiredChannels: ['local-artifact'],
    requiredActions: ['artifact-manifest-validation'],
    requiredReadbacks: ['manifest'],
    requiredFields: ['artifactRef', 'artifactManifestValidated', 'safeForCommit'],
  },
  'no-sensitive-artifact': {
    requirementId: 'no-sensitive-artifact',
    requiredChannels: ['local-artifact'],
    requiredActions: ['sensitive-hygiene-review'],
    requiredReadbacks: ['hygiene-log'],
    requiredFields: ['safeForCommit'],
    forbiddenFields: ['sensitive'],
  },
} as const satisfies Record<StyleProofRequirementId, StyleProofExecutionArtifactContract>

function doesStyleProofGateMutatePlatform(gate: StyleProofCollectionGate): boolean {
  return gate === 'authenticated-pc-editor'
    || gate === 'credentialed-channel'
    || gate === 'platform-publish'
}

function doesStyleProofGateRequireExternalAccount(gate: StyleProofCollectionGate): boolean {
  return gate === 'market-editor'
    || gate === 'authenticated-pc-editor'
    || gate === 'credentialed-channel'
    || gate === 'platform-publish'
}

function doesStyleProofGateRequirePhone(gate: StyleProofCollectionGate): boolean {
  return gate === 'phone-preview'
}

function isStyleProofGateSafeToAutomate(gate: StyleProofCollectionGate): boolean {
  return gate === 'local-evidence' || gate === 'sensitive-hygiene'
}

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
    choiceId: 'wechat-toolbar-parameter-map',
    platform: 'wechat',
    presetId: 'thesis',
    presetLabel: '璁烘枃缈昏瘧',
    scope: 'styled-and-native',
    note: 'maps typography parameters to an existing WeChat preset with font size, serif stack, indent, justify, line-height, and side-padding rules instead of leaving the available style choice disabled',
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
    choiceId: 'wechat-flagship-kiln-paste-safe',
    platform: 'wechat',
    presetId: 'flagship-kiln-paste-safe',
    presetLabel: '赤陶兼容旗舰',
    scope: 'styled-and-native',
    note: 'additive Kiln ordinary-paste compatibility path using encoded CF_HTML, the cover-title first block, the Kiln palette, and the Forge divider',
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
    note: 'direct mapping to the existing Amber flagship preset; ordinary OS Ctrl+V PC proof exists, while mobile preview and publish proof remain separate gates',
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
    choiceId: 'xhs-data-card',
    platform: 'xiaohongshu',
    presetId: 'xhs-tech',
    presetLabel: '科技数码',
    scope: 'styled-and-native',
    note: 'maps the proven local data-card image-page capability to the existing tech preset without claiming platform upload or publish proof',
  },
  {
    choiceId: 'xhs-long-report',
    platform: 'xiaohongshu',
    presetId: 'xhs-simple',
    presetLabel: '极简高级',
    scope: 'styled-and-native',
    note: 'maps the proven local long-report fallback capability to the existing restrained long-form Xiaohongshu preset',
  },
  {
    choiceId: 'xhs-market-rich-card-fallback',
    platform: 'xiaohongshu',
    presetId: 'xhs-nature',
    presetLabel: '自然清新',
    scope: 'styled-and-native',
    note: 'maps market-rich fallback intent to the existing source-owned Xiaohongshu image-page preset while keeping account upload and publish proof separate',
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

const MARKET_RESIDUE_DETECTOR_BLOCKER_BY_PLATFORM = {
  wechat: 'wechat-market-editor-residue',
  xiaohongshu: 'xhs-market-editor-residue',
  zhihu: 'zhihu-market-editor-residue',
} as const satisfies Record<Platform, string>

const PLATFORM_STYLE_CHOICES_BASE = [
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
    id: 'wechat-flagship-kiln-paste-safe',
    platform: 'wechat',
    label: 'Kiln ordinary-paste compatibility candidate',
    ruleGroup: 'headline-system',
    contentBlocks: ['cover-title fallback', 'chapter headers', 'Forge divider', 'quote cards', 'endmark'],
    visualStrength: 'high',
    motion: 'static',
    primaryOutput: 'wechat-safe-svg',
    fallbackOutput: 'image-fallback',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['pc-editor-paste', 'mobile-preview', 'published'],
    blockers: [
      'fresh mobile WeChat preview missing',
      'Dark Mode phone proof missing',
      'cover thumbnail not separately proven',
      'platform preview or publish proof missing',
    ],
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
    status: 'available',
    evidenceFloor: 'pc-editor-paste',
    publishEvidence: ['mobile-preview', 'published'],
    blockers: [
      'mobile preview proof missing',
      'Dark Mode phone proof missing',
      'cover thumbnail not separately proven',
      'platform preview or publish proof missing',
    ],
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
    id: 'wechat-market-svg-h5-fallback-matrix',
    platform: 'wechat',
    label: 'Market SVG/H5 fallback matrix',
    ruleGroup: 'fallback-system',
    contentBlocks: [
      'background SVG shell',
      'image carousel',
      'click expand',
      'click show/hide',
      'click switch',
      'path animation',
      'parallax',
      'slide trigger',
      'long press',
      'region trigger',
      'card/title/divider/cover structures',
      'text marquee',
      'quiz/game',
      'image-slot manifest',
      'trigger-zone manifest',
      'external H5 handoff boundary',
      'H5 handoff',
    ],
    visualStrength: 'high',
    motion: 'mobile-only',
    primaryOutput: 'image-fallback',
    fallbackOutput: 'static-fallback',
    status: 'blocked',
    evidenceFloor: 'mobile-preview',
    publishEvidence: ['mobile-preview', 'published'],
    marketCapabilities: [
      {
        family: 'background-svg-shell',
        label: 'Gap-safe background SVG shell',
        sources: ['135-svg-editor', 'public-wechat-svg-practice'],
        triggerMode: 'none',
        renderPattern: 'gap-safe-inline-svg',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        imageRatio: '1080x1920',
        requiredProof: [
          'market-applied-dom-readback',
          'no-proprietary-template-source',
          'local-browser-rendering',
          'phone-preview-readback',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Reimplement 135-style background SVG shells as InkForge-owned zero-gap media wrappers.',
          'Do not commit vendor template source, material URLs, or paid assets.',
        ],
      },
      {
        family: 'image-carousel',
        label: 'Image carousel and smooth scroll family',
        sources: ['135-svg-editor', 'xiumi-v5-paper'],
        triggerMode: 'slide',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        imageRatio: '1080x720',
        requiredProof: [
          'market-applied-dom-readback',
          'no-proprietary-template-source',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Xiumi cards expose ratio and component metadata; phone readback is still required for motion.',
          'A static first frame or raster pack is required before user-facing export selection.',
        ],
      },
      {
        family: 'click-expand',
        label: 'Click expand and click open family',
        sources: ['135-svg-editor', 'xiumi-v5-paper'],
        triggerMode: 'click',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Click-driven SVG/H5 affordances must keep readable expanded/collapsed fallback content.',
        ],
      },
      {
        family: 'click-show-hide',
        label: 'Click show hide and disappear family',
        sources: ['xiumi-v5-paper'],
        triggerMode: 'click',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Treat Xiumi click-show, popup, disappear, zoom, print, jump, and play branches as proof-gated variants.',
        ],
      },
      {
        family: 'click-switch',
        label: 'Click switch and step transition family',
        sources: ['135-svg-editor', 'xiumi-v5-paper'],
        triggerMode: 'click',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Single-step gallery changes must not be marked usable from library preview counts alone.',
        ],
      },
      {
        family: 'path-animation',
        label: 'Path animation and automatic motion family',
        sources: ['xiumi-v5-paper'],
        triggerMode: 'auto',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Auto motion needs a static readable fallback and mobile timing proof before any claim.',
        ],
      },
      {
        family: 'parallax-motion',
        label: 'Parallax and slide-trigger motion family',
        sources: ['xiumi-v5-paper'],
        triggerMode: 'slide',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Slide-trigger and parallax effects are mobile-behavior candidates, not desktop proof.',
        ],
      },
      {
        family: 'slide-trigger',
        label: 'Slide trigger and branch transition family',
        sources: ['135-svg-editor', 'xiumi-v5-paper'],
        triggerMode: 'slide',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Branch transitions require same-artifact phone before and after readback.',
        ],
      },
      {
        family: 'long-press-switch',
        label: 'Long press switch family',
        sources: ['135-svg-editor', 'xiumi-v5-paper'],
        triggerMode: 'long-press',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Long-press behavior must be proven on phone WeChat; desktop DOM readback is not enough.',
        ],
      },
      {
        family: 'region-trigger',
        label: 'Region trigger and trigger-zone family',
        sources: ['135-svg-editor', 'xiumi-v5-paper'],
        triggerMode: 'region',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Trigger zones require normalized geometry reports and mobile readback before export success.',
        ],
      },
      {
        family: 'text-marquee',
        label: 'Text marquee and bullet-comment motion family',
        sources: ['xiumi-v5-paper'],
        triggerMode: 'auto',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Xiumi text bullet screens are motion candidates; InkForge must keep readable static text before mobile proof.',
          'Do not copy vendor timeline wrappers, Angular bindings, or hosted material references.',
        ],
      },
      {
        family: 'quiz-game',
        label: 'Lottery, quiz, and lightweight game family',
        sources: ['xiumi-v5-paper'],
        triggerMode: 'click',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Lottery and quiz affordances need deterministic fallback copy and exact phone before/after readback.',
          'Game-like state must not depend on hidden vendor runtime, random remote state, or proprietary scripts.',
        ],
      },
      {
        family: 'flip-zoom',
        label: 'Flip, zoom, and scale transition family',
        sources: ['135-svg-editor', 'xiumi-v5-paper'],
        triggerMode: 'click',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Flip/zoom effects must expose both front and back content in a static fallback.',
          '135 free-trial flip-card observations remain authoring-canvas proof only until phone readback exists.',
        ],
      },
      {
        family: 'click-popup',
        label: 'Click popup and reveal overlay family',
        sources: ['135-svg-editor', 'xiumi-v5-paper'],
        triggerMode: 'click',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Popup/reveal overlays require same-artifact click readback and a fully readable expanded fallback.',
          'Transparent trigger regions must be normalized into InkForge-owned geometry metadata.',
        ],
      },
      {
        family: 'click-print-jump-play',
        label: 'Click print, jump, and play handoff family',
        sources: ['xiumi-v5-paper'],
        triggerMode: 'plugin-sync',
        renderPattern: 'publish-checklist',
        output: 'publish-checklist',
        status: 'external-handoff',
        degradable: false,
        requiredProof: [
          'credentialed-channel-response',
          'sync-readback',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Print, jump, and play actions stay checklist-only because they imply runtime action state outside static article markup.',
          'Do not mark these actions usable from editor thumbnails, preview labels, or desktop DOM alone.',
        ],
      },
      {
        family: 'falling-motion',
        label: 'Falling particles and ambient auto-motion family',
        sources: ['xiumi-v5-paper'],
        triggerMode: 'auto',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Ambient falling effects need static density limits, motion-off fallback, and mobile timing proof.',
          'Decorative particles must never obscure selectable article text or cover required readback.',
        ],
      },
      {
        family: 'click-plus-auto',
        label: 'Click plus automatic mixed-trigger family',
        sources: ['xiumi-v5-paper'],
        triggerMode: 'mobile-touch',
        renderPattern: 'component-tree',
        output: 'wechat-safe-svg',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'market-applied-dom-readback',
          'phone-preview-readback',
          'phone-screenshot',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Mixed click and auto effects must define the initial, triggered, and settled frames before export selection.',
          'Phone proof must verify both automatic timing and user-triggered state on the same artifact.',
        ],
      },
      {
        family: 'ratio-image-layer',
        label: 'Ratio-preserving image layer wrapper',
        sources: ['xiumi-v5-paper', 'inkforge-owned'],
        triggerMode: 'none',
        renderPattern: 'component-tree',
        output: 'static-fallback',
        status: 'fallback-only',
        degradable: true,
        imageRatio: '1080x720',
        requiredProof: [
          'local-browser-rendering',
          'no-proprietary-template-source',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Use ratio boxes, max-width images, overflow clipping, and line-height zero as wrapper rules.',
        ],
      },
      {
        family: 'title-card-layout',
        label: 'Title card and rich layout component tree',
        sources: ['135-svg-editor', 'xiumi-v5-paper', 'inkforge-owned'],
        triggerMode: 'none',
        renderPattern: 'component-tree',
        output: 'inline-html',
        status: 'fallback-only',
        degradable: true,
        requiredProof: [
          'local-browser-rendering',
          'no-proprietary-template-source',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Market title/card structures may inform InkForge-owned cards, not copied authoring markup.',
        ],
      },
      {
        family: 'h5-handoff',
        label: 'External H5 and plugin handoff boundary',
        sources: ['135-svg-editor', 'xiumi-v5-paper'],
        triggerMode: 'plugin-sync',
        renderPattern: 'publish-checklist',
        output: 'publish-checklist',
        status: 'external-handoff',
        degradable: false,
        requiredProof: [
          'credentialed-channel-response',
          'sync-readback',
          'published-url-or-platform-preview',
        ],
        notes: [
          'External H5/plugin workflows stay checklist-only until exact credentialed channel proof exists.',
        ],
      },
      {
        family: 'static-raster-fallback',
        label: 'Static raster fallback pack',
        sources: ['inkforge-owned', 'doocs-md'],
        triggerMode: 'none',
        renderPattern: 'static-raster',
        output: 'image-fallback',
        status: 'fallback-only',
        degradable: true,
        requiredProof: [
          'local-browser-rendering',
          'exact-artifact',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Raster/static fallback is the safe local bridge when WeChat interaction proof is absent.',
        ],
      },
    ],
    blockers: [
      '135/Xiumi SVG and H5 taxonomy must be rewritten as InkForge-owned modules, image manifests, or static/raster fallback',
      '135 background SVG shells require layout reports, typed image slots, normalized trigger zones, and static/raster fallback before any export claim',
      'Xiumi SVG/title/card samples are authoring wrappers or image/layer/action trees; center inline-SVG absence cannot become WeChat SVG proof',
      'external H5 pages, vendor H5 packages, and plugin/sync handoffs stay publish-checklist states until the exact InkForge artifact has platform preview or publish proof',
      'phone WeChat proof is missing for tap, swipe, long-press, and region-trigger behavior',
      'market authoring DOM, hosted media, and plugin/sync state cannot appear in publishable output',
    ],
    detectorBlockers: [
      'wechat-unsafe-svg-construct',
      'wechat-svg-touchstart-only',
      'wechat-fixed-container-size',
      'wechat-transparent-image-svg-overlay',
      'wechat-line-height-zero',
      'wechat-class-id-dependency',
      'wechat-layout-report-required',
    ],
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
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    blockers: ['dense table/card layouts still require per-artifact overflow and mobile readability checks'],
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
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    blockers: ['long-image crop and file-size proof must be regenerated for each exported artifact'],
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
    id: 'xhs-market-rich-card-fallback',
    platform: 'xiaohongshu',
    label: 'Market rich card image fallback',
    ruleGroup: 'fallback-system',
    contentBlocks: ['carousel card', 'poster slice', 'long image', 'design poster', 'plain note caption'],
    visualStrength: 'medium-high',
    motion: 'none',
    primaryOutput: 'image-page',
    fallbackOutput: 'long-image',
    status: 'available',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    marketCapabilities: [
      {
        family: 'title-card-layout',
        label: 'Market rich card rewritten as XHS image page',
        sources: ['135-svg-editor', 'xiumi-v5-paper', 'inkforge-owned'],
        triggerMode: 'none',
        renderPattern: 'static-raster',
        output: 'image-page',
        status: 'source-owned',
        degradable: true,
        requiredProof: [
          'local-browser-rendering',
          'xhs-artifact-manifest',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Use source-owned XHS image-page components instead of market editor HTML/SVG trees.',
        ],
      },
      {
        family: 'image-carousel',
        label: 'Carousel page pack fallback',
        sources: ['xiumi-v5-paper', 'inkforge-owned'],
        triggerMode: 'none',
        renderPattern: 'static-raster',
        output: 'image-page',
        status: 'fallback-only',
        degradable: true,
        imageRatio: '1080x1440',
        requiredProof: [
          'local-browser-rendering',
          'xhs-artifact-manifest',
          'published-url-or-platform-preview',
        ],
        notes: [
          'XHS receives page images or long images, not copied SVG/H5 interaction markup.',
        ],
      },
      {
        family: 'static-raster-fallback',
        label: 'Long-image and poster fallback',
        sources: ['inkforge-owned', 'doocs-md'],
        triggerMode: 'none',
        renderPattern: 'static-raster',
        output: 'long-image',
        status: 'fallback-only',
        degradable: true,
        requiredProof: [
          'local-browser-rendering',
          'xhs-artifact-manifest',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Regenerate crop, format, page order, and body reference proof for every exported pack.',
        ],
      },
    ],
    blockers: [
      '135/Xiumi SVG/H5 richness must materialize as real InkForge-owned XHS image pages or a long-image artifact manifest',
      'page crop, file format, page order, and body reference proof must be regenerated for each exported fallback pack',
      'raw HTML, SVG, market authoring DOM, and WeChat-only decoration cannot enter Xiaohongshu text output',
    ],
    detectorBlockers: [
      'xhs-image-reference-mismatch',
      'xhs-image-format-unsupported',
      'xhs-html-tags',
      'xhs-wechat-decoration-leak',
    ],
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
  {
    id: 'zhihu-market-rich-layout-fallback',
    platform: 'zhihu',
    label: 'Market rich layout image fallback',
    ruleGroup: 'fallback-system',
    contentBlocks: ['complex card', 'diagram poster', 'carousel summary', 'public image fallback', 'semantic caption'],
    visualStrength: 'medium',
    motion: 'none',
    primaryOutput: 'image-fallback',
    fallbackOutput: 'clean-markdown',
    status: 'blocked',
    evidenceFloor: 'local-browser',
    publishEvidence: ['published'],
    marketCapabilities: [
      {
        family: 'title-card-layout',
        label: 'Market rich layout rewritten as clean Zhihu structure',
        sources: ['135-svg-editor', 'xiumi-v5-paper', 'inkforge-owned'],
        triggerMode: 'none',
        renderPattern: 'clean-markdown',
        output: 'clean-markdown',
        status: 'fallback-only',
        degradable: true,
        requiredProof: [
          'unit-test-coverage',
          'zhihu-artifact-manifest',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Preserve semantic headings, captions, and list structure instead of WeChat-specific wrappers.',
        ],
      },
      {
        family: 'public-image-fallback',
        label: 'Public image fallback for diagram or poster layouts',
        sources: ['inkforge-owned'],
        triggerMode: 'public-host',
        renderPattern: 'static-raster',
        output: 'image-fallback',
        status: 'blocked-until-proof',
        degradable: true,
        requiredProof: [
          'local-browser-rendering',
          'public-image-host',
          'zhihu-artifact-manifest',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Zhihu image fallback requires public HTTPS or platform-host proof plus alt and caption metadata.',
        ],
      },
      {
        family: 'static-raster-fallback',
        label: 'Static article image fallback',
        sources: ['inkforge-owned', 'doocs-md'],
        triggerMode: 'none',
        renderPattern: 'static-raster',
        output: 'image-fallback',
        status: 'fallback-only',
        degradable: true,
        requiredProof: [
          'local-browser-rendering',
          'zhihu-artifact-manifest',
          'published-url-or-platform-preview',
        ],
        notes: [
          'Use only after host, alt text, caption, and manifest checks are satisfied.',
        ],
      },
    ],
    blockers: [
      '135/Xiumi rich layout must be rewritten as clean Markdown or public-host image fallback with alt and caption',
      'public HTTPS host proof and Zhihu artifact manifest validation are missing',
      'raw HTML, inline SVG, market authoring DOM, and private media dependencies cannot enter Zhihu output',
    ],
    detectorBlockers: [
      'zhihu-html-dependency',
      'zhihu-inline-svg',
      'zhihu-image-host-blocked',
      'zhihu-image-alt-missing',
      'zhihu-image-caption-missing',
    ],
  },
] as const satisfies readonly PlatformStyleChoice[]

export const PLATFORM_STYLE_CHOICES = PLATFORM_STYLE_CHOICES_BASE.map(choice => ({
  ...choice,
  detectorBlockers: [
    ...choice.detectorBlockers,
    MARKET_RESIDUE_DETECTOR_BLOCKER_BY_PLATFORM[choice.platform],
  ],
})) satisfies readonly PlatformStyleChoice[]

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

const EMPTY_STYLE_MARKET_CAPABILITIES = [] as const satisfies readonly StyleMarketCapability[]

export function getStyleChoiceMarketCapabilities(choiceId: string): readonly StyleMarketCapability[] {
  return getStyleChoiceById(choiceId)?.marketCapabilities ?? EMPTY_STYLE_MARKET_CAPABILITIES
}

export function getPlatformStyleMarketCapabilityReport(
  platform: Platform,
): PlatformStyleMarketCapabilityReport {
  const platformChoices = getPlatformStyleChoices(platform)
  const choices = platformChoices
    .map(choice => ({
      choice,
      capabilities: choice.marketCapabilities ?? EMPTY_STYLE_MARKET_CAPABILITIES,
      application: getStyleChoiceApplication(choice.id),
      proofRequirements: getStyleChoiceProofRequirements(choice),
    }))
    .filter(entry => entry.capabilities.length > 0)

  const capabilities = choices.flatMap(entry => entry.capabilities)
  const families = Array.from(new Set(capabilities.map(capability => capability.family))).sort()

  return {
    platform,
    choices,
    families,
    stats: {
      totalChoices: platformChoices.length,
      choicesWithCapabilities: choices.length,
      capabilities: capabilities.length,
      sourceOwned: capabilities.filter(capability => capability.status === 'source-owned').length,
      fallbackOnly: capabilities.filter(capability => capability.status === 'fallback-only').length,
      blockedUntilProof: capabilities.filter(capability => capability.status === 'blocked-until-proof').length,
      externalHandoff: capabilities.filter(capability => capability.status === 'external-handoff').length,
    },
  }
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

  if (
    choice.platform === 'xiaohongshu'
    && (
      choice.primaryOutput === 'image-page'
      || choice.primaryOutput === 'long-image'
      || choice.fallbackOutput === 'image-page'
      || choice.fallbackOutput === 'long-image'
    )
  ) {
    requirementIds.add('xhs-artifact-manifest')
  }

  if (
    choice.platform === 'zhihu'
    && (
      choice.primaryOutput === 'image-fallback'
      || choice.id === 'zhihu-public-image-upload-checklist'
    )
  ) {
    requirementIds.add('public-image-host')
    requirementIds.add('zhihu-artifact-manifest')
  }

  return Array.from(requirementIds, requirementId => {
    const requirement = STYLE_PROOF_REQUIREMENT_BY_ID.get(requirementId)
    if (!requirement) throw new Error(`Unknown style proof requirement: ${requirementId}`)
    return requirement
  })
}

interface CommittedStyleProofLocalEvidenceManifestOptions {
  choiceId: 'wechat-flagship-kiln' | 'wechat-flagship-tempera' | 'wechat-flagship-amber'
  label: string
  artifactFingerprint: string
  localRenderArtifactRef: string
}

interface CommittedStyleProofWechatUnitEvidenceManifestOptions {
  choiceId: 'wechat-classic-inline'
  label: string
  artifactFingerprint: string
  artifactRef: string
  reportRef: string
}

interface CommittedStyleProofWechatLocalHtmlEvidenceManifestOptions {
  choiceId:
    | 'wechat-quiet-editorial'
    | 'wechat-toolbar-parameter-map'
    | 'wechat-cover-seal-divider'
    | 'wechat-card-rich'
    | 'wechat-flagship-kiln-paste-safe'
  label: string
  artifactFingerprint: string
  artifactRef: string
  reportRef: string
}

interface CommittedStyleProofXhsLocalEvidenceManifestOptions {
  choiceId:
    | 'xhs-cover-carousel'
    | 'xhs-cover-hook'
    | 'xhs-markdown-card-slicer'
    | 'xhs-data-card'
    | 'xhs-long-report'
    | 'xhs-market-rich-card-fallback'
  label: string
  artifactFingerprint: string
  localRenderArtifactRef: string
  manifestArtifactRef: string
}

interface CommittedStyleProofXhsTextEvidenceManifestOptions {
  choiceId: 'xhs-clean-text'
  label: string
  artifactFingerprint: string
  artifactRef: string
  reportRef: string
}

interface CommittedStyleProofZhihuLocalEvidenceManifestOptions {
  choiceId: 'zhihu-data-table'
  label: string
  artifactFingerprint: string
  localRenderArtifactRef: string
  reportRef: string
}

interface CommittedStyleProofZhihuCleanMarkdownEvidenceManifestOptions {
  choiceId: 'zhihu-clean-column' | 'zhihu-academic-latex-column' | 'zhihu-wechat-adapted'
  label: string
  artifactFingerprint: string
  artifactRef: string
  reportRef: string
}

interface CommittedStyleProofWechatPcEvidenceManifestOptions {
  choiceId:
    | 'wechat-classic-inline'
    | 'wechat-quiet-editorial'
    | 'wechat-toolbar-parameter-map'
    | 'wechat-cover-seal-divider'
    | 'wechat-card-rich'
    | 'wechat-flagship-kiln'
    | 'wechat-flagship-amber'
    | 'wechat-flagship-tempera'
    | 'wechat-flagship-kiln-paste-safe'
  idPrefix: string
  label: string
  artifactFingerprint: string
  reportRef: string
  pasteProofLabel: string
  collectedAt: string
  readonlyEditorRefreshReportRef: string
  readonlyEditorRefreshCollectedAt: string
}

interface CommittedStyleProofWechatExternalBlockerManifestOptions {
  choiceId: 'wechat-flagship-amber'
  idPrefix: string
  label: string
  artifactFingerprint: string
  reportRef: string
  collectedAt: string
}

const COMMITTED_STYLE_PROOF_LOCAL_EVIDENCE_REPORT_REF =
  'prompts/0601/evidence/style-proof-committed-local-evidence-20260617.txt'

const COMMITTED_STYLE_PROOF_ACCEPTANCE_UI_REPORT_REF =
  'prompts/0601/evidence/style-proof-acceptance-ui-20260617.txt'

const COMMITTED_STYLE_PROOF_XHS_RASTER_REPORT_REF =
  'prompts/0601/evidence/xhs-raster/README.md'

const COMMITTED_STYLE_PROOF_WECHAT_CLASSIC_INLINE_ARTIFACT_REF =
  'prompts/0601/evidence/wechat-classic-inline-local-artifact-20260621.html'

const COMMITTED_STYLE_PROOF_WECHAT_CLASSIC_INLINE_REPORT_REF =
  'prompts/0601/evidence/wechat-classic-inline-local-evidence-20260621.txt'

const COMMITTED_STYLE_PROOF_WECHAT_QUIET_EDITORIAL_ARTIFACT_REF =
  'prompts/0601/evidence/wechat-quiet-editorial-local-artifact-20260621.html'

const COMMITTED_STYLE_PROOF_WECHAT_QUIET_EDITORIAL_REPORT_REF =
  'prompts/0601/evidence/wechat-quiet-editorial-local-evidence-20260621.txt'

const COMMITTED_STYLE_PROOF_WECHAT_TOOLBAR_PARAMETER_MAP_ARTIFACT_REF =
  'prompts/0601/evidence/wechat-toolbar-parameter-map-local-artifact-20260622.html'

const COMMITTED_STYLE_PROOF_WECHAT_TOOLBAR_PARAMETER_MAP_REPORT_REF =
  'prompts/0601/evidence/wechat-toolbar-parameter-map-local-evidence-20260622.txt'

const COMMITTED_STYLE_PROOF_WECHAT_COVER_SEAL_DIVIDER_ARTIFACT_REF =
  'prompts/0601/evidence/wechat-cover-seal-divider-local-artifact-20260622.html'

const COMMITTED_STYLE_PROOF_WECHAT_COVER_SEAL_DIVIDER_REPORT_REF =
  'prompts/0601/evidence/wechat-cover-seal-divider-local-evidence-20260622.txt'

const COMMITTED_STYLE_PROOF_WECHAT_CARD_RICH_ARTIFACT_REF =
  'prompts/0601/evidence/wechat-card-rich-local-artifact-20260622.html'

const COMMITTED_STYLE_PROOF_WECHAT_CARD_RICH_REPORT_REF =
  'prompts/0601/evidence/wechat-card-rich-local-evidence-20260622.txt'

const COMMITTED_STYLE_PROOF_WECHAT_KILN_PASTE_SAFE_ARTIFACT_REF =
  'prompts/0601/evidence/wechat-paste/flagship-kiln-paste-safe.html'

const COMMITTED_STYLE_PROOF_WECHAT_KILN_PASTE_SAFE_REPORT_REF =
  'prompts/0601/evidence/wechat-kiln-paste-safe-committed-local-evidence-20260622.txt'

const COMMITTED_STYLE_PROOF_WECHAT_KILN_PASTE_SAFE_PC_REPORT_REF =
  'prompts/0601/evidence/wechat-kiln-paste-safe-encoded-ordinary-ctrlv-20260703.txt'

const COMMITTED_STYLE_PROOF_WECHAT_PC_BATCH_REPORT_REF =
  'prompts/0601/evidence/wechat-pc-ordinary-ctrlv-batch-20260703.txt'

const COMMITTED_STYLE_PROOF_XHS_MANIFEST_REPORT_REF =
  'prompts/0601/evidence/xhs-image-manifest-gate-20260609.txt'

const COMMITTED_STYLE_PROOF_XHS_COVER_HOOK_MANIFEST_REPORT_REF =
  'prompts/0601/evidence/xhs-cover-hook-local-evidence-20260621.txt'

const COMMITTED_STYLE_PROOF_XHS_CARD_SLICER_MANIFEST_REF =
  'prompts/0601/evidence/xhs-raster/xhs-markdown-card-slicer-browser-2026-06-21.json'

const COMMITTED_STYLE_PROOF_XHS_DATA_CARD_MANIFEST_REF =
  'prompts/0601/evidence/xhs-raster/xhs-data-card-browser-2026-06-21.json'

const COMMITTED_STYLE_PROOF_XHS_LONG_REPORT_MANIFEST_REF =
  'prompts/0601/evidence/xhs-raster/xhs-long-report-browser-2026-06-21.json'

const COMMITTED_STYLE_PROOF_XHS_MARKET_RICH_CARD_FALLBACK_MANIFEST_REF =
  'prompts/0601/evidence/xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21.json'

const COMMITTED_STYLE_PROOF_XHS_CLEAN_TEXT_ARTIFACT_REF =
  'prompts/0601/evidence/xhs-clean-text-local-artifact-20260621.txt'

const COMMITTED_STYLE_PROOF_XHS_CLEAN_TEXT_REPORT_REF =
  'prompts/0601/evidence/xhs-clean-text-local-evidence-20260621.txt'

const COMMITTED_STYLE_PROOF_ZHIHU_LOCAL_ARTIFACT_REF =
  'prompts/0601/evidence/zhihu-data-table-local-artifact-20260621.md'

const COMMITTED_STYLE_PROOF_ZHIHU_LOCAL_REPORT_REF =
  'prompts/0601/evidence/zhihu-data-table-local-evidence-20260621.txt'

const COMMITTED_STYLE_PROOF_ZHIHU_CLEAN_COLUMN_ARTIFACT_REF =
  'prompts/0601/evidence/zhihu-clean-column-local-artifact-20260621.md'

const COMMITTED_STYLE_PROOF_ZHIHU_CLEAN_COLUMN_REPORT_REF =
  'prompts/0601/evidence/zhihu-clean-column-local-evidence-20260621.txt'

const COMMITTED_STYLE_PROOF_ZHIHU_ACADEMIC_LATEX_ARTIFACT_REF =
  'prompts/0601/evidence/zhihu-academic-latex-local-artifact-20260621.md'

const COMMITTED_STYLE_PROOF_ZHIHU_ACADEMIC_LATEX_REPORT_REF =
  'prompts/0601/evidence/zhihu-academic-latex-local-evidence-20260621.txt'

const COMMITTED_STYLE_PROOF_ZHIHU_WECHAT_ADAPTED_ARTIFACT_REF =
  'prompts/0601/evidence/zhihu-wechat-adapted-local-artifact-20260621.md'

const COMMITTED_STYLE_PROOF_ZHIHU_WECHAT_ADAPTED_REPORT_REF =
  'prompts/0601/evidence/zhihu-wechat-adapted-local-evidence-20260621.txt'

const COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF =
  'prompts/0601/evidence/wechat-authenticated-editor-dom-redacted-20260703.txt'

const COMMITTED_STYLE_PROOF_WECHAT_LOGIN_BLOCKER_REPORT_REF =
  'prompts/0601/evidence/wechat-login-state-readonly-20260625.txt'

const COMMITTED_STYLE_PROOF_WECHAT_AMBER_PC_ARTIFACT_FINGERPRINT =
  'sha256:09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d'

const COMMITTED_STYLE_PROOF_WECHAT_TEMPERA_ENTITY_PC_ARTIFACT_FINGERPRINT =
  'sha256:f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878'

const COMMITTED_STYLE_PROOF_WECHAT_KILN_PASTE_SAFE_PC_ARTIFACT_FINGERPRINT =
  'sha256:338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491'

const COMMITTED_STYLE_PROOF_WECHAT_KILN_PC_ARTIFACT_FINGERPRINT =
  'sha256:90581eec1c3cb2805ddc235b8d41725795bfeaf2fc3628c707d485201af0d531'

const COMMITTED_STYLE_PROOF_WECHAT_LOGIN_BLOCKER_ARTIFACT_FINGERPRINT =
  'sha256:redacted-wechat-login-state-readonly-20260625'

function createCommittedStyleProofLocalEvidenceManifest(
  options: CommittedStyleProofLocalEvidenceManifestOptions,
): StyleProofManifest {
  const artifactIdPrefix = options.choiceId.replace(/^wechat-/, '')

  return {
    platform: 'wechat',
    scope: 'style-choice',
    choiceId: options.choiceId,
    artifactFingerprint: options.artifactFingerprint,
    claimedEvidence: ['unit-tested', 'local-browser'],
    artifacts: [
      {
        id: `${artifactIdPrefix}-committed-unit-proof`,
        requirementId: 'unit-test-coverage',
        kind: 'test-log',
        label: `${options.label} committed export regression log`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'unit-test',
        action: 'test-run',
        readback: 'test-assertion',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: COMMITTED_STYLE_PROOF_ACCEPTANCE_UI_REPORT_REF,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-local-render-proof`,
        requirementId: 'local-browser-rendering',
        kind: 'screenshot',
        label: `${options.label} committed Tauri/WebView2 local rendering proof`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'tauri-webview',
        action: 'local-render',
        readback: 'screenshot',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.localRenderArtifactRef,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-exact-artifact-proof`,
        requirementId: 'exact-artifact',
        kind: 'doc-reference',
        label: `${options.label} committed exact-artifact binding`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'source-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: COMMITTED_STYLE_PROOF_LOCAL_EVIDENCE_REPORT_REF,
        exactArtifact: true,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-sensitive-hygiene-proof`,
        requirementId: 'no-sensitive-artifact',
        kind: 'hygiene-review',
        label: `${options.label} committed evidence hygiene review`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'sensitive-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: COMMITTED_STYLE_PROOF_LOCAL_EVIDENCE_REPORT_REF,
        committed: true,
        safeForCommit: true,
      },
    ],
  }
}

function createCommittedStyleProofWechatUnitEvidenceManifest(
  options: CommittedStyleProofWechatUnitEvidenceManifestOptions,
): StyleProofManifest {
  const artifactIdPrefix = options.choiceId.replace(/^wechat-/, '')

  return {
    platform: 'wechat',
    scope: 'style-choice',
    choiceId: options.choiceId,
    artifactFingerprint: options.artifactFingerprint,
    claimedEvidence: ['unit-tested'],
    artifacts: [
      {
        id: `${artifactIdPrefix}-committed-unit-proof`,
        requirementId: 'unit-test-coverage',
        kind: 'test-log',
        label: `${options.label} committed export regression log`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'unit-test',
        action: 'test-run',
        readback: 'test-assertion',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-exact-artifact-proof`,
        requirementId: 'exact-artifact',
        kind: 'doc-reference',
        label: `${options.label} committed exact HTML artifact binding`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'source-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.artifactRef,
        exactArtifact: true,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-sensitive-hygiene-proof`,
        requirementId: 'no-sensitive-artifact',
        kind: 'hygiene-review',
        label: `${options.label} committed evidence hygiene review`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'sensitive-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
    ],
  }
}

function createCommittedStyleProofWechatLocalHtmlEvidenceManifest(
  options: CommittedStyleProofWechatLocalHtmlEvidenceManifestOptions,
): StyleProofManifest {
  const artifactIdPrefix = options.choiceId.replace(/^wechat-/, '')

  return {
    platform: 'wechat',
    scope: 'style-choice',
    choiceId: options.choiceId,
    artifactFingerprint: options.artifactFingerprint,
    claimedEvidence: ['unit-tested', 'local-browser'],
    artifacts: [
      {
        id: `${artifactIdPrefix}-committed-unit-proof`,
        requirementId: 'unit-test-coverage',
        kind: 'test-log',
        label: `${options.label} committed export regression log`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'unit-test',
        action: 'test-run',
        readback: 'test-assertion',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-local-browser-proof`,
        requirementId: 'local-browser-rendering',
        kind: 'browser-readback',
        label: `${options.label} committed local browser DOM and overflow proof`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-browser',
        action: 'local-render',
        readback: 'visual-and-dom',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-exact-artifact-proof`,
        requirementId: 'exact-artifact',
        kind: 'doc-reference',
        label: `${options.label} committed exact HTML artifact binding`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'source-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.artifactRef,
        exactArtifact: true,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-sensitive-hygiene-proof`,
        requirementId: 'no-sensitive-artifact',
        kind: 'hygiene-review',
        label: `${options.label} committed evidence hygiene review`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'sensitive-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
    ],
  }
}

function createCommittedStyleProofXhsLocalEvidenceManifest(
  options: CommittedStyleProofXhsLocalEvidenceManifestOptions,
): StyleProofManifest {
  const artifactIdPrefix = options.choiceId

  return {
    platform: 'xiaohongshu',
    scope: 'style-choice',
    choiceId: options.choiceId,
    artifactFingerprint: options.artifactFingerprint,
    claimedEvidence: ['unit-tested', 'local-browser'],
    artifacts: [
      {
        id: `${artifactIdPrefix}-committed-unit-proof`,
        requirementId: 'unit-test-coverage',
        kind: 'test-log',
        label: `${options.label} committed export regression log`,
        platform: 'xiaohongshu',
        choiceId: options.choiceId,
        channel: 'unit-test',
        action: 'test-run',
        readback: 'test-assertion',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: COMMITTED_STYLE_PROOF_XHS_MANIFEST_REPORT_REF,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-local-render-proof`,
        requirementId: 'local-browser-rendering',
        kind: 'screenshot',
        label: `${options.label} committed browser canvas raster proof`,
        platform: 'xiaohongshu',
        choiceId: options.choiceId,
        channel: 'local-browser',
        action: 'local-render',
        readback: 'visual',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.localRenderArtifactRef,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-exact-artifact-proof`,
        requirementId: 'exact-artifact',
        kind: 'doc-reference',
        label: `${options.label} committed exact raster artifact binding`,
        platform: 'xiaohongshu',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'source-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: COMMITTED_STYLE_PROOF_XHS_RASTER_REPORT_REF,
        exactArtifact: true,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-manifest-proof`,
        requirementId: 'xhs-artifact-manifest',
        kind: 'artifact-manifest',
        label: `${options.label} committed image artifact manifest validation`,
        platform: 'xiaohongshu',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'artifact-manifest-validation',
        readback: 'manifest',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.manifestArtifactRef,
        artifactManifestValidated: true,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-sensitive-hygiene-proof`,
        requirementId: 'no-sensitive-artifact',
        kind: 'hygiene-review',
        label: `${options.label} committed evidence hygiene review`,
        platform: 'xiaohongshu',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'sensitive-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: COMMITTED_STYLE_PROOF_XHS_MANIFEST_REPORT_REF,
        committed: true,
        safeForCommit: true,
      },
    ],
  }
}

function createCommittedStyleProofXhsTextEvidenceManifest(
  options: CommittedStyleProofXhsTextEvidenceManifestOptions,
): StyleProofManifest {
  const artifactIdPrefix = options.choiceId

  return {
    platform: 'xiaohongshu',
    scope: 'style-choice',
    choiceId: options.choiceId,
    artifactFingerprint: options.artifactFingerprint,
    claimedEvidence: ['unit-tested'],
    artifacts: [
      {
        id: `${artifactIdPrefix}-committed-unit-proof`,
        requirementId: 'unit-test-coverage',
        kind: 'test-log',
        label: `${options.label} committed export regression log`,
        platform: 'xiaohongshu',
        choiceId: options.choiceId,
        channel: 'unit-test',
        action: 'test-run',
        readback: 'test-assertion',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-exact-artifact-proof`,
        requirementId: 'exact-artifact',
        kind: 'doc-reference',
        label: `${options.label} committed exact clean text artifact binding`,
        platform: 'xiaohongshu',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'source-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.artifactRef,
        exactArtifact: true,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-sensitive-hygiene-proof`,
        requirementId: 'no-sensitive-artifact',
        kind: 'hygiene-review',
        label: `${options.label} committed evidence hygiene review`,
        platform: 'xiaohongshu',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'sensitive-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
    ],
  }
}

function createCommittedStyleProofZhihuLocalEvidenceManifest(
  options: CommittedStyleProofZhihuLocalEvidenceManifestOptions,
): StyleProofManifest {
  const artifactIdPrefix = options.choiceId

  return {
    platform: 'zhihu',
    scope: 'style-choice',
    choiceId: options.choiceId,
    artifactFingerprint: options.artifactFingerprint,
    claimedEvidence: ['unit-tested', 'local-browser'],
    artifacts: [
      {
        id: `${artifactIdPrefix}-committed-unit-proof`,
        requirementId: 'unit-test-coverage',
        kind: 'test-log',
        label: `${options.label} committed export regression log`,
        platform: 'zhihu',
        choiceId: options.choiceId,
        channel: 'unit-test',
        action: 'test-run',
        readback: 'test-assertion',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-local-render-proof`,
        requirementId: 'local-browser-rendering',
        kind: 'browser-readback',
        label: `${options.label} committed local Zhihu preview proof`,
        platform: 'zhihu',
        choiceId: options.choiceId,
        channel: 'local-browser',
        action: 'local-render',
        readback: 'visual-and-dom',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.localRenderArtifactRef,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-exact-artifact-proof`,
        requirementId: 'exact-artifact',
        kind: 'doc-reference',
        label: `${options.label} committed exact clean Markdown artifact binding`,
        platform: 'zhihu',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'source-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.localRenderArtifactRef,
        exactArtifact: true,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-sensitive-hygiene-proof`,
        requirementId: 'no-sensitive-artifact',
        kind: 'hygiene-review',
        label: `${options.label} committed evidence hygiene review`,
        platform: 'zhihu',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'sensitive-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
    ],
  }
}

function createCommittedStyleProofZhihuCleanMarkdownEvidenceManifest(
  options: CommittedStyleProofZhihuCleanMarkdownEvidenceManifestOptions,
): StyleProofManifest {
  const artifactIdPrefix = options.choiceId

  return {
    platform: 'zhihu',
    scope: 'style-choice',
    choiceId: options.choiceId,
    artifactFingerprint: options.artifactFingerprint,
    claimedEvidence: ['unit-tested'],
    artifacts: [
      {
        id: `${artifactIdPrefix}-committed-unit-proof`,
        requirementId: 'unit-test-coverage',
        kind: 'test-log',
        label: `${options.label} committed export regression log`,
        platform: 'zhihu',
        choiceId: options.choiceId,
        channel: 'unit-test',
        action: 'test-run',
        readback: 'test-assertion',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-exact-artifact-proof`,
        requirementId: 'exact-artifact',
        kind: 'doc-reference',
        label: `${options.label} committed exact clean Markdown artifact binding`,
        platform: 'zhihu',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'source-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.artifactRef,
        exactArtifact: true,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${artifactIdPrefix}-committed-sensitive-hygiene-proof`,
        requirementId: 'no-sensitive-artifact',
        kind: 'hygiene-review',
        label: `${options.label} committed evidence hygiene review`,
        platform: 'zhihu',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'sensitive-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
    ],
  }
}

function createCommittedStyleProofWechatPcEvidenceManifest(
  options: CommittedStyleProofWechatPcEvidenceManifestOptions,
): StyleProofManifest {
  return {
    platform: 'wechat',
    scope: 'style-choice',
    choiceId: options.choiceId,
    artifactFingerprint: options.artifactFingerprint,
    claimedEvidence: ['pc-editor-dom-readable', 'pc-editor-paste'],
    artifacts: [
      {
        id: `${options.idPrefix}-committed-authenticated-editor-proof`,
        requirementId: 'authenticated-editor-url',
        kind: 'editor-readback',
        label: `${options.label} committed authenticated WeChat editor session proof`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'platform-editor',
        action: 'authenticated-editor-opened',
        readback: 'dom',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        authenticatedSessionVerified: true,
        platformEditorTargetVerified: true,
        collectedAt: options.collectedAt,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${options.idPrefix}-committed-pc-dom-proof`,
        requirementId: 'pc-editor-dom-readback',
        kind: 'editor-readback',
        label: `${options.label} committed WeChat PC editor DOM readback proof`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'platform-editor',
        action: 'pc-editor-dom-readback',
        readback: 'visual-and-dom',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        authenticatedSessionVerified: true,
        platformEditorTargetVerified: true,
        platformEditorSurfaceVerified: true,
        platformEditorDomVerified: true,
        mojibakeFreeVerified: true,
        collectedAt: options.collectedAt,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${options.idPrefix}-committed-readonly-authenticated-editor-refresh`,
        requirementId: 'authenticated-editor-url',
        kind: 'editor-readback',
        label: `${options.label} committed redacted authenticated WeChat editor reachability refresh`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'platform-editor',
        action: 'authenticated-editor-opened',
        readback: 'visual-and-dom',
        artifactRef: options.readonlyEditorRefreshReportRef,
        authenticatedSessionVerified: true,
        platformEditorTargetVerified: true,
        collectedAt: options.readonlyEditorRefreshCollectedAt,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${options.idPrefix}-committed-readonly-pc-dom-refresh`,
        requirementId: 'pc-editor-dom-readback',
        kind: 'editor-readback',
        label: `${options.label} committed redacted WeChat PC editor DOM refresh`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'platform-editor',
        action: 'pc-editor-dom-readback',
        readback: 'visual-and-dom',
        artifactRef: options.readonlyEditorRefreshReportRef,
        authenticatedSessionVerified: true,
        platformEditorTargetVerified: true,
        platformEditorSurfaceVerified: true,
        platformEditorDomVerified: true,
        mojibakeFreeVerified: true,
        collectedAt: options.readonlyEditorRefreshCollectedAt,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${options.idPrefix}-committed-exact-html-artifact-proof`,
        requirementId: 'exact-artifact',
        kind: 'doc-reference',
        label: `${options.label} committed exact WeChat HTML artifact binding`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'source-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        exactArtifact: true,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${options.idPrefix}-committed-safe-draft-proof`,
        requirementId: 'safe-disposable-draft',
        kind: 'editor-readback',
        label: `${options.label} committed disposable draft cleanup proof`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'platform-editor',
        action: 'safe-disposable-draft',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        disposableDraft: true,
        cleanupPathVerified: true,
        collectedAt: options.collectedAt,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${options.idPrefix}-committed-ordinary-pc-paste-proof`,
        requirementId: 'pc-editor-paste-event',
        kind: 'editor-readback',
        label: options.pasteProofLabel,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'platform-editor',
        action: 'pc-paste',
        readback: 'visual-and-dom',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
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
        collectedAt: options.collectedAt,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${options.idPrefix}-committed-pc-sensitive-hygiene-proof`,
        requirementId: 'no-sensitive-artifact',
        kind: 'hygiene-review',
        label: `${options.label} committed PC evidence hygiene review`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'sensitive-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        committed: true,
        safeForCommit: true,
      },
    ],
  }
}

function createCommittedStyleProofWechatExternalBlockerManifest(
  options: CommittedStyleProofWechatExternalBlockerManifestOptions,
): StyleProofManifest {
  return {
    platform: 'wechat',
    scope: 'style-choice',
    choiceId: options.choiceId,
    artifactFingerprint: options.artifactFingerprint,
    claimedEvidence: ['pc-editor-dom-readable'],
    artifacts: [
      {
        id: `${options.idPrefix}-committed-login-state-editor-url-blocker`,
        requirementId: 'authenticated-editor-url',
        kind: 'browser-readback',
        label: `${options.label} committed login-state readback is not authenticated editor reachability`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'platform-editor',
        action: 'authenticated-editor-opened',
        readback: 'dom',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        authenticatedSessionVerified: false,
        externalAccountAuthenticated: false,
        externalAccountLoginBlocked: true,
        platformEditorTargetVerified: false,
        collectedAt: options.collectedAt,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${options.idPrefix}-committed-login-state-pc-dom-blocker`,
        requirementId: 'pc-editor-dom-readback',
        kind: 'browser-readback',
        label: `${options.label} committed login-state readback is not PC article editor DOM proof`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'platform-editor',
        action: 'pc-editor-dom-readback',
        readback: 'visual-and-dom',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        authenticatedSessionVerified: false,
        externalAccountAuthenticated: false,
        externalAccountLoginBlocked: true,
        platformEditorTargetVerified: false,
        platformEditorSurfaceVerified: false,
        platformEditorDomVerified: false,
        mojibakeFreeVerified: false,
        collectedAt: options.collectedAt,
        committed: true,
        safeForCommit: true,
      },
      {
        id: `${options.idPrefix}-committed-login-state-sensitive-hygiene-proof`,
        requirementId: 'no-sensitive-artifact',
        kind: 'hygiene-review',
        label: `${options.label} committed login-state evidence hygiene review`,
        platform: 'wechat',
        choiceId: options.choiceId,
        channel: 'local-artifact',
        action: 'sensitive-hygiene-review',
        readback: 'hygiene-log',
        artifactFingerprint: options.artifactFingerprint,
        artifactRef: options.reportRef,
        redactionVerified: true,
        collectedAt: options.collectedAt,
        committed: true,
        safeForCommit: true,
      },
    ],
  }
}

const COMMITTED_STYLE_PROOF_LOCAL_EVIDENCE_MANIFESTS = [
  createCommittedStyleProofWechatUnitEvidenceManifest({
    choiceId: 'wechat-classic-inline',
    label: 'Classic WeChat inline preset',
    artifactFingerprint: 'sha256:13531674720c5015b00b652e05c8127c75c01b6395922d0f1572726a5b030562',
    artifactRef: COMMITTED_STYLE_PROOF_WECHAT_CLASSIC_INLINE_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_CLASSIC_INLINE_REPORT_REF,
  }),
  createCommittedStyleProofWechatLocalHtmlEvidenceManifest({
    choiceId: 'wechat-quiet-editorial',
    label: 'Quiet Press editorial blocks',
    artifactFingerprint: 'sha256:1962d5ef8cd5a76c9b8b5ffe33b87f80bd59cf1cd284b05d529608e1fbd2255e',
    artifactRef: COMMITTED_STYLE_PROOF_WECHAT_QUIET_EDITORIAL_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_QUIET_EDITORIAL_REPORT_REF,
  }),
  createCommittedStyleProofWechatLocalHtmlEvidenceManifest({
    choiceId: 'wechat-toolbar-parameter-map',
    label: 'Toolbar typography parameter map',
    artifactFingerprint: 'sha256:f5e6487905e11bfc64e2998d553de45de29b372a87b584014076e38b49263e79',
    artifactRef: COMMITTED_STYLE_PROOF_WECHAT_TOOLBAR_PARAMETER_MAP_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_TOOLBAR_PARAMETER_MAP_REPORT_REF,
  }),
  createCommittedStyleProofWechatLocalHtmlEvidenceManifest({
    choiceId: 'wechat-cover-seal-divider',
    label: 'Static cover seal and divider SVG',
    artifactFingerprint: 'sha256:e8537db3ddff4b51b5fc6cd189d92cc71fdc9dcc7b8beea7879c7dc96ecfcb2f',
    artifactRef: COMMITTED_STYLE_PROOF_WECHAT_COVER_SEAL_DIVIDER_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_COVER_SEAL_DIVIDER_REPORT_REF,
  }),
  createCommittedStyleProofWechatLocalHtmlEvidenceManifest({
    choiceId: 'wechat-card-rich',
    label: 'Rich cards and timeline blocks',
    artifactFingerprint: 'sha256:91a8c7ac75fc9a9359cc5cd6a6f9a407a7317bb300cf827403bc72e67e4d2990',
    artifactRef: COMMITTED_STYLE_PROOF_WECHAT_CARD_RICH_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_CARD_RICH_REPORT_REF,
  }),
  createCommittedStyleProofLocalEvidenceManifest({
    choiceId: 'wechat-flagship-kiln',
    label: 'Kiln creative flagship',
    artifactFingerprint: COMMITTED_STYLE_PROOF_WECHAT_KILN_PC_ARTIFACT_FINGERPRINT,
    localRenderArtifactRef: 'prompts/0601/evidence/e2e/flagship-kiln.png',
  }),
  createCommittedStyleProofWechatLocalHtmlEvidenceManifest({
    choiceId: 'wechat-flagship-kiln-paste-safe',
    label: 'Kiln ordinary-paste compatibility candidate',
    artifactFingerprint: 'sha256:338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491',
    artifactRef: COMMITTED_STYLE_PROOF_WECHAT_KILN_PASTE_SAFE_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_KILN_PASTE_SAFE_REPORT_REF,
  }),
  createCommittedStyleProofLocalEvidenceManifest({
    choiceId: 'wechat-flagship-tempera',
    label: 'Tempera academic flagship',
    artifactFingerprint: COMMITTED_STYLE_PROOF_WECHAT_TEMPERA_ENTITY_PC_ARTIFACT_FINGERPRINT,
    localRenderArtifactRef: 'prompts/0601/evidence/e2e/flagship-tempera.png',
  }),
  createCommittedStyleProofLocalEvidenceManifest({
    choiceId: 'wechat-flagship-amber',
    label: 'Amber business flagship',
    artifactFingerprint: COMMITTED_STYLE_PROOF_WECHAT_AMBER_PC_ARTIFACT_FINGERPRINT,
    localRenderArtifactRef: 'prompts/0601/evidence/e2e/flagship-amber.png',
  }),
  createCommittedStyleProofXhsTextEvidenceManifest({
    choiceId: 'xhs-clean-text',
    label: 'XHS clean text',
    artifactFingerprint: 'sha256:e590d621cb09f988c76f76c7b4db87295bce7765bdd8300479dac2d80c4d4e68',
    artifactRef: COMMITTED_STYLE_PROOF_XHS_CLEAN_TEXT_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_XHS_CLEAN_TEXT_REPORT_REF,
  }),
  createCommittedStyleProofXhsLocalEvidenceManifest({
    choiceId: 'xhs-cover-carousel',
    label: 'XHS cover carousel',
    artifactFingerprint:
      'prompts/0601/evidence/xhs-raster/xhs-raster-cover-grid-browser-2026-06-08-2026-06-07T23-38-29-127Z.png@sha256:1132933ecec1828c0129e8e92ec2553b4c54264ecda70ad228f15e7c62db101d',
    localRenderArtifactRef:
      'prompts/0601/evidence/xhs-raster/xhs-raster-cover-grid-browser-2026-06-08-2026-06-07T23-38-29-127Z.png',
    manifestArtifactRef: COMMITTED_STYLE_PROOF_XHS_MANIFEST_REPORT_REF,
  }),
  createCommittedStyleProofXhsLocalEvidenceManifest({
    choiceId: 'xhs-cover-hook',
    label: 'XHS cover hook',
    artifactFingerprint:
      'prompts/0601/evidence/xhs-raster/xhs-raster-cover-hook-browser-2026-06-21.png@sha256:c7200947079cda16ccafc51b5c56bfd840355da199da48b790b6725233af2d32',
    localRenderArtifactRef:
      'prompts/0601/evidence/xhs-raster/xhs-raster-cover-hook-browser-2026-06-21.png',
    manifestArtifactRef: COMMITTED_STYLE_PROOF_XHS_COVER_HOOK_MANIFEST_REPORT_REF,
  }),
  createCommittedStyleProofXhsLocalEvidenceManifest({
    choiceId: 'xhs-markdown-card-slicer',
    label: 'XHS Markdown card slicer',
    artifactFingerprint:
      'prompts/0601/evidence/xhs-raster/xhs-markdown-card-slicer-browser-2026-06-21.json@sha256:e3716eb5903b1b11a167b467c3c2aae4c6eff793ef5e0c29b39ddeb3b0da375c',
    localRenderArtifactRef:
      'prompts/0601/evidence/xhs-raster/xhs-markdown-card-slicer-browser-2026-06-21-page-01.png',
    manifestArtifactRef: COMMITTED_STYLE_PROOF_XHS_CARD_SLICER_MANIFEST_REF,
  }),
  createCommittedStyleProofXhsLocalEvidenceManifest({
    choiceId: 'xhs-data-card',
    label: 'XHS data card',
    artifactFingerprint:
      'prompts/0601/evidence/xhs-raster/xhs-data-card-browser-2026-06-21.json@sha256:bb78392d7b217251509eff0a9295ff3d601303747dd4eaa772e1b871c60bdc1a',
    localRenderArtifactRef:
      'prompts/0601/evidence/xhs-raster/xhs-data-card-browser-2026-06-21-page-01.png',
    manifestArtifactRef: COMMITTED_STYLE_PROOF_XHS_DATA_CARD_MANIFEST_REF,
  }),
  createCommittedStyleProofXhsLocalEvidenceManifest({
    choiceId: 'xhs-long-report',
    label: 'XHS long report',
    artifactFingerprint:
      'prompts/0601/evidence/xhs-raster/xhs-long-report-browser-2026-06-21.json@sha256:102dafef61c4d978f8fd4cb501f7469d714f4db5125e1943e940f77df59d2a9e',
    localRenderArtifactRef:
      'prompts/0601/evidence/xhs-raster/xhs-long-report-browser-2026-06-21-page-01.png',
    manifestArtifactRef: COMMITTED_STYLE_PROOF_XHS_LONG_REPORT_MANIFEST_REF,
  }),
  createCommittedStyleProofXhsLocalEvidenceManifest({
    choiceId: 'xhs-market-rich-card-fallback',
    label: 'XHS market rich card fallback',
    artifactFingerprint:
      'prompts/0601/evidence/xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21.json@sha256:beefe00ac8ceaa97aaaf1ad27b72055e70a3967bc148372666cd1d9e3f6a1b7b',
    localRenderArtifactRef:
      'prompts/0601/evidence/xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21-page-01.png',
    manifestArtifactRef: COMMITTED_STYLE_PROOF_XHS_MARKET_RICH_CARD_FALLBACK_MANIFEST_REF,
  }),
  createCommittedStyleProofZhihuCleanMarkdownEvidenceManifest({
    choiceId: 'zhihu-clean-column',
    label: 'Zhihu clean column',
    artifactFingerprint: 'sha256:eccc28007327ade6c6b05fd37567dd31632b9daada68b28aa7146afe8b64b329',
    artifactRef: COMMITTED_STYLE_PROOF_ZHIHU_CLEAN_COLUMN_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_ZHIHU_CLEAN_COLUMN_REPORT_REF,
  }),
  createCommittedStyleProofZhihuCleanMarkdownEvidenceManifest({
    choiceId: 'zhihu-academic-latex-column',
    label: 'Zhihu academic LaTeX column',
    artifactFingerprint: 'sha256:0bed075e0f24a94f4ecb0a9bf410e42f5de6caaff560347e6b016757916a7ff9',
    artifactRef: COMMITTED_STYLE_PROOF_ZHIHU_ACADEMIC_LATEX_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_ZHIHU_ACADEMIC_LATEX_REPORT_REF,
  }),
  createCommittedStyleProofZhihuCleanMarkdownEvidenceManifest({
    choiceId: 'zhihu-wechat-adapted',
    label: 'Zhihu WeChat semantic cleanup',
    artifactFingerprint: 'sha256:5aaf2834bcd50e8251b2d8e99deb72c550826909598dc17e3f80ec7ac3efba63',
    artifactRef: COMMITTED_STYLE_PROOF_ZHIHU_WECHAT_ADAPTED_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_ZHIHU_WECHAT_ADAPTED_REPORT_REF,
  }),
  createCommittedStyleProofZhihuLocalEvidenceManifest({
    choiceId: 'zhihu-data-table',
    label: 'Zhihu semantic Markdown table',
    artifactFingerprint: 'sha256:9e828ff7b50d642be8f59f4907dc5cd47fc9973f465e904446a21f6e79bccd8f',
    localRenderArtifactRef: COMMITTED_STYLE_PROOF_ZHIHU_LOCAL_ARTIFACT_REF,
    reportRef: COMMITTED_STYLE_PROOF_ZHIHU_LOCAL_REPORT_REF,
  }),
] as const satisfies readonly StyleProofManifest[]

const COMMITTED_STYLE_PROOF_WECHAT_PC_EVIDENCE_MANIFESTS = [
  createCommittedStyleProofWechatPcEvidenceManifest({
    choiceId: 'wechat-classic-inline',
    idPrefix: 'wechat-classic-inline',
    label: 'Classic inline',
    artifactFingerprint: 'sha256:13531674720c5015b00b652e05c8127c75c01b6395922d0f1572726a5b030562',
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_PC_BATCH_REPORT_REF,
    pasteProofLabel: 'Classic inline committed entity-safe ordinary OS Ctrl+V rich HTML paste proof',
    collectedAt: '2026-07-03T00:00:00.000Z',
    readonlyEditorRefreshReportRef: COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF,
    readonlyEditorRefreshCollectedAt: '2026-07-03T00:00:00.000Z',
  }),
  createCommittedStyleProofWechatPcEvidenceManifest({
    choiceId: 'wechat-quiet-editorial',
    idPrefix: 'wechat-quiet-editorial',
    label: 'Quiet editorial',
    artifactFingerprint: 'sha256:1962d5ef8cd5a76c9b8b5ffe33b87f80bd59cf1cd284b05d529608e1fbd2255e',
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_PC_BATCH_REPORT_REF,
    pasteProofLabel: 'Quiet editorial committed entity-safe ordinary OS Ctrl+V rich HTML/SVG paste proof',
    collectedAt: '2026-07-03T00:00:00.000Z',
    readonlyEditorRefreshReportRef: COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF,
    readonlyEditorRefreshCollectedAt: '2026-07-03T00:00:00.000Z',
  }),
  createCommittedStyleProofWechatPcEvidenceManifest({
    choiceId: 'wechat-toolbar-parameter-map',
    idPrefix: 'wechat-toolbar-parameter-map',
    label: 'Toolbar parameter map',
    artifactFingerprint: 'sha256:f5e6487905e11bfc64e2998d553de45de29b372a87b584014076e38b49263e79',
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_PC_BATCH_REPORT_REF,
    pasteProofLabel: 'Toolbar parameter map committed entity-safe ordinary OS Ctrl+V rich HTML paste proof',
    collectedAt: '2026-07-03T00:00:00.000Z',
    readonlyEditorRefreshReportRef: COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF,
    readonlyEditorRefreshCollectedAt: '2026-07-03T00:00:00.000Z',
  }),
  createCommittedStyleProofWechatPcEvidenceManifest({
    choiceId: 'wechat-cover-seal-divider',
    idPrefix: 'wechat-cover-seal-divider',
    label: 'Cover seal divider',
    artifactFingerprint: 'sha256:e8537db3ddff4b51b5fc6cd189d92cc71fdc9dcc7b8beea7879c7dc96ecfcb2f',
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_PC_BATCH_REPORT_REF,
    pasteProofLabel: 'Cover seal divider committed entity-safe ordinary OS Ctrl+V rich HTML/SVG paste proof',
    collectedAt: '2026-07-03T00:00:00.000Z',
    readonlyEditorRefreshReportRef: COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF,
    readonlyEditorRefreshCollectedAt: '2026-07-03T00:00:00.000Z',
  }),
  createCommittedStyleProofWechatPcEvidenceManifest({
    choiceId: 'wechat-card-rich',
    idPrefix: 'wechat-card-rich',
    label: 'Rich card',
    artifactFingerprint: 'sha256:91a8c7ac75fc9a9359cc5cd6a6f9a407a7317bb300cf827403bc72e67e4d2990',
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_PC_BATCH_REPORT_REF,
    pasteProofLabel: 'Rich card committed entity-safe ordinary OS Ctrl+V rich HTML/SVG paste proof',
    collectedAt: '2026-07-03T00:00:00.000Z',
    readonlyEditorRefreshReportRef: COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF,
    readonlyEditorRefreshCollectedAt: '2026-07-03T00:00:00.000Z',
  }),
  createCommittedStyleProofWechatPcEvidenceManifest({
    choiceId: 'wechat-flagship-kiln',
    idPrefix: 'wechat-flagship-kiln-entity-safe',
    label: 'Kiln entity-safe',
    artifactFingerprint: COMMITTED_STYLE_PROOF_WECHAT_KILN_PC_ARTIFACT_FINGERPRINT,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_PC_BATCH_REPORT_REF,
    pasteProofLabel: 'Kiln committed entity-safe ordinary OS Ctrl+V rich HTML/SVG paste proof',
    collectedAt: '2026-07-03T00:00:00.000Z',
    readonlyEditorRefreshReportRef: COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF,
    readonlyEditorRefreshCollectedAt: '2026-07-03T00:00:00.000Z',
  }),
  createCommittedStyleProofWechatPcEvidenceManifest({
    choiceId: 'wechat-flagship-amber',
    idPrefix: 'wechat-flagship-amber',
    label: 'Amber',
    artifactFingerprint: COMMITTED_STYLE_PROOF_WECHAT_AMBER_PC_ARTIFACT_FINGERPRINT,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_PC_BATCH_REPORT_REF,
    pasteProofLabel: 'Amber committed ordinary OS Ctrl+V rich HTML/SVG paste proof',
    collectedAt: '2026-07-03T00:00:00.000Z',
    readonlyEditorRefreshReportRef: COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF,
    readonlyEditorRefreshCollectedAt: '2026-07-03T00:00:00.000Z',
  }),
  createCommittedStyleProofWechatPcEvidenceManifest({
    choiceId: 'wechat-flagship-tempera',
    idPrefix: 'wechat-flagship-tempera-entity-safe',
    label: 'Tempera entity-safe',
    artifactFingerprint: COMMITTED_STYLE_PROOF_WECHAT_TEMPERA_ENTITY_PC_ARTIFACT_FINGERPRINT,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_PC_BATCH_REPORT_REF,
    pasteProofLabel: 'Tempera committed entity-safe ordinary OS Ctrl+V rich HTML/SVG paste proof',
    collectedAt: '2026-07-03T00:00:00.000Z',
    readonlyEditorRefreshReportRef: COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF,
    readonlyEditorRefreshCollectedAt: '2026-07-03T00:00:00.000Z',
  }),
  createCommittedStyleProofWechatPcEvidenceManifest({
    choiceId: 'wechat-flagship-kiln-paste-safe',
    idPrefix: 'wechat-flagship-kiln-paste-safe-encoded',
    label: 'Kiln paste-safe encoded',
    artifactFingerprint: COMMITTED_STYLE_PROOF_WECHAT_KILN_PASTE_SAFE_PC_ARTIFACT_FINGERPRINT,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_KILN_PASTE_SAFE_PC_REPORT_REF,
    pasteProofLabel: 'Kiln paste-safe committed encoded ordinary OS Ctrl+V rich HTML/SVG paste proof',
    collectedAt: '2026-07-03T00:00:00.000Z',
    readonlyEditorRefreshReportRef: COMMITTED_STYLE_PROOF_WECHAT_READONLY_EDITOR_REFRESH_REPORT_REF,
    readonlyEditorRefreshCollectedAt: '2026-07-03T00:00:00.000Z',
  }),
] as const satisfies readonly StyleProofManifest[]

const COMMITTED_STYLE_PROOF_EXTERNAL_BLOCKER_MANIFESTS = [
  createCommittedStyleProofWechatExternalBlockerManifest({
    choiceId: 'wechat-flagship-amber',
    idPrefix: 'wechat-flagship-amber',
    label: 'Amber',
    artifactFingerprint: COMMITTED_STYLE_PROOF_WECHAT_LOGIN_BLOCKER_ARTIFACT_FINGERPRINT,
    reportRef: COMMITTED_STYLE_PROOF_WECHAT_LOGIN_BLOCKER_REPORT_REF,
    collectedAt: '2026-06-24T00:00:00.000Z',
  }),
] as const satisfies readonly StyleProofManifest[]

function cloneStyleProofManifest(manifest: StyleProofManifest): StyleProofManifest {
  return {
    ...manifest,
    claimedEvidence: [...manifest.claimedEvidence],
    artifacts: manifest.artifacts.map(artifact => ({ ...artifact })),
  }
}

export function getCommittedStyleProofLocalEvidenceManifests(): readonly StyleProofManifest[] {
  return COMMITTED_STYLE_PROOF_LOCAL_EVIDENCE_MANIFESTS.map(cloneStyleProofManifest)
}

export function getCommittedStyleProofLocalEvidenceAuditReport(): StyleProofAcceptanceAuditReport {
  return getStyleProofAcceptanceAuditReport(getCommittedStyleProofLocalEvidenceManifests())
}

export function getCommittedStyleProofWechatPcEvidenceManifests(): readonly StyleProofManifest[] {
  return COMMITTED_STYLE_PROOF_WECHAT_PC_EVIDENCE_MANIFESTS.map(cloneStyleProofManifest)
}

export function getCommittedStyleProofWechatPcEvidenceAuditReport(): StyleProofAcceptanceAuditReport {
  return getStyleProofAcceptanceAuditReport(getCommittedStyleProofWechatPcEvidenceManifests())
}

export function getCommittedStyleProofExternalBlockerManifests(): readonly StyleProofManifest[] {
  return COMMITTED_STYLE_PROOF_EXTERNAL_BLOCKER_MANIFESTS.map(cloneStyleProofManifest)
}

export function getCommittedStyleProofExternalBlockerAuditReport(): StyleProofAcceptanceAuditReport {
  return getStyleProofAcceptanceAuditReport(getCommittedStyleProofExternalBlockerManifests())
}

export function getCommittedStyleProofEvidenceManifests(): readonly StyleProofManifest[] {
  return [
    ...getCommittedStyleProofLocalEvidenceManifests(),
    ...getCommittedStyleProofWechatPcEvidenceManifests(),
  ]
}

export function getCommittedStyleProofEvidenceAuditReport(): CommittedStyleProofEvidenceAuditReport {
  const local = getCommittedStyleProofLocalEvidenceAuditReport()
  const wechatPc = getCommittedStyleProofWechatPcEvidenceAuditReport()
  const combined = getStyleProofAcceptanceAuditReport(getCommittedStyleProofEvidenceManifests())

  return {
    local,
    wechatPc,
    combined,
    summary: {
      localManifestCount: local.summary.manifestCount,
      wechatPcManifestCount: wechatPc.summary.manifestCount,
      combinedManifestCount: combined.summary.manifestCount,
      combinedIssueCount: combined.summary.issueCount,
      hasExactArtifactFingerprintConflicts: combined.issues.some(issue =>
        issue.id === 'style-proof-manifest-pack-fingerprint-mismatch'
      ),
      cannotClaimRequirements: combined.summary.cannotClaimRequirements,
    },
  }
}

export function createStyleProofManifestDraft(options: StyleProofManifestDraftOptions): StyleProofManifest {
  return {
    platform: options.platform,
    scope: options.scope ?? (options.choiceId ? 'style-choice' : 'evidence-label'),
    claimedEvidence: options.claimedEvidence ?? [],
    artifacts: [],
    ...(options.choiceId ? { choiceId: options.choiceId } : {}),
    ...(options.artifactFingerprint ? { artifactFingerprint: options.artifactFingerprint } : {}),
  }
}

export function validateStyleProofManifest(manifest: StyleProofManifest): QualityIssue[] {
  const issues: QualityIssue[] = []
  const choice = manifest.choiceId ? getStyleChoiceById(manifest.choiceId) : undefined
  const scope = manifest.scope ?? 'evidence-label'

  if (manifest.choiceId && !choice) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-choice-unknown',
      message: `Style proof manifest references unknown style choice: ${manifest.choiceId}`,
      suggestion: 'Use a choice id from getStyleChoiceCatalog(), or omit choiceId for evidence-label-only validation.',
      location: manifest.choiceId,
    })
  }

  if (scope === 'style-choice' && !choice) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-choice-unknown',
      message: 'Style-choice proof validation requires a known choiceId.',
      suggestion: 'Set manifest.choiceId to a runtime catalog choice before validating full style-choice proof requirements.',
    })
  }

  if (choice && choice.platform !== manifest.platform) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-platform-mismatch',
      message: `Style proof manifest platform ${manifest.platform} does not match choice ${choice.id} platform ${choice.platform}.`,
      suggestion: 'Keep proof artifacts platform-specific; do not reuse WeChat, XHS, or Zhihu proof across platforms.',
      location: choice.id,
    })
  }

  if (choice && choice.status !== 'available') {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-choice-blocked',
      message: `Style choice ${choice.id} is ${choice.status} and cannot be promoted by proof artifacts.`,
      suggestion: choice.blockers[0] ?? 'Resolve the runtime catalog blocker before treating proof artifacts as an availability upgrade.',
      location: choice.id,
    })
  }

  const requirementEntries = collectRequiredStyleProofRequirementEntries(manifest, choice)
  for (const entry of requirementEntries) {
    const matchingArtifacts = manifest.artifacts.filter(artifact => artifact.requirementId === entry.requirementId)
    if (matchingArtifacts.length === 0) {
      addStyleProofIssue(issues, {
        id: 'style-proof-manifest-requirement-missing',
        message: `Style proof manifest is missing required proof artifact: ${entry.requirementId}.`,
        suggestion: 'Add a redacted, source-owned proof artifact for every requirement returned by the evidence label or style choice proof checklist.',
        location: entry.requirementId,
      })
      continue
    }

    for (const artifact of matchingArtifacts) {
      validateStyleProofArtifactScope(manifest, artifact, issues)
      validateStyleProofArtifactEvidence(entry, artifact, issues)
    }

    validateStyleProofRequirementCoverage(entry.requirementId, matchingArtifacts, issues)
  }

  for (const artifact of manifest.artifacts) {
    validateStyleProofArtifactScope(manifest, artifact, issues)
    validateStyleProofArtifactHygiene(artifact, issues)
  }

  return dedupeStyleProofIssues(issues)
}

export function getStyleProofManifestReport(manifest: StyleProofManifest): StyleProofManifestReport {
  const choice = manifest.choiceId ? getStyleChoiceById(manifest.choiceId) : undefined
  const scope = manifest.scope ?? 'evidence-label'
  const issues = validateStyleProofManifest(manifest)
  const requirements = collectRequiredStyleProofRequirementEntries(manifest, choice)
    .map(entry => buildStyleProofRequirementReport(entry, manifest.artifacts, issues))
  const artifacts = manifest.artifacts
    .map(artifact => buildStyleProofArtifactReport(artifact, issues))

  const satisfied = requirements.filter(requirement => requirement.status === 'satisfied').length
  const missing = requirements.filter(requirement => requirement.status === 'missing').length
  const invalid = requirements.filter(requirement => requirement.status === 'invalid').length
  const acceptedArtifactCount = artifacts.filter(artifact => artifact.status === 'accepted').length
  const sensitiveArtifactCount = artifacts.filter(artifact => artifact.sensitive).length
  const unsafeCommitArtifactCount = artifacts.filter(artifact => artifact.unsafeForCommit).length

  return {
    platform: manifest.platform,
    scope,
    choiceId: manifest.choiceId,
    choiceStatus: choice?.status,
    valid: issues.length === 0,
    issues,
    requirements,
    artifacts,
    summary: {
      required: requirements.length,
      satisfied,
      missing,
      invalid,
      artifactCount: artifacts.length,
      acceptedArtifactCount,
      sensitiveArtifactCount,
      unsafeCommitArtifactCount,
      issueCount: issues.length,
    },
  }
}

interface RequiredStyleProofRequirementEntry {
  requirementId: StyleProofRequirementId
  evidenceLabel?: StyleEvidenceLabel
}

function collectRequiredStyleProofRequirementEntries(
  manifest: StyleProofManifest,
  choice: PlatformStyleChoice | undefined,
): RequiredStyleProofRequirementEntry[] {
  const entries = new Map<StyleProofRequirementId, RequiredStyleProofRequirementEntry>()
  const addRequirement = (requirementId: StyleProofRequirementId, evidenceLabel?: StyleEvidenceLabel): void => {
    const current = entries.get(requirementId)
    if (!current) {
      entries.set(requirementId, { requirementId, evidenceLabel })
      return
    }

    if (
      evidenceLabel
      && (
        !current.evidenceLabel
        || EVIDENCE_RANK[evidenceLabel] > EVIDENCE_RANK[current.evidenceLabel]
      )
    ) {
      entries.set(requirementId, { requirementId, evidenceLabel })
    }
  }

  for (const label of manifest.claimedEvidence) {
    for (const requirementId of EVIDENCE_PROOF_REQUIREMENT_IDS[label]) {
      addRequirement(requirementId, label)
    }
  }

  if (manifest.scope === 'style-choice' && choice) {
    for (const label of [choice.evidenceFloor, ...choice.publishEvidence]) {
      for (const requirementId of EVIDENCE_PROOF_REQUIREMENT_IDS[label]) {
        addRequirement(requirementId, label)
      }
    }

    for (const requirement of getStyleChoiceProofRequirements(choice)) {
      addRequirement(requirement.id)
    }
  }

  return Array.from(entries.values())
}

function validateStyleProofArtifactScope(
  manifest: StyleProofManifest,
  artifact: StyleProofArtifact,
  issues: QualityIssue[],
): void {
  if (artifact.platform && artifact.platform !== manifest.platform) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-platform-mismatch',
      message: `Proof artifact ${artifact.id} platform ${artifact.platform} does not match manifest platform ${manifest.platform}.`,
      suggestion: 'Keep each proof artifact bound to the platform where it was collected.',
      location: artifact.id,
    })
  }

  if (manifest.choiceId && artifact.choiceId && artifact.choiceId !== manifest.choiceId) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-artifact-mismatch',
      message: `Proof artifact ${artifact.id} belongs to choice ${artifact.choiceId}, not ${manifest.choiceId}.`,
      suggestion: 'Do not reuse evidence across style choices unless the exact same artifact and renderer path are documented.',
      location: artifact.id,
    })
  }

  if (
    manifest.artifactFingerprint
    && artifact.artifactFingerprint
    && artifact.artifactFingerprint !== manifest.artifactFingerprint
  ) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-artifact-mismatch',
      message: `Proof artifact ${artifact.id} fingerprint does not match the manifest artifact fingerprint.`,
      suggestion: 'Only upgrade evidence labels when the exact same exported artifact fingerprint is preserved across proof steps.',
      location: artifact.id,
    })
  }
}

function validateStyleProofArtifactEvidence(
  entry: RequiredStyleProofRequirementEntry,
  artifact: StyleProofArtifact,
  issues: QualityIssue[],
): void {
  if (
    entry.evidenceLabel
    && artifact.evidenceLabel
    && !isEvidenceAtLeast(artifact.evidenceLabel, entry.evidenceLabel)
  ) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-evidence-too-weak',
      message: `Proof artifact ${artifact.id} carries ${artifact.evidenceLabel} evidence, below required ${entry.evidenceLabel}.`,
      suggestion: 'Collect proof through the exact target channel instead of reusing weaker local, documentation, or editor-reachability evidence.',
      location: artifact.id,
    })
  }
}

function validateStyleProofArtifactHygiene(artifact: StyleProofArtifact, issues: QualityIssue[]): void {
  if (isExternalAccountLoginBlockedStyleProofArtifact(artifact)) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-external-account-login-blocked',
      message: `Proof artifact ${artifact.id} is still blocked by an external account login or sign-in gate.`,
      suggestion: 'Login pages, expired sessions, verification forms, and sign-in route readbacks cannot prove platform upload, public-host, preview, sync, or publish success; record externalAccountAuthenticated:true only after the real creator/editor/upload surface is authenticated and read back.',
      location: artifact.id,
    })
  }

  if (isPhonePreviewBlockedStyleProofArtifact(artifact)) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-phone-preview-blocked',
      message: `Proof artifact ${artifact.id} is still blocked before final phone article preview content was read back.`,
      suggestion: 'Scan entries, setup dialogs, relogin pages, PC preview shells, and cover-setting panels cannot prove mobile article content; record phonePreviewContentVerified:true only after the exact artifact is visible in the phone preview article body.',
      location: artifact.id,
    })
  }

  if (isSensitiveStyleProofArtifact(artifact)) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-sensitive-artifact',
      message: `Proof artifact ${artifact.id} references sensitive or local authenticated material.`,
      suggestion: 'Keep cookies, tokens, QR codes, HAR files, browser profiles, account screenshots, and local profile paths out of committed proof manifests.',
      location: artifact.id,
    })
  }

  if (artifact.redactionReviewRequired === true && artifact.redactionVerified !== true) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-redaction-review-missing',
      message: `Proof artifact ${artifact.id} contains platform-visible text that has not passed redaction review.`,
      suggestion: 'Record redactionVerified:true only after account labels, draft titles, published titles, credential query material, account images, runtime capture locations, and local browser-state details are excluded from committed evidence.',
      location: artifact.id,
    })
  }

  if (isUnsafeStyleProofCommitArtifact(artifact)) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-unsafe-commit-artifact',
      message: `Proof artifact ${artifact.id} is marked committed but is not safe for repository evidence.`,
      suggestion: 'Commit only redacted summaries, issue ids, counts, hashes, or non-sensitive screenshots that have passed evidence hygiene review.',
      location: artifact.id,
    })
  }
}

function buildStyleProofRequirementReport(
  entry: RequiredStyleProofRequirementEntry,
  artifacts: readonly StyleProofArtifact[],
  issues: readonly QualityIssue[],
): StyleProofRequirementReport {
  const requirement = STYLE_PROOF_REQUIREMENT_BY_ID.get(entry.requirementId)
  if (!requirement) throw new Error(`Unknown style proof requirement: ${entry.requirementId}`)

  const matchingArtifacts = artifacts.filter(artifact => artifact.requirementId === entry.requirementId)
  const relatedIssues = getStyleProofRequirementIssues(entry, matchingArtifacts, issues)
  const status: StyleProofRequirementReportStatus = matchingArtifacts.length === 0
    ? 'missing'
    : relatedIssues.length > 0
      ? 'invalid'
      : 'satisfied'

  return {
    requirement,
    evidenceLabel: entry.evidenceLabel,
    status,
    artifactIds: matchingArtifacts.map(artifact => artifact.id),
    issues: relatedIssues,
  }
}

function buildStyleProofArtifactReport(
  artifact: StyleProofArtifact,
  issues: readonly QualityIssue[],
): StyleProofArtifactReport {
  const artifactIssues = getStyleProofArtifactIssues(artifact, issues)
  const sensitive = isSensitiveStyleProofArtifact(artifact)
  const unsafeForCommit = isUnsafeStyleProofCommitArtifact(artifact)
  const status: StyleProofArtifactReportStatus = unsafeForCommit
    ? 'unsafe-commit'
    : sensitive
      ? 'sensitive'
      : artifactIssues.length > 0
        ? 'invalid'
        : 'accepted'

  return {
    artifact,
    status,
    sensitive,
    unsafeForCommit,
    issues: artifactIssues,
  }
}

function getStyleProofRequirementIssues(
  entry: RequiredStyleProofRequirementEntry,
  artifacts: readonly StyleProofArtifact[],
  issues: readonly QualityIssue[],
): QualityIssue[] {
  const artifactIds = new Set(artifacts.map(artifact => artifact.id))

  return issues.filter(issue =>
    issue.location === entry.requirementId
    || (typeof issue.location === 'string' && artifactIds.has(issue.location))
  )
}

function getStyleProofArtifactIssues(
  artifact: StyleProofArtifact,
  issues: readonly QualityIssue[],
): QualityIssue[] {
  return issues.filter(issue => issue.location === artifact.id)
}

function isSensitiveStyleProofArtifact(artifact: StyleProofArtifact): boolean {
  return artifact.sensitive === true
    || isSensitiveStyleProofReference(artifact.id)
    || isSensitiveStyleProofReference(artifact.label)
    || (typeof artifact.artifactRef === 'string' && isSensitiveStyleProofReference(artifact.artifactRef))
}

function isUnsafeStyleProofCommitArtifact(artifact: StyleProofArtifact): boolean {
  return artifact.committed === true
    && (artifact.safeForCommit === false || isSensitiveStyleProofArtifact(artifact))
}

function isExternalAccountLoginBlockedStyleProofArtifact(artifact: StyleProofArtifact): boolean {
  return artifact.externalAccountLoginBlocked === true
    || artifact.externalAccountAuthenticated === false
    || artifact.action === 'external-account-login-readback'
}

function isExternalAccountAuthenticatedStyleProofArtifact(artifact: StyleProofArtifact): boolean {
  return artifact.externalAccountAuthenticated === true
}

function isPhonePreviewBlockedStyleProofArtifact(artifact: StyleProofArtifact): boolean {
  return artifact.phonePreviewBlocked === true
    || artifact.action === 'phone-preview-entry-readback'
}

function requireExternalAccountAuthenticatedStyleProof(
  issues: QualityIssue[],
  requirementId: StyleProofRequirementId,
  candidateFound: boolean,
  authenticatedCandidateFound: boolean,
): void {
  if (!candidateFound) {
    requireStyleProof(issues, requirementId, false)
    return
  }

  if (!authenticatedCandidateFound) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-external-account-auth-missing',
      message: 'External account proof does not prove that the platform account was authenticated for the exact proof row.',
      suggestion: 'Set externalAccountAuthenticated:true only after the real credentialed editor, upload surface, platform preview, public URL, or published result is authenticated and read back for the exact artifact.',
      location: requirementId,
    })
  }
}

function requireExactArtifactBoundExternalAccountStyleProof(
  issues: QualityIssue[],
  requirementId: StyleProofRequirementId,
  authenticatedCandidateFound: boolean,
  exactAuthenticatedCandidateFound: boolean,
  proofLabel: string,
): void {
  if (!authenticatedCandidateFound || exactAuthenticatedCandidateFound) return

  addStyleProofIssue(issues, {
    id: 'style-proof-manifest-exact-artifact-missing',
    message: `${proofLabel} proof is not bound to the exact exported artifact under review.`,
    suggestion: 'Record exactArtifact:true only after the credentialed channel response or sync readback is proven to belong to the exact exported artifact fingerprint for this style choice.',
    location: requirementId,
  })
}

function validateStyleProofRequirementCoverage(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
  issues: QualityIssue[],
): void {
  const has = (predicate: (artifact: StyleProofArtifact) => boolean): boolean => artifacts.some(predicate)

  switch (requirementId) {
    case 'catalog-source':
      requireStyleProof(issues, requirementId, has(artifact => artifact.action === 'catalog-source'))
      break
    case 'market-applied-dom-readback': {
      const hasAppliedMarketReadback = has(artifact =>
        artifact.action === 'applied-market-element'
        && artifact.channel === 'market-editor'
        && isDomOrVisualReadback(artifact.readback)
      )
      if (!hasAppliedMarketReadback) {
        requireStyleProof(issues, requirementId, false)
      } else if (!has(artifact =>
        artifact.action === 'applied-market-element'
        && artifact.channel === 'market-editor'
        && isDomOrVisualReadback(artifact.readback)
        && artifact.centralEditorChanged === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-market-editor-not-applied',
          message: 'Market editor proof does not prove that the central editor or canvas changed after applying the element.',
          suggestion: 'Record centralEditorChanged:true only after a concrete 135/Xiumi style or effect visibly changes the center editor/canvas and the applied DOM or controls are read back.',
          location: requirementId,
        })
      } else if (!has(artifact =>
        artifact.action === 'applied-market-element'
        && artifact.channel === 'market-editor'
        && isDomOrVisualReadback(artifact.readback)
        && artifact.centralEditorChanged === true
        && artifact.marketAppliedContentVerified === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-market-editor-placeholder-only',
          message: 'Market editor proof does not prove that the applied center editor content has meaningful non-placeholder structure.',
          suggestion: 'Record marketAppliedContentVerified:true only after the applied 135/Xiumi style or SVG effect is read back with meaningful DOM, controls, slots, metadata, or visible content beyond listing-only or placeholder-only authoring state.',
          location: requirementId,
        })
      }
      break
    }
    case 'no-proprietary-template-source':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'source-hygiene-review'
        && artifact.readback === 'hygiene-log'
      ))
      break
    case 'authenticated-editor-url':
      if (!has(artifact =>
        artifact.action === 'authenticated-editor-opened'
        && artifact.channel === 'platform-editor'
      )) {
        requireStyleProof(issues, requirementId, false)
      } else if (!has(artifact =>
        artifact.action === 'authenticated-editor-opened'
        && artifact.channel === 'platform-editor'
        && artifact.authenticatedSessionVerified === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-authenticated-session-not-verified',
          message: 'Authenticated editor proof does not prove that the platform session is still authenticated.',
          suggestion: 'Record authenticatedSessionVerified:true only after the platform page is not a login, QR, expired-session, or re-login page and the authenticated backend/editor state is read back.',
          location: requirementId,
        })
      } else if (!has(artifact =>
        artifact.action === 'authenticated-editor-opened'
        && artifact.channel === 'platform-editor'
        && artifact.authenticatedSessionVerified === true
        && artifact.platformEditorTargetVerified === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-platform-editor-target-not-verified',
          message: 'Authenticated editor proof does not prove that the target is the article editor, not a dashboard, draftbox, create menu, or other authenticated shell page.',
          suggestion: 'Record platformEditorTargetVerified:true only after the same-session article editor target is opened and the proof runner can distinguish it from draftbox/menu/dashboard surfaces.',
          location: requirementId,
        })
      }
      break
    case 'pc-editor-dom-readback':
      if (!has(artifact =>
        artifact.action === 'pc-editor-dom-readback'
        && artifact.channel === 'platform-editor'
        && isDomOrVisualReadback(artifact.readback)
      )) {
        requireStyleProof(issues, requirementId, false)
      } else {
        if (!has(artifact =>
          artifact.action === 'pc-editor-dom-readback'
          && artifact.channel === 'platform-editor'
          && isDomOrVisualReadback(artifact.readback)
          && artifact.authenticatedSessionVerified === true
        )) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-authenticated-session-not-verified',
            message: 'PC editor DOM proof does not prove that the platform session is authenticated.',
            suggestion: 'Record authenticatedSessionVerified:true only after the PC editor DOM is read back from an authenticated backend/editor page, not from a login or expired-session page.',
            location: requirementId,
          })
        }
        if (!has(artifact =>
          artifact.action === 'pc-editor-dom-readback'
          && artifact.channel === 'platform-editor'
          && isDomOrVisualReadback(artifact.readback)
          && artifact.platformEditorTargetVerified === true
        )) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-platform-editor-target-not-verified',
            message: 'PC editor DOM proof does not prove that the DOM readback target is the same article editor target.',
            suggestion: 'Record platformEditorTargetVerified:true only after the readback target is the same authenticated article editor, not a dashboard, draftbox, menu, hidden tab, or unrelated shell.',
            location: requirementId,
          })
        }
        if (!has(artifact =>
          artifact.action === 'pc-editor-dom-readback'
          && artifact.channel === 'platform-editor'
          && isDomOrVisualReadback(artifact.readback)
          && artifact.platformEditorSurfaceVerified === true
        )) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-platform-editor-surface-not-verified',
            message: 'PC editor DOM proof does not prove that the readback came from the intended editor body surface.',
            suggestion: 'Record platformEditorSurfaceVerified:true only after the main article body editing surface is identified and read back; for WeChat, target the body ProseMirror node inside the mock-iframe wrapper, not the title field, hidden iframe, draft list, or shell page.',
            location: requirementId,
          })
        }
        if (!has(artifact =>
          artifact.action === 'pc-editor-dom-readback'
          && artifact.channel === 'platform-editor'
          && isDomOrVisualReadback(artifact.readback)
          && artifact.platformEditorDomVerified === true
        )) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-platform-editor-dom-not-verified',
            message: 'PC editor proof does not prove that platform editor DOM nodes were read back.',
            suggestion: 'Record platformEditorDomVerified:true only after concrete editor shell/body nodes are read from the authenticated PC editor, such as the article editor container and editable body.',
            location: requirementId,
          })
        }
        if (!has(artifact =>
          artifact.action === 'pc-editor-dom-readback'
          && artifact.channel === 'platform-editor'
          && isDomOrVisualReadback(artifact.readback)
          && artifact.mojibakeFreeVerified === true
        )) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-editor-mojibake-not-ruled-out',
            message: 'PC editor DOM proof does not rule out mojibake or replacement-character damage in the editor body.',
            suggestion: 'Record mojibakeFreeVerified:true only after the same authenticated editor body readback has zero mojibake/replacement-character damage; editor reachability alone is not fidelity proof.',
            location: requirementId,
          })
        }
      }
      break
    case 'unit-test-coverage':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'test-run'
        && artifact.channel === 'unit-test'
        && artifact.readback === 'test-assertion'
      ))
      break
    case 'local-browser-rendering':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'local-render'
        && (artifact.channel === 'local-browser' || artifact.channel === 'tauri-webview')
        && isVisualReadback(artifact.readback)
      ))
      break
    case 'exact-artifact':
      if (!has(artifact => artifact.exactArtifact === true)) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-exact-artifact-missing',
          message: 'Style proof manifest does not prove that evidence belongs to the exact exported artifact.',
          suggestion: 'Record the exact preset/channel/artifact fingerprint and mark the proof artifact exactArtifact:true.',
          location: requirementId,
        })
      } else if (!has(artifact =>
        artifact.exactArtifact === true
        && typeof artifact.artifactFingerprint === 'string'
        && artifact.artifactFingerprint.trim().length > 0
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-exact-artifact-missing',
          message: 'Exact artifact proof lacks the exported artifact fingerprint.',
          suggestion: 'Record artifactFingerprint on the same exactArtifact:true proof row so the evidence can be bound to the exported artifact under review.',
          location: requirementId,
        })
      }
      break
    case 'safe-disposable-draft': {
      const isSafeDraftProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.action === 'safe-disposable-draft'
        && artifact.channel === 'platform-editor'
        && (artifact.readback === 'dom' || artifact.readback === 'visual-and-dom' || artifact.readback === 'hygiene-log')
      const hasDisposableDraftProof = has(artifact =>
        isSafeDraftProofArtifact(artifact)
        && artifact.disposableDraft === true
      )
      const hasCleanupPathProof = has(artifact =>
        isSafeDraftProofArtifact(artifact)
        && artifact.cleanupPathVerified === true
      )
      const hasBoundSafeDraftProof = has(artifact =>
        isSafeDraftProofArtifact(artifact)
        && artifact.disposableDraft === true
        && artifact.cleanupPathVerified === true
      )

      if (!hasDisposableDraftProof) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-disposable-draft-missing',
          message: 'PC editor proof lacks a safe disposable test draft bound to the platform-editor proof artifact.',
          suggestion: 'Do not mutate a real account draft until one safe-disposable-draft platform-editor proof records disposableDraft:true for the test draft/channel.',
          location: requirementId,
        })
      }
      if (!hasCleanupPathProof || (!hasBoundSafeDraftProof && hasDisposableDraftProof && hasCleanupPathProof)) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-cleanup-path-missing',
          message: 'PC editor proof lacks a cleanup, deletion, or rollback path bound to the safe disposable draft proof.',
          suggestion: 'Record cleanupPathVerified:true on the same safe-disposable-draft platform-editor proof before any real editor mutation.',
          location: requirementId,
        })
      }
      for (const artifact of artifacts.filter(isSafeDraftProofArtifact)) {
        if (artifact.createRouteActionMetadataMissing === true) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-create-route-action-missing',
            message: 'Safe disposable draft preflight did not expose a concrete create-route action for the article editor target.',
            suggestion: 'Keep route-discovery and create-menu readbacks as blocker evidence until a sanitized create route or same-session editor target action is proven.',
            location: artifact.id,
          })
        }
        if (artifact.cleanupTargetAmbiguous === true) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-cleanup-target-ambiguous',
            message: 'Safe disposable draft preflight cannot uniquely identify the draft that would be cleaned up.',
            suggestion: 'Do not create or mutate a real draft until the proof run defines a unique disposable draft marker and a post-cleanup readback for that exact draft.',
            location: artifact.id,
          })
        }
        if (artifact.saveDraftNoCard === true) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-save-draft-no-card',
            message: 'Safe disposable draft preflight did not produce a unique draftbox card after save-draft.',
            suggestion: 'Keep the run as blocker evidence until the same disposable marker appears as a unique draftbox card and can be deleted with post-cleanup absence readback.',
            location: artifact.id,
          })
        }
      }
      break
    }
    case 'pc-editor-paste-event': {
      const pcPasteArtifacts = artifacts.filter(artifact =>
        artifact.action === 'pc-paste'
        && artifact.channel === 'platform-editor'
      )
      const hasPcPasteEvent = pcPasteArtifacts.length > 0
      const hasCompleteOrdinaryPasteProof = pcPasteArtifacts.some(artifact =>
        typeof artifact.artifactFingerprint === 'string'
        && artifact.artifactFingerprint.trim().length > 0
        && artifact.exactArtifact === true
        && artifact.authenticatedSessionVerified === true
        && artifact.platformEditorTargetVerified === true
        && artifact.platformEditorSurfaceVerified === true
        && artifact.platformEditorDomVerified === true
        && artifact.ordinaryClipboardPasteVerified === true
        && artifact.sameEditorTabVerified === true
        && artifact.pasteInputEventVerified === true
        && artifact.editorBodyMutationVerified === true
        && artifact.mojibakeFreeVerified === true
        && artifact.safeForCommit === true
      )

      if (!hasPcPasteEvent) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-platform-action-missing',
          message: 'PC editor paste proof lacks the real paste/channel event.',
          suggestion: 'Authenticated editor reachability or DOM readback is not enough; record the exact PC paste or transfer action.',
          location: requirementId,
        })
      } else if (!hasCompleteOrdinaryPasteProof) {
        if (!pcPasteArtifacts.some(artifact =>
          typeof artifact.artifactFingerprint === 'string'
          && artifact.artifactFingerprint.trim().length > 0
          && artifact.exactArtifact === true
        )) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-exact-artifact-missing',
            message: 'PC editor paste proof is not bound to the exact exported artifact on the same paste artifact.',
            suggestion: 'Record artifactFingerprint and exactArtifact:true on the same platform-editor pc-paste artifact that carries the ordinary Ctrl+V and body readback flags.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.authenticatedSessionVerified === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-authenticated-session-not-verified',
            message: 'PC editor paste proof does not prove that Ctrl+V occurred in an authenticated platform editor session.',
            suggestion: 'Record authenticatedSessionVerified:true on the same platform-editor pc-paste artifact only after the paste target is an authenticated editor page, not a login, QR, expired-session, or shell page.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.ordinaryClipboardPasteVerified === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-ordinary-paste-not-verified',
            message: 'PC editor paste proof does not prove ordinary user Ctrl+V rich HTML paste.',
            suggestion: 'Record ordinaryClipboardPasteVerified:true only after a real user clipboard paste keeps the exact rich HTML/SVG artifact in the authenticated PC editor.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.sameEditorTabVerified === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-paste-editor-tab-not-verified',
            message: 'PC editor paste proof does not prove that the foreground editor tab and DOM readback target were the same editor.',
            suggestion: 'Record sameEditorTabVerified:true only when the visible OS foreground tab receiving Ctrl+V and the DOM readback target are proven to be the same authenticated editor.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.platformEditorTargetVerified === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-platform-editor-target-not-verified',
            message: 'PC editor paste proof does not prove that the paste target is the intended article editor.',
            suggestion: 'Record platformEditorTargetVerified:true only when the visible editor target, OS input target, and DOM readback target are all the same authenticated article editor.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.platformEditorSurfaceVerified === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-platform-editor-surface-not-verified',
            message: 'PC editor paste proof does not prove that Ctrl+V targeted the intended editor body surface.',
            suggestion: 'Record platformEditorSurfaceVerified:true only when the same main body editing surface receives Ctrl+V and the post-paste DOM readback comes from that exact surface; for WeChat, target the body ProseMirror node inside the mock-iframe wrapper, not the title field, hidden iframe, or list shell.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.platformEditorDomVerified === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-platform-editor-dom-not-verified',
            message: 'PC editor paste proof does not prove that platform editor DOM nodes were read back after Ctrl+V.',
            suggestion: 'Record platformEditorDomVerified:true on the same pc-paste artifact only after the authenticated editor body DOM is read back after the paste event.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.pasteInputEventVerified === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-paste-input-not-verified',
            message: 'PC editor paste proof does not prove that a paste/input event occurred in the editor.',
            suggestion: 'Record pasteInputEventVerified:true only after a real paste/input event is observed for the exact editor body, not merely foreground-window or key-event counts.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.editorBodyMutationVerified === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-editor-body-not-mutated',
            message: 'PC editor paste proof does not prove that the editor body changed after Ctrl+V.',
            suggestion: 'Record editorBodyMutationVerified:true only after the same focused editor body changes and readback preserves the exact rich HTML/SVG artifact.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.mojibakeFreeVerified === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-paste-mojibake-not-ruled-out',
            message: 'PC editor paste proof does not rule out mojibake or replacement-character damage in the pasted body.',
            suggestion: 'Record mojibakeFreeVerified:true only after the same editor body readback has zero mojibake/replacement-character damage for the exact artifact.',
            location: requirementId,
          })
        }
        if (!pcPasteArtifacts.some(artifact => artifact.safeForCommit === true)) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-safe-commit-not-verified',
            message: 'PC editor paste proof is not marked safe for committed repository evidence.',
            suggestion: 'Record safeForCommit:true on the same redacted pc-paste artifact only after credential material, QR artifacts, account images, local paths, and raw platform content are excluded.',
            location: requirementId,
          })
        }
        if (
          pcPasteArtifacts.some(artifact =>
            typeof artifact.artifactFingerprint === 'string'
            && artifact.artifactFingerprint.trim().length > 0
            && artifact.exactArtifact === true
          )
          && pcPasteArtifacts.some(artifact => artifact.authenticatedSessionVerified === true)
          && pcPasteArtifacts.some(artifact => artifact.ordinaryClipboardPasteVerified === true)
          && pcPasteArtifacts.some(artifact => artifact.platformEditorTargetVerified === true)
          && pcPasteArtifacts.some(artifact => artifact.platformEditorSurfaceVerified === true)
          && pcPasteArtifacts.some(artifact => artifact.platformEditorDomVerified === true)
          && pcPasteArtifacts.some(artifact => artifact.sameEditorTabVerified === true)
          && pcPasteArtifacts.some(artifact => artifact.pasteInputEventVerified === true)
          && pcPasteArtifacts.some(artifact => artifact.editorBodyMutationVerified === true)
          && pcPasteArtifacts.some(artifact => artifact.mojibakeFreeVerified === true)
          && pcPasteArtifacts.some(artifact => artifact.safeForCommit === true)
        ) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-paste-proof-not-bound',
            message: 'PC editor paste proof splits required ordinary paste flags across multiple artifacts.',
            suggestion: 'Record exact-artifact, authenticated session, same-target-surface, same-DOM, ordinary paste, same-tab, paste/input, body-mutation, mojibake-free, and safe-commit flags on the same pc-paste artifact for the exact editor readback.',
            location: requirementId,
          })
        }
      }
      break
    }
    case 'phone-preview-readback': {
      const isPhonePreviewProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.action === 'phone-preview'
        && artifact.channel === 'phone-preview'
        && (artifact.readback === 'phone' || isVisualReadback(artifact.readback))
      const hasPhonePreviewReadback = has(isPhonePreviewProofArtifact)
      if (!hasPhonePreviewReadback) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-readback-missing',
          message: 'Mobile preview proof lacks phone-side readback for the exact artifact.',
          suggestion: 'Use phone-preview evidence; local browser, PC editor DOM, and PC paste evidence do not prove final mobile rendering.',
          location: requirementId,
        })
      } else if (!has(artifact =>
        isPhonePreviewProofArtifact(artifact)
        && artifact.phonePreviewContentVerified === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-phone-content-missing',
          message: 'Mobile preview proof does not prove that the final phone article content was opened and read back.',
          suggestion: 'Do not use scan/entry/setup evidence for mobile-preview; record phonePreviewContentVerified:true only after the exact artifact is visible in the phone preview article body.',
          location: requirementId,
        })
      } else if (!has(artifact =>
        isPhonePreviewProofArtifact(artifact)
        && artifact.phonePreviewContentVerified === true
        && artifact.exactArtifact === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-exact-artifact-missing',
          message: 'Mobile preview proof is not bound to the exact exported artifact under review.',
          suggestion: 'Record exactArtifact:true only after the exact exported artifact is visible in the final phone preview article body.',
          location: requirementId,
        })
      }
      break
    }
    case 'phone-screenshot': {
      const isPhoneScreenshotProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.kind === 'screenshot'
        && artifact.channel === 'phone-preview'
        && artifact.readback === 'screenshot'
        && artifact.action === 'phone-preview'
      const hasPhoneScreenshot = has(isPhoneScreenshotProofArtifact)
      if (!hasPhoneScreenshot) {
        requireStyleProof(issues, requirementId, false)
      } else if (!has(artifact =>
        isPhoneScreenshotProofArtifact(artifact)
        && artifact.phonePreviewContentVerified === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-phone-content-missing',
          message: 'Phone screenshot proof does not prove that the screenshot is bound to final phone article content.',
          suggestion: 'Record phonePreviewContentVerified:true on the phone screenshot artifact only after the exact article body is open in phone preview; scan/setup/entry screenshots stay blocked evidence.',
          location: requirementId,
        })
      } else if (!has(artifact =>
        isPhoneScreenshotProofArtifact(artifact)
        && artifact.phonePreviewContentVerified === true
        && artifact.exactArtifact === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-exact-artifact-missing',
          message: 'Phone screenshot proof is not bound to the exact exported artifact under review.',
          suggestion: 'Record exactArtifact:true on the same phone screenshot proof artifact only after the screenshot captures the exact exported article body in phone preview.',
          location: requirementId,
        })
      }
      break
    }
    case 'dark-mode-check': {
      const isDarkModeProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.action === 'dark-mode-check'
        && artifact.channel === 'phone-preview'
        && (artifact.readback === 'phone' || artifact.readback === 'screenshot' || isVisualReadback(artifact.readback))
      const hasDarkModeReadback = has(isDarkModeProofArtifact)
      if (!hasDarkModeReadback) {
        requireStyleProof(issues, requirementId, false)
      } else {
        const hasPhoneContentProof = has(artifact =>
          isDarkModeProofArtifact(artifact)
            && artifact.phonePreviewContentVerified === true
        )
        const hasDarkModeEnabledProof = has(artifact =>
          isDarkModeProofArtifact(artifact)
            && artifact.darkModeEnabledVerified === true
        )
        const hasCompleteDarkModeProof = has(artifact =>
          isDarkModeProofArtifact(artifact)
            && artifact.phonePreviewContentVerified === true
            && artifact.darkModeEnabledVerified === true
        )

        if (!hasPhoneContentProof) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-phone-content-missing',
            message: 'Dark Mode proof is not bound to final phone article content readback.',
            suggestion: 'Record phonePreviewContentVerified:true on the Dark Mode artifact only after the exact article body is open in phone preview.',
            location: requirementId,
          })
        }
        if (!hasDarkModeEnabledProof) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-dark-mode-not-verified',
            message: 'Dark Mode proof does not prove that mobile Dark Mode was enabled for the phone preview.',
            suggestion: 'Record darkModeEnabledVerified:true only after inspecting the exact phone preview artifact with mobile Dark Mode enabled.',
            location: requirementId,
          })
        }
        if (hasPhoneContentProof && hasDarkModeEnabledProof && !hasCompleteDarkModeProof) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-dark-mode-not-verified',
            message: 'Dark Mode proof splits phone article content and mobile Dark Mode state across different artifacts.',
            suggestion: 'Record phonePreviewContentVerified:true and darkModeEnabledVerified:true on the same Dark Mode proof artifact for the exact phone preview body.',
            location: requirementId,
          })
        }
        if (hasCompleteDarkModeProof && !has(artifact =>
          isDarkModeProofArtifact(artifact)
            && artifact.phonePreviewContentVerified === true
            && artifact.darkModeEnabledVerified === true
            && artifact.exactArtifact === true
        )) {
          addStyleProofIssue(issues, {
            id: 'style-proof-manifest-exact-artifact-missing',
            message: 'Dark Mode proof is not bound to the exact exported artifact under review.',
            suggestion: 'Record exactArtifact:true on the same Dark Mode proof artifact only after the exact article body is open in phone preview with mobile Dark Mode enabled.',
            location: requirementId,
          })
        }
      }
      break
    }
    case 'cover-thumbnail-check': {
      const isCoverThumbnailProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.action === 'cover-thumbnail-check'
        && artifact.channel === 'phone-preview'
        && (artifact.readback === 'phone' || artifact.readback === 'screenshot' || isVisualReadback(artifact.readback))
      const hasCoverThumbnailReadback = has(isCoverThumbnailProofArtifact)
      if (!hasCoverThumbnailReadback) {
        requireStyleProof(issues, requirementId, false)
      } else if (!has(artifact =>
        isCoverThumbnailProofArtifact(artifact)
        && artifact.coverThumbnailAccepted === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-cover-thumbnail-not-accepted',
          message: 'Cover thumbnail proof does not prove that the cover thumbnail was accepted in the phone preview entry.',
          suggestion: 'Record coverThumbnailAccepted:true only after the platform preview entry or phone share/list entry shows the exact accepted cover thumbnail.',
          location: requirementId,
        })
      } else if (!has(artifact =>
        isCoverThumbnailProofArtifact(artifact)
        && artifact.coverThumbnailAccepted === true
        && artifact.exactArtifact === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-exact-artifact-missing',
          message: 'Cover thumbnail proof is not bound to the exact exported artifact under review.',
          suggestion: 'Record exactArtifact:true on the same cover-thumbnail proof artifact only after the exact accepted thumbnail is visible for the exported artifact.',
          location: requirementId,
        })
      }
      break
    }
    case 'credentialed-channel-response': {
      const isCredentialedChannelProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.action === 'credentialed-sync'
        && artifact.channel === 'credentialed-channel'
        && artifact.readback === 'api-response'
      const hasCredentialedChannelProof = has(isCredentialedChannelProofArtifact)
      const hasAuthenticatedCredentialedChannelProof = has(artifact =>
        isCredentialedChannelProofArtifact(artifact)
        && isExternalAccountAuthenticatedStyleProofArtifact(artifact)
      )

      requireExternalAccountAuthenticatedStyleProof(
        issues,
        requirementId,
        hasCredentialedChannelProof,
        hasAuthenticatedCredentialedChannelProof,
      )
      requireExactArtifactBoundExternalAccountStyleProof(
        issues,
        requirementId,
        hasAuthenticatedCredentialedChannelProof,
        has(artifact =>
          isCredentialedChannelProofArtifact(artifact)
          && isExternalAccountAuthenticatedStyleProofArtifact(artifact)
          && artifact.exactArtifact === true
        ),
        'Credentialed channel response',
      )
      break
    }
    case 'sync-readback': {
      const isSyncReadbackProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.action === 'sync-readback'
        && artifact.channel === 'credentialed-channel'
        && (artifact.readback === 'api-response' || artifact.readback === 'dom' || artifact.readback === 'visual-and-dom')
      const hasSyncReadbackProof = has(isSyncReadbackProofArtifact)
      const hasAuthenticatedSyncReadbackProof = has(artifact =>
        isSyncReadbackProofArtifact(artifact)
        && isExternalAccountAuthenticatedStyleProofArtifact(artifact)
      )

      requireExternalAccountAuthenticatedStyleProof(
        issues,
        requirementId,
        hasSyncReadbackProof,
        hasAuthenticatedSyncReadbackProof,
      )
      requireExactArtifactBoundExternalAccountStyleProof(
        issues,
        requirementId,
        hasAuthenticatedSyncReadbackProof,
        has(artifact =>
          isSyncReadbackProofArtifact(artifact)
          && isExternalAccountAuthenticatedStyleProofArtifact(artifact)
          && artifact.exactArtifact === true
        ),
        'Sync readback',
      )
      break
    }
    case 'scheduled-send-readback': {
      const isScheduledSendProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.action === 'scheduled-send'
        && artifact.channel === 'credentialed-channel'
        && (artifact.readback === 'api-response'
          || artifact.readback === 'dom'
          || artifact.readback === 'visual-and-dom'
          || artifact.readback === 'scheduled-send-state')
      const hasScheduledSendProof = has(isScheduledSendProofArtifact)
      const hasAuthenticatedScheduledSendProof = has(artifact =>
        isScheduledSendProofArtifact(artifact)
        && isExternalAccountAuthenticatedStyleProofArtifact(artifact)
      )

      requireExternalAccountAuthenticatedStyleProof(
        issues,
        requirementId,
        hasScheduledSendProof,
        hasAuthenticatedScheduledSendProof,
      )
      if (hasAuthenticatedScheduledSendProof && !has(artifact =>
        isScheduledSendProofArtifact(artifact)
        && isExternalAccountAuthenticatedStyleProofArtifact(artifact)
        && artifact.exactArtifact === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-exact-artifact-missing',
          message: 'Scheduled send proof is not bound to the exact exported artifact under review.',
          suggestion: 'Record exactArtifact:true only after the send or schedule state is read back for the exact exported artifact fingerprint.',
          location: requirementId,
        })
      }
      if (hasAuthenticatedScheduledSendProof && !has(artifact =>
        isScheduledSendProofArtifact(artifact)
        && isExternalAccountAuthenticatedStyleProofArtifact(artifact)
        && artifact.exactArtifact === true
        && artifact.scheduledSendVerified === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-scheduled-send-not-verified',
          message: 'Scheduled send proof does not prove that the exact artifact entered a real send or schedule state.',
          suggestion: 'Record scheduledSendVerified:true only after the platform send/schedule state is read back for the exact artifact; sync responses, editor previews, and local proof rows are not enough.',
          location: requirementId,
        })
      }
      break
    }
    case 'published-url-or-platform-preview': {
      const isPublishedPreviewProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.action === 'published-preview'
        && (artifact.channel === 'public-web' || artifact.channel === 'credentialed-channel')
        && (artifact.readback === 'published-url' || isVisualReadback(artifact.readback))
      const hasPublishedPreviewProof = has(isPublishedPreviewProofArtifact)
      const hasAuthenticatedPublishedPreviewProof = has(artifact =>
        isPublishedPreviewProofArtifact(artifact)
        && isExternalAccountAuthenticatedStyleProofArtifact(artifact)
      )

      requireExternalAccountAuthenticatedStyleProof(
        issues,
        requirementId,
        hasPublishedPreviewProof,
        hasAuthenticatedPublishedPreviewProof,
      )
      if (hasAuthenticatedPublishedPreviewProof && !has(artifact =>
        isPublishedPreviewProofArtifact(artifact)
        && isExternalAccountAuthenticatedStyleProofArtifact(artifact)
        && artifact.exactArtifact === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-exact-artifact-missing',
          message: 'Published or platform preview proof is not bound to the exact exported artifact under review.',
          suggestion: 'Record exactArtifact:true only after the public URL or platform preview readback is proven to contain the exact exported artifact fingerprint for this style choice.',
          location: requirementId,
        })
      }
      break
    }
    case 'public-image-host': {
      const isPublicImageHostProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.action === 'public-image-host-check'
        && artifact.channel === 'public-web'
        && (artifact.readback === 'visual' || artifact.readback === 'dom' || artifact.readback === 'manifest')
        && (artifact.hostStatus === 'public-https' || artifact.hostStatus === 'platform-hosted')
      const hasTraceablePublicImageHostProof = has(artifact =>
        isPublicImageHostProofArtifact(artifact)
        && typeof artifact.artifactRef === 'string'
        && artifact.artifactRef.trim().length > 0
      )

      if (!has(isPublicImageHostProofArtifact)) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-public-image-host-missing',
          message: 'Image fallback proof lacks a public HTTPS or platform-hosted image host check.',
          suggestion: 'Record a public-image-host proof artifact; local, data, blob, temporary preview, or WeChat-only image URLs do not satisfy this requirement.',
          location: requirementId,
        })
      } else if (!hasTraceablePublicImageHostProof) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-artifact-ref-missing',
          message: 'Public image host proof does not reference the redacted image host or platform-host report that was verified.',
          suggestion: 'Attach artifactRef to the exact redacted public-host or platform-host proof report; do not rely on an untraceable host-status row.',
          location: requirementId,
        })
      } else if (!has(artifact =>
        isPublicImageHostProofArtifact(artifact)
        && typeof artifact.artifactRef === 'string'
        && artifact.artifactRef.trim().length > 0
        && artifact.safeForCommit === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-safe-commit-not-verified',
          message: 'Public image host proof is not marked safe for committed repository evidence on the same redacted host report.',
          suggestion: 'Record safeForCommit:true on the same public-image-host artifact only after the referenced host report excludes local paths, account material, temporary preview URLs, credential secrets, and raw platform captures.',
          location: requirementId,
        })
      }
      break
    }
    case 'xhs-artifact-manifest':
    case 'zhihu-artifact-manifest': {
      const isArtifactManifestProofArtifact = (artifact: StyleProofArtifact): boolean =>
        artifact.kind === 'artifact-manifest'
        && artifact.action === 'artifact-manifest-validation'
        && artifact.readback === 'manifest'
      const hasTraceableArtifactManifestProof = has(artifact =>
        isArtifactManifestProofArtifact(artifact)
        && typeof artifact.artifactRef === 'string'
        && artifact.artifactRef.trim().length > 0
      )
      const hasValidatedArtifactManifestProof = has(artifact =>
        isArtifactManifestProofArtifact(artifact)
        && typeof artifact.artifactRef === 'string'
        && artifact.artifactRef.trim().length > 0
        && artifact.artifactManifestValidated === true
      )

      if (!has(isArtifactManifestProofArtifact)) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-validation-missing',
          message: `${requirementId} proof lacks a validated artifact manifest entry.`,
          suggestion: 'Run the platform-specific image artifact manifest validator first, then reference only the redacted validation result in style proof.',
          location: requirementId,
        })
      }
      else if (!hasTraceableArtifactManifestProof) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-artifact-ref-missing',
          message: `${requirementId} proof does not reference the redacted artifact manifest report that was validated.`,
          suggestion: 'Attach artifactRef to the exact redacted manifest validator report; do not rely on an untraceable local artifact-manifest row.',
          location: requirementId,
        })
      }
      else if (!hasValidatedArtifactManifestProof) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-artifact-manifest-not-validated',
          message: `${requirementId} proof references an artifact manifest but does not prove the platform manifest validator passed on the same redacted report.`,
          suggestion: 'Set artifactManifestValidated:true on the same artifactRef row only after validateXhsImageArtifactManifest() or validateZhihuImageArtifactManifest() returns no issues for the exact redacted artifact manifest.',
          location: requirementId,
        })
      }
      else if (!has(artifact =>
        isArtifactManifestProofArtifact(artifact)
        && typeof artifact.artifactRef === 'string'
        && artifact.artifactRef.trim().length > 0
        && artifact.artifactManifestValidated === true
        && artifact.safeForCommit === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-safe-commit-not-verified',
          message: `${requirementId} proof is not marked safe for committed repository evidence on the same validated manifest report.`,
          suggestion: 'Record safeForCommit:true on the same artifact-manifest validation row only after the referenced manifest report excludes local paths, account material, credential secrets, temporary upload URLs, and raw platform captures.',
          location: requirementId,
        })
      }
      break
    }
    case 'no-sensitive-artifact':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'sensitive-hygiene-review'
        && artifact.readback === 'hygiene-log'
      ))
      break
  }

  validateStyleProofRequiredActionChannel(requirementId, artifacts, issues)
  validateStyleProofRequiredReadback(requirementId, artifacts, issues)
  validateStyleProofRequiredCollectedAt(requirementId, artifacts, issues)
  validateStyleProofRequiredSafeCommit(requirementId, artifacts, issues)
  validateStyleProofRequiredArtifactFingerprint(requirementId, artifacts, issues)
  validateStyleProofRequiredExactArtifact(requirementId, artifacts, issues)
  validateStyleProofForbiddenFields(requirementId, artifacts, issues)
  validateStyleProofRequiredFieldBinding(requirementId, artifacts, issues)
}

function isStyleProofReadbackAllowedByContract(
  contract: StyleProofExecutionArtifactContract,
  readback: StyleProofReadback,
): boolean {
  return (contract.requiredReadbacks as readonly StyleProofReadback[]).includes(readback)
}

function getStyleProofContractActionChannelCandidates(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
): StyleProofArtifact[] {
  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract

  return artifacts.filter(artifact =>
    (contract.requiredChannels as readonly StyleProofChannel[]).includes(artifact.channel)
    && (contract.requiredActions as readonly StyleProofAction[]).includes(artifact.action)
    && (!contract.acceptedHostStatuses
      || (
        typeof artifact.hostStatus === 'string'
        && (contract.acceptedHostStatuses as readonly StyleProofHostStatus[]).includes(artifact.hostStatus)
      ))
  )
}

function getStyleProofContractCandidates(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
): StyleProofArtifact[] {
  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract

  return getStyleProofContractActionChannelCandidates(requirementId, artifacts)
    .filter(artifact => isStyleProofReadbackAllowedByContract(contract, artifact.readback))
}

function getStyleProofCollectedAtTimestamp(artifact: StyleProofArtifact): number | null {
  if (typeof artifact.collectedAt !== 'string') return null

  const collectedAt = artifact.collectedAt.trim()
  if (collectedAt.length === 0) return null

  return Date.parse(collectedAt)
}

function isStyleProofCollectedAtInvalid(
  artifact: StyleProofArtifact,
  nowMs = Date.now(),
): boolean {
  const timestamp = getStyleProofCollectedAtTimestamp(artifact)
  if (timestamp === null) return false

  return !Number.isFinite(timestamp) || timestamp > nowMs
}

function isStyleProofCollectedAtFresh(
  artifact: StyleProofArtifact,
  maxFreshnessDays: number,
  nowMs = Date.now(),
): boolean {
  const timestamp = getStyleProofCollectedAtTimestamp(artifact)
  if (timestamp === null || !Number.isFinite(timestamp) || timestamp > nowMs) return false

  return nowMs - timestamp <= maxFreshnessDays * STYLE_PROOF_MILLISECONDS_PER_DAY
}

function validateStyleProofRequiredActionChannel(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
  issues: QualityIssue[],
): void {
  if (issues.some(issue =>
    issue.location === requirementId
    && issue.id === 'style-proof-manifest-contract-action-channel-mismatch'
  )) {
    return
  }

  const requirementArtifacts = artifacts.filter(artifact => artifact.requirementId === requirementId)
  if (requirementArtifacts.length === 0) return
  if (getStyleProofContractActionChannelCandidates(requirementId, requirementArtifacts).length > 0) {
    return
  }

  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract
  addStyleProofIssue(issues, {
    id: 'style-proof-manifest-contract-action-channel-mismatch',
    message: `${requirementId} proof rows do not match the required action/channel contract.`,
    suggestion: `Record one proof row with action ${contract.requiredActions.join(' or ')} and channel ${contract.requiredChannels.join(' or ')} before claiming this requirement.`,
    location: requirementId,
  })
}

function validateStyleProofRequiredReadback(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
  issues: QualityIssue[],
): void {
  if (issues.some(issue =>
    issue.location === requirementId
    && issue.id === 'style-proof-manifest-readback-missing'
  )) {
    return
  }

  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract
  const contractCandidates = getStyleProofContractActionChannelCandidates(requirementId, artifacts)
  if (contractCandidates.length === 0) return
  if (contractCandidates.some(artifact => isStyleProofReadbackAllowedByContract(contract, artifact.readback))) return

  addStyleProofIssue(issues, {
    id: 'style-proof-manifest-readback-missing',
    message: `${requirementId} proof uses the expected channel/action but not an accepted readback type.`,
    suggestion: `Record one of ${contract.requiredReadbacks.join(', ')} on the same proof row; fields from a different readback cannot satisfy this requirement.`,
    location: requirementId,
  })
}

function validateStyleProofRequiredCollectedAt(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
  issues: QualityIssue[],
): void {
  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract
  if (!(contract.requiredFields as readonly StyleProofArtifactVerificationField[]).includes('collectedAt')) {
    return
  }

  if (issues.some(issue =>
    issue.location === requirementId
    && (
      issue.id === 'style-proof-manifest-collected-at-missing'
      || issue.id === 'style-proof-manifest-collected-at-invalid'
      || issue.id === 'style-proof-manifest-proof-stale'
    )
  )) {
    return
  }

  const contractCandidates = getStyleProofContractCandidates(requirementId, artifacts)
  if (contractCandidates.length === 0) return

  const candidatesWithCollectedAt = contractCandidates.filter(artifact =>
    typeof artifact.collectedAt === 'string' && artifact.collectedAt.trim().length > 0
  )
  if (candidatesWithCollectedAt.length === 0) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-collected-at-missing',
      message: `${requirementId} proof lacks collectedAt on a matching external proof row.`,
      suggestion: 'Record collectedAt as a redacted ISO timestamp on the same proof row when the external editor, phone, public host, credentialed channel, or publish readback is collected.',
      location: requirementId,
    })
    return
  }

  const nowMs = Date.now()
  if (candidatesWithCollectedAt.some(artifact => isStyleProofCollectedAtInvalid(artifact, nowMs))) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-collected-at-invalid',
      message: `${requirementId} proof has an invalid or future collectedAt timestamp.`,
      suggestion: 'Use a parseable timestamp collected no later than the current validation time; future-dated proof cannot satisfy an external platform gate.',
      location: requirementId,
    })
    return
  }

  const maxFreshnessDays = contract.maxFreshnessDays ?? STYLE_PROOF_DEFAULT_MAX_FRESHNESS_DAYS
  if (!candidatesWithCollectedAt.some(artifact => isStyleProofCollectedAtFresh(artifact, maxFreshnessDays, nowMs))) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-proof-stale',
      message: `${requirementId} proof is older than the accepted freshness window.`,
      suggestion: `Refresh this external proof and record a new collectedAt timestamp within ${maxFreshnessDays} days of validation before claiming the gate.`,
      location: requirementId,
    })
  }
}

function validateStyleProofRequiredSafeCommit(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
  issues: QualityIssue[],
): void {
  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract
  if (!(contract.requiredFields as readonly StyleProofArtifactVerificationField[]).includes('safeForCommit')) {
    return
  }

  if (issues.some(issue =>
    issue.location === requirementId
    && issue.id === 'style-proof-manifest-safe-commit-not-verified'
  )) {
    return
  }

  const contractCandidates = getStyleProofContractCandidates(requirementId, artifacts)
  if (contractCandidates.length === 0) return
  if (contractCandidates.some(artifact => artifact.safeForCommit === true)) return

  addStyleProofIssue(issues, {
    id: 'style-proof-manifest-safe-commit-not-verified',
    message: `${requirementId} proof is not marked safe for committed repository evidence on a matching action/channel row.`,
    suggestion: 'Record safeForCommit:true on the same proof row only after the referenced evidence excludes account material, local paths, credential secrets, temporary platform URLs, and raw platform captures.',
    location: requirementId,
  })
}

function validateStyleProofRequiredArtifactFingerprint(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
  issues: QualityIssue[],
): void {
  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract
  if (!(contract.requiredFields as readonly StyleProofArtifactVerificationField[]).includes('artifactFingerprint')) {
    return
  }

  if (issues.some(issue =>
    issue.location === requirementId
    && issue.id === 'style-proof-manifest-exact-artifact-missing'
  )) {
    return
  }

  const contractCandidates = getStyleProofContractCandidates(requirementId, artifacts)
  if (contractCandidates.length === 0) return
  if (contractCandidates.some(artifact =>
    typeof artifact.artifactFingerprint === 'string'
    && artifact.artifactFingerprint.trim().length > 0
  )) {
    return
  }

  addStyleProofIssue(issues, {
    id: 'style-proof-manifest-exact-artifact-missing',
    message: `${requirementId} proof lacks artifactFingerprint on a matching action/channel row.`,
    suggestion: 'Record a non-empty artifactFingerprint on the same proof row so the evidence can be traced to the exact exported artifact under review.',
    location: requirementId,
  })
}

function validateStyleProofRequiredExactArtifact(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
  issues: QualityIssue[],
): void {
  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract
  if (!(contract.requiredFields as readonly StyleProofArtifactVerificationField[]).includes('exactArtifact')) {
    return
  }

  if (issues.some(issue =>
    issue.location === requirementId
    && issue.id === 'style-proof-manifest-exact-artifact-missing'
  )) {
    return
  }

  const contractCandidates = getStyleProofContractCandidates(requirementId, artifacts)
  if (contractCandidates.length === 0) return
  if (contractCandidates.some(artifact => artifact.exactArtifact === true)) return

  addStyleProofIssue(issues, {
    id: 'style-proof-manifest-exact-artifact-missing',
    message: `${requirementId} proof is not marked as the exact exported artifact on a matching action/channel row.`,
    suggestion: 'Record exactArtifact:true on the same proof row only after the evidence is proven to belong to the exact exported artifact under review.',
    location: requirementId,
  })
}

function isStyleProofForbiddenFieldPresent(
  contract: StyleProofExecutionArtifactContract,
  artifact: StyleProofArtifact,
  field: StyleProofArtifactVerificationField,
): boolean {
  if (field === 'sensitive') return isSensitiveStyleProofArtifact(artifact)
  if (field === 'hostStatus') return typeof artifact.hostStatus === 'string'
  return isStyleProofRequiredFieldSatisfied(contract, artifact, field)
}

function getStyleProofForbiddenFieldIssueId(
  field: StyleProofArtifactVerificationField,
): StyleProofManifestIssueId {
  return field === 'sensitive'
    ? 'style-proof-manifest-sensitive-artifact'
    : 'style-proof-manifest-forbidden-field-present'
}

function validateStyleProofForbiddenFields(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
  issues: QualityIssue[],
): void {
  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract
  const forbiddenFields = contract.forbiddenFields as readonly StyleProofArtifactVerificationField[] | undefined
  if (!forbiddenFields || forbiddenFields.length === 0) return

  const contractCandidates = getStyleProofContractCandidates(requirementId, artifacts)
  if (contractCandidates.length === 0) return

  for (const field of forbiddenFields) {
    const issueId = getStyleProofForbiddenFieldIssueId(field)
    if (issues.some(issue => issue.location === requirementId && issue.id === issueId)) continue
    if (!contractCandidates.some(artifact => isStyleProofForbiddenFieldPresent(contract, artifact, field))) {
      continue
    }

    addStyleProofIssue(issues, {
      id: issueId,
      message: `${requirementId} proof sets forbidden artifact field ${field} on a matching action/channel/readback row.`,
      suggestion: 'Remove sensitive, credentialed, local-only, or otherwise forbidden proof fields from the matching artifact row before claiming this requirement.',
      location: requirementId,
    })
  }
}

function isStyleProofRequiredFieldSatisfied(
  contract: StyleProofExecutionArtifactContract,
  artifact: StyleProofArtifact,
  field: StyleProofArtifactVerificationField,
): boolean {
  switch (field) {
    case 'artifactFingerprint':
      return typeof artifact.artifactFingerprint === 'string' && artifact.artifactFingerprint.trim().length > 0
    case 'artifactRef':
      return typeof artifact.artifactRef === 'string' && artifact.artifactRef.trim().length > 0
    case 'hostStatus':
      return typeof artifact.hostStatus === 'string'
        && Boolean(contract.acceptedHostStatuses?.includes(artifact.hostStatus))
    case 'exactArtifact':
      return artifact.exactArtifact === true
    case 'authenticatedSessionVerified':
      return artifact.authenticatedSessionVerified === true
    case 'externalAccountAuthenticated':
      return artifact.externalAccountAuthenticated === true
    case 'externalAccountLoginBlocked':
      return artifact.externalAccountLoginBlocked === true
    case 'platformEditorTargetVerified':
      return artifact.platformEditorTargetVerified === true
    case 'platformEditorSurfaceVerified':
      return artifact.platformEditorSurfaceVerified === true
    case 'platformEditorDomVerified':
      return artifact.platformEditorDomVerified === true
    case 'centralEditorChanged':
      return artifact.centralEditorChanged === true
    case 'marketAppliedContentVerified':
      return artifact.marketAppliedContentVerified === true
    case 'ordinaryClipboardPasteVerified':
      return artifact.ordinaryClipboardPasteVerified === true
    case 'sameEditorTabVerified':
      return artifact.sameEditorTabVerified === true
    case 'pasteInputEventVerified':
      return artifact.pasteInputEventVerified === true
    case 'editorBodyMutationVerified':
      return artifact.editorBodyMutationVerified === true
    case 'mojibakeFreeVerified':
      return artifact.mojibakeFreeVerified === true
    case 'phonePreviewContentVerified':
      return artifact.phonePreviewContentVerified === true
    case 'phonePreviewBlocked':
      return artifact.phonePreviewBlocked === true
    case 'darkModeEnabledVerified':
      return artifact.darkModeEnabledVerified === true
    case 'coverThumbnailAccepted':
      return artifact.coverThumbnailAccepted === true
    case 'scheduledSendVerified':
      return artifact.scheduledSendVerified === true
    case 'disposableDraft':
      return artifact.disposableDraft === true
    case 'cleanupPathVerified':
      return artifact.cleanupPathVerified === true
    case 'saveDraftNoCard':
      return artifact.saveDraftNoCard === true
    case 'artifactManifestValidated':
      return artifact.artifactManifestValidated === true
    case 'redactionVerified':
      return artifact.redactionVerified === true
    case 'collectedAt':
      return isStyleProofCollectedAtFresh(
        artifact,
        contract.maxFreshnessDays ?? STYLE_PROOF_DEFAULT_MAX_FRESHNESS_DAYS,
      )
    case 'safeForCommit':
      return artifact.safeForCommit === true
    case 'committed':
      return artifact.committed === true
    case 'sensitive':
      return artifact.sensitive === true
  }
}

function validateStyleProofRequiredFieldBinding(
  requirementId: StyleProofRequirementId,
  artifacts: readonly StyleProofArtifact[],
  issues: QualityIssue[],
): void {
  if (issues.some(issue =>
    issue.location === requirementId
    && issue.id === 'style-proof-manifest-proof-not-bound'
  )) {
    return
  }

  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[requirementId] as StyleProofExecutionArtifactContract
  const requiredFields = contract.requiredFields as readonly StyleProofArtifactVerificationField[]
  if (requiredFields.length <= 1) return

  const contractCandidates = getStyleProofContractCandidates(requirementId, artifacts)
  if (contractCandidates.length === 0) return
  if (contractCandidates.some(artifact =>
    requiredFields.every(field => isStyleProofRequiredFieldSatisfied(contract, artifact, field))
  )) {
    return
  }
  if (!requiredFields.every(field =>
    contractCandidates.some(artifact => isStyleProofRequiredFieldSatisfied(contract, artifact, field))
  )) {
    return
  }

  addStyleProofIssue(issues, {
    id: 'style-proof-manifest-proof-not-bound',
    message: `${requirementId} proof splits required fields across multiple matching proof rows.`,
    suggestion: 'Record every required field on one matching proof row; fields spread across separate artifacts cannot prove a single exported artifact state.',
    location: requirementId,
  })
}

function requireStyleProof(
  issues: QualityIssue[],
  requirementId: StyleProofRequirementId,
  passed: boolean,
): void {
  if (passed) return

  addStyleProofIssue(issues, {
    id: 'style-proof-manifest-requirement-missing',
    message: `Style proof artifact for ${requirementId} is present but does not satisfy the required action/channel/readback contract.`,
    suggestion: 'Use the exact platform action and readback expected by this proof requirement; weaker evidence must remain a lower evidence label.',
    location: requirementId,
  })
}

function isDomOrVisualReadback(readback: StyleProofReadback): boolean {
  return readback === 'dom' || readback === 'visual' || readback === 'visual-and-dom'
}

function isVisualReadback(readback: StyleProofReadback): boolean {
  return readback === 'visual' || readback === 'visual-and-dom' || readback === 'screenshot'
}

function isSensitiveStyleProofReference(value: string): boolean {
  return SENSITIVE_ARTIFACT_TEXT_PATTERNS.some(pattern => pattern.test(value))
}

function addStyleProofIssue(
  issues: QualityIssue[],
  issue: {
    id: StyleProofManifestIssueId
    severity?: QualityIssue['severity']
    message: string
    suggestion: string
    location?: string
  },
): void {
  issues.push({
    id: issue.id,
    severity: issue.severity ?? 'error',
    message: issue.message,
    suggestion: issue.suggestion,
    location: issue.location,
  })
}

function dedupeStyleProofIssues(issues: readonly QualityIssue[]): QualityIssue[] {
  const seen = new Set<string>()
  const deduped: QualityIssue[] = []

  for (const issue of issues) {
    const key = `${issue.id}\u0000${issue.location ?? ''}\u0000${issue.message}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(issue)
  }

  return deduped
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

export function getPlatformStyleProofReadinessReport(platform: Platform): PlatformStyleProofReadinessReport {
  const choices = getPlatformStyleChoices(platform)
    .map(choice => {
      const draft = createStyleProofManifestDraft({
        platform,
        choiceId: choice.id,
      })
      const report = getStyleProofManifestReport(draft)
      const missingRequirementIds = report.requirements
        .filter(requirement => requirement.status === 'missing')
        .map(requirement => requirement.requirement.id)
      const invalidRequirementIds = report.requirements
        .filter(requirement => requirement.status === 'invalid')
        .map(requirement => requirement.requirement.id)

      return {
        choice,
        draft,
        report,
        blockedByCatalog: choice.status !== 'available',
        missingRequirementIds,
        invalidRequirementIds,
      }
    })

  return {
    platform,
    choices,
    summary: {
      total: choices.length,
      valid: choices.filter(choice => choice.report.valid).length,
      blockedByCatalog: choices.filter(choice => choice.blockedByCatalog).length,
      missingRequirements: choices.reduce((total, choice) => total + choice.missingRequirementIds.length, 0),
      invalidRequirements: choices.reduce((total, choice) => total + choice.invalidRequirementIds.length, 0),
    },
  }
}

function buildStyleProofCollectionStep(
  choiceReadiness: StyleChoiceProofReadiness,
  requirementId: StyleProofRequirementId,
  status: StyleProofCollectionStatus,
): StyleProofCollectionStep {
  const requirement = STYLE_PROOF_REQUIREMENT_BY_ID.get(requirementId)
  if (!requirement) {
    throw new Error(`Unknown style proof requirement: ${requirementId}`)
  }

  const gate = STYLE_PROOF_COLLECTION_GATE_BY_REQUIREMENT[requirementId]

  return {
    choice: choiceReadiness.choice,
    requirement,
    status,
    gate,
    order: STYLE_PROOF_COLLECTION_ORDER[gate],
    blockedByCatalog: choiceReadiness.blockedByCatalog,
    mutatesPlatform: doesStyleProofGateMutatePlatform(gate),
    requiresExternalAccount: doesStyleProofGateRequireExternalAccount(gate),
    requiresPhone: doesStyleProofGateRequirePhone(gate),
    safeToAutomate: isStyleProofGateSafeToAutomate(gate),
    note: STYLE_PROOF_COLLECTION_NOTES[gate],
  }
}

export function getPlatformStyleProofCollectionPlan(platform: Platform): PlatformStyleProofCollectionPlan {
  const readiness = getPlatformStyleProofReadinessReport(platform)
  const steps = readiness.choices
    .flatMap(choiceReadiness => [
      ...choiceReadiness.missingRequirementIds.map(requirementId =>
        buildStyleProofCollectionStep(choiceReadiness, requirementId, 'missing'),
      ),
      ...choiceReadiness.invalidRequirementIds.map(requirementId =>
        buildStyleProofCollectionStep(choiceReadiness, requirementId, 'invalid'),
      ),
    ])
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order
      if (left.choice.id !== right.choice.id) return left.choice.id.localeCompare(right.choice.id)
      return left.requirement.id.localeCompare(right.requirement.id)
    })

  return {
    platform,
    steps,
    summary: {
      total: steps.length,
      localEvidence: steps.filter(step => step.gate === 'local-evidence').length,
      marketEditor: steps.filter(step => step.gate === 'market-editor').length,
      authenticatedPcEditor: steps.filter(step => step.gate === 'authenticated-pc-editor').length,
      phonePreview: steps.filter(step => step.gate === 'phone-preview').length,
      credentialedChannel: steps.filter(step => step.gate === 'credentialed-channel').length,
      publicHost: steps.filter(step => step.gate === 'public-host').length,
      platformPublish: steps.filter(step => step.gate === 'platform-publish').length,
      sensitiveHygiene: steps.filter(step => step.gate === 'sensitive-hygiene').length,
      blockedChoices: new Set(steps.filter(step => step.blockedByCatalog).map(step => step.choice.id)).size,
      mutatingSteps: steps.filter(step => step.mutatesPlatform).length,
      externalAccountSteps: steps.filter(step => step.requiresExternalAccount).length,
      phoneSteps: steps.filter(step => step.requiresPhone).length,
      safeToAutomate: steps.filter(step => step.safeToAutomate).length,
    },
  }
}

export function getPlatformStyleProofCollectionQueue(platform: Platform): PlatformStyleProofCollectionQueue {
  const plan = getPlatformStyleProofCollectionPlan(platform)
  const groups: StyleProofCollectionGateGroup[] = []

  for (const gate of STYLE_PROOF_COLLECTION_GATE_SEQUENCE) {
    const steps = plan.steps.filter(step => step.gate === gate)
    if (steps.length === 0) continue

    groups.push({
      gate,
      order: STYLE_PROOF_COLLECTION_ORDER[gate],
      note: STYLE_PROOF_COLLECTION_NOTES[gate],
      steps,
      choiceIds: Array.from(new Set(steps.map(step => step.choice.id))).sort(),
      stepCount: steps.length,
      blockedChoiceCount: new Set(steps
        .filter(step => step.blockedByCatalog)
        .map(step => step.choice.id)).size,
      mutatingSteps: steps.filter(step => step.mutatesPlatform).length,
      externalAccountSteps: steps.filter(step => step.requiresExternalAccount).length,
      phoneSteps: steps.filter(step => step.requiresPhone).length,
      safeToAutomateSteps: steps.filter(step => step.safeToAutomate).length,
    })
  }

  const choiceIds = new Set(plan.steps.map(step => step.choice.id))
  const nextGate = groups[0]?.gate ?? null
  const nextSafeGate = groups.find(group => group.safeToAutomateSteps > 0)?.gate ?? null

  return {
    platform,
    groups,
    nextGate,
    nextSafeGate,
    summary: {
      totalSteps: plan.steps.length,
      totalGates: groups.length,
      totalChoices: choiceIds.size,
      blockedChoices: new Set(plan.steps
        .filter(step => step.blockedByCatalog)
        .map(step => step.choice.id)).size,
      safeToAutomateSteps: plan.summary.safeToAutomate,
      mutatingSteps: plan.summary.mutatingSteps,
      externalAccountSteps: plan.summary.externalAccountSteps,
      phoneSteps: plan.summary.phoneSteps,
    },
  }
}

interface StyleProofProgressSource {
  choice: PlatformStyleChoice
  report: StyleProofManifestReport
  blockedByCatalog: boolean
}

function getStyleProofProgressStatus(summary: {
  missing: number
  invalid: number
  forcedInvalid?: boolean
}): StyleProofProgressStatus {
  if (summary.forcedInvalid) return 'invalid'
  if (summary.invalid > 0) return 'invalid'
  if (summary.missing > 0) return 'missing'
  return 'satisfied'
}

function buildMergedStyleChoiceProofManifest(
  platform: Platform,
  choice: PlatformStyleChoice,
  manifests: readonly StyleProofManifest[],
): {
  manifest: StyleProofManifest
  manifestCount: number
  issues: readonly QualityIssue[]
} {
  const matchingManifests = manifests.filter(manifest =>
    manifest.platform === platform && manifest.choiceId === choice.id
  )

  if (matchingManifests.length === 0) {
    return {
      manifest: createStyleProofManifestDraft({
        platform,
        choiceId: choice.id,
      }),
      manifestCount: 0,
      issues: [],
    }
  }

  const claimedEvidence = new Set<StyleEvidenceLabel>()
  const artifacts: StyleProofArtifact[] = []
  const artifactFingerprints = new Set<string>()

  for (const manifest of matchingManifests) {
    if (manifest.artifactFingerprint) {
      artifactFingerprints.add(manifest.artifactFingerprint)
    }

    for (const evidence of manifest.claimedEvidence) {
      claimedEvidence.add(evidence)
    }

    artifacts.push(...manifest.artifacts)
    for (const artifact of manifest.artifacts) {
      if (artifact.artifactFingerprint) {
        artifactFingerprints.add(artifact.artifactFingerprint)
      }
    }
  }

  const sortedArtifactFingerprints = Array.from(artifactFingerprints).sort()
  const issues: QualityIssue[] = []
  if (sortedArtifactFingerprints.length > 1) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-pack-fingerprint-mismatch',
      message: `Style proof manifests for ${choice.id} reference multiple artifact fingerprints.`,
      suggestion: 'Do not merge proof artifacts from different exported artifacts; collect one manifest set per exact artifact fingerprint.',
      location: choice.id,
    })
  }

  return {
    manifest: {
      platform,
      choiceId: choice.id,
      scope: 'style-choice',
      ...(sortedArtifactFingerprints.length === 1 ? { artifactFingerprint: sortedArtifactFingerprints[0] } : {}),
      claimedEvidence: Array.from(claimedEvidence).sort((left, right) => {
        if (EVIDENCE_RANK[left] !== EVIDENCE_RANK[right]) return EVIDENCE_RANK[left] - EVIDENCE_RANK[right]
        return left.localeCompare(right)
      }),
      artifacts,
    },
    manifestCount: matchingManifests.length,
    issues,
  }
}

function mergeStyleProofManifestReportIssues(
  report: StyleProofManifestReport,
  issues: readonly QualityIssue[],
): StyleProofManifestReport {
  if (issues.length === 0) return report

  const mergedIssues = dedupeStyleProofIssues([...report.issues, ...issues])

  return {
    ...report,
    valid: mergedIssues.length === 0,
    issues: mergedIssues,
    summary: {
      ...report.summary,
      issueCount: mergedIssues.length,
    },
  }
}

function buildStyleProofGateProgress(
  gate: StyleProofCollectionGate,
  sources: readonly StyleProofProgressSource[],
): StyleProofGateProgress | null {
  const requirementIds = new Set<StyleProofRequirementId>()
  const choiceIds = new Set<string>()
  const blockedChoiceIds = new Set<string>()
  const issueKeys = new Set<string>()

  let required = 0
  let satisfied = 0
  let missing = 0
  let invalid = 0
  let artifactCount = 0
  let acceptedArtifactCount = 0
  let sensitiveArtifactCount = 0
  let unsafeCommitArtifactCount = 0

  for (const source of sources) {
    const sourceRequirementIds = new Set<StyleProofRequirementId>()

    for (const requirement of source.report.requirements) {
      const requirementId = requirement.requirement.id
      if (STYLE_PROOF_COLLECTION_GATE_BY_REQUIREMENT[requirementId] !== gate) continue

      sourceRequirementIds.add(requirementId)
      requirementIds.add(requirementId)
      choiceIds.add(source.choice.id)
      if (source.blockedByCatalog) blockedChoiceIds.add(source.choice.id)

      required += 1
      if (requirement.status === 'satisfied') satisfied += 1
      if (requirement.status === 'missing') missing += 1
      if (requirement.status === 'invalid') invalid += 1

      for (const issue of requirement.issues) {
        issueKeys.add(`${issue.id}|${String(issue.location ?? '')}|${issue.message}`)
      }
    }

    if (sourceRequirementIds.size === 0) continue

    for (const artifact of source.report.artifacts) {
      if (!sourceRequirementIds.has(artifact.artifact.requirementId)) continue

      artifactCount += 1
      if (artifact.status === 'accepted') acceptedArtifactCount += 1
      if (artifact.sensitive) sensitiveArtifactCount += 1
      if (artifact.unsafeForCommit) unsafeCommitArtifactCount += 1

      for (const issue of artifact.issues) {
        issueKeys.add(`${issue.id}|${String(issue.location ?? '')}|${issue.message}`)
      }
    }
  }

  if (required === 0) return null

  return {
    gate,
    order: STYLE_PROOF_COLLECTION_ORDER[gate],
    note: STYLE_PROOF_COLLECTION_NOTES[gate],
    status: getStyleProofProgressStatus({
      missing,
      invalid,
      forcedInvalid: blockedChoiceIds.size > 0,
    }),
    requirementIds: Array.from(requirementIds).sort(),
    choiceIds: Array.from(choiceIds).sort(),
    required,
    satisfied,
    missing,
    invalid,
    artifactCount,
    acceptedArtifactCount,
    sensitiveArtifactCount,
    unsafeCommitArtifactCount,
    issueCount: issueKeys.size,
    blockedChoiceCount: blockedChoiceIds.size,
    mutatingRequirements: doesStyleProofGateMutatePlatform(gate) ? required : 0,
    externalAccountRequirements: doesStyleProofGateRequireExternalAccount(gate) ? required : 0,
    phoneRequirements: doesStyleProofGateRequirePhone(gate) ? required : 0,
    safeToAutomateRequirements: isStyleProofGateSafeToAutomate(gate) ? required : 0,
  }
}

export function getPlatformStyleProofProgressReport(
  platform: Platform,
  manifests: readonly StyleProofManifest[] = [],
): PlatformStyleProofProgressReport {
  const choices = getPlatformStyleChoices(platform)
  const choiceIds = new Set(choices.map(choice => choice.id))
  const usableManifests = manifests.filter(manifest =>
    manifest.platform === platform
    && typeof manifest.choiceId === 'string'
    && choiceIds.has(manifest.choiceId)
  )
  const progressChoices = choices.map(choice => {
    const {
      manifest,
      manifestCount,
      issues,
    } = buildMergedStyleChoiceProofManifest(platform, choice, usableManifests)
    const baseReport = getStyleProofManifestReport(manifest)
    const report = mergeStyleProofManifestReportIssues(baseReport, issues)
    const blockedByCatalog = choice.status !== 'available'
    const source: StyleProofProgressSource = {
      choice,
      report,
      blockedByCatalog,
    }
    const gates = STYLE_PROOF_COLLECTION_GATE_SEQUENCE
      .map(gate => buildStyleProofGateProgress(gate, [source]))
      .filter((gateProgress): gateProgress is StyleProofGateProgress => gateProgress !== null)
    const status = getStyleProofProgressStatus({
      ...report.summary,
      forcedInvalid: blockedByCatalog || issues.length > 0,
    })

    return {
      choice,
      manifest,
      manifestCount,
      report,
      blockedByCatalog,
      status,
      gates,
      summary: {
        required: report.summary.required,
        satisfied: report.summary.satisfied,
        missing: report.summary.missing,
        invalid: report.summary.invalid,
        artifactCount: report.summary.artifactCount,
        acceptedArtifactCount: report.summary.acceptedArtifactCount,
        sensitiveArtifactCount: report.summary.sensitiveArtifactCount,
        unsafeCommitArtifactCount: report.summary.unsafeCommitArtifactCount,
        issueCount: report.summary.issueCount,
      },
    }
  })

  const sources = progressChoices.map(progress => ({
    choice: progress.choice,
    report: progress.report,
    blockedByCatalog: progress.blockedByCatalog,
  }))
  const gates = STYLE_PROOF_COLLECTION_GATE_SEQUENCE
    .map(gate => buildStyleProofGateProgress(gate, sources))
    .filter((gateProgress): gateProgress is StyleProofGateProgress => gateProgress !== null)
  const nextGate = gates.find(gate => gate.missing > 0 || gate.invalid > 0)?.gate ?? null
  const nextSafeGate = gates.find(gate =>
    gate.safeToAutomateRequirements > 0 && (gate.missing > 0 || gate.invalid > 0)
  )?.gate ?? null

  return {
    platform,
    choices: progressChoices,
    gates,
    nextGate,
    nextSafeGate,
    ignoredManifestCount: manifests.length - usableManifests.length,
    summary: {
      totalChoices: progressChoices.length,
      choicesWithManifest: progressChoices.filter(choice => choice.manifestCount > 0).length,
      proofSatisfiedChoices: progressChoices.filter(choice => choice.status === 'satisfied').length,
      proofMissingChoices: progressChoices.filter(choice => choice.status === 'missing').length,
      proofInvalidChoices: progressChoices.filter(choice => choice.status === 'invalid').length,
      blockedChoices: progressChoices.filter(choice => choice.blockedByCatalog).length,
      required: progressChoices.reduce((total, choice) => total + choice.summary.required, 0),
      satisfied: progressChoices.reduce((total, choice) => total + choice.summary.satisfied, 0),
      missing: progressChoices.reduce((total, choice) => total + choice.summary.missing, 0),
      invalid: progressChoices.reduce((total, choice) => total + choice.summary.invalid, 0),
      artifactCount: progressChoices.reduce((total, choice) => total + choice.summary.artifactCount, 0),
      acceptedArtifactCount: progressChoices.reduce((total, choice) =>
        total + choice.summary.acceptedArtifactCount, 0),
      sensitiveArtifactCount: progressChoices.reduce((total, choice) =>
        total + choice.summary.sensitiveArtifactCount, 0),
      unsafeCommitArtifactCount: progressChoices.reduce((total, choice) =>
        total + choice.summary.unsafeCommitArtifactCount, 0),
      issueCount: progressChoices.reduce((total, choice) => total + choice.summary.issueCount, 0),
      totalGates: gates.length,
      mutatingRequirements: gates.reduce((total, gate) => total + gate.mutatingRequirements, 0),
      externalAccountRequirements: gates.reduce((total, gate) => total + gate.externalAccountRequirements, 0),
      phoneRequirements: gates.reduce((total, gate) => total + gate.phoneRequirements, 0),
      safeToAutomateRequirements: gates.reduce((total, gate) => total + gate.safeToAutomateRequirements, 0),
    },
  }
}

function buildStyleProofManifestPackIssues(manifests: readonly StyleProofManifest[]): {
  issues: QualityIssue[]
  duplicateArtifactIds: string[]
} {
  const issues: QualityIssue[] = []
  const artifactCounts = new Map<string, number>()
  const fingerprintsByChoice = new Map<string, Set<string>>()

  for (const manifest of manifests) {
    const choice = manifest.choiceId ? getStyleChoiceById(manifest.choiceId) : undefined
    const fingerprintChoiceKey = manifest.choiceId
      ? `${manifest.platform}|${manifest.choiceId}`
      : null

    if (manifest.choiceId && !choice) {
      addStyleProofIssue(issues, {
        id: 'style-proof-manifest-pack-choice-unknown',
        message: `Style proof manifest pack references unknown style choice: ${manifest.choiceId}.`,
        suggestion: 'Use a choice id from getStyleChoiceCatalog() before feeding manifests into a platform progress report.',
        location: manifest.choiceId,
      })
    }

    if (choice && choice.platform !== manifest.platform) {
      addStyleProofIssue(issues, {
        id: 'style-proof-manifest-pack-platform-mismatch',
        message: `Style proof manifest pack binds ${manifest.choiceId} to ${manifest.platform}, but the catalog choice belongs to ${choice.platform}.`,
        suggestion: 'Keep every manifest bound to the platform where the style choice and evidence were collected.',
        location: manifest.choiceId,
      })
    }

    if (fingerprintChoiceKey && manifest.artifactFingerprint) {
      const fingerprints = fingerprintsByChoice.get(fingerprintChoiceKey) ?? new Set<string>()
      fingerprints.add(manifest.artifactFingerprint)
      fingerprintsByChoice.set(fingerprintChoiceKey, fingerprints)
    }

    for (const artifact of manifest.artifacts) {
      artifactCounts.set(artifact.id, (artifactCounts.get(artifact.id) ?? 0) + 1)

      if (fingerprintChoiceKey && artifact.artifactFingerprint) {
        const fingerprints = fingerprintsByChoice.get(fingerprintChoiceKey) ?? new Set<string>()
        fingerprints.add(artifact.artifactFingerprint)
        fingerprintsByChoice.set(fingerprintChoiceKey, fingerprints)
      }
    }
  }

  const duplicateArtifactIds = Array.from(artifactCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([artifactId]) => artifactId)
    .sort()

  for (const artifactId of duplicateArtifactIds) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-pack-artifact-id-duplicate',
      message: `Style proof manifest pack reuses artifact id ${artifactId}.`,
      suggestion: 'Use stable, unique artifact ids so gate progress and hygiene reports can point to one proof record unambiguously.',
      location: artifactId,
    })
  }

  for (const [choiceKey, fingerprints] of fingerprintsByChoice.entries()) {
    if (fingerprints.size <= 1) continue

    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-pack-fingerprint-mismatch',
      message: `Style proof manifest pack references multiple artifact fingerprints for ${choiceKey}.`,
      suggestion: 'Keep each proof pack grouped by exact exported artifact fingerprint before reporting gate progress.',
      location: choiceKey,
    })
  }

  return {
    issues: dedupeStyleProofIssues(issues),
    duplicateArtifactIds,
  }
}

export function getStyleProofManifestPackReport(
  manifests: readonly StyleProofManifest[],
): StyleProofManifestPackReport {
  const platformReports: Record<Platform, PlatformStyleProofProgressReport> = {
    wechat: getPlatformStyleProofProgressReport('wechat', manifests),
    xiaohongshu: getPlatformStyleProofProgressReport('xiaohongshu', manifests),
    zhihu: getPlatformStyleProofProgressReport('zhihu', manifests),
  }
  const { issues: packIssues, duplicateArtifactIds } = buildStyleProofManifestPackIssues(manifests)
  const manifestSummaries = manifests.map((manifest, index) => {
    const manifestIssues = validateStyleProofManifest(manifest)
    const choice = manifest.choiceId ? getStyleChoiceById(manifest.choiceId) : undefined
    const usableForProgress = Boolean(choice && choice.platform === manifest.platform)

    return {
      index,
      platform: manifest.platform,
      ...(manifest.choiceId ? { choiceId: manifest.choiceId } : {}),
      artifactCount: manifest.artifacts.length,
      valid: manifestIssues.length === 0,
      usableForProgress,
      issueCount: manifestIssues.length,
    }
  })
  const manifestIssues = manifests.flatMap(manifest => validateStyleProofManifest(manifest))
  const issues = dedupeStyleProofIssues([...manifestIssues, ...packIssues])

  return {
    manifests: manifestSummaries,
    platformReports,
    issues,
    duplicateArtifactIds,
    summary: {
      manifestCount: manifests.length,
      validManifestCount: manifestSummaries.filter(manifest => manifest.valid).length,
      invalidManifestCount: manifestSummaries.filter(manifest => !manifest.valid).length,
      usableManifestCount: manifestSummaries.filter(manifest => manifest.usableForProgress).length,
      unboundManifestCount: manifestSummaries.filter(manifest => !manifest.choiceId).length,
      artifactCount: manifests.reduce((total, manifest) => total + manifest.artifacts.length, 0),
      duplicateArtifactIdCount: duplicateArtifactIds.length,
      issueCount: issues.length,
    },
  }
}

function getStyleProofAcceptanceAuditStatus(
  gate: StyleProofCollectionGate,
  progress: StyleProofProgressStatus,
): StyleProofAcceptanceAuditStatus {
  if (progress === 'satisfied') return 'completed'
  if (doesStyleProofGateMutatePlatform(gate)) return 'unsafe-to-automate'
  if (
    doesStyleProofGateRequirePhone(gate)
    || doesStyleProofGateRequireExternalAccount(gate)
    || gate === 'public-host'
  ) {
    return 'blocked-by-external'
  }
  if (progress === 'invalid') return 'invalid'
  return 'missing'
}

const STYLE_PROOF_ACCEPTANCE_INVALID_ISSUE_IDS = new Set<StyleProofManifestIssueId>([
  'style-proof-manifest-external-account-login-blocked',
  'style-proof-manifest-external-account-auth-missing',
  'style-proof-manifest-phone-preview-blocked',
  'style-proof-manifest-phone-content-missing',
  'style-proof-manifest-dark-mode-not-verified',
  'style-proof-manifest-cover-thumbnail-not-accepted',
  'style-proof-manifest-scheduled-send-not-verified',
  'style-proof-manifest-disposable-draft-missing',
  'style-proof-manifest-cleanup-path-missing',
  'style-proof-manifest-save-draft-no-card',
  'style-proof-manifest-ordinary-paste-not-verified',
  'style-proof-manifest-paste-editor-tab-not-verified',
  'style-proof-manifest-paste-input-not-verified',
  'style-proof-manifest-editor-body-not-mutated',
  'style-proof-manifest-paste-mojibake-not-ruled-out',
  'style-proof-manifest-paste-proof-not-bound',
  'style-proof-manifest-exact-artifact-missing',
  'style-proof-manifest-collected-at-missing',
  'style-proof-manifest-collected-at-invalid',
  'style-proof-manifest-proof-stale',
  'style-proof-manifest-market-editor-not-applied',
  'style-proof-manifest-market-editor-placeholder-only',
  'style-proof-manifest-proof-not-bound',
  'style-proof-manifest-contract-action-channel-mismatch',
  'style-proof-manifest-artifact-ref-missing',
  'style-proof-manifest-safe-commit-not-verified',
  'style-proof-manifest-sensitive-artifact',
  'style-proof-manifest-forbidden-field-present',
  'style-proof-manifest-unsafe-commit-artifact',
] satisfies readonly StyleProofManifestIssueId[])

const STYLE_PROOF_ACCEPTANCE_REQUIREMENT_INVALID_ISSUE_IDS: Partial<
  Record<StyleProofRequirementId, readonly StyleProofManifestIssueId[]>
> = {
  'market-applied-dom-readback': [
    'style-proof-manifest-market-editor-placeholder-only',
  ],
  'pc-editor-dom-readback': [
    'style-proof-manifest-editor-mojibake-not-ruled-out',
  ],
  'pc-editor-paste-event': [
    'style-proof-manifest-authenticated-session-not-verified',
    'style-proof-manifest-platform-editor-target-not-verified',
    'style-proof-manifest-platform-editor-surface-not-verified',
    'style-proof-manifest-platform-editor-dom-not-verified',
  ],
}

function hasStyleProofAcceptanceInvalidIssue(
  requirementId: StyleProofRequirementId,
  gate: StyleProofCollectionGate,
  issueIds: ReadonlySet<StyleProofManifestIssueId>,
): boolean {
  for (const issueId of issueIds) {
    if (STYLE_PROOF_ACCEPTANCE_INVALID_ISSUE_IDS.has(issueId)) return true
  }
  for (const issueId of STYLE_PROOF_ACCEPTANCE_REQUIREMENT_INVALID_ISSUE_IDS[requirementId] ?? []) {
    if (issueIds.has(issueId)) return true
  }
  if (
    gate !== 'authenticated-pc-editor'
    && issueIds.has('style-proof-manifest-readback-missing')
  ) {
    return true
  }
  return false
}

function toStyleProofAcceptanceNextAction(
  audit: StyleProofAcceptanceGateAudit,
): StyleProofAcceptanceNextAction {
  return {
    gate: audit.gate,
    status: audit.status,
    requirementIds: audit.requirementIds,
    choiceIds: audit.choiceIds,
    note: audit.note,
  }
}

function buildStyleProofAcceptanceGateAudit(
  gate: StyleProofGateProgress,
): StyleProofAcceptanceGateAudit {
  const status: StyleProofAcceptanceAuditStatus = gate.invalid > 0
    ? 'invalid'
    : getStyleProofAcceptanceAuditStatus(gate.gate, gate.status)

  return {
    gate: gate.gate,
    order: gate.order,
    note: gate.note,
    status,
    requirementIds: gate.requirementIds,
    choiceIds: gate.choiceIds,
    required: gate.required,
    satisfied: gate.satisfied,
    missing: gate.missing,
    invalid: gate.invalid,
    artifactCount: gate.artifactCount,
    acceptedArtifactCount: gate.acceptedArtifactCount,
    sensitiveArtifactCount: gate.sensitiveArtifactCount,
    unsafeCommitArtifactCount: gate.unsafeCommitArtifactCount,
    issueCount: gate.issueCount,
    blockedChoiceCount: gate.blockedChoiceCount,
    mutatingRequirements: gate.mutatingRequirements,
    externalAccountRequirements: gate.externalAccountRequirements,
    phoneRequirements: gate.phoneRequirements,
    safeToAutomateRequirements: gate.safeToAutomateRequirements,
    cannotClaim: status !== 'completed',
  }
}

interface StyleProofRequirementAcceptanceAccumulator {
  requirement: StyleProofRequirement
  gate: StyleProofCollectionGate
  choiceIds: Set<string>
  blockedChoiceIds: Set<string>
  issueKeys: Set<string>
  issueIds: Set<StyleProofManifestIssueId>
  required: number
  satisfied: number
  missing: number
  invalid: number
  artifactCount: number
  acceptedArtifactCount: number
  sensitiveArtifactCount: number
  unsafeCommitArtifactCount: number
}

function getStyleProofIssueKey(issue: QualityIssue): string {
  return `${issue.id}\u0000${issue.location ?? ''}\u0000${issue.message}`
}

function addStyleProofManifestIssueId(
  accumulator: StyleProofRequirementAcceptanceAccumulator,
  issueId: string,
): void {
  if (isStyleProofManifestIssueId(issueId)) {
    accumulator.issueIds.add(issueId)
  }
}

function getOrCreateStyleProofRequirementAcceptanceAccumulator(
  accumulators: Map<StyleProofRequirementId, StyleProofRequirementAcceptanceAccumulator>,
  requirement: StyleProofRequirement,
): StyleProofRequirementAcceptanceAccumulator {
  const existing = accumulators.get(requirement.id)
  if (existing) return existing

  const gate = STYLE_PROOF_COLLECTION_GATE_BY_REQUIREMENT[requirement.id]
  const accumulator: StyleProofRequirementAcceptanceAccumulator = {
    requirement,
    gate,
    choiceIds: new Set<string>(),
    blockedChoiceIds: new Set<string>(),
    issueKeys: new Set<string>(),
    issueIds: new Set<StyleProofManifestIssueId>(),
    required: 0,
    satisfied: 0,
    missing: 0,
    invalid: 0,
    artifactCount: 0,
    acceptedArtifactCount: 0,
    sensitiveArtifactCount: 0,
    unsafeCommitArtifactCount: 0,
  }
  accumulators.set(requirement.id, accumulator)
  return accumulator
}

function buildStyleProofAcceptanceRequirementAudits(
  progress: PlatformStyleProofProgressReport,
): StyleProofAcceptanceRequirementAudit[] {
  const accumulators = new Map<StyleProofRequirementId, StyleProofRequirementAcceptanceAccumulator>()

  for (const choiceProgress of progress.choices) {
    for (const requirementReport of choiceProgress.report.requirements) {
      const accumulator = getOrCreateStyleProofRequirementAcceptanceAccumulator(
        accumulators,
        requirementReport.requirement,
      )
      accumulator.choiceIds.add(choiceProgress.choice.id)
      if (choiceProgress.blockedByCatalog) {
        accumulator.blockedChoiceIds.add(choiceProgress.choice.id)
      }
      accumulator.required += 1
      if (requirementReport.status === 'satisfied') accumulator.satisfied += 1
      if (requirementReport.status === 'missing') accumulator.missing += 1
      if (requirementReport.status === 'invalid') accumulator.invalid += 1

      for (const issue of requirementReport.issues) {
        accumulator.issueKeys.add(getStyleProofIssueKey(issue))
        addStyleProofManifestIssueId(accumulator, issue.id)
      }

      for (const artifactReport of choiceProgress.report.artifacts) {
        if (artifactReport.artifact.requirementId !== requirementReport.requirement.id) continue

        accumulator.artifactCount += 1
        if (artifactReport.status === 'accepted') accumulator.acceptedArtifactCount += 1
        if (artifactReport.sensitive) accumulator.sensitiveArtifactCount += 1
        if (artifactReport.unsafeForCommit) accumulator.unsafeCommitArtifactCount += 1

        for (const issue of artifactReport.issues) {
          accumulator.issueKeys.add(getStyleProofIssueKey(issue))
          addStyleProofManifestIssueId(accumulator, issue.id)
        }
      }
    }
  }

  return Array.from(accumulators.values())
    .map(accumulator => {
      const progressStatus = getStyleProofProgressStatus({
        missing: accumulator.missing,
        invalid: accumulator.invalid,
        forcedInvalid: accumulator.blockedChoiceIds.size > 0,
      })
      const status = hasStyleProofAcceptanceInvalidIssue(
        accumulator.requirement.id,
        accumulator.gate,
        accumulator.issueIds,
      )
        ? 'invalid'
        : getStyleProofAcceptanceAuditStatus(accumulator.gate, progressStatus)

      return {
        requirement: accumulator.requirement,
        gate: accumulator.gate,
        order: STYLE_PROOF_COLLECTION_ORDER[accumulator.gate],
        note: STYLE_PROOF_COLLECTION_NOTES[accumulator.gate],
        status,
        choiceIds: Array.from(accumulator.choiceIds).sort(),
        required: accumulator.required,
        satisfied: accumulator.satisfied,
        missing: accumulator.missing,
        invalid: accumulator.invalid,
        artifactCount: accumulator.artifactCount,
        acceptedArtifactCount: accumulator.acceptedArtifactCount,
        sensitiveArtifactCount: accumulator.sensitiveArtifactCount,
        unsafeCommitArtifactCount: accumulator.unsafeCommitArtifactCount,
        issueCount: accumulator.issueKeys.size,
        issueIds: Array.from(accumulator.issueIds).sort(),
        blockedChoiceCount: accumulator.blockedChoiceIds.size,
        mutatesPlatform: doesStyleProofGateMutatePlatform(accumulator.gate),
        requiresExternalAccount: doesStyleProofGateRequireExternalAccount(accumulator.gate),
        requiresPhone: doesStyleProofGateRequirePhone(accumulator.gate),
        safeToAutomate: isStyleProofGateSafeToAutomate(accumulator.gate),
        cannotClaim: status !== 'completed',
      }
    })
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order
      return left.requirement.id.localeCompare(right.requirement.id)
    })
}

function countStyleProofAcceptanceStatus(
  items: readonly { status: StyleProofAcceptanceAuditStatus }[],
  status: StyleProofAcceptanceAuditStatus,
): number {
  return items.filter(item => item.status === status).length
}

export function getPlatformStyleProofAcceptanceAuditReport(
  platform: Platform,
  manifests: readonly StyleProofManifest[] = [],
): PlatformStyleProofAcceptanceAuditReport {
  const progress = getPlatformStyleProofProgressReport(platform, manifests)
  const gates = progress.gates.map(buildStyleProofAcceptanceGateAudit)
  const requirements = buildStyleProofAcceptanceRequirementAudits(progress)
  const cannotClaim = requirements.filter(requirement => requirement.cannotClaim)
  const openRequirements = requirements.filter(requirement => requirement.status !== 'completed')
  const nextLocalSafeGate = gates
    .find(gate => gate.status !== 'completed' && gate.safeToAutomateRequirements > 0)
  const nextExternalAccountGate = gates
    .find(gate =>
      gate.status !== 'completed'
      && (gate.externalAccountRequirements > 0 || gate.gate === 'public-host')
    )
  const nextPhoneGate = gates
    .find(gate => gate.status !== 'completed' && gate.phoneRequirements > 0)
  const nextUnsafeToAutomateGate = gates
    .find(gate => gate.status === 'unsafe-to-automate')

  return {
    platform,
    progress,
    gates,
    requirements,
    cannotClaim,
    nextLocalSafeAction: nextLocalSafeGate ? toStyleProofAcceptanceNextAction(nextLocalSafeGate) : null,
    nextExternalAccountAction: nextExternalAccountGate
      ? toStyleProofAcceptanceNextAction(nextExternalAccountGate)
      : null,
    nextPhoneAction: nextPhoneGate ? toStyleProofAcceptanceNextAction(nextPhoneGate) : null,
    nextUnsafeToAutomateAction: nextUnsafeToAutomateGate
      ? toStyleProofAcceptanceNextAction(nextUnsafeToAutomateGate)
      : null,
    summary: {
      totalGates: gates.length,
      completedGates: countStyleProofAcceptanceStatus(gates, 'completed'),
      missingGates: countStyleProofAcceptanceStatus(gates, 'missing'),
      invalidGates: countStyleProofAcceptanceStatus(gates, 'invalid'),
      blockedByExternalGates: countStyleProofAcceptanceStatus(gates, 'blocked-by-external'),
      unsafeToAutomateGates: countStyleProofAcceptanceStatus(gates, 'unsafe-to-automate'),
      totalRequirements: requirements.length,
      completedRequirements: countStyleProofAcceptanceStatus(requirements, 'completed'),
      missingRequirements: countStyleProofAcceptanceStatus(requirements, 'missing'),
      invalidRequirements: countStyleProofAcceptanceStatus(requirements, 'invalid'),
      blockedByExternalRequirements: countStyleProofAcceptanceStatus(requirements, 'blocked-by-external'),
      unsafeToAutomateRequirements: countStyleProofAcceptanceStatus(requirements, 'unsafe-to-automate'),
      cannotClaimRequirements: cannotClaim.length,
      safeToAutomateOpenRequirements: openRequirements.filter(requirement => requirement.safeToAutomate).length,
      externalAccountOpenRequirements: openRequirements.filter(requirement => requirement.requiresExternalAccount).length,
      phoneOpenRequirements: openRequirements.filter(requirement => requirement.requiresPhone).length,
      mutatingOpenRequirements: openRequirements.filter(requirement => requirement.mutatesPlatform).length,
    },
  }
}

export function getStyleProofAcceptanceAuditReport(
  manifests: readonly StyleProofManifest[] = [],
): StyleProofAcceptanceAuditReport {
  const packReport = getStyleProofManifestPackReport(manifests)
  const platformReports: Record<Platform, PlatformStyleProofAcceptanceAuditReport> = {
    wechat: getPlatformStyleProofAcceptanceAuditReport('wechat', manifests),
    xiaohongshu: getPlatformStyleProofAcceptanceAuditReport('xiaohongshu', manifests),
    zhihu: getPlatformStyleProofAcceptanceAuditReport('zhihu', manifests),
  }
  const platformReportValues = Object.values(platformReports)

  return {
    manifests: packReport.manifests,
    platformReports,
    issues: packReport.issues,
    duplicateArtifactIds: packReport.duplicateArtifactIds,
    summary: {
      manifestCount: packReport.summary.manifestCount,
      validManifestCount: packReport.summary.validManifestCount,
      invalidManifestCount: packReport.summary.invalidManifestCount,
      usableManifestCount: packReport.summary.usableManifestCount,
      duplicateArtifactIdCount: packReport.summary.duplicateArtifactIdCount,
      issueCount: packReport.summary.issueCount,
      completedGates: platformReportValues.reduce((total, report) => total + report.summary.completedGates, 0),
      openGates: platformReportValues.reduce((total, report) =>
        total + report.summary.totalGates - report.summary.completedGates, 0),
      completedRequirements: platformReportValues.reduce((total, report) =>
        total + report.summary.completedRequirements, 0),
      cannotClaimRequirements: platformReportValues.reduce((total, report) =>
        total + report.summary.cannotClaimRequirements, 0),
      blockedByExternalRequirements: platformReportValues.reduce((total, report) =>
        total + report.summary.blockedByExternalRequirements, 0),
      unsafeToAutomateRequirements: platformReportValues.reduce((total, report) =>
        total + report.summary.unsafeToAutomateRequirements, 0),
      safeToAutomateOpenRequirements: platformReportValues.reduce((total, report) =>
        total + report.summary.safeToAutomateOpenRequirements, 0),
    },
  }
}

function getStyleProofExecutionBoundary(gate: StyleProofCollectionGate): StyleProofExecutionBoundary {
  if (gate === 'market-editor') return 'market-editor-account'
  if (gate === 'authenticated-pc-editor') return 'authenticated-pc-editor'
  if (gate === 'phone-preview') return 'phone-preview'
  if (gate === 'public-host') return 'public-host'
  if (gate === 'credentialed-channel') return 'credentialed-channel'
  if (gate === 'platform-publish') return 'platform-publish'
  return 'local-only'
}

function isStyleProofExecutionFreshCollectedAtRequired(
  contract: StyleProofExecutionArtifactContract,
): boolean {
  return contract.requiredFields.includes('collectedAt')
}

function getStyleProofExecutionFreshnessMaxDays(
  contract: StyleProofExecutionArtifactContract,
): number | null {
  if (!isStyleProofExecutionFreshCollectedAtRequired(contract)) return null
  return contract.maxFreshnessDays ?? STYLE_PROOF_DEFAULT_MAX_FRESHNESS_DAYS
}

function getStyleProofExecutionFreshnessIssueIds(
  audit: StyleProofAcceptanceRequirementAudit,
): readonly StyleProofManifestIssueId[] {
  return audit.issueIds.filter(issueId => STYLE_PROOF_FRESHNESS_ISSUE_IDS.includes(issueId))
}

function getStyleProofExecutionCannotClaimReason(
  audit: StyleProofAcceptanceRequirementAudit,
): string | null {
  if (audit.status === 'completed') return null
  const freshnessIssueIds = getStyleProofExecutionFreshnessIssueIds(audit)
  if (freshnessIssueIds.includes('style-proof-manifest-collected-at-missing')) {
    return `${audit.requirement.label} cannot be claimed because the matching external proof row lacks collectedAt.`
  }
  if (freshnessIssueIds.includes('style-proof-manifest-collected-at-invalid')) {
    return `${audit.requirement.label} cannot be claimed because collectedAt is unparseable or future-dated.`
  }
  if (freshnessIssueIds.includes('style-proof-manifest-proof-stale')) {
    return `${audit.requirement.label} cannot be claimed because the external proof is older than the accepted freshness window.`
  }
  if (audit.status === 'unsafe-to-automate') {
    return `${audit.requirement.label} cannot be claimed because it requires a mutating credentialed platform action and exact readback.`
  }
  if (audit.status === 'blocked-by-external') {
    if (audit.requiresPhone) {
      return `${audit.requirement.label} cannot be claimed until phone-side preview evidence is collected for the exact artifact.`
    }
    if (audit.gate === 'public-host') {
      return `${audit.requirement.label} cannot be claimed until a public HTTPS or platform-hosted artifact is verified.`
    }
    return `${audit.requirement.label} cannot be claimed until the required external account/editor dependency is verified.`
  }
  if (audit.status === 'invalid') {
    return `${audit.requirement.label} cannot be claimed because supplied proof is invalid for this requirement.`
  }
  return `${audit.requirement.label} cannot be claimed because required proof is missing.`
}

function getStyleProofExecutionRedactionBoundary(gate: StyleProofCollectionGate): string {
  if (gate === 'sensitive-hygiene') {
    return 'Only commit redacted hygiene summaries; never commit cookies, tokens, QR images, account screenshots, HAR files, browser profiles, or local credential paths.'
  }
  if (gate === 'market-editor') {
    return 'Record taxonomy and redacted DOM/control summaries only; do not copy proprietary 135/Xiumi template source, paid assets, account data, or third-party private CDN dependencies.'
  }
  if (gate === 'authenticated-pc-editor' || gate === 'credentialed-channel' || gate === 'platform-publish') {
    return 'Keep account identifiers, draft URLs, request payloads, cookies, QR codes, screenshots with account data, and raw platform responses out of committed evidence.'
  }
  if (gate === 'phone-preview') {
    return 'Keep phone screenshots redacted and local unless they contain no account, QR, draft URL, or personal notification data.'
  }
  return 'Committed evidence must be redacted local artifacts, logs, manifests, or summaries that contain no credentials, account data, QR codes, or local browser profile paths.'
}

const STYLE_PROOF_ARTIFACT_FIELD_CRITERIA: Record<StyleProofArtifactVerificationField, string> = {
  artifactFingerprint: 'artifactFingerprint: non-empty fingerprint for the exact artifact',
  artifactRef: 'artifactRef: redacted committed artifact reference',
  exactArtifact: 'exactArtifact:true for the same exported artifact',
  authenticatedSessionVerified: 'authenticatedSessionVerified:true for the same authenticated editor session',
  externalAccountAuthenticated: 'externalAccountAuthenticated:true for the required platform account',
  externalAccountLoginBlocked: 'externalAccountLoginBlocked:true only when login is the recorded blocker; forbidden on matching credentialed or publish success proof rows',
  platformEditorTargetVerified: 'platformEditorTargetVerified:true for the intended editor route and target',
  platformEditorSurfaceVerified: 'platformEditorSurfaceVerified:true for the intended title/body/editor surface',
  platformEditorDomVerified: 'platformEditorDomVerified:true after the exact editor DOM is read back',
  centralEditorChanged: 'centralEditorChanged:true after the 135/Xiumi center editor or canvas mutates',
  marketAppliedContentVerified: 'marketAppliedContentVerified:true after meaningful non-placeholder applied DOM, controls, slots, metadata, or visible content are read back',
  ordinaryClipboardPasteVerified: 'ordinaryClipboardPasteVerified:true for the ordinary OS Ctrl+V path',
  sameEditorTabVerified: 'sameEditorTabVerified:true for the same browser/editor tab',
  pasteInputEventVerified: 'pasteInputEventVerified:true after paste/input events reach the body editor',
  editorBodyMutationVerified: 'editorBodyMutationVerified:true after the intended body editor mutates',
  mojibakeFreeVerified: 'mojibakeFreeVerified:true after replacement glyph and mojibake damage are ruled out',
  phonePreviewContentVerified: 'phonePreviewContentVerified:true after the exact article body is visible on phone',
  phonePreviewBlocked: 'phonePreviewBlocked:true only when phone preview is the recorded blocker; forbidden on matching phone success proof rows',
  darkModeEnabledVerified: 'darkModeEnabledVerified:true while inspecting the exact mobile article body',
  coverThumbnailAccepted: 'coverThumbnailAccepted:true after the exact cover thumbnail is accepted',
  scheduledSendVerified: 'scheduledSendVerified:true after real scheduled-send state readback',
  disposableDraft: 'disposableDraft:true for a draft that can be safely mutated and removed',
  cleanupPathVerified: 'cleanupPathVerified:true after the cleanup path is proven',
  saveDraftNoCard: 'saveDraftNoCard:true only for blocker evidence where save-draft produced no unique draftbox card',
  artifactManifestValidated: 'artifactManifestValidated:true after the platform artifact manifest validator passes',
  redactionVerified: 'redactionVerified:true after platform-visible account and draft text is excluded from committed evidence',
  collectedAt: `collectedAt: parseable timestamp within ${STYLE_PROOF_DEFAULT_MAX_FRESHNESS_DAYS} days for external proof rows`,
  safeForCommit: 'safeForCommit:true after redaction and repository hygiene review',
  committed: 'committed:true only for tracked proof artifacts',
  sensitive: 'sensitive:true marks an artifact that must not satisfy committed proof',
  hostStatus: 'hostStatus: accepted public or platform-hosted artifact host status',
}

function formatStyleProofArtifactVerificationFields(
  fields: readonly StyleProofArtifactVerificationField[],
): string {
  return fields.map(field => STYLE_PROOF_ARTIFACT_FIELD_CRITERIA[field]).join('; ')
}

function buildStyleProofExecutionSuccessCriteria(
  audit: StyleProofAcceptanceRequirementAudit,
  contract: StyleProofExecutionArtifactContract,
): string[] {
  const manifestValidatorName = getStyleProofArtifactManifestValidatorName(audit.requirement.id)
  const criteria = [
    `Add at least one StyleProofArtifact with requirementId "${audit.requirement.id}".`,
    `Use channel ${contract.requiredChannels.join(' or ')} and action ${contract.requiredActions.join(' or ')}.`,
    `Use readback ${contract.requiredReadbacks.join(' or ')} for the same exact artifact under review.`,
  ]

  if (contract.requiredFields.length > 0) {
    criteria.push(`Set required artifact fields on one matching row: ${formatStyleProofArtifactVerificationFields(contract.requiredFields)}.`)
  }
  const freshnessMaxDays = getStyleProofExecutionFreshnessMaxDays(contract)
  if (freshnessMaxDays !== null) {
    criteria.push(`Capture collectedAt on the same matching proof row at collection time; it must stay parseable, non-future, and within ${freshnessMaxDays} days of validation.`)
  }
  if (contract.forbiddenFields && contract.forbiddenFields.length > 0) {
    criteria.push(`Do not set forbidden artifact fields: ${formatStyleProofArtifactVerificationFields(contract.forbiddenFields)}.`)
  }
  if (contract.acceptedHostStatuses && contract.acceptedHostStatuses.length > 0) {
    criteria.push(`Host status must be ${contract.acceptedHostStatuses.join(' or ')}.`)
  }
  if (manifestValidatorName) {
    criteria.push(`Run ${manifestValidatorName} and set artifactManifestValidated:true only when it returns no issues for the exact redacted manifest.`)
  }
  if (audit.blockedChoiceCount > 0) {
    criteria.push('The catalog choice must be unblocked before this proof can complete acceptance.')
  }

  return criteria
}

function buildStyleProofExecutionFailureSignals(
  audit: StyleProofAcceptanceRequirementAudit,
  contract: StyleProofExecutionArtifactContract,
): string[] {
  const manifestValidatorName = getStyleProofArtifactManifestValidatorName(audit.requirement.id)
  const signals = [
    'Proof is collected from a different platform, style choice, channel, or artifact fingerprint.',
    'Artifact references contain sensitive account, browser profile, token, QR, HAR, or local credential material.',
  ]

  if (contract.requiredFields.length > 0) {
    signals.push(`Any missing, false, or unbound required field invalidates this row: ${formatStyleProofArtifactVerificationFields(contract.requiredFields)}.`)
  }
  const freshnessMaxDays = getStyleProofExecutionFreshnessMaxDays(contract)
  const freshnessIssueIds = getStyleProofExecutionFreshnessIssueIds(audit)
  if (freshnessMaxDays !== null) {
    signals.push(`Missing, timestamp-free, unparseable, future-dated, or older-than-${freshnessMaxDays}-days collectedAt invalidates this external proof row.`)
  }
  if (contract.forbiddenFields && contract.forbiddenFields.length > 0) {
    signals.push(`Any present forbidden field invalidates this row: ${formatStyleProofArtifactVerificationFields(contract.forbiddenFields)}.`)
  }
  if (manifestValidatorName) {
    signals.push(`Any ${manifestValidatorName} issue or missing artifactManifestValidated:true invalidates this artifact-manifest row.`)
  }
  if (audit.issueIds.length > 0) {
    signals.push(`Current validator issue ids: ${audit.issueIds.join(', ')}.`)
  }
  if (freshnessIssueIds.length > 0) {
    signals.push(`Current freshness issue ids: ${freshnessIssueIds.join(', ')}.`)
  }
  if (audit.requiresPhone) {
    signals.push('PC editor DOM, local browser screenshots, scan pages, or setup screens do not prove phone final-article rendering.')
    signals.push('Phone preview scan entries, setup dialogs, PC preview shells, relogin pages, and generic QR screens are blocker evidence until the exact article body is visible on the phone.')
  }
  if (audit.requirement.id === 'dark-mode-check') {
    signals.push('A Dark Mode settings page, generic phone screenshot, or PC preview shell does not prove the exact article body was inspected with mobile Dark Mode enabled.')
  }
  if (audit.requirement.id === 'cover-thumbnail-check') {
    signals.push('Cover crop panels, cover-setting screens, or upload dialogs do not prove the exact cover thumbnail was accepted in a phone share, preview entry, or platform list entry.')
  }
  if (audit.requirement.id === 'scheduled-send-readback') {
    signals.push('Credentialed sync responses, editor previews, draft creation, and public preview URLs do not prove the exact artifact entered a real send or scheduled-send state.')
  }
  if (audit.requirement.id === 'credentialed-channel-response' || audit.requirement.id === 'sync-readback') {
    signals.push('Credentialed account responses, upload responses, draft ids, or material readbacks for a different artifact cannot prove this exported artifact was synced.')
  }
  if (audit.mutatesPlatform) {
    signals.push('Request success alone is insufficient; the created draft, preview, or published result must be read back.')
  }

  return signals
}

function getStyleProofExecutionNextOperatorAction(
  audit: StyleProofAcceptanceRequirementAudit,
): string {
  if (audit.status === 'completed') return 'No action required for this requirement.'
  const manifestValidatorName = getStyleProofArtifactManifestValidatorName(audit.requirement.id)
  if (manifestValidatorName) {
    return `Run ${manifestValidatorName} for the exact redacted artifact manifest, then attach the validator-passed manifest proof with artifactManifestValidated:true.`
  }
  const contract = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[audit.requirement.id]
  const freshnessMaxDays = getStyleProofExecutionFreshnessMaxDays(contract)
  if (freshnessMaxDays !== null && getStyleProofExecutionFreshnessIssueIds(audit).length > 0) {
    return `Recapture ${audit.requirement.label} for the exact artifact and attach one matching proof row with collectedAt within ${freshnessMaxDays} days; do not reuse stale, future-dated, or timestamp-free external proof.`
  }
  if (audit.safeToAutomate) return STYLE_PROOF_COLLECTION_NOTES[audit.gate]
  if (audit.requiresPhone) return STYLE_PROOF_COLLECTION_NOTES['phone-preview']
  if (audit.gate === 'public-host') return STYLE_PROOF_COLLECTION_NOTES['public-host']
  return STYLE_PROOF_COLLECTION_NOTES[audit.gate]
}

function getStyleProofArtifactManifestValidatorName(
  requirementId: StyleProofRequirementId,
): 'validateXhsImageArtifactManifest()' | 'validateZhihuImageArtifactManifest()' | null {
  if (requirementId === 'xhs-artifact-manifest') return 'validateXhsImageArtifactManifest()'
  if (requirementId === 'zhihu-artifact-manifest') return 'validateZhihuImageArtifactManifest()'
  return null
}

function buildStyleProofExecutionRunbookStep(
  platform: Platform,
  audit: StyleProofAcceptanceRequirementAudit,
): StyleProofExecutionRunbookStep {
  const requiredArtifact = STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS[audit.requirement.id]
  const freshnessMaxDays = getStyleProofExecutionFreshnessMaxDays(requiredArtifact)
  const freshnessIssueIds = getStyleProofExecutionFreshnessIssueIds(audit)

  return {
    platform,
    requirement: audit.requirement,
    gate: audit.gate,
    order: audit.order,
    status: audit.status,
    boundary: getStyleProofExecutionBoundary(audit.gate),
    choiceIds: audit.choiceIds,
    issueIds: audit.issueIds,
    required: audit.required,
    satisfied: audit.satisfied,
    missing: audit.missing,
    invalid: audit.invalid,
    artifactCount: audit.artifactCount,
    acceptedArtifactCount: audit.acceptedArtifactCount,
    blockedChoiceCount: audit.blockedChoiceCount,
    mutatesPlatform: audit.mutatesPlatform,
    requiresExternalAccount: audit.requiresExternalAccount,
    requiresPhone: audit.requiresPhone,
    safeToAutomate: audit.safeToAutomate,
    requiresFreshCollectedAt: freshnessMaxDays !== null,
    freshnessMaxDays,
    freshnessIssueIds,
    cannotClaim: audit.cannotClaim,
    cannotClaimReason: getStyleProofExecutionCannotClaimReason(audit),
    nextOperatorAction: getStyleProofExecutionNextOperatorAction(audit),
    requiredArtifact,
    successCriteria: buildStyleProofExecutionSuccessCriteria(audit, requiredArtifact),
    failureSignals: buildStyleProofExecutionFailureSignals(audit, requiredArtifact),
    redactionBoundary: getStyleProofExecutionRedactionBoundary(audit.gate),
  }
}

function countStyleProofExecutionSteps(
  steps: readonly StyleProofExecutionRunbookStep[],
  predicate: (step: StyleProofExecutionRunbookStep) => boolean,
): number {
  return steps.filter(predicate).length
}

export function getPlatformStyleProofExecutionRunbook(
  platform: Platform,
  manifests: readonly StyleProofManifest[] = [],
): PlatformStyleProofExecutionRunbook {
  const acceptance = getPlatformStyleProofAcceptanceAuditReport(platform, manifests)
  const steps = acceptance.requirements.map(requirement =>
    buildStyleProofExecutionRunbookStep(platform, requirement)
  )
  const openSteps = steps.filter(step => step.status !== 'completed')
  const cannotClaim = steps.filter(step => step.cannotClaim)

  return {
    platform,
    acceptance,
    steps,
    openSteps,
    cannotClaim,
    nextLocalSafeStep: openSteps.find(step => step.safeToAutomate) ?? null,
    nextExternalDependencyStep: openSteps.find(step =>
      step.requiresExternalAccount || step.gate === 'public-host'
    ) ?? null,
    nextPhoneStep: openSteps.find(step => step.requiresPhone) ?? null,
    nextUnsafeToAutomateStep: openSteps.find(step => step.status === 'unsafe-to-automate') ?? null,
    summary: {
      totalSteps: steps.length,
      completedSteps: countStyleProofExecutionSteps(steps, step => step.status === 'completed'),
      openSteps: openSteps.length,
      cannotClaimSteps: cannotClaim.length,
      safeToAutomateOpenSteps: countStyleProofExecutionSteps(openSteps, step => step.safeToAutomate),
      externalDependencyOpenSteps: countStyleProofExecutionSteps(openSteps, step =>
        step.requiresExternalAccount || step.gate === 'public-host'
      ),
      phoneOpenSteps: countStyleProofExecutionSteps(openSteps, step => step.requiresPhone),
      mutatingOpenSteps: countStyleProofExecutionSteps(openSteps, step => step.mutatesPlatform),
      unsafeToAutomateOpenSteps: countStyleProofExecutionSteps(openSteps, step =>
        step.status === 'unsafe-to-automate'
      ),
    },
  }
}

export function getStyleProofExecutionRunbook(
  manifests: readonly StyleProofManifest[] = [],
): StyleProofExecutionRunbook {
  const packReport = getStyleProofManifestPackReport(manifests)
  const platformReports: Record<Platform, PlatformStyleProofExecutionRunbook> = {
    wechat: getPlatformStyleProofExecutionRunbook('wechat', manifests),
    xiaohongshu: getPlatformStyleProofExecutionRunbook('xiaohongshu', manifests),
    zhihu: getPlatformStyleProofExecutionRunbook('zhihu', manifests),
  }
  const platformReportValues = Object.values(platformReports)

  return {
    platformReports,
    issues: packReport.issues,
    duplicateArtifactIds: packReport.duplicateArtifactIds,
    summary: {
      manifestCount: packReport.summary.manifestCount,
      validManifestCount: packReport.summary.validManifestCount,
      invalidManifestCount: packReport.summary.invalidManifestCount,
      usableManifestCount: packReport.summary.usableManifestCount,
      duplicateArtifactIdCount: packReport.summary.duplicateArtifactIdCount,
      issueCount: packReport.summary.issueCount,
      totalSteps: platformReportValues.reduce((total, report) => total + report.summary.totalSteps, 0),
      completedSteps: platformReportValues.reduce((total, report) => total + report.summary.completedSteps, 0),
      openSteps: platformReportValues.reduce((total, report) => total + report.summary.openSteps, 0),
      cannotClaimSteps: platformReportValues.reduce((total, report) => total + report.summary.cannotClaimSteps, 0),
      safeToAutomateOpenSteps: platformReportValues.reduce((total, report) =>
        total + report.summary.safeToAutomateOpenSteps, 0),
      externalDependencyOpenSteps: platformReportValues.reduce((total, report) =>
        total + report.summary.externalDependencyOpenSteps, 0),
      phoneOpenSteps: platformReportValues.reduce((total, report) => total + report.summary.phoneOpenSteps, 0),
      mutatingOpenSteps: platformReportValues.reduce((total, report) => total + report.summary.mutatingOpenSteps, 0),
      unsafeToAutomateOpenSteps: platformReportValues.reduce((total, report) =>
        total + report.summary.unsafeToAutomateOpenSteps, 0),
    },
  }
}

const STYLE_PROOF_MANIFEST_INTAKE_MANIFEST_FIELDS = new Set<string>([
  'platform',
  'claimedEvidence',
  'scope',
  'choiceId',
  'artifactFingerprint',
  'artifacts',
])

const STYLE_PROOF_MANIFEST_INTAKE_ARTIFACT_FIELDS = new Set<string>([
  'id',
  'requirementId',
  'kind',
  'label',
  'evidenceLabel',
  'platform',
  'choiceId',
  'channel',
  'action',
  'readback',
  'artifactFingerprint',
  'artifactRef',
  'exactArtifact',
  'authenticatedSessionVerified',
  'externalAccountAuthenticated',
  'externalAccountLoginBlocked',
  'platformEditorTargetVerified',
  'platformEditorSurfaceVerified',
  'platformEditorDomVerified',
  'centralEditorChanged',
  'marketAppliedContentVerified',
  'ordinaryClipboardPasteVerified',
  'sameEditorTabVerified',
  'pasteInputEventVerified',
  'editorBodyMutationVerified',
  'mojibakeFreeVerified',
  'phonePreviewContentVerified',
  'phonePreviewBlocked',
  'darkModeEnabledVerified',
  'coverThumbnailAccepted',
  'scheduledSendVerified',
  'disposableDraft',
  'cleanupPathVerified',
  'createRouteActionMetadataMissing',
  'cleanupTargetAmbiguous',
  'saveDraftNoCard',
  'artifactManifestValidated',
  'redactionReviewRequired',
  'redactionVerified',
  'collectedAt',
  'safeForCommit',
  'committed',
  'sensitive',
  'hostStatus',
])

const STYLE_PROOF_MANIFEST_INTAKE_TEMPLATE_ARTIFACT_FIELDS = new Set<string>([
  'acceptedHostStatuses',
  'acceptedValues',
  'appendOnlyAfterExternalProof',
  'artifactDraftTemplate',
  'artifactGuidance',
  'artifactTemplate',
  'baseFields',
  'blankFields',
  'canClaimComplete',
  'doNotInclude',
  'draftOnly',
  'failureSignals',
  'fillOnlyAfterExternalProof',
  'forbiddenFields',
  'forbiddenVerificationFields',
  'format',
  'intakeCommand',
  'keepArtifactsEmptyUntilCollected',
  'keepOutOfManifestUntilCollected',
  'manifestDraftTemplate',
  'manifestDraftsCommand',
  'maxFreshnessDays',
  'mergeCommand',
  'notProof',
  'operatorWorksheet',
  'redactionBoundary',
  'requiredActions',
  'requiredChannels',
  'requiredFields',
  'requiredReadbacks',
  'requiredVerificationFields',
  'sourceRowIds',
  'sourceRows',
  'successCriteria',
  'templateCommand',
  'templateOnly',
])

type StyleProofArtifactBooleanField =
  | 'exactArtifact'
  | 'authenticatedSessionVerified'
  | 'externalAccountAuthenticated'
  | 'externalAccountLoginBlocked'
  | 'platformEditorTargetVerified'
  | 'platformEditorSurfaceVerified'
  | 'platformEditorDomVerified'
  | 'centralEditorChanged'
  | 'marketAppliedContentVerified'
  | 'ordinaryClipboardPasteVerified'
  | 'sameEditorTabVerified'
  | 'pasteInputEventVerified'
  | 'editorBodyMutationVerified'
  | 'mojibakeFreeVerified'
  | 'phonePreviewContentVerified'
  | 'phonePreviewBlocked'
  | 'darkModeEnabledVerified'
  | 'coverThumbnailAccepted'
  | 'scheduledSendVerified'
  | 'disposableDraft'
  | 'cleanupPathVerified'
  | 'createRouteActionMetadataMissing'
  | 'cleanupTargetAmbiguous'
  | 'saveDraftNoCard'
  | 'artifactManifestValidated'
  | 'redactionReviewRequired'
  | 'redactionVerified'
  | 'safeForCommit'
  | 'committed'
  | 'sensitive'

const STYLE_PROOF_ARTIFACT_BOOLEAN_FIELDS = [
  'exactArtifact',
  'authenticatedSessionVerified',
  'externalAccountAuthenticated',
  'externalAccountLoginBlocked',
  'platformEditorTargetVerified',
  'platformEditorSurfaceVerified',
  'platformEditorDomVerified',
  'centralEditorChanged',
  'marketAppliedContentVerified',
  'ordinaryClipboardPasteVerified',
  'sameEditorTabVerified',
  'pasteInputEventVerified',
  'editorBodyMutationVerified',
  'mojibakeFreeVerified',
  'phonePreviewContentVerified',
  'phonePreviewBlocked',
  'darkModeEnabledVerified',
  'coverThumbnailAccepted',
  'scheduledSendVerified',
  'disposableDraft',
  'cleanupPathVerified',
  'createRouteActionMetadataMissing',
  'cleanupTargetAmbiguous',
  'saveDraftNoCard',
  'artifactManifestValidated',
  'redactionReviewRequired',
  'redactionVerified',
  'safeForCommit',
  'committed',
  'sensitive',
] as const satisfies readonly StyleProofArtifactBooleanField[]

interface StyleProofManifestIntakeInputs {
  inputs: readonly unknown[]
  rootIssues: readonly QualityIssue[]
}

interface ParsedStyleProofManifestIntakeCandidate {
  manifest: StyleProofManifest | null
  issues: readonly QualityIssue[]
}

interface ParsedStyleProofArtifactIntakeCandidate {
  artifact: StyleProofArtifact | null
  issues: readonly QualityIssue[]
}

function hasStyleProofIntakeField(record: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, field)
}

function getStyleProofIntakeRawKind(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function isStyleProofIntakeRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isKnownStyleProofString<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function isStyleProofRequirementIdValue(value: unknown): value is StyleProofRequirementId {
  return typeof value === 'string' && STYLE_PROOF_REQUIREMENT_BY_ID.has(value as StyleProofRequirementId)
}

function addStyleProofManifestIntakeIssue(
  issues: QualityIssue[],
  issue: QualityIssue,
): void {
  issues.push(issue)
}

function addStyleProofManifestIntakeTypeIssue(
  issues: QualityIssue[],
  location: string,
  expected: string,
  actual: unknown,
): void {
  addStyleProofManifestIntakeIssue(issues, {
    id: 'style-proof-manifest-intake-field-invalid',
    severity: 'error',
    message: `Style proof manifest intake expected ${location} to be ${expected}.`,
    suggestion: 'Submit a redacted JSON proof manifest pack that matches the StyleProofManifest contract before running acceptance audit.',
    location: `${location}:${getStyleProofIntakeRawKind(actual)}`,
  })
}

function addStyleProofManifestIntakeUnknownFieldWarnings(
  record: Record<string, unknown>,
  allowedFields: ReadonlySet<string>,
  issues: QualityIssue[],
  location: string,
): void {
  const unknownFields = Object.keys(record)
    .filter(field => !allowedFields.has(field))
    .sort()
  if (unknownFields.length === 0) return

  addStyleProofManifestIntakeIssue(issues, {
    id: 'style-proof-manifest-intake-unknown-field',
    severity: 'warning',
    message: `Style proof manifest intake dropped ${unknownFields.length} unsupported field(s) from ${location}.`,
    suggestion: 'Keep external evidence packs schema-minimal and submit sensitive runtime context through redacted artifact summaries only.',
    location: `${location}:${unknownFields.join(',')}`,
  })
}

function getStyleProofManifestIntakeTemplateArtifactFields(
  record: Record<string, unknown>,
): readonly string[] {
  return Object.keys(record)
    .filter(field => STYLE_PROOF_MANIFEST_INTAKE_TEMPLATE_ARTIFACT_FIELDS.has(field))
    .sort()
}

function addStyleProofManifestIntakeTemplateArtifactError(
  record: Record<string, unknown>,
  issues: QualityIssue[],
  location: string,
): void {
  const templateFields = getStyleProofManifestIntakeTemplateArtifactFields(record)
  if (templateFields.length === 0) return

  addStyleProofManifestIntakeIssue(issues, {
    id: 'style-proof-manifest-intake-template-artifact',
    severity: 'error',
    message: `Style proof manifest intake rejected ${location} because it contains external handoff draft/template field(s).`,
    suggestion: 'Do not paste artifactTemplate, artifactDraftTemplate, manifestDraftTemplate, operator worksheet, guidance, or draftOnly/notProof placeholders into artifacts. Collect real external proof first, then append a minimal StyleProofArtifact row with only verified proof fields.',
    location: `${location}:${templateFields.join(',')}`,
  })
}

function readRequiredStyleProofStringField(
  record: Record<string, unknown>,
  field: string,
  issues: QualityIssue[],
  location: string,
): string | null {
  if (!hasStyleProofIntakeField(record, field)) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.${field}`, 'a non-empty string', undefined)
    return null
  }

  const value = record[field]
  if (typeof value !== 'string' || value.trim().length === 0) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.${field}`, 'a non-empty string', value)
    return null
  }

  if (value.length > STYLE_PROOF_MANIFEST_INTAKE_MAX_STRING_LENGTH) {
    addStyleProofManifestIntakeIssue(issues, {
      id: 'style-proof-manifest-intake-field-too-large',
      severity: 'error',
      message: `Style proof manifest intake field ${location}.${field} is limited to ${STYLE_PROOF_MANIFEST_INTAKE_MAX_STRING_LENGTH} characters.`,
      suggestion: 'Keep proof manifests concise and redacted; store bulky screenshots, DOM dumps, media blobs, or logs as external artifacts with safe references instead of inline fields.',
      location: `${location}.${field}:length:${value.length}`,
    })
    return null
  }

  return value
}

function readOptionalStyleProofStringField(
  record: Record<string, unknown>,
  field: string,
  issues: QualityIssue[],
  location: string,
): string | undefined {
  if (!hasStyleProofIntakeField(record, field)) return undefined

  const value = record[field]
  if (typeof value !== 'string' || value.trim().length === 0) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.${field}`, 'a non-empty string', value)
    return undefined
  }

  if (value.length > STYLE_PROOF_MANIFEST_INTAKE_MAX_STRING_LENGTH) {
    addStyleProofManifestIntakeIssue(issues, {
      id: 'style-proof-manifest-intake-field-too-large',
      severity: 'error',
      message: `Style proof manifest intake field ${location}.${field} is limited to ${STYLE_PROOF_MANIFEST_INTAKE_MAX_STRING_LENGTH} characters.`,
      suggestion: 'Keep proof manifests concise and redacted; store bulky screenshots, DOM dumps, media blobs, or logs as external artifacts with safe references instead of inline fields.',
      location: `${location}.${field}:length:${value.length}`,
    })
    return undefined
  }

  return value
}

function readOptionalStyleProofBooleanField(
  record: Record<string, unknown>,
  field: StyleProofArtifactBooleanField,
  issues: QualityIssue[],
  location: string,
): boolean | undefined {
  if (!hasStyleProofIntakeField(record, field)) return undefined

  const value = record[field]
  if (typeof value !== 'boolean') {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.${field}`, 'a boolean', value)
    return undefined
  }

  return value
}

function readRequiredKnownStyleProofField<T extends string>(
  record: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  expected: string,
  issues: QualityIssue[],
  location: string,
): T | null {
  if (!hasStyleProofIntakeField(record, field)) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.${field}`, expected, undefined)
    return null
  }

  const value = record[field]
  if (!isKnownStyleProofString(value, allowed)) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.${field}`, expected, value)
    return null
  }

  return value
}

function readOptionalKnownStyleProofField<T extends string>(
  record: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  expected: string,
  issues: QualityIssue[],
  location: string,
): T | undefined {
  if (!hasStyleProofIntakeField(record, field)) return undefined

  const value = record[field]
  if (!isKnownStyleProofString(value, allowed)) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.${field}`, expected, value)
    return undefined
  }

  return value
}

function readRequiredStyleProofRequirementIdField(
  record: Record<string, unknown>,
  issues: QualityIssue[],
  location: string,
): StyleProofRequirementId | null {
  if (!hasStyleProofIntakeField(record, 'requirementId')) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.requirementId`, 'a known style proof requirement id', undefined)
    return null
  }

  const value = record.requirementId
  if (!isStyleProofRequirementIdValue(value)) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.requirementId`, 'a known style proof requirement id', value)
    return null
  }

  return value
}

function readStyleProofClaimedEvidenceField(
  record: Record<string, unknown>,
  issues: QualityIssue[],
  location: string,
): StyleEvidenceLabel[] | null {
  if (!hasStyleProofIntakeField(record, 'claimedEvidence')) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.claimedEvidence`, 'an array of style evidence labels', undefined)
    return null
  }

  const value = record.claimedEvidence
  if (!Array.isArray(value)) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.claimedEvidence`, 'an array of style evidence labels', value)
    return null
  }

  const labels: StyleEvidenceLabel[] = []
  for (let index = 0; index < value.length; index += 1) {
    const label = value[index]
    if (!isKnownStyleProofString(label, STYLE_EVIDENCE_LABELS)) {
      addStyleProofManifestIntakeTypeIssue(
        issues,
        `${location}.claimedEvidence[${index}]`,
        'a known style evidence label',
        label,
      )
      continue
    }
    labels.push(label)
  }

  return labels
}

function parseStyleProofArtifactIntakeCandidate(
  input: unknown,
  location: string,
): ParsedStyleProofArtifactIntakeCandidate {
  const issues: QualityIssue[] = []
  if (!isStyleProofIntakeRecord(input)) {
    addStyleProofManifestIntakeIssue(issues, {
      id: 'style-proof-manifest-intake-artifact-not-object',
      severity: 'error',
      message: `Style proof manifest intake expected ${location} to be an object.`,
      suggestion: 'Each artifact must be a redacted object with id, requirementId, kind, channel, action, readback, and label fields.',
      location: `${location}:${getStyleProofIntakeRawKind(input)}`,
    })
    return { artifact: null, issues }
  }

  addStyleProofManifestIntakeUnknownFieldWarnings(
    input,
    STYLE_PROOF_MANIFEST_INTAKE_ARTIFACT_FIELDS,
    issues,
    location,
  )
  addStyleProofManifestIntakeTemplateArtifactError(input, issues, location)

  const id = readRequiredStyleProofStringField(input, 'id', issues, location)
  const requirementId = readRequiredStyleProofRequirementIdField(input, issues, location)
  const kind = readRequiredKnownStyleProofField(
    input,
    'kind',
    STYLE_PROOF_ARTIFACT_KINDS,
    'a known style proof artifact kind',
    issues,
    location,
  )
  const label = readRequiredStyleProofStringField(input, 'label', issues, location)
  const channel = readRequiredKnownStyleProofField(
    input,
    'channel',
    STYLE_PROOF_CHANNELS,
    'a known style proof channel',
    issues,
    location,
  )
  const action = readRequiredKnownStyleProofField(
    input,
    'action',
    STYLE_PROOF_ACTIONS,
    'a known style proof action',
    issues,
    location,
  )
  const readback = readRequiredKnownStyleProofField(
    input,
    'readback',
    STYLE_PROOF_READBACKS,
    'a known style proof readback',
    issues,
    location,
  )
  const evidenceLabel = readOptionalKnownStyleProofField(
    input,
    'evidenceLabel',
    STYLE_EVIDENCE_LABELS,
    'a known style evidence label',
    issues,
    location,
  )
  const platform = readOptionalKnownStyleProofField(
    input,
    'platform',
    STYLE_PROOF_PLATFORMS,
    'a known platform',
    issues,
    location,
  )
  const choiceId = readOptionalStyleProofStringField(input, 'choiceId', issues, location)
  const artifactFingerprint = readOptionalStyleProofStringField(input, 'artifactFingerprint', issues, location)
  const artifactRef = readOptionalStyleProofStringField(input, 'artifactRef', issues, location)
  const collectedAt = readOptionalStyleProofStringField(input, 'collectedAt', issues, location)
  const hostStatus = readOptionalKnownStyleProofField(
    input,
    'hostStatus',
    STYLE_PROOF_HOST_STATUSES,
    'a known style proof host status',
    issues,
    location,
  )
  const booleanFields: Partial<Record<StyleProofArtifactBooleanField, boolean>> = {}
  for (const field of STYLE_PROOF_ARTIFACT_BOOLEAN_FIELDS) {
    const value = readOptionalStyleProofBooleanField(input, field, issues, location)
    if (value !== undefined) booleanFields[field] = value
  }

  const hasErrors = issues.some(issue => issue.severity === 'error')
  if (
    hasErrors ||
    !id ||
    !requirementId ||
    !kind ||
    !label ||
    !channel ||
    !action ||
    !readback
  ) {
    return { artifact: null, issues }
  }

  return {
    artifact: {
      id,
      requirementId,
      kind,
      label,
      channel,
      action,
      readback,
      ...booleanFields,
      ...(evidenceLabel ? { evidenceLabel } : {}),
      ...(platform ? { platform } : {}),
      ...(choiceId ? { choiceId } : {}),
      ...(artifactFingerprint ? { artifactFingerprint } : {}),
      ...(artifactRef ? { artifactRef } : {}),
      ...(collectedAt ? { collectedAt } : {}),
      ...(hostStatus ? { hostStatus } : {}),
    },
    issues,
  }
}

function readStyleProofArtifactsField(
  record: Record<string, unknown>,
  issues: QualityIssue[],
  location: string,
): StyleProofArtifact[] | null {
  if (!hasStyleProofIntakeField(record, 'artifacts')) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.artifacts`, 'an array of style proof artifacts', undefined)
    return null
  }

  const value = record.artifacts
  if (!Array.isArray(value)) {
    addStyleProofManifestIntakeTypeIssue(issues, `${location}.artifacts`, 'an array of style proof artifacts', value)
    return null
  }

  if (value.length > STYLE_PROOF_MANIFEST_INTAKE_MAX_ARTIFACTS) {
    addStyleProofManifestIntakeIssue(issues, {
      id: 'style-proof-manifest-intake-artifact-count-too-large',
      severity: 'error',
      message: `Style proof manifest intake accepts at most ${STYLE_PROOF_MANIFEST_INTAKE_MAX_ARTIFACTS} artifacts per manifest.`,
      suggestion: 'Split oversized proof packs into smaller redacted manifests; do not submit raw browser dumps, media blobs, or bulk runtime exports as artifact arrays.',
      location: `${location}.artifacts:length:${value.length}`,
    })
    return null
  }

  const artifacts: StyleProofArtifact[] = []
  for (let index = 0; index < value.length; index += 1) {
    const parsed = parseStyleProofArtifactIntakeCandidate(value[index], `${location}.artifacts[${index}]`)
    issues.push(...parsed.issues)
    if (parsed.artifact) artifacts.push(parsed.artifact)
  }

  return artifacts
}

function parseStyleProofManifestIntakeCandidate(
  input: unknown,
  index: number,
): ParsedStyleProofManifestIntakeCandidate {
  const issues: QualityIssue[] = []
  const location = `manifests[${index}]`
  if (!isStyleProofIntakeRecord(input)) {
    addStyleProofManifestIntakeIssue(issues, {
      id: 'style-proof-manifest-intake-manifest-not-object',
      severity: 'error',
      message: `Style proof manifest intake expected ${location} to be an object.`,
      suggestion: 'Submit each external proof manifest as a redacted object, not a raw screenshot, DOM dump, browser profile, or primitive value.',
      location: `${location}:${getStyleProofIntakeRawKind(input)}`,
    })
    return { manifest: null, issues }
  }

  addStyleProofManifestIntakeUnknownFieldWarnings(
    input,
    STYLE_PROOF_MANIFEST_INTAKE_MANIFEST_FIELDS,
    issues,
    location,
  )

  const platform = readRequiredKnownStyleProofField(
    input,
    'platform',
    STYLE_PROOF_PLATFORMS,
    'a known platform',
    issues,
    location,
  )
  const claimedEvidence = readStyleProofClaimedEvidenceField(input, issues, location)
  const scope = readOptionalKnownStyleProofField(
    input,
    'scope',
    STYLE_PROOF_MANIFEST_SCOPES,
    'a known manifest scope',
    issues,
    location,
  )
  const choiceId = readOptionalStyleProofStringField(input, 'choiceId', issues, location)
  const artifactFingerprint = readOptionalStyleProofStringField(input, 'artifactFingerprint', issues, location)
  const artifacts = readStyleProofArtifactsField(input, issues, location)
  const hasErrors = issues.some(issue => issue.severity === 'error')

  if (hasErrors || !platform || !claimedEvidence || !artifacts) {
    return { manifest: null, issues }
  }

  return {
    manifest: {
      platform,
      claimedEvidence,
      artifacts,
      ...(scope ? { scope } : {}),
      ...(choiceId ? { choiceId } : {}),
      ...(artifactFingerprint ? { artifactFingerprint } : {}),
    },
    issues,
  }
}

function getStyleProofManifestIntakeInputs(input: unknown): StyleProofManifestIntakeInputs {
  const rootIssues: QualityIssue[] = []
  if (Array.isArray(input)) {
    if (input.length > STYLE_PROOF_MANIFEST_INTAKE_MAX_MANIFESTS) {
      addStyleProofManifestIntakeIssue(rootIssues, {
        id: 'style-proof-manifest-intake-manifest-count-too-large',
        severity: 'error',
        message: `Style proof manifest intake accepts at most ${STYLE_PROOF_MANIFEST_INTAKE_MAX_MANIFESTS} manifests per pack.`,
        suggestion: 'Split oversized proof packs into smaller redacted batches; do not submit raw browser state, media blobs, or bulk runtime exports.',
        location: `root.manifests:length:${input.length}`,
      })
      return { inputs: [], rootIssues }
    }

    return { inputs: input, rootIssues }
  }

  if (isStyleProofIntakeRecord(input)) {
    if (hasStyleProofIntakeField(input, 'manifests')) {
      const manifests = input.manifests
      if (Array.isArray(manifests)) {
        if (manifests.length > STYLE_PROOF_MANIFEST_INTAKE_MAX_MANIFESTS) {
          addStyleProofManifestIntakeIssue(rootIssues, {
            id: 'style-proof-manifest-intake-manifest-count-too-large',
            severity: 'error',
            message: `Style proof manifest intake accepts at most ${STYLE_PROOF_MANIFEST_INTAKE_MAX_MANIFESTS} manifests per pack.`,
            suggestion: 'Split oversized proof packs into smaller redacted batches; do not submit raw browser state, media blobs, or bulk runtime exports.',
            location: `root.manifests:length:${manifests.length}`,
          })
          return { inputs: [], rootIssues }
        }

        return { inputs: manifests, rootIssues }
      }

      addStyleProofManifestIntakeTypeIssue(rootIssues, 'root.manifests', 'an array of style proof manifests', manifests)
      return { inputs: [], rootIssues }
    }

    if (hasStyleProofIntakeField(input, 'platform') || hasStyleProofIntakeField(input, 'artifacts')) {
      return { inputs: [input], rootIssues }
    }
  }

  addStyleProofManifestIntakeIssue(rootIssues, {
    id: 'style-proof-manifest-intake-root-invalid',
    severity: 'error',
    message: 'Style proof manifest intake expected an array, a { manifests: [...] } object, or one manifest object.',
    suggestion: 'Load only redacted proof manifests into this local audit entry point; keep raw browser state, cookies, screenshots, and account artifacts outside repo commits.',
    location: `root:${getStyleProofIntakeRawKind(input)}`,
  })
  return { inputs: [], rootIssues }
}

function getStyleProofManifestIntakeStatus(
  acceptedManifestCount: number,
  schemaErrorCount: number,
  schemaWarningCount: number,
): StyleProofManifestIntakeStatus {
  if (acceptedManifestCount === 0 && schemaErrorCount === 0) return 'empty'
  if (schemaErrorCount > 0) return 'schema-invalid'
  if (schemaWarningCount > 0) return 'accepted-with-warnings'
  return 'ready-for-review'
}

function buildRejectedStyleProofManifestIntakeReport(
  rawKind: string,
  rootIssue: QualityIssue,
): StyleProofManifestIntakeReport {
  const packReport = getStyleProofManifestPackReport([])
  const acceptanceAudit = getStyleProofAcceptanceAuditReport([])
  const executionRunbook = getStyleProofExecutionRunbook([])

  return {
    status: 'schema-invalid',
    manifests: [],
    rejected: [{
      index: null,
      rawKind,
      issues: [rootIssue],
    }],
    schemaIssues: [rootIssue],
    packReport,
    acceptanceAudit,
    executionRunbook,
    canClaimComplete: false,
    summary: {
      inputManifestCount: 0,
      acceptedManifestCount: 0,
      rejectedManifestCount: 1,
      schemaIssueCount: 1,
      schemaErrorCount: 1,
      schemaWarningCount: 0,
      semanticIssueCount: packReport.summary.issueCount,
      artifactCount: packReport.summary.artifactCount,
      cannotClaimRequirements: acceptanceAudit.summary.cannotClaimRequirements,
      cannotClaimSteps: executionRunbook.summary.cannotClaimSteps,
      safeToAutomateOpenSteps: executionRunbook.summary.safeToAutomateOpenSteps,
      externalDependencyOpenSteps: executionRunbook.summary.externalDependencyOpenSteps,
      phoneOpenSteps: executionRunbook.summary.phoneOpenSteps,
      mutatingOpenSteps: executionRunbook.summary.mutatingOpenSteps,
      unsafeToAutomateOpenSteps: executionRunbook.summary.unsafeToAutomateOpenSteps,
    },
  }
}

export function getStyleProofManifestIntakeReport(input: unknown): StyleProofManifestIntakeReport {
  const { inputs, rootIssues } = getStyleProofManifestIntakeInputs(input)
  const manifests: StyleProofManifest[] = []
  const rejected: StyleProofManifestIntakeRejectedItem[] = rootIssues.length > 0
    ? [{
        index: null,
        rawKind: getStyleProofIntakeRawKind(input),
        issues: rootIssues,
      }]
    : []
  const schemaIssues: QualityIssue[] = [...rootIssues]

  inputs.forEach((candidate, index) => {
    const parsed = parseStyleProofManifestIntakeCandidate(candidate, index)
    schemaIssues.push(...parsed.issues)
    if (parsed.manifest) {
      manifests.push(parsed.manifest)
      return
    }

    rejected.push({
      index,
      rawKind: getStyleProofIntakeRawKind(candidate),
      issues: parsed.issues,
    })
  })

  const packReport = getStyleProofManifestPackReport(manifests)
  const acceptanceAudit = getStyleProofAcceptanceAuditReport(manifests)
  const executionRunbook = getStyleProofExecutionRunbook(manifests)
  const schemaErrorCount = schemaIssues.filter(issue => issue.severity === 'error').length
  const schemaWarningCount = schemaIssues.filter(issue => issue.severity === 'warning').length
  const canClaimComplete = manifests.length > 0 &&
    rejected.length === 0 &&
    schemaErrorCount === 0 &&
    packReport.summary.issueCount === 0 &&
    acceptanceAudit.summary.cannotClaimRequirements === 0 &&
    executionRunbook.summary.cannotClaimSteps === 0

  return {
    status: getStyleProofManifestIntakeStatus(manifests.length, schemaErrorCount, schemaWarningCount),
    manifests,
    rejected,
    schemaIssues,
    packReport,
    acceptanceAudit,
    executionRunbook,
    canClaimComplete,
    summary: {
      inputManifestCount: inputs.length,
      acceptedManifestCount: manifests.length,
      rejectedManifestCount: rejected.length,
      schemaIssueCount: schemaIssues.length,
      schemaErrorCount,
      schemaWarningCount,
      semanticIssueCount: packReport.summary.issueCount,
      artifactCount: packReport.summary.artifactCount,
      cannotClaimRequirements: acceptanceAudit.summary.cannotClaimRequirements,
      cannotClaimSteps: executionRunbook.summary.cannotClaimSteps,
      safeToAutomateOpenSteps: executionRunbook.summary.safeToAutomateOpenSteps,
      externalDependencyOpenSteps: executionRunbook.summary.externalDependencyOpenSteps,
      phoneOpenSteps: executionRunbook.summary.phoneOpenSteps,
      mutatingOpenSteps: executionRunbook.summary.mutatingOpenSteps,
      unsafeToAutomateOpenSteps: executionRunbook.summary.unsafeToAutomateOpenSteps,
    },
  }
}

export function getStyleProofManifestJsonIntakeReport(jsonText: string): StyleProofManifestIntakeReport {
  if (typeof jsonText !== 'string') {
    return buildRejectedStyleProofManifestIntakeReport('json', {
      id: 'style-proof-manifest-intake-json-invalid',
      severity: 'error',
      message: 'Style proof manifest JSON intake expected a non-empty JSON string.',
      suggestion: 'Paste or load a redacted JSON object or array before running local proof manifest intake.',
      location: 'json:empty',
    })
  }

  const normalizedJsonText = jsonText.replace(/^\uFEFF+/, '')

  if (normalizedJsonText.length > STYLE_PROOF_MANIFEST_JSON_MAX_LENGTH) {
    return buildRejectedStyleProofManifestIntakeReport('json', {
      id: 'style-proof-manifest-intake-json-too-large',
      severity: 'error',
      message: `Style proof manifest JSON intake is limited to ${STYLE_PROOF_MANIFEST_JSON_MAX_LENGTH} characters.`,
      suggestion: 'Reduce the payload to a redacted manifest pack; keep raw browser dumps, screenshots, media blobs, and account artifacts outside this intake boundary.',
      location: `json:length:${normalizedJsonText.length}`,
    })
  }

  if (normalizedJsonText.trim().length === 0) {
    return buildRejectedStyleProofManifestIntakeReport('json', {
      id: 'style-proof-manifest-intake-json-invalid',
      severity: 'error',
      message: 'Style proof manifest JSON intake expected a non-empty JSON string.',
      suggestion: 'Paste or load a redacted JSON object or array before running local proof manifest intake.',
      location: 'json:empty',
    })
  }

  try {
    return getStyleProofManifestIntakeReport(JSON.parse(normalizedJsonText) as unknown)
  } catch (error) {
    return buildRejectedStyleProofManifestIntakeReport('json', {
      id: 'style-proof-manifest-intake-json-invalid',
      severity: 'error',
      message: 'Style proof manifest JSON intake could not parse the supplied JSON string.',
      suggestion: 'Fix the JSON syntax first; do not paste raw browser state, network archives, screenshots, or account artifacts into this intake boundary.',
      location: error instanceof Error ? `json:${error.name}` : 'json:parse-error',
    })
  }
}

export function getCommittedStyleProofLocalEvidenceExecutionRunbook(): StyleProofExecutionRunbook {
  return getStyleProofExecutionRunbook(getCommittedStyleProofLocalEvidenceManifests())
}

export function getCommittedStyleProofWechatPcEvidenceExecutionRunbook(): StyleProofExecutionRunbook {
  return getStyleProofExecutionRunbook(getCommittedStyleProofWechatPcEvidenceManifests())
}

export function getCommittedStyleProofEvidenceExecutionRunbookReport(): CommittedStyleProofExecutionRunbookReport {
  const local = getCommittedStyleProofLocalEvidenceExecutionRunbook()
  const wechatPc = getCommittedStyleProofWechatPcEvidenceExecutionRunbook()
  const combined = getStyleProofExecutionRunbook(getCommittedStyleProofEvidenceManifests())

  return {
    local,
    wechatPc,
    combined,
    summary: {
      localManifestCount: local.summary.manifestCount,
      wechatPcManifestCount: wechatPc.summary.manifestCount,
      combinedManifestCount: combined.summary.manifestCount,
      combinedIssueCount: combined.summary.issueCount,
      hasExactArtifactFingerprintConflicts: combined.issues.some(issue =>
        issue.id === 'style-proof-manifest-pack-fingerprint-mismatch'
      ),
      cannotClaimSteps: combined.summary.cannotClaimSteps,
      phoneOpenSteps: combined.summary.phoneOpenSteps,
      externalDependencyOpenSteps: combined.summary.externalDependencyOpenSteps,
      unsafeToAutomateOpenSteps: combined.summary.unsafeToAutomateOpenSteps,
      mutatingOpenSteps: combined.summary.mutatingOpenSteps,
    },
  }
}

function getUniqueCommittedStyleProofReleaseValues<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values))
}

function getCommittedStyleProofReleasePlatformStepCounts(
  steps: readonly StyleProofExecutionRunbookStep[],
): CommittedStyleProofReleasePlatformStepCount[] {
  const counts = new Map<Platform, number>()
  for (const step of steps) {
    counts.set(step.platform, (counts.get(step.platform) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([platform, stepCount]) => ({ platform, stepCount }))
    .sort((left, right) => left.platform.localeCompare(right.platform))
}

function getCommittedStyleProofReleaseRequirementStepCounts(
  steps: readonly StyleProofExecutionRunbookStep[],
): CommittedStyleProofReleaseRequirementStepCount[] {
  const counts = new Map<StyleProofRequirementId, number>()
  for (const step of steps) {
    counts.set(step.requirement.id, (counts.get(step.requirement.id) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([requirementId, stepCount]) => ({ requirementId, stepCount }))
    .sort((left, right) => {
      if (right.stepCount !== left.stepCount) return right.stepCount - left.stepCount
      return left.requirementId.localeCompare(right.requirementId)
    })
}

function getCommittedStyleProofReleaseIssueCounts(
  issueIds: readonly StyleProofManifestIssueId[],
): CommittedStyleProofReleaseIssueCount[] {
  const counts = new Map<StyleProofManifestIssueId, number>()
  for (const issueId of issueIds) {
    counts.set(issueId, (counts.get(issueId) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([issueId, count]) => ({ issueId, count }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.issueId.localeCompare(right.issueId)
    })
}

function getCommittedStyleProofRunbookOpenSteps(
  report: CommittedStyleProofExecutionRunbookReport,
): StyleProofExecutionRunbookStep[] {
  return Object.values(report.combined.platformReports).flatMap(platformReport =>
    platformReport.openSteps
  )
}

const COMMITTED_STYLE_PROOF_MANUAL_RELEASE_PLATFORMS = new Set<Platform>([
  'xiaohongshu',
  'zhihu',
])

function isCommittedStyleProofManualReleaseDeferredStep(
  step: StyleProofExecutionRunbookStep,
): boolean {
  return COMMITTED_STYLE_PROOF_MANUAL_RELEASE_PLATFORMS.has(step.platform) &&
    (
      step.boundary === 'public-host' ||
      step.boundary === 'credentialed-channel' ||
      step.boundary === 'platform-publish' ||
      step.requiresExternalAccount ||
      step.mutatesPlatform
    )
}

function getCommittedStyleProofReleaseBlockingOpenSteps(
  report: CommittedStyleProofExecutionRunbookReport,
): StyleProofExecutionRunbookStep[] {
  return getCommittedStyleProofRunbookOpenSteps(report)
    .filter(step => !isCommittedStyleProofManualReleaseDeferredStep(step))
}

function getCommittedStyleProofManualReleaseDeferredOpenSteps(
  report: CommittedStyleProofExecutionRunbookReport,
): StyleProofExecutionRunbookStep[] {
  return getCommittedStyleProofRunbookOpenSteps(report)
    .filter(isCommittedStyleProofManualReleaseDeferredStep)
}

function getCommittedStyleProofReleaseOpenStepSummary(
  steps: readonly StyleProofExecutionRunbookStep[],
): Pick<
  CommittedStyleProofReleaseGateReport['summary'],
  | 'releaseBlockingOpenSteps'
  | 'releaseBlockingPhoneOpenSteps'
  | 'releaseBlockingExternalDependencyOpenSteps'
  | 'releaseBlockingUnsafeToAutomateOpenSteps'
  | 'releaseBlockingMutatingOpenSteps'
> {
  return {
    releaseBlockingOpenSteps: steps.length,
    releaseBlockingPhoneOpenSteps: steps.filter(step => step.requiresPhone).length,
    releaseBlockingExternalDependencyOpenSteps: steps.filter(step =>
      step.requiresExternalAccount || step.boundary === 'public-host'
    ).length,
    releaseBlockingUnsafeToAutomateOpenSteps: steps.filter(step =>
      step.status === 'unsafe-to-automate'
    ).length,
    releaseBlockingMutatingOpenSteps: steps.filter(step => step.mutatesPlatform).length,
  }
}

function isCommittedStyleProofReleaseBlockingLocalOpenStep(
  step: StyleProofExecutionRunbookStep,
): boolean {
  if (step.boundary !== 'local-only') return false

  return !(
    step.safeToAutomate &&
    step.invalid === 0 &&
    step.missing > 0 &&
    step.missing <= step.blockedChoiceCount &&
    step.issueIds.every(issueId => issueId === 'style-proof-manifest-requirement-missing')
  )
}

const COMMITTED_STYLE_PROOF_RELEASE_LOCAL_REQUIREMENTS = new Set<StyleProofRequirementId>([
  'catalog-source',
  'market-applied-dom-readback',
  'no-proprietary-template-source',
  'unit-test-coverage',
  'local-browser-rendering',
  'exact-artifact',
  'xhs-artifact-manifest',
  'no-sensitive-artifact',
])

function isStyleProofRequirementId(value: string | undefined): value is StyleProofRequirementId {
  return value ? STYLE_PROOF_REQUIREMENT_BY_ID.has(value as StyleProofRequirementId) : false
}

function isCommittedStyleProofReleaseLocalRequirement(value: string | undefined): boolean {
  return isStyleProofRequirementId(value) &&
    COMMITTED_STYLE_PROOF_RELEASE_LOCAL_REQUIREMENTS.has(value)
}

function isCommittedStyleProofReleaseBlockedChoiceOnlyRequirementGap(
  report: CommittedStyleProofExecutionRunbookReport,
  requirementId: StyleProofRequirementId,
): boolean {
  const matchingSteps = getCommittedStyleProofRunbookOpenSteps(report)
    .filter(step =>
      step.requirement.id === requirementId &&
      step.issueIds.includes('style-proof-manifest-requirement-missing')
    )

  return matchingSteps.length > 0 &&
    matchingSteps.every(step => step.missing > 0 && step.missing <= step.blockedChoiceCount)
}

function isCommittedStyleProofReleaseLocalConflictIssue(
  issue: QualityIssue,
  report: CommittedStyleProofExecutionRunbookReport,
): boolean {
  if (!STYLE_PROOF_MANIFEST_ISSUE_IDS.includes(issue.id as StyleProofManifestIssueId)) return false
  if (issue.id === 'style-proof-manifest-proof-stale') {
    return isCommittedStyleProofReleaseLocalRequirement(issue.location)
  }
  if (issue.id === 'style-proof-manifest-requirement-missing') {
    if (!isStyleProofRequirementId(issue.location)) return false
    if (!isCommittedStyleProofReleaseLocalRequirement(issue.location)) return false
    return !isCommittedStyleProofReleaseBlockedChoiceOnlyRequirementGap(report, issue.location)
  }
  return true
}

function getCommittedStyleProofReleaseLocalConflictIssues(
  report: CommittedStyleProofExecutionRunbookReport,
): QualityIssue[] {
  return report.combined.issues
    .filter(issue => isCommittedStyleProofReleaseLocalConflictIssue(issue, report))
}

function getCommittedStyleProofManifestIssueIds(
  issues: readonly QualityIssue[],
): StyleProofManifestIssueId[] {
  return issues
    .map(issue => issue.id)
    .filter((issueId): issueId is StyleProofManifestIssueId =>
      STYLE_PROOF_MANIFEST_ISSUE_IDS.includes(issueId as StyleProofManifestIssueId)
    )
}

function getCommittedStyleProofManifestRequirementIds(
  issues: readonly QualityIssue[],
): StyleProofRequirementId[] {
  return getUniqueCommittedStyleProofReleaseValues(
    issues.map(issue => issue.location).filter(isStyleProofRequirementId)
  )
}

function getCommittedStyleProofReleaseFingerprintConflicts(
  manifests: readonly StyleProofManifest[],
): CommittedStyleProofReleaseFingerprintConflict[] {
  const fingerprintsByChoice = new Map<string, {
    platform: Platform
    choiceId: string
    fingerprints: Set<string>
  }>()

  for (const manifest of manifests) {
    if (!manifest.choiceId) continue
    const key = `${manifest.platform}|${manifest.choiceId}`
    const accumulator = fingerprintsByChoice.get(key) ?? {
      platform: manifest.platform,
      choiceId: manifest.choiceId,
      fingerprints: new Set<string>(),
    }

    if (manifest.artifactFingerprint) {
      accumulator.fingerprints.add(manifest.artifactFingerprint)
    }

    for (const artifact of manifest.artifacts) {
      if (artifact.artifactFingerprint) {
        accumulator.fingerprints.add(artifact.artifactFingerprint)
      }
    }

    fingerprintsByChoice.set(key, accumulator)
  }

  return Array.from(fingerprintsByChoice.values())
    .filter(accumulator => accumulator.fingerprints.size > 1)
    .map(accumulator => ({
      platform: accumulator.platform,
      choiceId: accumulator.choiceId,
      fingerprints: Array.from(accumulator.fingerprints).sort(),
    }))
    .sort((left, right) => {
      if (left.platform !== right.platform) return left.platform.localeCompare(right.platform)
      return left.choiceId.localeCompare(right.choiceId)
    })
}

function getCommittedStyleProofReleaseStepActionPriority(
  kind: Exclude<CommittedStyleProofReleaseGateBlockerKind, 'local-conflict'>,
  step: StyleProofExecutionRunbookStep,
): number {
  if (kind === 'phone-preview') {
    if (step.requirement.id === 'phone-preview-readback') return 0
    if (step.requirement.id === 'phone-screenshot') return 1
    if (step.requirement.id === 'dark-mode-check') return 2
    if (step.requirement.id === 'cover-thumbnail-check') return 3
    return 4
  }

  if (kind === 'external-dependency') {
    if (step.boundary === 'public-host') return 0
    if (step.boundary === 'credentialed-channel') return 1
    if (step.boundary === 'authenticated-pc-editor') return 2
    if (step.requiresExternalAccount) return 3
    return 4
  }

  if (kind === 'unsafe-to-automate' || kind === 'mutating-platform') {
    if (step.boundary === 'platform-publish') return 0
    if (step.mutatesPlatform) return 1
    if (step.boundary === 'credentialed-channel') return 2
    if (step.requiresExternalAccount) return 3
    return 4
  }

  if (step.status === 'invalid') return 0
  if (step.requiresPhone) return 1
  if (step.mutatesPlatform) return 2
  if (step.boundary === 'public-host') return 3
  if (step.requiresExternalAccount) return 4
  if (step.safeToAutomate) return 5
  return 6
}

function getCommittedStyleProofReleaseNextOperatorActions(
  kind: Exclude<CommittedStyleProofReleaseGateBlockerKind, 'local-conflict'>,
  steps: readonly StyleProofExecutionRunbookStep[],
  limit = 3,
): CommittedStyleProofReleaseNextOperatorAction[] {
  const actions: CommittedStyleProofReleaseNextOperatorAction[] = []
  const seen = new Set<string>()

  for (const step of [...steps].sort((left, right) => {
    const priority = getCommittedStyleProofReleaseStepActionPriority(kind, left) -
      getCommittedStyleProofReleaseStepActionPriority(kind, right)
    if (priority !== 0) return priority
    if (left.platform !== right.platform) return left.platform.localeCompare(right.platform)
    return left.order - right.order
  })) {
    const key = [
      step.platform,
      step.gate,
      step.boundary,
      step.nextOperatorAction,
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    actions.push({
      platforms: [step.platform],
      requirementId: step.requirement.id,
      gate: step.gate,
      boundary: step.boundary,
      action: step.nextOperatorAction,
    })
    if (actions.length >= limit) break
  }

  return actions
}

function getCommittedStyleProofReleaseLocalConflictAction(
  issueIds: readonly StyleProofManifestIssueId[],
): CommittedStyleProofReleaseNextOperatorAction[] {
  if (issueIds.length === 0) return []

  const hasFingerprintMismatch = issueIds.includes('style-proof-manifest-pack-fingerprint-mismatch')
  const hasChoiceBlocked = issueIds.includes('style-proof-manifest-choice-blocked')
  const hasRequirementMissing = issueIds.includes('style-proof-manifest-requirement-missing')

  return [{
    platforms: ['wechat', 'xiaohongshu', 'zhihu'],
    action: hasFingerprintMismatch
      ? 'Reconcile the committed manifest pack before any release claim: remove stale conflicting proof rows or replace them with one exact redacted artifact fingerprint for each platform and choice.'
      : hasChoiceBlocked && hasRequirementMissing
        ? 'Reconcile committed proof rows that target catalog-blocked choices or missing local artifact requirements; external phone, account, public-host, sync, scheduled-send, and publish gates remain separate blockers.'
        : hasChoiceBlocked
          ? 'Reconcile committed proof rows that target catalog-blocked choices; external phone, account, public-host, sync, scheduled-send, and publish gates remain separate blockers.'
        : 'Complete the remaining local committed proof rows before any release claim; external phone, account, public-host, sync, scheduled-send, and publish proof cannot be inferred from local manifests.',
  }]
}

function buildCommittedStyleProofReleaseStepBlocker(
  kind: Exclude<CommittedStyleProofReleaseGateBlockerKind, 'local-conflict'>,
  status: StyleProofAcceptanceAuditStatus,
  steps: readonly StyleProofExecutionRunbookStep[],
  message: string,
): CommittedStyleProofReleaseGateBlocker | null {
  if (steps.length === 0) return null

  return {
    kind,
    status,
    platforms: getUniqueCommittedStyleProofReleaseValues(steps.map(step => step.platform)),
    requirementIds: getUniqueCommittedStyleProofReleaseValues(
      steps.map(step => step.requirement.id)
    ),
    issueIds: getUniqueCommittedStyleProofReleaseValues(
      steps.flatMap(step => step.issueIds)
    ),
    issueCount: steps.reduce((total, step) => total + step.issueIds.length, 0),
    stepCount: steps.length,
    platformStepCounts: getCommittedStyleProofReleasePlatformStepCounts(steps),
    requirementStepCounts: getCommittedStyleProofReleaseRequirementStepCounts(steps),
    issueCounts: getCommittedStyleProofReleaseIssueCounts(
      steps.flatMap(step => step.issueIds)
    ),
    message,
    nextOperatorActions: getCommittedStyleProofReleaseNextOperatorActions(kind, steps),
  }
}

function getCommittedStyleProofReleaseGateStatus(
  report: CommittedStyleProofExecutionRunbookReport,
  blockingOpenSteps = getCommittedStyleProofReleaseBlockingOpenSteps(report),
): CommittedStyleProofReleaseGateStatus {
  const localConflictIssues = getCommittedStyleProofReleaseLocalConflictIssues(report)
  if (report.summary.hasExactArtifactFingerprintConflicts || localConflictIssues.length > 0) {
    return 'blocked-by-local-conflict'
  }
  if (
    blockingOpenSteps.some(step => step.requiresPhone) ||
    blockingOpenSteps.some(step => step.requiresExternalAccount || step.boundary === 'public-host')
  ) {
    return 'blocked-by-external'
  }
  if (
    blockingOpenSteps.some(step => step.status === 'unsafe-to-automate') ||
    blockingOpenSteps.some(step => step.mutatesPlatform)
  ) {
    return 'unsafe-to-automate'
  }
  if (blockingOpenSteps.some(isCommittedStyleProofReleaseBlockingLocalOpenStep)) {
    return 'blocked-by-local-conflict'
  }
  return 'ready'
}

export function getCommittedStyleProofEvidenceReleaseGateReport(): CommittedStyleProofReleaseGateReport {
  const source = getCommittedStyleProofEvidenceExecutionRunbookReport()
  const blockingOpenSteps = getCommittedStyleProofReleaseBlockingOpenSteps(source)
  const manualDeferredOpenSteps = getCommittedStyleProofManualReleaseDeferredOpenSteps(source)
  const blockingSummary = getCommittedStyleProofReleaseOpenStepSummary(blockingOpenSteps)
  const localConflictIssues = getCommittedStyleProofReleaseLocalConflictIssues(source)
  const issueIds = getCommittedStyleProofManifestIssueIds(localConflictIssues)
  const fingerprintConflicts = getCommittedStyleProofReleaseFingerprintConflicts(
    getCommittedStyleProofEvidenceManifests(),
  )
  const blockers: CommittedStyleProofReleaseGateBlocker[] = []

  if (source.summary.hasExactArtifactFingerprintConflicts || issueIds.length > 0) {
    blockers.push({
      kind: 'local-conflict',
      status: 'issue',
      platforms: ['wechat', 'xiaohongshu', 'zhihu'],
      requirementIds: getCommittedStyleProofManifestRequirementIds(localConflictIssues),
      issueIds: getUniqueCommittedStyleProofReleaseValues(issueIds),
      issueCount: localConflictIssues.length,
      stepCount: localConflictIssues.length,
      platformStepCounts: [],
      requirementStepCounts: [],
      issueCounts: getCommittedStyleProofReleaseIssueCounts(issueIds),
      message: 'Committed local and PC evidence still contain local manifest conflicts; do not claim complete style proof.',
      nextOperatorActions: getCommittedStyleProofReleaseLocalConflictAction(issueIds),
      ...(fingerprintConflicts.length > 0 ? { fingerprintConflicts } : {}),
    })
  }

  const phoneBlocker = buildCommittedStyleProofReleaseStepBlocker(
    'phone-preview',
    'blocked-by-external',
    blockingOpenSteps.filter(step => step.requiresPhone),
    'Phone preview, screenshots, Dark Mode, cover thumbnail, and mobile interaction remain external proof gates.',
  )
  if (phoneBlocker) blockers.push(phoneBlocker)

  const externalDependencyBlocker = buildCommittedStyleProofReleaseStepBlocker(
    'external-dependency',
    'blocked-by-external',
    blockingOpenSteps.filter(step => step.requiresExternalAccount || step.boundary === 'public-host'),
    'WeChat credentialed account, sync, platform preview, and readback dependencies remain unproven for this release scope.',
  )
  if (externalDependencyBlocker) blockers.push(externalDependencyBlocker)

  const unsafeToAutomateBlocker = buildCommittedStyleProofReleaseStepBlocker(
    'unsafe-to-automate',
    'unsafe-to-automate',
    blockingOpenSteps.filter(step => step.status === 'unsafe-to-automate'),
    'Some in-scope WeChat proof rows require mutating credentialed platform actions and exact readback.',
  )
  if (unsafeToAutomateBlocker) blockers.push(unsafeToAutomateBlocker)

  const mutatingBlocker = buildCommittedStyleProofReleaseStepBlocker(
    'mutating-platform',
    'unsafe-to-automate',
    blockingOpenSteps.filter(step => step.mutatesPlatform),
    'In-scope WeChat scheduled send, publish, and platform-preview rows mutate platform state and must be operator-proven.',
  )
  if (mutatingBlocker) blockers.push(mutatingBlocker)

  const status = getCommittedStyleProofReleaseGateStatus(source, blockingOpenSteps)

  return {
    source,
    canClaimComplete: status === 'ready' && blockers.length === 0,
    status,
    blockers,
    summary: {
      ...source.summary,
      blockerCount: blockers.length,
      manualDeferredOpenSteps: manualDeferredOpenSteps.length,
      manualDeferredPlatformStepCounts: getCommittedStyleProofReleasePlatformStepCounts(
        manualDeferredOpenSteps,
      ),
      ...blockingSummary,
    },
  }
}

const COMMITTED_STYLE_PROOF_EXTERNAL_CHECKLIST_BLOCKER_ORDER: readonly CommittedStyleProofExternalProofChecklistBlockerKind[] = [
  'phone-preview',
  'external-dependency',
  'unsafe-to-automate',
  'mutating-platform',
]

function isCommittedStyleProofExternalProofChecklistBlockerKind(
  kind: CommittedStyleProofReleaseGateBlockerKind,
): kind is CommittedStyleProofExternalProofChecklistBlockerKind {
  return kind !== 'local-conflict'
}

function getCommittedStyleProofExternalProofChecklistRowId(
  step: StyleProofExecutionRunbookStep,
): string {
  return [
    'committed-style-proof',
    step.platform,
    step.requirement.id,
    step.gate,
    step.boundary,
  ].join(':')
}

function doesCommittedStyleProofExternalProofChecklistStepMatchBlocker(
  kind: CommittedStyleProofExternalProofChecklistBlockerKind,
  step: StyleProofExecutionRunbookStep,
): boolean {
  if (kind === 'phone-preview') return step.requiresPhone
  if (kind === 'external-dependency') {
    return step.requiresExternalAccount || step.boundary === 'public-host'
  }
  if (kind === 'unsafe-to-automate') return step.status === 'unsafe-to-automate'
  return step.mutatesPlatform
}

function getCommittedStyleProofExternalProofChecklistBlockerOrder(
  kind: CommittedStyleProofExternalProofChecklistBlockerKind,
): number {
  return COMMITTED_STYLE_PROOF_EXTERNAL_CHECKLIST_BLOCKER_ORDER.indexOf(kind)
}

function buildCommittedStyleProofExternalProofArtifactTemplate(
  step: StyleProofExecutionRunbookStep,
): CommittedStyleProofExternalProofArtifactTemplate {
  return {
    requirementId: step.requiredArtifact.requirementId,
    requiredChannels: step.requiredArtifact.requiredChannels,
    requiredActions: step.requiredArtifact.requiredActions,
    requiredReadbacks: step.requiredArtifact.requiredReadbacks,
    requiredFields: step.requiredArtifact.requiredFields,
    forbiddenFields: step.requiredArtifact.forbiddenFields ?? [],
    acceptedHostStatuses: step.requiredArtifact.acceptedHostStatuses ?? [],
    maxFreshnessDays: step.requiredArtifact.maxFreshnessDays ?? null,
    redactionBoundary: step.redactionBoundary,
    successCriteria: step.successCriteria,
    failureSignals: step.failureSignals,
  }
}

function buildCommittedStyleProofExternalProofChecklistRow(
  step: StyleProofExecutionRunbookStep,
  blockerKinds: readonly CommittedStyleProofExternalProofChecklistBlockerKind[],
): CommittedStyleProofExternalProofChecklistRow {
  return {
    id: getCommittedStyleProofExternalProofChecklistRowId(step),
    blockerKinds: [...blockerKinds].sort((left, right) =>
      getCommittedStyleProofExternalProofChecklistBlockerOrder(left) -
      getCommittedStyleProofExternalProofChecklistBlockerOrder(right)
    ),
    platform: step.platform,
    choiceIds: step.choiceIds,
    requirementId: step.requirement.id,
    requirementLabel: step.requirement.label,
    gate: step.gate,
    boundary: step.boundary,
    order: step.order,
    status: step.status,
    issueIds: step.issueIds,
    required: step.required,
    satisfied: step.satisfied,
    missing: step.missing,
    invalid: step.invalid,
    artifactCount: step.artifactCount,
    acceptedArtifactCount: step.acceptedArtifactCount,
    blockedChoiceCount: step.blockedChoiceCount,
    mutatesPlatform: step.mutatesPlatform,
    requiresExternalAccount: step.requiresExternalAccount,
    requiresPhone: step.requiresPhone,
    safeToAutomate: step.safeToAutomate,
    requiresFreshCollectedAt: step.requiresFreshCollectedAt,
    freshnessMaxDays: step.freshnessMaxDays,
    freshnessIssueIds: step.freshnessIssueIds,
    cannotClaim: step.cannotClaim,
    cannotClaimReason: step.cannotClaimReason,
    nextOperatorAction: step.nextOperatorAction,
    artifactTemplate: buildCommittedStyleProofExternalProofArtifactTemplate(step),
  }
}

function sortCommittedStyleProofExternalProofChecklistRows(
  rows: readonly CommittedStyleProofExternalProofChecklistRow[],
): CommittedStyleProofExternalProofChecklistRow[] {
  return [...rows].sort((left, right) => {
    if (left.platform !== right.platform) return left.platform.localeCompare(right.platform)
    if (left.order !== right.order) return left.order - right.order
    return left.requirementId.localeCompare(right.requirementId)
  })
}

export function getCommittedStyleProofExternalProofChecklistReport(): CommittedStyleProofExternalProofChecklistReport {
  const releaseGate = getCommittedStyleProofEvidenceReleaseGateReport()
  const openSteps = getCommittedStyleProofRunbookOpenSteps(releaseGate.source)
    .filter(step => !isCommittedStyleProofManualReleaseDeferredStep(step))
  const rowInputs = new Map<string, {
    step: StyleProofExecutionRunbookStep
    blockerKinds: Set<CommittedStyleProofExternalProofChecklistBlockerKind>
  }>()
  const stepIdsByBlocker = new Map<CommittedStyleProofExternalProofChecklistBlockerKind, string[]>()

  for (const blocker of releaseGate.blockers) {
    if (!isCommittedStyleProofExternalProofChecklistBlockerKind(blocker.kind)) continue
    const stepIds: string[] = []
    for (const step of openSteps) {
      if (!doesCommittedStyleProofExternalProofChecklistStepMatchBlocker(blocker.kind, step)) {
        continue
      }

      const rowId = getCommittedStyleProofExternalProofChecklistRowId(step)
      const input = rowInputs.get(rowId) ?? {
        step,
        blockerKinds: new Set<CommittedStyleProofExternalProofChecklistBlockerKind>(),
      }
      input.blockerKinds.add(blocker.kind)
      rowInputs.set(rowId, input)
      stepIds.push(rowId)
    }
    stepIdsByBlocker.set(blocker.kind, stepIds)
  }

  const rows = sortCommittedStyleProofExternalProofChecklistRows(
    Array.from(rowInputs.values()).map(input =>
      buildCommittedStyleProofExternalProofChecklistRow(input.step, Array.from(input.blockerKinds))
    )
  )
  const rowsById = new Map(rows.map(row => [row.id, row]))
  const groups = releaseGate.blockers
    .filter((blocker): blocker is CommittedStyleProofReleaseGateBlocker & {
      kind: CommittedStyleProofExternalProofChecklistBlockerKind
    } => isCommittedStyleProofExternalProofChecklistBlockerKind(blocker.kind))
    .map((blocker): CommittedStyleProofExternalProofChecklistGroup => {
      const blockerRows = sortCommittedStyleProofExternalProofChecklistRows(
        (stepIdsByBlocker.get(blocker.kind) ?? [])
          .map(rowId => rowsById.get(rowId))
          .filter((row): row is CommittedStyleProofExternalProofChecklistRow => Boolean(row))
      )

      return {
        kind: blocker.kind,
        status: blocker.status,
        message: blocker.message,
        platforms: blocker.platforms,
        requirementIds: blocker.requirementIds,
        issueIds: blocker.issueIds,
        issueCount: blocker.issueCount,
        stepCount: blocker.stepCount,
        rowCount: blockerRows.length,
        platformStepCounts: blocker.platformStepCounts,
        requirementStepCounts: blocker.requirementStepCounts,
        issueCounts: blocker.issueCounts,
        nextOperatorActions: blocker.nextOperatorActions,
        rows: blockerRows,
      }
    })

  return {
    releaseGate,
    canClaimComplete: releaseGate.canClaimComplete,
    status: releaseGate.status,
    rows,
    groups,
    summary: {
      ...releaseGate.summary,
      groupCount: groups.length,
      groupRowCount: groups.reduce((total, group) => total + group.rowCount, 0),
      uniqueChecklistRowCount: rows.length,
      phoneRows: rows.filter(row => row.requiresPhone).length,
      externalAccountRows: rows.filter(row => row.requiresExternalAccount).length,
      publicHostRows: rows.filter(row => row.boundary === 'public-host').length,
      mutatingRows: rows.filter(row => row.mutatesPlatform).length,
      unsafeToAutomateRows: rows.filter(row => row.status === 'unsafe-to-automate').length,
      safeToAutomateRows: rows.filter(row => row.safeToAutomate).length,
    },
  }
}

function getCommittedStyleProofLocalActionabilityRowId(
  step: StyleProofExecutionRunbookStep,
): string {
  return [
    'committed-style-proof-local',
    step.platform,
    step.requirement.id,
    step.gate,
    step.boundary,
  ].join(':')
}

function isCommittedStyleProofLocalStepCatalogBlockedOnly(
  step: StyleProofExecutionRunbookStep,
): boolean {
  return step.safeToAutomate
    && step.boundary === 'local-only'
    && step.invalid === 0
    && step.missing > 0
    && step.missing <= step.blockedChoiceCount
    && step.issueIds.every(issueId => issueId === 'style-proof-manifest-requirement-missing')
}

function getCommittedStyleProofLocalActionabilityStatus(
  step: StyleProofExecutionRunbookStep,
): CommittedStyleProofLocalActionabilityStatus {
  return isCommittedStyleProofLocalStepCatalogBlockedOnly(step)
    ? 'catalog-blocked'
    : 'actionable-local'
}

function buildCommittedStyleProofLocalActionabilityRow(
  step: StyleProofExecutionRunbookStep,
): CommittedStyleProofLocalActionabilityRow {
  const actionability = getCommittedStyleProofLocalActionabilityStatus(step)

  return {
    id: getCommittedStyleProofLocalActionabilityRowId(step),
    actionability,
    catalogBlockedOnly: actionability === 'catalog-blocked',
    platform: step.platform,
    choiceIds: step.choiceIds,
    requirementId: step.requirement.id,
    requirementLabel: step.requirement.label,
    gate: step.gate,
    boundary: step.boundary,
    order: step.order,
    status: step.status,
    issueIds: step.issueIds,
    required: step.required,
    satisfied: step.satisfied,
    missing: step.missing,
    invalid: step.invalid,
    artifactCount: step.artifactCount,
    acceptedArtifactCount: step.acceptedArtifactCount,
    blockedChoiceCount: step.blockedChoiceCount,
    safeToAutomate: step.safeToAutomate,
    cannotClaim: step.cannotClaim,
    cannotClaimReason: step.cannotClaimReason,
    nextOperatorAction: step.nextOperatorAction,
    requiredArtifact: step.requiredArtifact,
    successCriteria: step.successCriteria,
    failureSignals: step.failureSignals,
    redactionBoundary: step.redactionBoundary,
  }
}

function sortCommittedStyleProofLocalActionabilityRows(
  rows: readonly CommittedStyleProofLocalActionabilityRow[],
): CommittedStyleProofLocalActionabilityRow[] {
  return [...rows].sort((left, right) => {
    if (left.platform !== right.platform) return left.platform.localeCompare(right.platform)
    if (left.actionability !== right.actionability) {
      return left.actionability.localeCompare(right.actionability)
    }
    if (left.order !== right.order) return left.order - right.order
    return left.requirementId.localeCompare(right.requirementId)
  })
}

export function getCommittedStyleProofLocalActionabilityReport(): CommittedStyleProofLocalActionabilityReport {
  const externalChecklist = getCommittedStyleProofExternalProofChecklistReport()
  const releaseGate = externalChecklist.releaseGate
  const rows = sortCommittedStyleProofLocalActionabilityRows(
    getCommittedStyleProofRunbookOpenSteps(releaseGate.source)
      .filter(step => step.safeToAutomate && step.boundary === 'local-only')
      .map(buildCommittedStyleProofLocalActionabilityRow)
  )
  const actionableRows = rows.filter(row => row.actionability === 'actionable-local')
  const catalogBlockedRows = rows.filter(row => row.actionability === 'catalog-blocked')

  return {
    releaseGate,
    externalChecklist,
    canClaimComplete: releaseGate.canClaimComplete,
    status: releaseGate.status,
    rows,
    actionableRows,
    catalogBlockedRows,
    nextLocalActionableRow: actionableRows[0] ?? null,
    nextCatalogBlockedRow: catalogBlockedRows[0] ?? null,
    summary: {
      ...releaseGate.summary,
      safeLocalOpenRows: rows.length,
      actionableLocalRows: actionableRows.length,
      catalogBlockedLocalRows: catalogBlockedRows.length,
      externalChecklistRows: externalChecklist.summary.uniqueChecklistRowCount,
      externalChecklistGroupRows: externalChecklist.summary.groupRowCount,
      phoneExternalRows: externalChecklist.summary.phoneRows,
      unsafeExternalRows: externalChecklist.summary.unsafeToAutomateRows,
      mutatingExternalRows: externalChecklist.summary.mutatingRows,
      safeExternalRows: externalChecklist.summary.safeToAutomateRows,
    },
  }
}

function getCommittedStyleProofExternalHandoffCannotAutoCompleteReason(
  report: CommittedStyleProofExternalHandoffReport,
): string | null {
  if (report.canClaimComplete) return null

  const reasons: string[] = []
  if (!report.canContinueLocally) {
    reasons.push('no direct local proof rows are actionable')
  }
  if (report.externalChecklist.summary.safeToAutomateRows === 0) {
    reasons.push('No safe external proof rows can be automated locally')
  }
  if (report.requiresPhone) {
    reasons.push('phone preview, screenshot, Dark Mode, or cover proof requires phone-side readback')
  }
  if (report.requiresExternalAccount) {
    reasons.push('credentialed account upload, sync, preview, scheduled-send, or publish proof requires operator account access')
  }
  if (report.requiresPublicHost) {
    reasons.push('public-host proof requires a real public HTTPS or platform-hosted image readback')
  }
  if (report.containsMutatingPlatformRows) {
    reasons.push('some rows mutate platform state and must not run silently')
  }

  return reasons.join('; ')
}

export function getCommittedStyleProofExternalHandoffReport(): CommittedStyleProofExternalHandoffReport {
  const localActionability = getCommittedStyleProofLocalActionabilityReport()
  const externalChecklist = localActionability.externalChecklist
  const releaseGate = localActionability.releaseGate
  const nextPhoneRow = externalChecklist.rows.find(row => row.requiresPhone) ?? null
  const nextExternalAccountRow = externalChecklist.rows.find(row => row.requiresExternalAccount) ?? null
  const nextPublicHostRow = externalChecklist.rows.find(row => row.boundary === 'public-host') ?? null
  const nextUnsafeToAutomateRow = externalChecklist.rows.find(row =>
    row.status === 'unsafe-to-automate'
  ) ?? null
  const nextMutatingPlatformRow = externalChecklist.rows.find(row => row.mutatesPlatform) ?? null
  const canContinueLocally = localActionability.summary.actionableLocalRows > 0
  const reportWithoutReason: Omit<
    CommittedStyleProofExternalHandoffReport,
    'cannotAutoCompleteReason'
  > = {
    releaseGate,
    externalChecklist,
    localActionability,
    canClaimComplete: releaseGate.canClaimComplete,
    status: releaseGate.status,
    canContinueLocally,
    requiresOperator: externalChecklist.summary.uniqueChecklistRowCount > 0,
    requiresPhone: externalChecklist.summary.phoneRows > 0,
    requiresExternalAccount: externalChecklist.summary.externalAccountRows > 0,
    requiresPublicHost: externalChecklist.summary.publicHostRows > 0,
    containsUnsafeToAutomateRows: externalChecklist.summary.unsafeToAutomateRows > 0,
    containsMutatingPlatformRows: externalChecklist.summary.mutatingRows > 0,
    nextLocalActionableRow: localActionability.nextLocalActionableRow,
    nextCatalogBlockedRow: localActionability.nextCatalogBlockedRow,
    nextPhoneRow,
    nextExternalAccountRow,
    nextPublicHostRow,
    nextUnsafeToAutomateRow,
    nextMutatingPlatformRow,
    recommendedNextAction: localActionability.nextLocalActionableRow?.nextOperatorAction ??
      nextPhoneRow?.nextOperatorAction ??
      nextExternalAccountRow?.nextOperatorAction ??
      nextPublicHostRow?.nextOperatorAction ??
      nextUnsafeToAutomateRow?.nextOperatorAction ??
      nextMutatingPlatformRow?.nextOperatorAction ??
      null,
    summary: {
      ...localActionability.summary,
      externalHandoffRows: externalChecklist.summary.uniqueChecklistRowCount,
      externalHandoffGroups: externalChecklist.summary.groupCount,
      phoneRows: externalChecklist.summary.phoneRows,
      externalAccountRows: externalChecklist.summary.externalAccountRows,
      publicHostRows: externalChecklist.summary.publicHostRows,
      unsafeToAutomateRows: externalChecklist.summary.unsafeToAutomateRows,
      mutatingRows: externalChecklist.summary.mutatingRows,
    },
  }

  const report: CommittedStyleProofExternalHandoffReport = {
    ...reportWithoutReason,
    cannotAutoCompleteReason: null,
  }

  return {
    ...report,
    cannotAutoCompleteReason: getCommittedStyleProofExternalHandoffCannotAutoCompleteReason(report),
  }
}

function getCommittedStyleProofExternalHandoffNextRowRefs(
  report: CommittedStyleProofExternalHandoffReport,
): CommittedStyleProofExternalHandoffNextRowRef[] {
  return [
    { kind: 'phone-preview', row: report.nextPhoneRow },
    { kind: 'external-account', row: report.nextExternalAccountRow },
    { kind: 'public-host', row: report.nextPublicHostRow },
    { kind: 'unsafe-to-automate', row: report.nextUnsafeToAutomateRow },
    { kind: 'mutating-platform', row: report.nextMutatingPlatformRow },
  ].filter((ref): ref is CommittedStyleProofExternalHandoffNextRowRef => Boolean(ref.row))
}

function getCommittedStyleProofExternalHandoffNextRows(
  refs: readonly CommittedStyleProofExternalHandoffNextRowRef[],
): CommittedStyleProofExternalProofChecklistRow[] {
  return Array.from(
    refs.reduce((rowsById, ref) => {
      rowsById.set(ref.row.id, ref.row)
      return rowsById
    }, new Map<string, CommittedStyleProofExternalProofChecklistRow>()).values()
  )
}

export function getCommittedStyleProofExternalHandoffPacket(
  report = getCommittedStyleProofExternalHandoffReport(),
): CommittedStyleProofExternalHandoffPacket {
  const nextRowRefs = getCommittedStyleProofExternalHandoffNextRowRefs(report)

  return {
    canClaimComplete: report.canClaimComplete,
    status: report.status,
    canContinueLocally: report.canContinueLocally,
    requiresOperator: report.requiresOperator,
    requiresPhone: report.requiresPhone,
    requiresExternalAccount: report.requiresExternalAccount,
    requiresPublicHost: report.requiresPublicHost,
    containsUnsafeToAutomateRows: report.containsUnsafeToAutomateRows,
    containsMutatingPlatformRows: report.containsMutatingPlatformRows,
    recommendedNextAction: report.recommendedNextAction,
    cannotAutoCompleteReason: report.cannotAutoCompleteReason,
    summary: report.summary,
    groups: report.externalChecklist.groups,
    rows: report.externalChecklist.rows,
    nextRowRefs,
    nextRows: getCommittedStyleProofExternalHandoffNextRows(nextRowRefs),
  }
}

function formatCommittedStyleProofExternalHandoffBoolean(value: boolean): 'yes' | 'no' {
  return value ? 'yes' : 'no'
}

function formatCommittedStyleProofExternalHandoffText(value: string | null): string {
  if (!value) return 'none'
  return value.replace(/\s+/g, ' ').trim()
}

function formatCommittedStyleProofExternalHandoffList(
  values: readonly string[],
): string {
  return values.length > 0
    ? values.map(formatCommittedStyleProofExternalHandoffText).join(', ')
    : 'none'
}

function formatCommittedStyleProofExternalHandoffRowHeader(
  row: CommittedStyleProofExternalProofChecklistRow,
): string {
  return `${row.platform} / ${row.requirementId} / ${row.boundary}`
}

function formatCommittedStyleProofExternalHandoffRow(
  row: CommittedStyleProofExternalProofChecklistRow,
): readonly string[] {
  const template = row.artifactTemplate

  return [
    `- ${formatCommittedStyleProofExternalHandoffRowHeader(row)}`,
    `  - Gate: ${row.gate}`,
    `  - Status: ${row.status}`,
    `  - Blockers: ${formatCommittedStyleProofExternalHandoffList(row.blockerKinds)}`,
    `  - Issue ids: ${formatCommittedStyleProofExternalHandoffList(row.issueIds)}`,
    `  - Freshness issue ids: ${formatCommittedStyleProofExternalHandoffList(row.freshnessIssueIds)}`,
    `  - Choices: ${formatCommittedStyleProofExternalHandoffList(row.choiceIds)}`,
    `  - Required proofs: ${row.required}`,
    `  - Satisfied proofs: ${row.satisfied}`,
    `  - Missing proofs: ${row.missing}`,
    `  - Invalid proofs: ${row.invalid}`,
    `  - Artifact count: ${row.artifactCount}`,
    `  - Accepted artifact count: ${row.acceptedArtifactCount}`,
    `  - Required channels: ${formatCommittedStyleProofExternalHandoffList(template.requiredChannels)}`,
    `  - Required actions: ${formatCommittedStyleProofExternalHandoffList(template.requiredActions)}`,
    `  - Required readbacks: ${formatCommittedStyleProofExternalHandoffList(template.requiredReadbacks)}`,
    `  - Required evidence fields: ${formatCommittedStyleProofExternalHandoffList(template.requiredFields)}`,
    `  - Forbidden evidence fields: ${formatCommittedStyleProofExternalHandoffList(template.forbiddenFields)}`,
    `  - Accepted host statuses: ${formatCommittedStyleProofExternalHandoffList(template.acceptedHostStatuses)}`,
    `  - Freshness max days: ${template.maxFreshnessDays ?? 'none'}`,
    `  - Mutates platform: ${formatCommittedStyleProofExternalHandoffBoolean(row.mutatesPlatform)}`,
    `  - Requires external account: ${formatCommittedStyleProofExternalHandoffBoolean(row.requiresExternalAccount)}`,
    `  - Requires phone: ${formatCommittedStyleProofExternalHandoffBoolean(row.requiresPhone)}`,
    `  - Safe to automate: ${formatCommittedStyleProofExternalHandoffBoolean(row.safeToAutomate)}`,
    `  - Cannot claim: ${formatCommittedStyleProofExternalHandoffBoolean(row.cannotClaim)}`,
    `  - Cannot claim reason: ${formatCommittedStyleProofExternalHandoffText(row.cannotClaimReason)}`,
    `  - Next operator action: ${formatCommittedStyleProofExternalHandoffText(row.nextOperatorAction)}`,
    `  - Redaction boundary: ${formatCommittedStyleProofExternalHandoffText(template.redactionBoundary)}`,
    `  - Success criteria: ${formatCommittedStyleProofExternalHandoffList(template.successCriteria)}`,
    `  - Failure signals: ${formatCommittedStyleProofExternalHandoffList(template.failureSignals)}`,
  ]
}

export function formatCommittedStyleProofExternalHandoffPacketMarkdown(
  packet = getCommittedStyleProofExternalHandoffPacket(),
): string {
  const lines = [
    '# Committed Style Proof External Handoff',
    '',
    '## Summary',
    `- Status: ${packet.status}`,
    `- Can claim complete: ${formatCommittedStyleProofExternalHandoffBoolean(packet.canClaimComplete)}`,
    `- Can continue locally: ${formatCommittedStyleProofExternalHandoffBoolean(packet.canContinueLocally)}`,
    `- Requires operator: ${formatCommittedStyleProofExternalHandoffBoolean(packet.requiresOperator)}`,
    `- Requires phone: ${formatCommittedStyleProofExternalHandoffBoolean(packet.requiresPhone)}`,
    `- Requires external account: ${formatCommittedStyleProofExternalHandoffBoolean(packet.requiresExternalAccount)}`,
    `- Requires public host: ${formatCommittedStyleProofExternalHandoffBoolean(packet.requiresPublicHost)}`,
    `- Unsafe-to-automate rows: ${packet.summary.unsafeToAutomateRows}`,
    `- Mutating platform rows: ${packet.summary.mutatingRows}`,
    `- Phone rows: ${packet.summary.phoneRows}`,
    `- External account rows: ${packet.summary.externalAccountRows}`,
    `- Public host rows: ${packet.summary.publicHostRows}`,
    `- Safe external rows: ${packet.summary.safeExternalRows}`,
    `- External handoff rows: ${packet.summary.externalHandoffRows}`,
    `- Cannot auto-complete reason: ${formatCommittedStyleProofExternalHandoffText(packet.cannotAutoCompleteReason)}`,
    '',
    '## Cannot-Claim Boundary',
    '- Do not claim completion from local-only checks, unit tests, local browser rendering, or catalog availability.',
    '- Do not claim phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, platform preview, public rendering, upload, or publish success until the exact artifact has the required external readback.',
    '- Do not automate rows that require credentialed account mutation; collect them through an operator-run, redacted proof manifest.',
    '',
    '## Next Operator Rows',
    ...(packet.nextRowRefs.length > 0
      ? packet.nextRowRefs.map(ref =>
          `- ${ref.kind}: ${formatCommittedStyleProofExternalHandoffRowHeader(ref.row)}: ${formatCommittedStyleProofExternalHandoffText(ref.row.nextOperatorAction)}`
        )
      : ['- none']),
    '',
    '## Proof Rows',
    ...packet.rows.flatMap(formatCommittedStyleProofExternalHandoffRow),
  ]

  return `${lines.join('\n')}\n`
}
