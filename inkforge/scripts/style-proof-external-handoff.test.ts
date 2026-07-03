import { execFile, type ExecFileException } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface ExternalHandoffCliResult {
  exitCode: number
  stdout: string
  stderr: string
}

interface ExternalHandoffSummary {
  externalHandoffRows: number
  phoneRows: number
  externalAccountRows: number
  publicHostRows: number
  unsafeToAutomateRows: number
  mutatingRows: number
  safeExternalRows: number
  actionableLocalRows: number
}

interface ExternalHandoffRow {
  id: string
  platform: string
  requirementId: string
  boundary: string
  status: string
  blockerKinds: string[]
  issueIds: string[]
  freshnessIssueIds: string[]
  requiresExternalAccount: boolean
  requiresPhone: boolean
  safeToAutomate: boolean
  cannotClaim: boolean
  nextOperatorAction: string
}

interface ExternalHandoffNextRowRef {
  kind: string
  row: ExternalHandoffRow
}

interface ExternalHandoffCliFilters {
  platform: string | null
  kind: string | null
  status: string | null
  issueId: string | null
  nextOnly: boolean
  freshnessOnly: boolean
}

interface ExternalHandoffFilteredSummary {
  committedExternalHandoffRows: number
  filteredRows: number
  filteredNextRowRefs: number
  filteredNextRows: number
  phoneRows: number
  externalAccountRows: number
  publicHostRows: number
  unsafeToAutomateRows: number
  mutatingRows: number
  safeExternalRows: number
  cannotClaimRows: number
  freshnessIssueRows: number
  platforms: string[]
  kinds: string[]
  statuses: string[]
  issueIds: string[]
}

interface ExternalHandoffArtifactTemplate {
  requirementId: string
  requiredChannels: string[]
  requiredActions: string[]
  requiredReadbacks: string[]
  requiredFields: string[]
  forbiddenFields: string[]
  acceptedHostStatuses: string[]
  maxFreshnessDays: number | null
  redactionBoundary: string
  successCriteria: string[]
  failureSignals: string[]
}

interface ExternalHandoffArtifactDraftFieldChecklistItem {
  field: string
  value: null
  required: boolean
  forbidden: boolean
}

interface ExternalHandoffArtifactDraftTemplate {
  draftOnly: true
  notProof: true
  appendOnlyAfterExternalProof: true
  keepOutOfManifestUntilCollected: true
  requirementId: string
  platform: string
  choiceId: null
  baseFields: {
    id: null
    requirementId: string
    kind: null
    label: null
    platform: string
    choiceId: null
    channel: null
    action: null
    readback: null
    artifactFingerprint: null
    artifactRef: null
    exactArtifact: null
    collectedAt: null
    safeForCommit: null
    committed: null
    sensitive: null
    hostStatus: null
  }
  requiredVerificationFields: ExternalHandoffArtifactDraftFieldChecklistItem[]
  forbiddenVerificationFields: ExternalHandoffArtifactDraftFieldChecklistItem[]
  acceptedValues: {
    channels: string[]
    actions: string[]
    readbacks: string[]
    hostStatuses: string[]
  }
  redactionBoundary: string
  successCriteria: string[]
  failureSignals: string[]
  doNotInclude: string[]
}

interface ExternalHandoffTemplateInstructions {
  requiredChannels: string[]
  requiredActions: string[]
  requiredReadbacks: string[]
  requiredFields: string[]
  forbiddenFields: string[]
  acceptedHostStatuses: string[]
  maxFreshnessDays: number | null
  fillOnlyAfterExternalProof: true
  doNotInclude: string[]
  blankFields: {
    collectedAt: null
    channel: null
    action: null
    readback: null
    artifactRef: null
    notes: unknown[]
  }
  artifactDraftTemplate: ExternalHandoffArtifactDraftTemplate
}

interface ExternalHandoffManifestDraft {
  platform: string
  scope?: string
  choiceId?: string
  claimedEvidence: string[]
  artifacts: unknown[]
}

interface ExternalHandoffManifestDraftTemplate {
  draftOnly: true
  notProof: true
  format: 'StyleProofManifest'
  canClaimComplete: false
  platform: string
  targetRequirementId: string
  choiceIds: string[]
  drafts: ExternalHandoffManifestDraft[]
  intakeCommand: string
  artifactGuidance: {
    appendArtifactsOnlyAfterExternalProof: true
    keepArtifactsEmptyUntilCollected: true
    requiredFields: string[]
    forbiddenFields: string[]
    acceptedHostStatuses: string[]
    maxFreshnessDays: number | null
    artifactDraftTemplate: ExternalHandoffArtifactDraftTemplate
  }
}

interface ExternalHandoffTemplateRow {
  id: string
  templateOnly: true
  notProof: true
  platform: string
  choiceIds: string[]
  requirementId: string
  requirementLabel: string
  gate: string
  boundary: string
  status: string
  blockerKinds: string[]
  issueIds: string[]
  freshnessIssueIds: string[]
  cannotClaim: true
  cannotClaimReason: string | null
  nextOperatorAction: string
  artifactTemplate: ExternalHandoffArtifactTemplate
  operatorWorksheet: ExternalHandoffTemplateInstructions
  manifestDraftTemplate: ExternalHandoffManifestDraftTemplate
}

interface ExternalHandoffManifestDraftSourceRow {
  id: string
  platform: string
  choiceIds: string[]
  requirementId: string
  requirementLabel: string
  gate: string
  boundary: string
  status: string
  blockerKinds: string[]
  issueIds: string[]
  freshnessIssueIds: string[]
  cannotClaim: true
  cannotClaimReason: string | null
  nextOperatorAction: string
  artifactTemplate: ExternalHandoffArtifactTemplate
  artifactGuidance: ExternalHandoffManifestDraftTemplate['artifactGuidance']
}

interface ExternalHandoffTemplateNextRowRef {
  kind: string
  rowId: string
}

interface ExternalHandoffTemplatePacket {
  templateOnly: true
  notProof: true
  status: string
  canClaimComplete: false
  committedCanClaimComplete: boolean
  filters: ExternalHandoffCliFilters
  committedSummary: ExternalHandoffSummary
  filteredSummary: ExternalHandoffFilteredSummary
  recommendedNextAction: string | null
  rows: ExternalHandoffTemplateRow[]
  nextRowRefs: ExternalHandoffTemplateNextRowRef[]
  nextRows: string[]
}

