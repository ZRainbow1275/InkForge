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
  | 'dark-mode-check'
  | 'cover-thumbnail-check'
  | 'credentialed-sync'
  | 'sync-readback'
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
  centralEditorChanged?: boolean
  phonePreviewContentVerified?: boolean
  darkModeEnabledVerified?: boolean
  coverThumbnailAccepted?: boolean
  disposableDraft?: boolean
  cleanupPathVerified?: boolean
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
  | 'style-proof-manifest-phone-content-missing'
  | 'style-proof-manifest-dark-mode-not-verified'
  | 'style-proof-manifest-cover-thumbnail-not-accepted'
  | 'style-proof-manifest-disposable-draft-missing'
  | 'style-proof-manifest-cleanup-path-missing'
  | 'style-proof-manifest-platform-action-missing'
  | 'style-proof-manifest-readback-missing'
  | 'style-proof-manifest-public-image-host-missing'
  | 'style-proof-manifest-validation-missing'
  | 'style-proof-manifest-pack-choice-unknown'
  | 'style-proof-manifest-pack-platform-mismatch'
  | 'style-proof-manifest-pack-artifact-id-duplicate'
  | 'style-proof-manifest-pack-fingerprint-mismatch'

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
    'published-url-or-platform-preview',
    'no-sensitive-artifact',
  ],
} as const satisfies Record<StyleEvidenceLabel, readonly StyleProofRequirementId[]>

