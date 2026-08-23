import { calculateBlobSha256 } from '../asset-pipeline/hash'
import {
  collectWritingComponentOccurrences,
  listWritingComponentDefinitions,
  renderWritingComponentVisualBody,
  type WritingComponentDefinition,
  type WritingComponentProp,
  type WritingComponentProps,
} from '../writing-components'
import {
  resolveDeliveryAdornmentSlots,
  type DeliveryPlatformComponent,
} from './delivery-adornments'

export type WechatNativeComponentKind = 'song' | 'profile' | 'article' | 'media'
export type WechatComponentDisposition =
  | 'safe-rich-text'
  | 'manual-native-insert'
  | 'blocked'
export type WechatNativeHandoffStatus = 'manual-native-insert' | 'blocked'

export interface WechatComponentRegistryMatrixRow {
  componentId: string
  label: string
  disposition: WechatComponentDisposition
  fallback: 'safe-rich-text' | 'static-safe-html'
  nativeKind: WechatNativeComponentKind | null
  requiredFields: string[]
  handoff: string | null
  validator: 'writing-component-registry'
  localEvidence: 'not-run' | 'local'
  externalEvidence: 'not-required' | 'not-run'
}

export interface WechatNativeComponentHandoff {
  occurrenceKey: string
  source: 'body' | 'delivery'
  componentId: string
  label: string
  nativeKind: WechatNativeComponentKind
  expectedIdentity: string
  anchor: string
  requiredFields: string[]
  action: string
  fallbackAvailable: boolean
  status: WechatNativeHandoffStatus
  issues: string[]
}

export interface WechatNativeComponentHandoffReport {
  platform: 'wechat'
  artifactFingerprint: string
  valid: boolean
  registryMatrix: WechatComponentRegistryMatrixRow[]
  currentArtifactOccurrenceCount: number
  currentArtifactExecutedOccurrenceCount: number
  handoffs: WechatNativeComponentHandoff[]
  issues: string[]
  externalReadbackRequired: true
  nativeInsertionProven: false
  published: false
}

export interface BuildWechatNativeComponentHandoffReportInput {
  markdown: string
  artifactContent: string
  deliveryConfig?: unknown
}

export function formatWechatNativeComponentHandoffReport(
  report: WechatNativeComponentHandoffReport,
): string {
  const rows = report.handoffs.map((handoff, index) => [
    `${index + 1}. ${handoff.label}｜${handoff.expectedIdentity || '缺少真实可见名称'}`,
    `   状态：${handoff.status}`,
    `   位置：${handoff.anchor}`,
    `   操作：${handoff.action}`,
    `   occurrence：${handoff.occurrenceKey}`,
    ...(handoff.issues.length ? [`   阻断：${handoff.issues.join('；')}`] : []),
  ].join('\n'))
  return [
    '# 微信原生组件人工交接',
    `artifact: ${report.artifactFingerprint}`,
    `registry: ${report.registryMatrix.length}`,
    'nativeInsertionProven: false',
    'published: false',
    '',
    'registry-state:',
    ...report.registryMatrix.map(row => `- ${row.componentId}: ${row.localEvidence}`),
    '',
    ...(rows.length ? rows : ['当前产物没有需要平台原生插入的组件。']),
  ].join('\n')
}

function nativeKindForDefinition(
  definition: WritingComponentDefinition,
): WechatNativeComponentKind | null {
  const fields = new Set(definition.fields.map(field => field.key))
  if (definition.category === '微信' && fields.has('kind') && fields.has('title')) return 'media'
  if (fields.has('title') && fields.has('artist') && fields.has('url')) return 'song'
  if (fields.has('displayName') && fields.has('accountId')) return 'profile'
  if (fields.has('title') && fields.has('summary') && fields.has('url')) return 'article'
  return null
}

function actionForNativeKind(kind: WechatNativeComponentKind): string {
  switch (kind) {
    case 'song':
      return '在微信公众号编辑器的音乐入口搜索真实歌曲，插入后核对歌曲名、作者和正文顺序。'
    case 'profile':
      return '在微信公众号编辑器插入真实公众号名片，核对可见名称、账号和正文顺序。'
    case 'article':
      return '在微信公众号编辑器插入真实文章卡片，核对可见标题和正文顺序。'
    case 'media':
      return '按真实媒体类型使用微信公众号编辑器原生入口插入，核对可见标题、类型和正文顺序。'
  }
}