interface ExternalHandoffManifestDraftPack {
  draftOnly: true
  notProof: true
  format: 'StyleProofManifestPack'
  status: string
  canClaimComplete: false
  committedCanClaimComplete: boolean
  filters: ExternalHandoffCliFilters
  committedSummary: ExternalHandoffSummary
  filteredSummary: ExternalHandoffFilteredSummary
  recommendedNextAction: string | null
  sourceRowIds: string[]
  sourceRows: ExternalHandoffManifestDraftSourceRow[]
  manifestCount: number
  intakeCommand: string
  mergeCommand: string
  guidance: {
    appendArtifactsOnlyAfterExternalProof: true
    keepArtifactsEmptyUntilCollected: true
    doNotInclude: string[]
  }
  manifests: ExternalHandoffManifestDraft[]
}

interface ExternalHandoffJsonPacket {
  canClaimComplete: boolean
  status: string
  canContinueLocally: boolean
  requiresOperator: boolean
  requiresPhone: boolean
  requiresExternalAccount: boolean
  requiresPublicHost: boolean
  containsUnsafeToAutomateRows: boolean
  containsMutatingPlatformRows: boolean
  recommendedNextAction: string | null
  cannotAutoCompleteReason: string | null
  summary: ExternalHandoffSummary
  rows: ExternalHandoffRow[]
  nextRowRefs: ExternalHandoffNextRowRef[]
  nextRows: ExternalHandoffRow[]
}

interface FilteredExternalHandoffJsonPacket extends ExternalHandoffJsonPacket {
  filters: ExternalHandoffCliFilters
  committedSummary: ExternalHandoffSummary
  filteredSummary: ExternalHandoffFilteredSummary
}

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(currentFilePath), '..')
const tsxCliPath = resolve(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const externalHandoffScriptPath = resolve(projectRoot, 'scripts', 'style-proof-external-handoff.ts')
const manifestIntakeScriptPath = resolve(projectRoot, 'scripts', 'style-proof-manifest-intake.ts')

const externalHandoffSensitiveFragments = [
  ['C:/Users', 'HP'].join('/'),
  ['C:', 'Users', 'HP'].join('\\'),
  ['profile', 'Dir'].join(''),
  ['session', 'id'].join(''),
  ['access', 'To', 'ken'].join(''),
  ['refresh', 'To', 'ken'].join(''),
  ['authorization', ':'].join(''),
  ['cookie', ':'].join(''),
  ['set', 'cookie'].join('-'),
  ['.', 'har'].join(''),
  ['qr', 'code'].join(''),
  ['scan', 'qr'].join('-'),
  ['private', ' material'].join(''),
]

function getCliEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      environment[key] = value
    }
  }

  environment.FORCE_COLOR = '0'
  environment.NO_COLOR = '1'

  return environment
}

function toCliText(value: string | Buffer): string {
  return Buffer.isBuffer(value) ? value.toString('utf8') : value
}

function getExitCode(error: ExecFileException | null): number {
  if (!error) {
    return 0
  }

  if (typeof error.code === 'number') {
    return error.code
  }

  if (typeof error.code === 'string') {
    const parsedCode = Number.parseInt(error.code, 10)
    if (Number.isFinite(parsedCode)) {
      return parsedCode
    }
  }

  return 1
}

function runExternalHandoffCli(args: readonly string[]): Promise<ExternalHandoffCliResult> {
  return new Promise(resolveCliRun => {
    execFile(
      process.execPath,
      [tsxCliPath, externalHandoffScriptPath, ...args],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env: getCliEnvironment(),
        maxBuffer: 2 * 1024 * 1024,
        timeout: 30_000,
      },
      (error, stdout, stderr) => {
        resolveCliRun({
          exitCode: getExitCode(error),
          stdout: toCliText(stdout),
          stderr: toCliText(stderr),
        })
      },
    )
  })
}

function runManifestIntakeCli(args: readonly string[]): Promise<ExternalHandoffCliResult> {
  return new Promise(resolveCliRun => {
    execFile(
      process.execPath,
      [tsxCliPath, manifestIntakeScriptPath, ...args],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env: getCliEnvironment(),
        maxBuffer: 2 * 1024 * 1024,
        timeout: 30_000,
      },
      (error, stdout, stderr) => {
        resolveCliRun({
          exitCode: getExitCode(error),
          stdout: toCliText(stdout),
          stderr: toCliText(stderr),
        })
      },
    )
  })
}

async function withRedactedManifestFile<T>(
  jsonText: string,
  run: (filePath: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'inkforge-style-proof-handoff-intake-'))
  const filePath = join(directory, 'redacted-manifest.json')
  try {
    await writeFile(filePath, jsonText, 'utf8')
    return await run(filePath)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasNumberKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every(key => typeof value[key] === 'number')
}

function isExternalHandoffSummary(value: unknown): value is ExternalHandoffSummary {
  return isRecord(value) && hasNumberKeys(value, [
    'externalHandoffRows',
    'phoneRows',
    'externalAccountRows',
    'publicHostRows',
    'unsafeToAutomateRows',
    'mutatingRows',
    'safeExternalRows',
    'actionableLocalRows',
  ])
}

function isExternalHandoffRow(value: unknown): value is ExternalHandoffRow {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.platform === 'string' &&
    typeof value.requirementId === 'string' &&
    typeof value.boundary === 'string' &&
    typeof value.status === 'string' &&
    Array.isArray(value.blockerKinds) &&
    value.blockerKinds.every(kind => typeof kind === 'string') &&
    Array.isArray(value.issueIds) &&
    value.issueIds.every(issueId => typeof issueId === 'string') &&
    Array.isArray(value.freshnessIssueIds) &&
    value.freshnessIssueIds.every(issueId => typeof issueId === 'string') &&
    typeof value.requiresExternalAccount === 'boolean' &&
    typeof value.requiresPhone === 'boolean' &&
    typeof value.safeToAutomate === 'boolean' &&
    typeof value.cannotClaim === 'boolean' &&
    typeof value.nextOperatorAction === 'string'
}

function isExternalHandoffNextRowRef(value: unknown): value is ExternalHandoffNextRowRef {
  return isRecord(value) &&
    typeof value.kind === 'string' &&
    isExternalHandoffRow(value.row)
}