const SENSITIVE_ARTIFACT_REF_PATTERNS = [
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
  /\bprofileDir\b/i,
  /\buserDataDir\b/i,
  /[a-z]:\\users\\/i,
  /[a-z]:\/users\//i,
  /cloakbrowser.*profiles/i,
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

const STYLE_PROOF_COLLECTION_NOTES = {
  'local-evidence': 'Collect a redacted local artifact, test log, manifest, or local browser/Tauri proof before touching a real platform.',
  'sensitive-hygiene': 'Review proof references for tokens, cookies, QR codes, HAR files, browser profiles, account screenshots, and local credential paths.',
  'market-editor': 'Use CloakBrowser to apply a concrete market editor element, visually confirm insertion, and record DOM/controls without copying template source.',
  'authenticated-pc-editor': 'Use a real authenticated PC editor only after exact-artifact and safe disposable-draft cleanup proof are ready.',
  'phone-preview': 'Use the target phone preview for readback, screenshots, Dark Mode, cover thumbnail, and interaction checks; PC DOM proof is not enough.',
  'public-host': 'Verify public HTTPS or platform-hosted image URLs with alt/caption context before reporting image fallback readiness.',
  'credentialed-channel': 'Use a real credentialed sync, plugin, upload, or API channel and read back the created draft/material.',
  'platform-publish': 'Inspect a real platform preview or published result for the exact artifact; do not infer this from editor paste or sync success.',
} as const satisfies Record<StyleProofCollectionGate, string>

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
    note: 'kept mapped but disabled until mobile preview and publish proof exist; ordinary Ctrl+V remains blocked',
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
    blockers: [
      'ordinary Ctrl+V reduced the rich HTML artifact to plain text; 2026-06-09 CloakBrowser ClipboardEvent PC DOM readback is channel-specific',
      'mobile preview proof missing',
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
      || choice.fallbackOutput === 'image-fallback'
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

const COMMITTED_STYLE_PROOF_LOCAL_EVIDENCE_REPORT_REF =
  'prompts/0601/evidence/style-proof-committed-local-evidence-20260617.txt'

const COMMITTED_STYLE_PROOF_ACCEPTANCE_UI_REPORT_REF =
  'prompts/0601/evidence/style-proof-acceptance-ui-20260617.txt'

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

const COMMITTED_STYLE_PROOF_LOCAL_EVIDENCE_MANIFESTS = [
  createCommittedStyleProofLocalEvidenceManifest({
    choiceId: 'wechat-flagship-kiln',
    label: 'Kiln creative flagship',
    artifactFingerprint: 'prompts/0601/evidence/e2e/flagship-kiln.png@tauri-webview-e2e',
    localRenderArtifactRef: 'prompts/0601/evidence/e2e/flagship-kiln.png',
  }),
  createCommittedStyleProofLocalEvidenceManifest({
    choiceId: 'wechat-flagship-tempera',
    label: 'Tempera academic flagship',
    artifactFingerprint: 'prompts/0601/evidence/e2e/flagship-tempera.png@tauri-webview-e2e',
    localRenderArtifactRef: 'prompts/0601/evidence/e2e/flagship-tempera.png',
  }),
  createCommittedStyleProofLocalEvidenceManifest({
    choiceId: 'wechat-flagship-amber',
    label: 'Amber business flagship',
    artifactFingerprint: 'prompts/0601/evidence/e2e/flagship-amber.png@tauri-webview-e2e',
    localRenderArtifactRef: 'prompts/0601/evidence/e2e/flagship-amber.png',
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
  if (isSensitiveStyleProofArtifact(artifact)) {
    addStyleProofIssue(issues, {
      id: 'style-proof-manifest-sensitive-artifact',
      message: `Proof artifact ${artifact.id} references sensitive or local authenticated material.`,
      suggestion: 'Keep cookies, tokens, QR codes, HAR files, browser profiles, account screenshots, and local profile paths out of committed proof manifests.',
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
    || (typeof artifact.artifactRef === 'string' && isSensitiveStyleProofReference(artifact.artifactRef))
}

function isUnsafeStyleProofCommitArtifact(artifact: StyleProofArtifact): boolean {
  return artifact.committed === true
    && (artifact.safeForCommit === false || isSensitiveStyleProofArtifact(artifact))
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
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'authenticated-editor-opened'
        && artifact.channel === 'platform-editor'
      ))
      break
    case 'pc-editor-dom-readback':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'pc-editor-dom-readback'
        && artifact.channel === 'platform-editor'
        && isDomOrVisualReadback(artifact.readback)
      ))
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
      break
    }
    case 'pc-editor-paste-event':
      if (!has(artifact => artifact.action === 'pc-paste' && artifact.channel === 'platform-editor')) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-platform-action-missing',
          message: 'PC editor paste proof lacks the real paste/channel event.',
          suggestion: 'Authenticated editor reachability or DOM readback is not enough; record the exact PC paste or transfer action.',
          location: requirementId,
        })
      }
      break
    case 'phone-preview-readback': {
      const hasPhonePreviewReadback = has(artifact =>
        artifact.action === 'phone-preview'
        && artifact.channel === 'phone-preview'
        && (artifact.readback === 'phone' || isVisualReadback(artifact.readback))
      )
      if (!hasPhonePreviewReadback) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-readback-missing',
          message: 'Mobile preview proof lacks phone-side readback for the exact artifact.',
          suggestion: 'Use phone-preview evidence; local browser, PC editor DOM, and PC paste evidence do not prove final mobile rendering.',
          location: requirementId,
        })
      } else if (!has(artifact =>
        artifact.action === 'phone-preview'
        && artifact.channel === 'phone-preview'
        && (artifact.readback === 'phone' || isVisualReadback(artifact.readback))
        && artifact.phonePreviewContentVerified === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-phone-content-missing',
          message: 'Mobile preview proof does not prove that the final phone article content was opened and read back.',
          suggestion: 'Do not use scan/entry/setup evidence for mobile-preview; record phonePreviewContentVerified:true only after the exact artifact is visible in the phone preview article body.',
          location: requirementId,
        })
      }
      break
    }
    case 'phone-screenshot':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.kind === 'screenshot'
        && artifact.channel === 'phone-preview'
        && artifact.readback === 'screenshot'
      ))
      break
    case 'dark-mode-check': {
      const hasDarkModeReadback = has(artifact =>
        artifact.action === 'dark-mode-check'
        && artifact.channel === 'phone-preview'
        && (artifact.readback === 'phone' || artifact.readback === 'screenshot' || isVisualReadback(artifact.readback))
      )
      if (!hasDarkModeReadback) {
        requireStyleProof(issues, requirementId, false)
      } else if (!has(artifact =>
        artifact.action === 'dark-mode-check'
        && artifact.channel === 'phone-preview'
        && (artifact.readback === 'phone' || artifact.readback === 'screenshot' || isVisualReadback(artifact.readback))
        && artifact.darkModeEnabledVerified === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-dark-mode-not-verified',
          message: 'Dark Mode proof does not prove that mobile Dark Mode was enabled for the phone preview.',
          suggestion: 'Record darkModeEnabledVerified:true only after inspecting the exact phone preview artifact with mobile Dark Mode enabled.',
          location: requirementId,
        })
      }
      break
    }
    case 'cover-thumbnail-check': {
      const hasCoverThumbnailReadback = has(artifact =>
        artifact.action === 'cover-thumbnail-check'
        && artifact.channel === 'phone-preview'
        && (artifact.readback === 'phone' || artifact.readback === 'screenshot' || isVisualReadback(artifact.readback))
      )
      if (!hasCoverThumbnailReadback) {
        requireStyleProof(issues, requirementId, false)
      } else if (!has(artifact =>
        artifact.action === 'cover-thumbnail-check'
        && artifact.channel === 'phone-preview'
        && (artifact.readback === 'phone' || artifact.readback === 'screenshot' || isVisualReadback(artifact.readback))
        && artifact.coverThumbnailAccepted === true
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-cover-thumbnail-not-accepted',
          message: 'Cover thumbnail proof does not prove that the cover thumbnail was accepted in the phone preview entry.',
          suggestion: 'Record coverThumbnailAccepted:true only after the platform preview entry or phone share/list entry shows the exact accepted cover thumbnail.',
          location: requirementId,
        })
      }
      break
    }
    case 'credentialed-channel-response':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'credentialed-sync'
        && artifact.channel === 'credentialed-channel'
        && artifact.readback === 'api-response'
      ))
      break
    case 'sync-readback':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'sync-readback'
        && artifact.channel === 'credentialed-channel'
        && (artifact.readback === 'api-response' || artifact.readback === 'dom' || artifact.readback === 'visual-and-dom')
      ))
      break
    case 'published-url-or-platform-preview':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'published-preview'
        && (artifact.channel === 'public-web' || artifact.channel === 'phone-preview')
        && (artifact.readback === 'published-url' || isVisualReadback(artifact.readback))
      ))
      break
    case 'public-image-host':
      if (!has(artifact =>
        artifact.action === 'public-image-host-check'
        && (artifact.hostStatus === 'public-https' || artifact.hostStatus === 'platform-hosted')
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-public-image-host-missing',
          message: 'Image fallback proof lacks a public HTTPS or platform-hosted image host check.',
          suggestion: 'Record a public-image-host proof artifact; local, data, blob, temporary preview, or WeChat-only image URLs do not satisfy this requirement.',
          location: requirementId,
        })
      }
      break
    case 'xhs-artifact-manifest':
    case 'zhihu-artifact-manifest':
      if (!has(artifact =>
        artifact.kind === 'artifact-manifest'
        && artifact.action === 'artifact-manifest-validation'
        && artifact.readback === 'manifest'
      )) {
        addStyleProofIssue(issues, {
          id: 'style-proof-manifest-validation-missing',
          message: `${requirementId} proof lacks a validated artifact manifest entry.`,
          suggestion: 'Run the platform-specific image artifact manifest validator first, then reference only the redacted validation result in style proof.',
          location: requirementId,
        })
      }
      break
    case 'no-sensitive-artifact':
      requireStyleProof(issues, requirementId, has(artifact =>
        artifact.action === 'sensitive-hygiene-review'
        && artifact.readback === 'hygiene-log'
      ))
      break
  }
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
  return SENSITIVE_ARTIFACT_REF_PATTERNS.some(pattern => pattern.test(value))
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
  const status = getStyleProofAcceptanceAuditStatus(gate.gate, gate.status)

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
      }

      for (const artifactReport of choiceProgress.report.artifacts) {
        if (artifactReport.artifact.requirementId !== requirementReport.requirement.id) continue

        accumulator.artifactCount += 1
        if (artifactReport.status === 'accepted') accumulator.acceptedArtifactCount += 1
        if (artifactReport.sensitive) accumulator.sensitiveArtifactCount += 1
        if (artifactReport.unsafeForCommit) accumulator.unsafeCommitArtifactCount += 1

        for (const issue of artifactReport.issues) {
          accumulator.issueKeys.add(getStyleProofIssueKey(issue))
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
      const status = getStyleProofAcceptanceAuditStatus(accumulator.gate, progressStatus)

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