function buildRegistryMatrix(
  definitions: WritingComponentDefinition[],
  localEvidenceById: ReadonlyMap<string, 'not-run' | 'local'>,
): WechatComponentRegistryMatrixRow[] {
  return definitions.map(definition => {
    const nativeKind = nativeKindForDefinition(definition)
    return {
      componentId: definition.id,
      label: definition.label,
      disposition: nativeKind ? 'manual-native-insert' : 'safe-rich-text',
      fallback: nativeKind ? 'static-safe-html' : 'safe-rich-text',
      nativeKind,
      requiredFields: definition.fields.filter(field => field.required).map(field => field.label),
      handoff: nativeKind ? actionForNativeKind(nativeKind) : null,
      validator: 'writing-component-registry',
      localEvidence: localEvidenceById.get(definition.id) ?? 'not-run',
      externalEvidence: nativeKind ? 'not-run' : 'not-required',
    }
  })
}

function propText(value: WritingComponentProp | undefined): string {
  return (Array.isArray(value) ? value.join(' ') : String(value ?? ''))
    .replace(/\s+/g, ' ')
    .trim()
}

function expectedIdentity(
  kind: WechatNativeComponentKind,
  props: WritingComponentProps,
): string {
  switch (kind) {
    case 'song':
      return [propText(props.title), propText(props.artist)].filter(Boolean).join(' · ')
    case 'profile':
      return [propText(props.displayName), propText(props.accountId)].filter(Boolean).join(' · ')
    case 'article':
      return propText(props.title)
    case 'media':
      return [propText(props.kind), propText(props.title)].filter(Boolean).join(' · ')
  }
}