function isExternalHandoffCliFilters(value: unknown): value is ExternalHandoffCliFilters {
  return isRecord(value) &&
    (typeof value.platform === 'string' || value.platform === null) &&
    (typeof value.kind === 'string' || value.kind === null) &&
    (typeof value.status === 'string' || value.status === null) &&
    (typeof value.issueId === 'string' || value.issueId === null) &&
    typeof value.nextOnly === 'boolean' &&
    typeof value.freshnessOnly === 'boolean'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isExternalHandoffFilteredSummary(value: unknown): value is ExternalHandoffFilteredSummary {
  return isRecord(value) &&
    hasNumberKeys(value, [
      'committedExternalHandoffRows',
      'filteredRows',
      'filteredNextRowRefs',
      'filteredNextRows',
      'phoneRows',
      'externalAccountRows',
      'publicHostRows',
      'unsafeToAutomateRows',
      'mutatingRows',
      'safeExternalRows',
      'cannotClaimRows',
      'freshnessIssueRows',
    ]) &&
    isStringArray(value.platforms) &&
    isStringArray(value.kinds) &&
    isStringArray(value.statuses) &&
    isStringArray(value.issueIds)
}

function isExternalHandoffJsonPacket(value: unknown): value is ExternalHandoffJsonPacket {
  return isRecord(value) &&
    typeof value.canClaimComplete === 'boolean' &&
    typeof value.status === 'string' &&
    typeof value.canContinueLocally === 'boolean' &&
    typeof value.requiresOperator === 'boolean' &&
    typeof value.requiresPhone === 'boolean' &&
    typeof value.requiresExternalAccount === 'boolean' &&
    typeof value.requiresPublicHost === 'boolean' &&
    typeof value.containsUnsafeToAutomateRows === 'boolean' &&
    typeof value.containsMutatingPlatformRows === 'boolean' &&
    (typeof value.recommendedNextAction === 'string' || value.recommendedNextAction === null) &&
    (typeof value.cannotAutoCompleteReason === 'string' || value.cannotAutoCompleteReason === null) &&
    isExternalHandoffSummary(value.summary) &&
    Array.isArray(value.rows) &&
    value.rows.every(isExternalHandoffRow) &&
    Array.isArray(value.nextRowRefs) &&
    value.nextRowRefs.every(isExternalHandoffNextRowRef) &&
    Array.isArray(value.nextRows) &&
    value.nextRows.every(isExternalHandoffRow)
}

function isFilteredExternalHandoffJsonPacket(value: unknown): value is FilteredExternalHandoffJsonPacket {
  return isExternalHandoffJsonPacket(value) &&
    isExternalHandoffCliFilters(value.filters) &&
    isExternalHandoffSummary(value.committedSummary) &&
    isExternalHandoffFilteredSummary(value.filteredSummary)
}

function isExternalHandoffArtifactTemplate(value: unknown): value is ExternalHandoffArtifactTemplate {
  return isRecord(value) &&
    typeof value.requirementId === 'string' &&
    isStringArray(value.requiredChannels) &&
    isStringArray(value.requiredActions) &&
    isStringArray(value.requiredReadbacks) &&
    isStringArray(value.requiredFields) &&
    isStringArray(value.forbiddenFields) &&
    isStringArray(value.acceptedHostStatuses) &&
    (typeof value.maxFreshnessDays === 'number' || value.maxFreshnessDays === null) &&
    typeof value.redactionBoundary === 'string' &&
    isStringArray(value.successCriteria) &&
    isStringArray(value.failureSignals)
}

function isExternalHandoffTemplateInstructions(
  value: unknown,
): value is ExternalHandoffTemplateInstructions {
  return isRecord(value) &&
    isStringArray(value.requiredChannels) &&
    isStringArray(value.requiredActions) &&
    isStringArray(value.requiredReadbacks) &&
    isStringArray(value.requiredFields) &&
    isStringArray(value.forbiddenFields) &&
    isStringArray(value.acceptedHostStatuses) &&
    (typeof value.maxFreshnessDays === 'number' || value.maxFreshnessDays === null) &&
    value.fillOnlyAfterExternalProof === true &&
    isStringArray(value.doNotInclude) &&
    isRecord(value.blankFields) &&
    value.blankFields.collectedAt === null &&
    value.blankFields.channel === null &&
    value.blankFields.action === null &&
    value.blankFields.readback === null &&
    value.blankFields.artifactRef === null &&
    Array.isArray(value.blankFields.notes) &&
    value.blankFields.notes.length === 0
}

function isExternalHandoffManifestDraft(value: unknown): value is ExternalHandoffManifestDraft {
  return isRecord(value) &&
    typeof value.platform === 'string' &&
    (typeof value.scope === 'string' || value.scope === undefined) &&
    (typeof value.choiceId === 'string' || value.choiceId === undefined) &&
    isStringArray(value.claimedEvidence) &&
    Array.isArray(value.artifacts) &&
    value.artifacts.length === 0
}

function isExternalHandoffManifestDraftTemplate(
  value: unknown,
): value is ExternalHandoffManifestDraftTemplate {
  return isRecord(value) &&
    value.draftOnly === true &&
    value.notProof === true &&
    value.format === 'StyleProofManifest' &&
    value.canClaimComplete === false &&
    typeof value.platform === 'string' &&
    typeof value.targetRequirementId === 'string' &&
    isStringArray(value.choiceIds) &&
    Array.isArray(value.drafts) &&
    value.drafts.length > 0 &&
    value.drafts.every(isExternalHandoffManifestDraft) &&
    typeof value.intakeCommand === 'string' &&
    isRecord(value.artifactGuidance) &&
    value.artifactGuidance.appendArtifactsOnlyAfterExternalProof === true &&
    value.artifactGuidance.keepArtifactsEmptyUntilCollected === true &&
    isStringArray(value.artifactGuidance.requiredFields) &&
    isStringArray(value.artifactGuidance.forbiddenFields) &&
    isStringArray(value.artifactGuidance.acceptedHostStatuses) &&
    (
      typeof value.artifactGuidance.maxFreshnessDays === 'number' ||
      value.artifactGuidance.maxFreshnessDays === null
    )
}

function isExternalHandoffTemplateRow(value: unknown): value is ExternalHandoffTemplateRow {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    value.templateOnly === true &&
    value.notProof === true &&
    typeof value.platform === 'string' &&
    isStringArray(value.choiceIds) &&
    typeof value.requirementId === 'string' &&
    typeof value.requirementLabel === 'string' &&
    typeof value.gate === 'string' &&
    typeof value.boundary === 'string' &&
    typeof value.status === 'string' &&
    isStringArray(value.blockerKinds) &&
    isStringArray(value.issueIds) &&
    isStringArray(value.freshnessIssueIds) &&
    value.cannotClaim === true &&
    (typeof value.cannotClaimReason === 'string' || value.cannotClaimReason === null) &&
    typeof value.nextOperatorAction === 'string' &&
    isExternalHandoffArtifactTemplate(value.artifactTemplate) &&
    isExternalHandoffTemplateInstructions(value.operatorWorksheet) &&
    isExternalHandoffManifestDraftTemplate(value.manifestDraftTemplate)
}

function isExternalHandoffTemplateNextRowRef(
  value: unknown,
): value is ExternalHandoffTemplateNextRowRef {
  return isRecord(value) &&
    typeof value.kind === 'string' &&
    typeof value.rowId === 'string'
}

function isExternalHandoffTemplatePacket(value: unknown): value is ExternalHandoffTemplatePacket {
  return isRecord(value) &&
    value.templateOnly === true &&
    value.notProof === true &&
    typeof value.status === 'string' &&
    value.canClaimComplete === false &&
    typeof value.committedCanClaimComplete === 'boolean' &&
    isExternalHandoffCliFilters(value.filters) &&
    isExternalHandoffSummary(value.committedSummary) &&
    isExternalHandoffFilteredSummary(value.filteredSummary) &&
    (typeof value.recommendedNextAction === 'string' || value.recommendedNextAction === null) &&
    Array.isArray(value.rows) &&
    value.rows.every(isExternalHandoffTemplateRow) &&
    Array.isArray(value.nextRowRefs) &&
    value.nextRowRefs.every(isExternalHandoffTemplateNextRowRef) &&
    isStringArray(value.nextRows)
}

function isExternalHandoffManifestDraftPack(value: unknown): value is ExternalHandoffManifestDraftPack {
  return isRecord(value) &&
    value.draftOnly === true &&
    value.notProof === true &&
    value.format === 'StyleProofManifestPack' &&
    typeof value.status === 'string' &&
    value.canClaimComplete === false &&
    typeof value.committedCanClaimComplete === 'boolean' &&
    isExternalHandoffCliFilters(value.filters) &&
    isExternalHandoffSummary(value.committedSummary) &&
    isExternalHandoffFilteredSummary(value.filteredSummary) &&
    (typeof value.recommendedNextAction === 'string' || value.recommendedNextAction === null) &&
    isStringArray(value.sourceRowIds) &&
    typeof value.manifestCount === 'number' &&
    typeof value.intakeCommand === 'string' &&
    typeof value.mergeCommand === 'string' &&
    isRecord(value.guidance) &&
    value.guidance.appendArtifactsOnlyAfterExternalProof === true &&
    value.guidance.keepArtifactsEmptyUntilCollected === true &&
    isStringArray(value.guidance.doNotInclude) &&
    Array.isArray(value.manifests) &&
    value.manifests.every(isExternalHandoffManifestDraft) &&
    value.manifestCount === value.manifests.length
}

function parseExternalHandoffJson(stdout: string): ExternalHandoffJsonPacket {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isExternalHandoffJsonPacket(parsed)) {
    throw new Error('style-proof external handoff JSON shape is invalid')
  }

  return parsed
}