function normalizeContext(line: string): string {
  return line
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[\s>#*+\-\d.)`_[\]]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

function findContext(
  lines: string[],
  componentLines: Set<number>,
  start: number,
  step: -1 | 1,
): string {
  for (let index = start; index >= 0 && index < lines.length; index += step) {
    if (componentLines.has(index + 1)) continue
    const context = normalizeContext(lines[index])
    if (context) return context
  }
  return step < 0 ? '文首' : '文末'
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

async function sha256(value: string): Promise<string> {
  return `sha256:${await calculateBlobSha256(new Blob([value], { type: 'text/plain;charset=utf-8' }))}`
}

function deliveryNativeKind(
  component: DeliveryPlatformComponent,
): WechatNativeComponentKind | null {
  if (component.type === 'song') return 'song'
  if (component.type === 'contact-card') return 'profile'
  if (component.type === 'related-article') return 'article'
  return null
}

function deliveryIdentity(
  component: DeliveryPlatformComponent,
  kind: WechatNativeComponentKind,
): string {
  if (kind === 'song' && component.type === 'song') {
    return [component.title, component.artist].filter(Boolean).join(' · ')
  }
  if (kind === 'profile' && component.type === 'contact-card') {
    return [component.displayName, component.accountId].filter(Boolean).join(' · ')
  }
  if (kind === 'article' && component.type === 'related-article') return component.title
  return ''
}

function deliveryFallbackAvailable(component: DeliveryPlatformComponent): boolean {
  if (component.type === 'song' || component.type === 'related-article') return Boolean(component.url)
  return component.type === 'contact-card' && Boolean(component.displayName)
}

function normalizeVisibleText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/&#(\d+);/gu, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim()
}

function artifactReadyComponentMarkerCount(artifactContent: string, componentId: string): number {
  let count = 0
  for (const match of artifactContent.matchAll(/<[^>]*>/giu)) {
    const tag = match[0]
    const renderedId = tag.match(/data-ink-component-id\s*=\s*["']([^"']+)["']/iu)?.[1]
    const status = tag.match(/data-ink-component-status\s*=\s*["']([^"']+)["']/iu)?.[1]
    if (renderedId === componentId && status?.toLowerCase() === 'ready') count += 1
  }
  return count
}

function artifactComponentMarkerCount(artifactContent: string, componentId: string): number {
  let count = 0
  for (const match of artifactContent.matchAll(/data-ink-component-id\s*=\s*["']([^"']+)["']/giu)) {
    if (match[1] === componentId) count += 1
  }
  return count
}

function countVisibleTextOccurrences(value: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let offset = 0
  while (true) {
    const index = value.indexOf(needle, offset)
    if (index < 0) return count
    count += 1
    offset = index + needle.length
  }
}

function occurrencesWereRendered(
  artifactContent: string,
  occurrences: ReturnType<typeof collectWritingComponentOccurrences>,
): boolean {
  if (!occurrences.length || occurrences.some(occurrence => occurrence.parsed.status !== 'ready')) return false
  const componentId = occurrences[0].parsed.definition?.id
  if (!componentId) return false
  const markerCount = artifactComponentMarkerCount(artifactContent, componentId)
  if (markerCount > 0) {
    return markerCount === occurrences.length
      && artifactReadyComponentMarkerCount(artifactContent, componentId) === markerCount
  }

  const artifactText = normalizeVisibleText(artifactContent)
  const requiredTextCounts = new Map<string, number>()
  for (const occurrence of occurrences) {
    const renderedBody = renderWritingComponentVisualBody(occurrence.parsed.source)
    const renderedText = renderedBody ? normalizeVisibleText(renderedBody) : ''
    if (!renderedText) return false
    requiredTextCounts.set(renderedText, (requiredTextCounts.get(renderedText) ?? 0) + 1)
  }
  return Array.from(requiredTextCounts).every(([renderedText, requiredCount]) => (
    countVisibleTextOccurrences(artifactText, renderedText) >= requiredCount
  ))
}

export async function buildWechatNativeComponentHandoffReport(
  input: BuildWechatNativeComponentHandoffReportInput,
): Promise<WechatNativeComponentHandoffReport> {
  if (!input.artifactContent.trim()) throw new Error('微信原生产物为空，无法生成原生组件交接。')

  const artifactFingerprint = await sha256(input.artifactContent)
  const definitions = listWritingComponentDefinitions()
  const definitionIds = new Set(definitions.map(definition => definition.id))
  const occurrences = collectWritingComponentOccurrences(input.markdown)
  const localEvidenceById = new Map<string, 'not-run' | 'local'>()
  for (const definition of definitions) {
    const definitionOccurrences = occurrences.filter(
      occurrence => occurrence.parsed.definition?.id === definition.id,
    )
    const rendered = occurrencesWereRendered(input.artifactContent, definitionOccurrences)
    localEvidenceById.set(definition.id, rendered ? 'local' : 'not-run')
  }
  const registryMatrix = buildRegistryMatrix(definitions, localEvidenceById)
  const currentArtifactExecutedOccurrenceCount = occurrences.filter(occurrence => {
    const componentId = occurrence.parsed.definition?.id
    return componentId !== undefined && localEvidenceById.get(componentId) === 'local'
  }).length
  const registryById = new Map(registryMatrix.map(row => [row.componentId, row]))
  const componentLines = new Set(occurrences.map(item => item.line))
  const lines = input.markdown.split('\n')
  const issues: string[] = []
  const handoffs: WechatNativeComponentHandoff[] = []
  const anchorGroups = new Map<string, number[]>()

  const definitionIdCounts = new Map<string, number>()
  for (const definition of definitions) {
    definitionIdCounts.set(definition.id, (definitionIdCounts.get(definition.id) ?? 0) + 1)
  }
  for (const [componentId, count] of definitionIdCounts) {
    if (count > 1) issues.push(`当前 registry 含重复组件 ID：${componentId}。`)
  }
  for (const row of registryMatrix) {
    const occurrenceCount = occurrences.filter(
      occurrence => occurrence.parsed.definition?.id === row.componentId,
    ).length
    const markerCount = artifactComponentMarkerCount(input.artifactContent, row.componentId)
    if (markerCount > occurrenceCount) {
      issues.push(`产物组件“${row.label}”的 occurrence 数量为 ${markerCount}，当前 Markdown 为 ${occurrenceCount}。`)
    }
    if (occurrenceCount > 0 && row.localEvidence === 'not-run') {
      issues.push(`组件“${row.label}”未在当前 Markdown/artifact 中完成本地执行。`)
    }
  }
  for (const match of input.artifactContent.matchAll(/data-ink-component-id\s*=\s*["']([^"']+)["']/giu)) {
    const componentId = match[1]
    if (componentId && !definitionIds.has(componentId)) {
      issues.push(`产物包含未在当前 registry 注册的组件：${componentId}。`)
    }
  }

  for (const occurrence of occurrences) {
    const parsed = occurrence.parsed
    if (!parsed.definition) {
      issues.push(`第 ${occurrence.ordinal + 1} 个正文组件未在当前 registry 注册。`)
      continue
    }
    const matrix = registryById.get(parsed.definition.id)
    const nativeKind = matrix?.nativeKind ?? null
    if (!nativeKind) {
      if (parsed.status !== 'ready') {
        issues.push(`组件“${parsed.definition.label}”未通过 registry 校验。`)
      }
      continue
    }

    const before = findContext(lines, componentLines, occurrence.line - 2, -1)
    const after = findContext(lines, componentLines, occurrence.line, 1)
    const identity = expectedIdentity(nativeKind, parsed.node?.props ?? {})
    const anchorSignature = stableJson({ nativeKind, identity, before, after })
    const anchorIndexes = anchorGroups.get(anchorSignature) ?? []
    anchorIndexes.push(handoffs.length)
    anchorGroups.set(anchorSignature, anchorIndexes)
    const propsHash = await sha256(stableJson(parsed.node?.props ?? {}))
    const rowIssues = [...parsed.issues]
    if (!identity) rowIssues.push('缺少可用于平台读回的真实可见名称或标题。')
    const occurrenceKey = await sha256([
      artifactFingerprint,
      String(occurrence.ordinal),
      parsed.definition.id,
      propsHash,
    ].join('\n'))
    handoffs.push({
      occurrenceKey,
      source: 'body',
      componentId: parsed.definition.id,
      label: parsed.definition.label,
      nativeKind,
      expectedIdentity: identity,
      anchor: `“${before}”之后、“${after}”之前（正文第 ${occurrence.ordinal + 1} 个组件）`,
      requiredFields: matrix?.requiredFields ?? [],
      action: actionForNativeKind(nativeKind),
      fallbackAvailable: renderWritingComponentVisualBody(parsed.source) !== null,
      status: rowIssues.length === 0 ? 'manual-native-insert' : 'blocked',
      issues: rowIssues,
    })
  }

  for (const indexes of anchorGroups.values()) {
    if (indexes.length < 2) continue
    for (const index of indexes) {
      handoffs[index].status = 'blocked'
      handoffs[index].issues.push('正文锚点不唯一，不能可靠映射平台原生组件。')
    }
  }

  if (input.deliveryConfig !== undefined) {
    const resolved = resolveDeliveryAdornmentSlots(input.deliveryConfig)
    if (!resolved.valid || !resolved.config) {
      issues.push(...resolved.issues.map(issue => `交付配置：${issue}`))
    } else {
      const idCounts = new Map<string, number>()
      for (const component of resolved.config.components) {
        idCounts.set(component.id, (idCounts.get(component.id) ?? 0) + 1)
      }
      for (const [index, component] of resolved.config.components.entries()) {
        const nativeKind = deliveryNativeKind(component)
        if (!nativeKind || !component.enabled) continue
        const identity = deliveryIdentity(component, nativeKind)
        const duplicate = (idCounts.get(component.id) ?? 0) > 1
        const rowIssues = [
          ...(identity ? [] : ['缺少可用于平台读回的真实可见名称或标题。']),
          ...(duplicate ? ['交付组件 ID 重复，不能可靠选择唯一实例。'] : []),
        ]
        const anchor = component === resolved.config.components.find(item => item.id === resolved.mastheadSong?.componentId)
          ? '文章抬头歌曲位'
          : component === resolved.afterBodyProfile
            ? '正文结束后的关注名片位'
            : `文末附加内容第 ${index + 1} 位`
        const occurrenceKey = await sha256([
          artifactFingerprint,
          `delivery:${index}`,
          component.type,
          await sha256(stableJson(component)),
        ].join('\n'))
        handoffs.push({
          occurrenceKey,
          source: 'delivery',
          componentId: component.type,
          label: nativeKind === 'profile' ? '名片' : nativeKind === 'article' ? '关联文章' : '歌曲',
          nativeKind,
          expectedIdentity: identity,
          anchor,
          requiredFields: nativeKind === 'profile' ? ['名称'] : ['标题'],
          action: actionForNativeKind(nativeKind),
          fallbackAvailable: deliveryFallbackAvailable(component),
          status: rowIssues.length === 0 ? 'manual-native-insert' : 'blocked',
          issues: rowIssues,
        })
      }
    }
  }

  for (const handoff of handoffs) {
    if (handoff.status === 'blocked') issues.push(`${handoff.label}：${handoff.issues.join('；')}`)
  }

  return {
    platform: 'wechat',
    artifactFingerprint,
    valid: issues.length === 0,
    registryMatrix,
    currentArtifactOccurrenceCount: occurrences.length,
    currentArtifactExecutedOccurrenceCount,
    handoffs,
    issues,
    externalReadbackRequired: true,
    nativeInsertionProven: false,
    published: false,
  }
}