function parseFilteredExternalHandoffJson(stdout: string): FilteredExternalHandoffJsonPacket {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isFilteredExternalHandoffJsonPacket(parsed)) {
    throw new Error('filtered style-proof external handoff JSON shape is invalid')
  }

  return parsed
}

function parseExternalHandoffTemplateJson(stdout: string): ExternalHandoffTemplatePacket {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isExternalHandoffTemplatePacket(parsed)) {
    throw new Error('style-proof external handoff template JSON shape is invalid')
  }

  return parsed
}

function parseExternalHandoffManifestDraftPack(stdout: string): ExternalHandoffManifestDraftPack {
  const parsed = JSON.parse(stdout.replace(/^\uFEFF+/, '')) as unknown
  if (!isExternalHandoffManifestDraftPack(parsed)) {
    throw new Error('style-proof external handoff manifest draft pack JSON shape is invalid')
  }

  return parsed
}

function expectNoSensitiveFragments(output: string): void {
  for (const fragment of externalHandoffSensitiveFragments) {
    expect(output).not.toContain(fragment)
  }
}

describe('style-proof external handoff CLI', { timeout: 60_000 }, () => {
  it('prints markdown handoff rows and blocks completion while external gates remain open', async () => {
    const result = await runExternalHandoffCli([])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('# Committed Style Proof External Handoff')
    expect(result.stdout).toContain('- Status: blocked-by-external')
    expect(result.stdout).toContain('- Can claim complete: no')
    expect(result.stdout).toContain('- Can continue locally: no')
    expect(result.stdout).toContain('- Requires operator: yes')
    expect(result.stdout).toContain('- Phone rows: 4')
    expect(result.stdout).toContain('- External account rows: 4')
    expect(result.stdout).toContain('- Public host rows: 0')
    expect(result.stdout).toContain('- External handoff rows: 8')
    expect(result.stdout).toContain('## Cannot-Claim Boundary')
    expect(result.stdout).toContain('Do not claim phone preview, mobile interaction, Dark Mode')
    expect(result.stdout).toContain('- phone-preview: wechat / cover-thumbnail-check / phone-preview:')
    expect(result.stdout).toContain('- external-account: wechat / credentialed-channel-response / credentialed-channel:')
    expect(result.stdout).not.toContain('style-proof-manifest-proof-stale')
    expectNoSensitiveFragments(result.stdout)
  })

  it('emits the raw handoff packet JSON without claiming external proof completion', async () => {
    const result = await runExternalHandoffCli(['--json'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')
    expectNoSensitiveFragments(result.stdout)

    const packet = parseExternalHandoffJson(result.stdout)
    expect(packet.status).toBe('blocked-by-external')
    expect(packet.canClaimComplete).toBe(false)
    expect(packet.canContinueLocally).toBe(false)
    expect(packet.requiresOperator).toBe(true)
    expect(packet.requiresPhone).toBe(true)
    expect(packet.requiresExternalAccount).toBe(true)
    expect(packet.requiresPublicHost).toBe(false)
    expect(packet.containsUnsafeToAutomateRows).toBe(true)
    expect(packet.containsMutatingPlatformRows).toBe(true)
    expect(packet.summary).toMatchObject({
      externalHandoffRows: 8,
      phoneRows: 4,
      externalAccountRows: 4,
      publicHostRows: 0,
      unsafeToAutomateRows: 4,
      mutatingRows: 4,
      manualDeferredOpenSteps: 7,
      safeExternalRows: 0,
      actionableLocalRows: 0,
    })
    expect(packet.rows).toHaveLength(8)
    expect(packet.nextRowRefs).toHaveLength(4)
    expect(packet.nextRows).toHaveLength(2)
    expect(packet.nextRowRefs.map(ref => ref.kind)).toEqual([
      'phone-preview',
      'external-account',
      'unsafe-to-automate',
      'mutating-platform',
    ])
    expect(packet.nextRowRefs.every(ref => ref.row.cannotClaim)).toBe(true)
    expect(packet.nextRowRefs.every(ref => !ref.row.safeToAutomate)).toBe(true)
    expect(packet.rows.some(row =>
      row.issueIds.includes('style-proof-manifest-proof-stale')
    )).toBe(false)
    expect(packet.rows.some(row =>
      row.freshnessIssueIds.includes('style-proof-manifest-proof-stale')
    )).toBe(false)
  })

  it('prints help with a successful exit code', async () => {
    const result = await runExternalHandoffCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain(
      'Usage: pnpm style-proof:external-handoff [--markdown|--json|--template|--manifest-drafts] [--platform <platform>] [--kind <kind>] [--status <status>] [--issue <issue-id>] [--freshness-only] [--next-only]'
    )
    expect(result.stdout).toContain('--markdown')
    expect(result.stdout).toContain('--json')
    expect(result.stdout).toContain('--template')
    expect(result.stdout).toContain('This is not proof and contains no completed artifact rows.')
    expect(result.stdout).toContain('empty StyleProofManifest draft skeletons for intake')
    expect(result.stdout).toContain('--manifest-drafts')
    expect(result.stdout).toContain('redacted { manifests: [...] } draft pack')
    expect(result.stdout).toContain('--platform')
    expect(result.stdout).toContain('--kind')
    expect(result.stdout).toContain('--status')
    expect(result.stdout).toContain('--issue')
    expect(result.stdout).toContain('--freshness-only')
    expect(result.stdout).toContain('--next-only')
    expect(result.stdout).toContain('--help')
    expect(result.stdout).toContain('pnpm --silent -C inkforge style-proof:external-handoff --json')
    expectNoSensitiveFragments(result.stdout)
  })

  it('rejects invalid output modes before reading or claiming proof success', async () => {
    const result = await runExternalHandoffCli(['--markdown', '--json'])
    const templateConflict = await runExternalHandoffCli(['--json', '--template'])
    const draftPackConflict = await runExternalHandoffCli(['--template', '--manifest-drafts'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Choose only one output mode: --markdown, --json, --template, or --manifest-drafts')
    expect(result.stdout).toContain('Usage: pnpm style-proof:external-handoff')
    expect(result.stdout).not.toContain('Can claim complete')

    expect(templateConflict.exitCode).toBe(2)
    expect(templateConflict.stderr).toContain('Choose only one output mode: --markdown, --json, --template, or --manifest-drafts')
    expect(templateConflict.stdout).toContain('Usage: pnpm style-proof:external-handoff')
    expect(templateConflict.stdout).not.toContain('Can claim complete')

    expect(draftPackConflict.exitCode).toBe(2)
    expect(draftPackConflict.stderr).toContain(
      'Choose only one output mode: --markdown, --json, --template, or --manifest-drafts',
    )
    expect(draftPackConflict.stdout).toContain('Usage: pnpm style-proof:external-handoff')
    expect(draftPackConflict.stdout).not.toContain('Can claim complete')
    expectNoSensitiveFragments([
      result.stdout,
      result.stderr,
      templateConflict.stdout,
      templateConflict.stderr,
      draftPackConflict.stdout,
      draftPackConflict.stderr,
    ].join('\n'))
  })

  it('rejects unknown arguments before reading or claiming proof success', async () => {
    const result = await runExternalHandoffCli(['--unknown-handoff-flag'])

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Unknown option: --unknown-handoff-flag')
    expect(result.stdout).toContain('Usage: pnpm style-proof:external-handoff')
    expect(result.stdout).not.toContain('Can claim complete')
    expectNoSensitiveFragments(`${result.stdout}\n${result.stderr}`)
  })

  it('filters JSON handoff rows by platform, gate kind, and next-row priority without claiming completion', async () => {
    const result = await runExternalHandoffCli([
      '--json',
      '--platform',
      'wechat',
      '--kind',
      'phone-preview',
      '--next-only',
    ])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')
    expectNoSensitiveFragments(result.stdout)

    const packet = parseFilteredExternalHandoffJson(result.stdout)
    expect(packet.status).toBe('blocked-by-external')
    expect(packet.canClaimComplete).toBe(false)
    expect(packet.filters).toEqual({
      platform: 'wechat',
      kind: 'phone-preview',
      status: null,
      issueId: null,
      nextOnly: true,
      freshnessOnly: false,
    })
    expect(packet.committedSummary.externalHandoffRows).toBe(8)
    expect(packet.filteredSummary).toMatchObject({
      committedExternalHandoffRows: 8,
      filteredRows: 1,
      filteredNextRowRefs: 1,
      filteredNextRows: 1,
      phoneRows: 1,
      externalAccountRows: 0,
      publicHostRows: 0,
      cannotClaimRows: 1,
      freshnessIssueRows: 0,
    })
    expect(packet.filteredSummary.platforms).toEqual(['wechat'])
    expect(packet.filteredSummary.kinds).toEqual(['phone-preview'])
    expect(packet.filteredSummary.statuses).toEqual(['blocked-by-external'])
    expect(packet.filteredSummary.issueIds).toEqual(['style-proof-manifest-requirement-missing'])
    expect(packet.rows).toHaveLength(1)
    expect(packet.nextRowRefs).toHaveLength(1)
    expect(packet.nextRows).toHaveLength(1)
    expect(packet.nextRowRefs[0]?.kind).toBe('phone-preview')
    expect(packet.rows[0]?.platform).toBe('wechat')
    expect(packet.rows[0]?.requiresPhone).toBe(true)
    expect(packet.rows[0]?.cannotClaim).toBe(true)
    expect(packet.rows[0]?.safeToAutomate).toBe(false)
  })

  it('prints a filtered markdown handoff view for operator collection focus', async () => {
    const result = await runExternalHandoffCli([
      '--platform=wechat',
      '--kind=phone-preview',
      '--next-only',
    ])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout).toContain('# Committed Style Proof External Handoff Filtered View')
    expect(result.stdout).toContain('- Platform: wechat')
    expect(result.stdout).toContain('- Kind: phone-preview')
    expect(result.stdout).toContain('- Status: all')
    expect(result.stdout).toContain('- Issue id: all')
    expect(result.stdout).toContain('- Freshness only: no')
    expect(result.stdout).toContain('- Next only: yes')
    expect(result.stdout).toContain('- Committed external handoff rows: 8')
    expect(result.stdout).toContain('- Filtered rows: 1')
    expect(result.stdout).toContain('- phone-preview: wechat / cover-thumbnail-check / phone-preview:')
    expect(result.stdout).not.toContain('- external-account:')
    expect(result.stdout).not.toContain('xiaohongshu /')
    expect(result.stdout).not.toContain('zhihu /')
    expectNoSensitiveFragments(result.stdout)
  })

  it('filters freshness-only stale rows after the PC proof refresh without treating absence as completion', async () => {
    const result = await runExternalHandoffCli([
      '--json',
      '--platform=wechat',
      '--kind=external-account',
      '--status',
      'invalid',
      '--issue',
      'style-proof-manifest-proof-stale',
      '--freshness-only',
    ])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')
    expectNoSensitiveFragments(result.stdout)

    const packet = parseFilteredExternalHandoffJson(result.stdout)
    expect(packet.canClaimComplete).toBe(false)
    expect(packet.filters).toEqual({
      platform: 'wechat',
      kind: 'external-account',
      status: 'invalid',
      issueId: 'style-proof-manifest-proof-stale',
      nextOnly: false,
      freshnessOnly: true,
    })
    expect(packet.filteredSummary).toMatchObject({
      committedExternalHandoffRows: 8,
      filteredRows: 0,
      filteredNextRowRefs: 0,
      filteredNextRows: 0,
      externalAccountRows: 0,
      freshnessIssueRows: 0,
      cannotClaimRows: 0,
    })
    expect(packet.filteredSummary.platforms).toEqual([])
    expect(packet.filteredSummary.kinds).toEqual([])
    expect(packet.filteredSummary.statuses).toEqual([])
    expect(packet.filteredSummary.issueIds).toEqual([])
    expect(packet.rows).toHaveLength(0)
  })

  it('prints a redacted operator worksheet template for the next credentialed proof row without creating proof', async () => {
    const result = await runExternalHandoffCli([
      '--template',
      '--platform=wechat',
      '--kind=external-account',
      '--status=unsafe-to-automate',
      '--issue=style-proof-manifest-requirement-missing',
      '--next-only',
    ])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expect(result.stdout.trim()).not.toContain('\n')
    expectNoSensitiveFragments(result.stdout)

    const template = parseExternalHandoffTemplateJson(result.stdout)
    expect(template.templateOnly).toBe(true)
    expect(template.notProof).toBe(true)
    expect(template.canClaimComplete).toBe(false)
    expect(template.committedCanClaimComplete).toBe(false)
    expect(template.filters).toEqual({
      platform: 'wechat',
      kind: 'external-account',
      status: 'unsafe-to-automate',
      issueId: 'style-proof-manifest-requirement-missing',
      nextOnly: true,
      freshnessOnly: false,
    })
    expect(template.filteredSummary).toMatchObject({
      committedExternalHandoffRows: 8,
      filteredRows: 1,
      filteredNextRowRefs: 1,
      filteredNextRows: 1,
      externalAccountRows: 1,
      freshnessIssueRows: 0,
      cannotClaimRows: 1,
    })
    expect(template.rows).toHaveLength(1)
    expect(template.nextRowRefs).toHaveLength(1)
    expect(template.nextRows).toHaveLength(1)

    const row = template.rows[0]
    expect(row?.templateOnly).toBe(true)
    expect(row?.notProof).toBe(true)
    expect(row?.cannotClaim).toBe(true)
    expect(row?.platform).toBe('wechat')
    expect(row?.requirementId).toBe('credentialed-channel-response')
    expect(row?.status).toBe('unsafe-to-automate')
    expect(row?.issueIds).toContain('style-proof-manifest-requirement-missing')
    expect(row?.freshnessIssueIds).toEqual([])
    expect(row?.artifactTemplate.requirementId).toBe(row?.requirementId)
    expect(row?.operatorWorksheet.requiredFields).toContain('collectedAt')
    expect(row?.operatorWorksheet.requiredChannels).toEqual(row?.artifactTemplate.requiredChannels)
    expect(row?.operatorWorksheet.requiredActions).toEqual(row?.artifactTemplate.requiredActions)
    expect(row?.operatorWorksheet.requiredReadbacks).toEqual(row?.artifactTemplate.requiredReadbacks)
    expect(row?.operatorWorksheet.fillOnlyAfterExternalProof).toBe(true)
    expect(row?.operatorWorksheet.blankFields).toEqual({
      collectedAt: null,
      channel: null,
      action: null,
      readback: null,
      artifactRef: null,
      notes: [],
    })
    expect(row?.operatorWorksheet.artifactDraftTemplate).toMatchObject({
      draftOnly: true,
      notProof: true,
      appendOnlyAfterExternalProof: true,
      keepOutOfManifestUntilCollected: true,
      requirementId: row?.requirementId,
      platform: 'wechat',
      choiceId: null,
      baseFields: {
        id: null,
        requirementId: row?.requirementId,
        kind: null,
        label: null,
        platform: 'wechat',
        choiceId: null,
        channel: null,
        action: null,
        readback: null,
        artifactFingerprint: null,
        artifactRef: null,
        exactArtifact: null,
        collectedAt: null,
        safeForCommit: null,
        committed: null,
        sensitive: null,
        hostStatus: null,
      },
      acceptedValues: {
        channels: row?.artifactTemplate.requiredChannels,
        actions: row?.artifactTemplate.requiredActions,
        readbacks: row?.artifactTemplate.requiredReadbacks,
        hostStatuses: row?.artifactTemplate.acceptedHostStatuses,
      },
    })
    expect(row?.operatorWorksheet.artifactDraftTemplate.requiredVerificationFields).toContainEqual({
      field: 'externalAccountAuthenticated',
      value: null,
      required: true,
      forbidden: false,
    })
    expect(row?.operatorWorksheet.artifactDraftTemplate.forbiddenVerificationFields).toContainEqual({
      field: 'externalAccountLoginBlocked',
      value: null,
      required: false,
      forbidden: true,
    })
    expect(row?.operatorWorksheet.artifactDraftTemplate.redactionBoundary).toBe(
      row?.artifactTemplate.redactionBoundary,
    )
    expect(row?.operatorWorksheet.artifactDraftTemplate.successCriteria).toEqual(
      row?.artifactTemplate.successCriteria,
    )
    expect(row?.operatorWorksheet.artifactDraftTemplate.failureSignals).toEqual(
      row?.artifactTemplate.failureSignals,
    )
    expect(row?.operatorWorksheet.artifactDraftTemplate.doNotInclude).toContain(
      'raw account session material',
    )
    expect(row?.manifestDraftTemplate).toMatchObject({
      draftOnly: true,
      notProof: true,
      format: 'StyleProofManifest',
      canClaimComplete: false,
      platform: 'wechat',
      targetRequirementId: row?.requirementId,
      artifactGuidance: {
        appendArtifactsOnlyAfterExternalProof: true,
        keepArtifactsEmptyUntilCollected: true,
      },
    })
    expect(row?.manifestDraftTemplate.choiceIds).toEqual(row?.choiceIds)
    expect(row?.manifestDraftTemplate.artifactGuidance.requiredFields).toEqual(
      row?.artifactTemplate.requiredFields,
    )
    expect(row?.manifestDraftTemplate.artifactGuidance.forbiddenFields).toEqual(
      row?.artifactTemplate.forbiddenFields,
    )
    expect(row?.manifestDraftTemplate.artifactGuidance.artifactDraftTemplate).toEqual(
      row?.operatorWorksheet.artifactDraftTemplate,
    )
    expect(row?.manifestDraftTemplate.intakeCommand).toBe(
      'pnpm --silent -C inkforge style-proof:manifest-intake --file <redacted-manifest.json> --json',
    )
    expect(row?.manifestDraftTemplate.drafts.length).toBeGreaterThan(0)
    for (const draft of row?.manifestDraftTemplate.drafts ?? []) {
      expect(draft.platform).toBe('wechat')
      expect(draft.scope).toBe('style-choice')
      expect(row?.choiceIds).toContain(draft.choiceId)
      expect(draft.claimedEvidence).toEqual([])
      expect(draft.artifacts).toEqual([])
    }
    expect(result.stdout).not.toContain('"canClaimComplete":true')
    expect(result.stdout).not.toContain('"acceptedArtifactCount"')
    expect(result.stdout).not.toContain('"artifacts":[{')
  })

  it('feeds template manifest draft skeletons into manifest-intake without schema errors or proof claims', async () => {
    const templateResult = await runExternalHandoffCli([
      '--template',
      '--platform=wechat',
      '--kind=external-account',
      '--status=unsafe-to-automate',
      '--issue=style-proof-manifest-requirement-missing',
      '--next-only',
    ])
    const template = parseExternalHandoffTemplateJson(templateResult.stdout)
    const manifests = template.rows.flatMap(row => row.manifestDraftTemplate.drafts)

    expect(manifests).toHaveLength(4)
    expect(manifests.every(manifest => manifest.artifacts.length === 0)).toBe(true)

    const result = await withRedactedManifestFile(
      JSON.stringify({ manifests }),
      filePath => runManifestIntakeCli(['--file', filePath, '--json']),
    )

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expectNoSensitiveFragments(result.stdout)

    const report = JSON.parse(result.stdout) as unknown
    if (!isRecord(report) || !isRecord(report.summary) || !isRecord(report.issueIds)) {
      throw new Error('style-proof manifest intake JSON shape is invalid')
    }
    const schemaIssues = report.issueIds.schema
    const semanticIssues = report.issueIds.semantic
    if (!Array.isArray(schemaIssues) || !Array.isArray(semanticIssues)) {
      throw new Error('style-proof manifest intake issue arrays are invalid')
    }

    expect(report.canClaimComplete).toBe(false)
    expect(report.status).not.toBe('schema-invalid')
    expect(report.summary.inputManifestCount).toBe(4)
    expect(report.summary.acceptedManifestCount).toBe(4)
    expect(report.summary.schemaErrorCount).toBe(0)
    expect(report.summary.schemaWarningCount).toBe(0)
    expect(report.summary.artifactCount).toBe(0)
    expect(schemaIssues).toHaveLength(0)
    expect(semanticIssues.length).toBeGreaterThan(0)
    expect(result.stdout).not.toContain('"canClaimComplete":true')
    expect(result.stdout).not.toContain('"artifacts":[{')
  })

  it('defers Zhihu public-host worksheet rows out of this release handoff scope', async () => {
    const result = await runExternalHandoffCli([
      '--template',
      '--platform=zhihu',
      '--kind=public-host',
      '--status=blocked-by-external',
      '--issue=style-proof-manifest-requirement-missing',
      '--next-only',
    ])

    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('')
    expectNoSensitiveFragments(result.stdout)

    const template = parseExternalHandoffTemplateJson(result.stdout)
    expect(template.rows).toHaveLength(0)
    expect(template.filteredSummary).toMatchObject({
      committedExternalHandoffRows: 8,
      filteredRows: 0,
      filteredNextRows: 0,
      publicHostRows: 0,
      cannotClaimRows: 0,
    })
    expect(result.stdout).not.toContain('"canClaimComplete":true')
    expect(result.stdout).not.toContain('"artifacts":[{')
  })

  it('prints a deduplicated manifest draft pack for the next external rows without creating proof', async () => {
    const draftPackResult = await runExternalHandoffCli(['--manifest-drafts', '--next-only'])

    expect(draftPackResult.exitCode).toBe(1)
    expect(draftPackResult.stderr.trim()).toBe('')
    expect(draftPackResult.stdout.trim()).not.toContain('\n')
    expectNoSensitiveFragments(draftPackResult.stdout)

    const draftPack = parseExternalHandoffManifestDraftPack(draftPackResult.stdout)
    expect(draftPack).toMatchObject({
      draftOnly: true,
      notProof: true,
      format: 'StyleProofManifestPack',
      canClaimComplete: false,
      committedCanClaimComplete: false,
      filters: {
        platform: null,
        kind: null,
        status: null,
        issueId: null,
        nextOnly: true,
        freshnessOnly: false,
      },
    })
    expect(draftPack.filteredSummary).toMatchObject({
      committedExternalHandoffRows: 8,
      filteredRows: 2,
      filteredNextRows: 2,
      phoneRows: 1,
      externalAccountRows: 1,
      publicHostRows: 0,
      cannotClaimRows: 2,
      freshnessIssueRows: 0,
    })
    expect(draftPack.sourceRowIds).toEqual([
      'committed-style-proof:wechat:cover-thumbnail-check:phone-preview:phone-preview',
      'committed-style-proof:wechat:credentialed-channel-response:credentialed-channel:credentialed-channel',
    ])
    expect(draftPack.sourceRows.map(row => row.id)).toEqual(draftPack.sourceRowIds)
    expect(draftPack.sourceRows).toHaveLength(2)
    const credentialedSourceRow = draftPack.sourceRows.find(
      row => row.requirementId === 'credentialed-channel-response',
    )
    expect(credentialedSourceRow?.artifactGuidance.artifactDraftTemplate).toMatchObject({
      draftOnly: true,
      notProof: true,
      appendOnlyAfterExternalProof: true,
      keepOutOfManifestUntilCollected: true,
      platform: 'wechat',
      requirementId: 'credentialed-channel-response',
      baseFields: {
        platform: 'wechat',
        requirementId: 'credentialed-channel-response',
        channel: null,
        action: null,
        readback: null,
      },
    })
    expect(
      credentialedSourceRow?.artifactGuidance.artifactDraftTemplate.requiredVerificationFields,
    ).toContainEqual({
      field: 'externalAccountAuthenticated',
      value: null,
      required: true,
      forbidden: false,
    })
    expect(draftPack.sourceRows.some(row => row.requirementId === 'public-image-host')).toBe(false)
    expect(draftPack.manifestCount).toBe(17)
    expect(draftPack.manifests).toHaveLength(17)
    expect(draftPack.intakeCommand).toBe(
      'pnpm --silent -C inkforge style-proof:manifest-intake --file <redacted-manifest.json> --json',
    )
    expect(draftPack.mergeCommand).toBe(
      'pnpm --silent -C inkforge style-proof:manifest-merge --file <redacted-manifest.json> --json',
    )
    expect(draftPack.guidance).toMatchObject({
      appendArtifactsOnlyAfterExternalProof: true,
      keepArtifactsEmptyUntilCollected: true,
    })
    expect(draftPack.guidance.doNotInclude).toContain('raw account session material')
    expect(draftPack.guidance.doNotInclude).toContain('local browser-runtime directories')
    expect(new Set(draftPack.manifests.map(manifest =>
      `${manifest.platform}:${manifest.scope ?? ''}:${manifest.choiceId ?? ''}`,
    )).size).toBe(draftPack.manifestCount)
    expect(draftPack.manifests.every(manifest => manifest.artifacts.length === 0)).toBe(true)
    expect(draftPack.manifests.every(manifest => manifest.claimedEvidence.length === 0)).toBe(true)
    expect(draftPack.manifests.filter(manifest => manifest.platform === 'wechat')).toHaveLength(17)
    expect(draftPack.manifests.filter(manifest => manifest.platform === 'zhihu')).toHaveLength(0)
    expect(draftPackResult.stdout).not.toContain('"canClaimComplete":true')
    expect(draftPackResult.stdout).not.toContain('"artifacts":[{')
  })

  it('feeds manifest-drafts output directly into manifest-intake as an incomplete draft pack', async () => {
    const draftPackResult = await runExternalHandoffCli(['--manifest-drafts', '--next-only'])
    const draftPack = parseExternalHandoffManifestDraftPack(draftPackResult.stdout)

    const intakeResult = await withRedactedManifestFile(
      JSON.stringify({ manifests: draftPack.manifests }),
      filePath => runManifestIntakeCli(['--file', filePath, '--json']),
    )

    expect(intakeResult.exitCode).toBe(1)
    expect(intakeResult.stderr.trim()).toBe('')
    expectNoSensitiveFragments(intakeResult.stdout)

    const report = JSON.parse(intakeResult.stdout) as unknown
    if (!isRecord(report) || !isRecord(report.summary) || !isRecord(report.issueIds)) {
      throw new Error('style-proof manifest intake JSON shape is invalid')
    }
    const schemaIssues = report.issueIds.schema
    const semanticIssues = report.issueIds.semantic
    if (!Array.isArray(schemaIssues) || !Array.isArray(semanticIssues)) {
      throw new Error('style-proof manifest intake issue arrays are invalid')
    }

    expect(report.canClaimComplete).toBe(false)
    expect(report.status).not.toBe('schema-invalid')
    expect(report.summary.inputManifestCount).toBe(draftPack.manifestCount)
    expect(report.summary.acceptedManifestCount).toBe(draftPack.manifestCount)
    expect(report.summary.schemaErrorCount).toBe(0)
    expect(report.summary.schemaWarningCount).toBe(0)
    expect(report.summary.artifactCount).toBe(0)
    expect(schemaIssues).toHaveLength(0)
    expect(semanticIssues.length).toBeGreaterThan(0)
    expect(intakeResult.stdout).not.toContain('"canClaimComplete":true')
    expect(intakeResult.stdout).not.toContain('"artifacts":[{')
  })

  it('rejects invalid filter values before reading or claiming proof success', async () => {
    const invalidPlatform = await runExternalHandoffCli(['--platform', 'unknown-platform'])
    const invalidKind = await runExternalHandoffCli(['--kind=unknown-kind'])
    const invalidStatus = await runExternalHandoffCli(['--status', 'unknown-status'])
    const invalidIssue = await runExternalHandoffCli(['--issue', '../secret'])
    const missingPlatform = await runExternalHandoffCli(['--platform'])

    expect(invalidPlatform.exitCode).toBe(2)
    expect(invalidPlatform.stderr).toContain('Invalid platform filter: unknown-platform')
    expect(invalidPlatform.stdout).toContain('Usage: pnpm style-proof:external-handoff')
    expect(invalidPlatform.stdout).not.toContain('Can claim complete')

    expect(invalidKind.exitCode).toBe(2)
    expect(invalidKind.stderr).toContain('Invalid kind filter: unknown-kind')
    expect(invalidKind.stdout).toContain('Usage: pnpm style-proof:external-handoff')
    expect(invalidKind.stdout).not.toContain('Can claim complete')

    expect(invalidStatus.exitCode).toBe(2)
    expect(invalidStatus.stderr).toContain('Invalid status filter: unknown-status')
    expect(invalidStatus.stdout).toContain('Usage: pnpm style-proof:external-handoff')
    expect(invalidStatus.stdout).not.toContain('Can claim complete')

    expect(invalidIssue.exitCode).toBe(2)
    expect(invalidIssue.stderr).toContain('Invalid issue filter: ../secret')
    expect(invalidIssue.stdout).toContain('Usage: pnpm style-proof:external-handoff')
    expect(invalidIssue.stdout).not.toContain('Can claim complete')

    expect(missingPlatform.exitCode).toBe(2)
    expect(missingPlatform.stderr).toContain('Missing value for --platform')
    expect(missingPlatform.stdout).toContain('Usage: pnpm style-proof:external-handoff')
    expect(missingPlatform.stdout).not.toContain('Can claim complete')
    expectNoSensitiveFragments([
      invalidPlatform.stdout,
      invalidPlatform.stderr,
      invalidKind.stdout,
      invalidKind.stderr,
      invalidStatus.stdout,
      invalidStatus.stderr,
      invalidIssue.stdout,
      invalidIssue.stderr,
      missingPlatform.stdout,
      missingPlatform.stderr,
    ].join('\n'))
  })
})
