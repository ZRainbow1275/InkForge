import { z } from 'zod'

import { sha256Hex } from '@/core/authority/hash'
import { AppError, ErrorCode, logger } from '@/services/error'
import { isTauriEnv, tauriInvoke } from '@/utils/platform'

import type { ResolvedImage, UploadResult } from './image-pipeline/types'

const WECHAT_CREDENTIAL_KEYS = ['WECHAT_APP_ID', 'WECHAT_APP_SECRET'] as const
const WECHAT_IMAGE_HOSTS = new Set(['mmbiz.qpic.cn', 'mmbiz.qlogo.cn'])
const WECHAT_ARTICLE_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png'])
const WECHAT_PERMANENT_IMAGE_MIME_TYPES = new Set(['image/bmp', 'image/gif', 'image/jpeg', 'image/png'])
const WECHAT_UPLOAD_KIND_LABELS = {
  article: '正文图片',
  cover: '永久封面素材',
} as const
const INKFORGE_ASSET_PREFIX = 'inkforge-asset://'
export const WECHAT_DRAFT_TITLE_MAX_CHARS = 32
const WECHAT_DRAFT_AUTHOR_MAX_CHARS = 16
const WECHAT_DRAFT_DIGEST_MAX_CHARS = 120
const WECHAT_ARTICLE_CONTENT_MAX_CHARS = 20_000
const WECHAT_ARTICLE_CONTENT_MAX_BYTES = 1024 * 1024
const WECHAT_DRAFT_CONTENT_SOURCE_URL_MAX_BYTES = 1024
const WECHAT_COVER_HANDLE_PATTERN = /^[a-f0-9]{32}$/i
const WECHAT_DRAFT_PUBLISH_PLAN_SCHEMA_VERSION = 'wechat-draft-publish-plan/v1' as const

type WechatUploadKind = keyof typeof WECHAT_UPLOAD_KIND_LABELS

const WechatCredentialSourceSchema = z.enum([
  'process-env',
  'env.local',
  'mixed',
  'web-runtime',
  'none',
])

const WechatPublishStatusSchema = z.object({
  configured: z.boolean(),
  missingKeys: z.array(z.string()),
  source: WechatCredentialSourceSchema,
  appIdHint: z.string().nullable().optional(),
})

const WechatArticleImageUploadSchema = z.object({
  remoteUrl: z.string().url(),
})

const WechatCoverUploadSchema = z.object({
  remoteUrl: z.string().url(),
  coverHandle: z.string().regex(WECHAT_COVER_HANDLE_PATTERN),
}).strict()

const WechatDraftCreateSchema = z.object({
  articleCount: z.number().int().positive(),
}).strict()

export type WechatPublishStatus = z.infer<typeof WechatPublishStatusSchema>
export type WechatCredentialSource = z.infer<typeof WechatCredentialSourceSchema>

export interface WechatUploadSource {
  filename?: string
  mimeType?: string
  dataUrl?: string
  remoteUrl?: string
}

export interface WechatCoverUploadResult extends UploadResult {
  coverHandle: string
}

export interface WechatDraftArticleInput {
  title: string
  content: string
  coverHandle: string
  author?: string
  digest?: string
  showCoverPic?: 0 | 1
  contentSourceUrl?: string
  needOpenComment?: 0 | 1
  onlyFansCanComment?: 0 | 1
}

export interface WechatDraftCreateResult {
  articleCount: number
  createdAt: string
}

export interface WechatDraftPublishInput extends Omit<WechatDraftArticleInput, 'content' | 'coverHandle'> {
  contentHtml: string
  coverHandle?: string
  coverImage?: ResolvedImage
}

export interface WechatDraftPublishResult extends WechatDraftCreateResult {
  coverHandle: string
  uploadedContentHtml: string
  uploadedImageCount: number
}

export interface WechatHtmlRewriteResult {
  html: string
  uploadedImages: UploadResult[]
}

export type WechatDraftPublishReasonCode =
  | 'metadata-invalid'
  | 'content-invalid'
  | 'dom-unavailable'
  | 'article-image-invalid'
  | 'cover-handle-invalid'
  | 'cover-image-missing'
  | 'cover-image-invalid'

export interface WechatDraftPublishPlanIssue {
  code: WechatDraftPublishReasonCode
  message: string
}

export interface WechatDraftPublishSideEffectUpperBounds {
  draftCreates: 1
  articleImageUploads: number
  permanentCoverUploads: 0 | 1
}

export interface WechatDraftPublishPlan {
  schemaVersion: typeof WECHAT_DRAFT_PUBLISH_PLAN_SCHEMA_VERSION
  eligible: boolean
  inputFingerprint: string
  planFingerprint: string
  reasons: readonly WechatDraftPublishPlanIssue[]
  limits: {
    titleChars: number
    titleMaxChars: number
    contentChars: number
    contentMaxCharsExclusive: number
    contentBytes: number
    contentMaxBytesExclusive: number
  }
  images: {
    uniqueNonWechatImageCount: number
    uniqueWechatHostedImageCount: number
    preparedArticleUploadCount: number
    preparedLocalArticleSourceCount: number
  }
  cover: {
    state: 'existing-handle-unverified' | 'upload-required' | 'missing' | 'invalid-handle' | 'invalid-image'
    remoteValidityUnverified: boolean
  }
  unverifiedRemote: {
    httpSourceReachability: boolean
    httpSourceMimeTruth: boolean
    coverHandleOwnership: boolean
  }
  sideEffectUpperBounds: WechatDraftPublishSideEffectUpperBounds
}

export interface WechatDraftPublishApproval {
  planFingerprint: string
  targetMatched: true
  verificationMethod: 'visible-editor-confirmation'
  approvedSideEffectUpperBounds: WechatDraftPublishSideEffectUpperBounds
}

interface PreparedWechatArticleImage {
  src: string
  input: WechatUploadSource
}

interface PreparedWechatDraftPublish {
  metadata: Pick<WechatDraftArticleInput, 'title' | 'author' | 'digest' | 'contentSourceUrl'>
  contentHtml: string
  coverHandle?: string
  showCoverPic?: 0 | 1
  needOpenComment?: 0 | 1
  onlyFansCanComment?: 0 | 1
  articleImages: readonly PreparedWechatArticleImage[]
  coverInput?: WechatUploadSource
}

const preparedWechatDraftPlans = new WeakMap<WechatDraftPublishPlan, PreparedWechatDraftPublish>()
const approvedWechatDraftPlans = new WeakMap<WechatDraftPublishApproval, WechatDraftPublishPlan>()

function parseSrcsetUrls(srcset: string): string[] {
  return srcset
    .split(',')
    .map(candidate => candidate.trim().split(/\s+/)[0])
    .filter((candidate): candidate is string => Boolean(candidate))
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = ''
    const chunkSize = 0x8000
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    return btoa(binary)
  }

  const maybeBuffer = (globalThis as { Buffer?: { from(input: Uint8Array): { toString(enc: string): string } } }).Buffer
  if (maybeBuffer) {
    return maybeBuffer.from(bytes).toString('base64')
  }

  throw new AppError(ErrorCode.UNKNOWN_ERROR, 'No base64 encoder available in current runtime')
}

function mimeTypeFromDataUrl(dataUrl: string): string | undefined {
  const match = /^data:([^;,]+)[;,]/i.exec(dataUrl)
  return match?.[1] ? normalizeImageMimeType(match[1]) : undefined
}

function normalizeImageMimeType(mimeType?: string): string | undefined {
  const normalized = mimeType?.split(';')[0]?.trim().toLowerCase()
  if (!normalized) return undefined
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized
}

function extensionFromMime(mimeType?: string): string {
  switch (normalizeImageMimeType(mimeType)) {
    case 'image/bmp': return 'bmp'
    case 'image/gif': return 'gif'
    case 'image/png': return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/svg+xml': return 'svg'
    default: return 'bin'
  }
}

function inferFilename(image: ResolvedImage, mimeType?: string): string {
  const candidates = [image.resolvedUrl, image.src]
  for (const candidate of candidates) {
    try {
      if (!candidate || candidate.startsWith('data:') || candidate.startsWith('blob:')) continue
      const pathname = new URL(candidate).pathname
      const leaf = pathname.split('/').filter(Boolean).pop()
      if (leaf) return leaf
    } catch {
      // ignore invalid URLs and fall back below
    }
  }
  return `wechat-upload.${extensionFromMime(mimeType ?? image.mimeType)}`
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

function normalizeWechatDraftMetadata(
  article: Pick<WechatDraftArticleInput, 'title' | 'author' | 'digest' | 'contentSourceUrl'>,
): Pick<WechatDraftArticleInput, 'title' | 'author' | 'digest' | 'contentSourceUrl'> {
  const normalized: Pick<
    WechatDraftArticleInput,
    'title' | 'author' | 'digest' | 'contentSourceUrl'
  > = { title: article.title.trim() }
  const author = article.author?.trim()
  const digest = article.digest?.trim()
  const contentSourceUrl = article.contentSourceUrl?.trim()
  if (author) normalized.author = author
  if (digest) normalized.digest = digest
  if (contentSourceUrl) normalized.contentSourceUrl = contentSourceUrl
  return normalized
}

function assertMaxChars(label: string, value: string | undefined, maxChars: number): void {
  if (!value) return
  const count = Array.from(value.trim()).length
  if (count > maxChars) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `微信草稿${label}不能超过 ${maxChars} 字，当前为 ${count} 字`,
      { label, maxChars, count },
    )
  }
}

function assertMaxBytes(label: string, value: string | undefined, maxBytes: number): void {
  if (!value) return
  const bytes = byteLength(value.trim())
  if (bytes > maxBytes) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `微信草稿${label}不能超过 ${maxBytes} 字节，当前为 ${bytes} 字节`,
      { label, maxBytes, bytes },
    )
  }
}

function assertWechatDraftMetadata(
  article: Pick<WechatDraftArticleInput, 'title' | 'author' | 'digest' | 'contentSourceUrl'>,
): void {
  if (!article.title.trim()) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿标题不能为空')
  }
  assertMaxChars('标题', article.title, WECHAT_DRAFT_TITLE_MAX_CHARS)
  assertMaxChars('作者', article.author, WECHAT_DRAFT_AUTHOR_MAX_CHARS)
  assertMaxChars('摘要', article.digest, WECHAT_DRAFT_DIGEST_MAX_CHARS)
  assertMaxBytes('原文链接', article.contentSourceUrl, WECHAT_DRAFT_CONTENT_SOURCE_URL_MAX_BYTES)
  if (article.contentSourceUrl?.trim()) {
    let parsed: URL
    try {
      parsed = new URL(article.contentSourceUrl.trim())
    } catch {
      throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿原文链接必须是有效 URL')
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿原文链接必须使用 HTTP(S) URL')
    }
  }
}

function assertWechatDraftContent(content: string): void {
  if (!content.trim()) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿正文不能为空')
  }
  if (byteLength(content) >= WECHAT_ARTICLE_CONTENT_MAX_BYTES) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `微信草稿正文必须小于 ${WECHAT_ARTICLE_CONTENT_MAX_BYTES} 字节`,
      { maxBytes: WECHAT_ARTICLE_CONTENT_MAX_BYTES, bytes: byteLength(content) },
    )
  }
  if (Array.from(content).length >= WECHAT_ARTICLE_CONTENT_MAX_CHARS) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `微信草稿正文必须少于 ${WECHAT_ARTICLE_CONTENT_MAX_CHARS} 字符`,
    )
  }
}

function assertWechatDraftImagesUploaded(content: string): void {
  const foreignImages = collectNonWechatHostedImages(content)
  if (foreignImages.length > 0) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `微信草稿正文仍包含未上传到微信的图片: ${foreignImages.slice(0, 3).join(', ')}`,
      { foreignImages: foreignImages.slice(0, 10) },
    )
  }
}

function assertWechatDraftArticleInput(article: WechatDraftArticleInput): void {
  assertWechatDraftMetadata(article)
  assertWechatDraftContent(article.content)
  assertWechatDraftOptions(article)
  if (!WECHAT_COVER_HANDLE_PATTERN.test(article.coverHandle.trim())) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿封面句柄无效，请重新上传正文首图')
  }

  assertWechatDraftImagesUploaded(article.content)
}

function assertWechatDraftOptions(
  article: Pick<WechatDraftArticleInput, 'showCoverPic' | 'needOpenComment' | 'onlyFansCanComment'>,
): void {
  const values = [article.showCoverPic, article.needOpenComment, article.onlyFansCanComment]
  if (!values.every(value => value === undefined || value === 0 || value === 1)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿封面与评论选项必须是 0 或 1')
  }
}

function buildWebRuntimeStatus(): WechatPublishStatus {
  return {
    configured: false,
    missingKeys: [...WECHAT_CREDENTIAL_KEYS],
    source: 'web-runtime',
    appIdHint: null,
  }
}

function supportedMimeTypesForUpload(kind: WechatUploadKind): Set<string> {
  return kind === 'cover' ? WECHAT_PERMANENT_IMAGE_MIME_TYPES : WECHAT_ARTICLE_IMAGE_MIME_TYPES
}

function supportedMimeLabelForUpload(kind: WechatUploadKind): string {
  return kind === 'cover' ? 'BMP/GIF/JPG/PNG' : 'JPG/PNG'
}

function assertWechatUploadImage(
  image: ResolvedImage,
  kind: WechatUploadKind,
  source: string = image.resolvedUrl || image.src,
  mimeTypeHint?: string,
): void {
  const mimeType = normalizeImageMimeType(mimeTypeHint || image.mimeType || (source.startsWith('data:') ? mimeTypeFromDataUrl(source) : undefined))
  const lowerSource = source.toLowerCase()
  if (
    mimeType === 'image/svg+xml'
    || /\.svg(?:[?#].*)?$/i.test(lowerSource)
    || lowerSource.startsWith('data:image/svg+xml')
  ) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      '微信公众号图片上传默认要求先将 SVG 转为 PNG/JPG，再走素材接口',
      { src: image.src, mimeType },
    )
  }
  if (mimeType && !supportedMimeTypesForUpload(kind).has(mimeType)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `微信公众号${WECHAT_UPLOAD_KIND_LABELS[kind]}上传仅支持 ${supportedMimeLabelForUpload(kind)}，当前图片类型为 ${mimeType}`,
      { src: image.src, resolvedUrl: image.resolvedUrl, mimeType },
    )
  }
  const unsupportedByExtension = kind === 'cover'
    ? /\.(webp|avif)(?:[?#].*)?$/i
    : /\.(bmp|gif|webp|avif)(?:[?#].*)?$/i
  if (unsupportedByExtension.test(lowerSource)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `微信公众号${WECHAT_UPLOAD_KIND_LABELS[kind]}上传仅支持 ${supportedMimeLabelForUpload(kind)}，请先转换图片格式`,
      { src: image.src, resolvedUrl: image.resolvedUrl },
    )
  }
}

function extractAssetId(src: string): string {
  if (!src.startsWith(INKFORGE_ASSET_PREFIX)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, `Not an inkforge asset URL: ${src}`)
  }
  return src.slice(INKFORGE_ASSET_PREFIX.length)
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const mimeType = blob.type || 'application/octet-stream'
  const buffer = await blob.arrayBuffer()
  return `data:${mimeType};base64,${bytesToBase64(new Uint8Array(buffer))}`
}

async function resolveAssetDataUrl(src: string): Promise<string> {
  const assetId = extractAssetId(src)
  const { resolveAssetSnapshot } = await import('@/services/asset-pipeline/snapshot')
  const snapshot = await resolveAssetSnapshot(assetId, 'inline-base64')
  if (snapshot.status !== 'inline-base64' || !snapshot.dataUrl) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Asset ${assetId} 无法导出为 data URL，请先确认图片资产真实存在`,
      { assetId, status: snapshot.status },
    )
  }
  return snapshot.dataUrl
}

async function resolveBlobDataUrl(src: string): Promise<string> {
  const response = await fetch(src)
  if (!response.ok) {
    throw new AppError(ErrorCode.PARSE_FETCH_FAILED, `无法读取本地 blob 图片: ${response.status}`)
  }
  const blob = await response.blob()
  return blobToDataUrl(blob)
}

async function normalizeWechatUploadSource(image: ResolvedImage, kind: WechatUploadKind): Promise<WechatUploadSource> {
  const source = (image.resolvedUrl || image.src).trim()

  if (!source) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Image source is empty')
  }
  assertWechatUploadImage(image, kind, source)

  if (source.startsWith(INKFORGE_ASSET_PREFIX)) {
    const dataUrl = await resolveAssetDataUrl(source)
    const mimeType = mimeTypeFromDataUrl(dataUrl) ?? image.mimeType
    assertWechatUploadImage(image, kind, dataUrl, mimeType)
    return {
      dataUrl,
      filename: inferFilename(image, mimeType),
      mimeType,
    }
  }

  if (source.startsWith('data:')) {
    const mimeType = mimeTypeFromDataUrl(source) ?? image.mimeType
    assertWechatUploadImage(image, kind, source, mimeType)
    return {
      dataUrl: source,
      filename: inferFilename(image, mimeType),
      mimeType,
    }
  }

  if (source.startsWith('blob:')) {
    const dataUrl = await resolveBlobDataUrl(source)
    const mimeType = mimeTypeFromDataUrl(dataUrl) ?? image.mimeType
    assertWechatUploadImage(image, kind, dataUrl, mimeType)
    return {
      dataUrl,
      filename: inferFilename(image, mimeType),
      mimeType,
    }
  }

  if (/^https?:\/\//i.test(source)) {
    let remoteUrl: URL
    try {
      remoteUrl = new URL(source)
    } catch {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `微信公众号上传图片 URL 无效: ${source}`)
    }
    if (!['http:', 'https:'].includes(remoteUrl.protocol) || !remoteUrl.hostname) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `微信公众号上传图片 URL 无效: ${source}`)
    }
    return {
      remoteUrl: remoteUrl.href,
      filename: inferFilename(image),
      mimeType: image.mimeType,
    }
  }

  throw new AppError(
    ErrorCode.VALIDATION_ERROR,
    `微信公众号上传暂不支持该图片来源: ${source}`,
    { src: image.src, resolvedUrl: image.resolvedUrl },
  )
}

function ensureTauriRuntime(): void {
  if (!isTauriEnv()) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信公众号真实发布能力仅在 Tauri 桌面运行时可用')
  }
}

function parseWechatResponse<T>(schema: z.ZodSchema<T>, value: unknown, operation: string): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    logger.error(`微信发布响应解析失败: ${operation}`, parsed.error, { operation })
    throw new AppError(ErrorCode.UNKNOWN_ERROR, `微信发布响应格式异常: ${operation}`)
  }
  return parsed.data
}

function parseImageDimensions(image: Element): Pick<ResolvedImage, 'width' | 'height'> {
  const widthAttr = image.getAttribute('width')
  const heightAttr = image.getAttribute('height')
  const width = widthAttr ? Number.parseInt(widthAttr, 10) : undefined
  const height = heightAttr ? Number.parseInt(heightAttr, 10) : undefined
  return {
    width: Number.isFinite(width) ? width : undefined,
    height: Number.isFinite(height) ? height : undefined,
  }
}

function createResolvedImageFromTag(image: HTMLImageElement): ResolvedImage {
  const src = image.getAttribute('src')?.trim() || ''
  const mimeType = src.startsWith('data:') ? mimeTypeFromDataUrl(src) : undefined
  return {
    src,
    resolvedUrl: src,
    alt: image.getAttribute('alt') || undefined,
    mimeType,
    ...parseImageDimensions(image),
  }
}

function firstWechatDraftCoverImage(html: string): ResolvedImage | undefined {
  if (!html.trim() || typeof DOMParser === 'undefined') return undefined
  const image = new DOMParser().parseFromString(html, 'text/html').querySelector('img')
  if (!(image instanceof HTMLImageElement) || !image.getAttribute('src')?.trim()) return undefined
  return createResolvedImageFromTag(image)
}

function collectWechatDraftImages(html: string): {
  articleImages: readonly { src: string; image: ResolvedImage }[]
  uniqueWechatHostedImageCount: number
  invalidSrcsetOnlyImageCount: number
} {
  if (!html.trim()) {
    return { articleImages: [], uniqueWechatHostedImageCount: 0, invalidSrcsetOnlyImageCount: 0 }
  }
  if (typeof DOMParser === 'undefined') {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Current runtime does not provide DOMParser for WeChat HTML rewriting')
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const articleImages = new Map<string, ResolvedImage>()
  const hostedImages = new Set<string>()
  let invalidSrcsetOnlyImageCount = 0
  for (const image of Array.from(doc.querySelectorAll('img'))) {
    const src = image.getAttribute('src')?.trim()
    if (!src) {
      if (image.getAttribute('srcset')?.trim()) invalidSrcsetOnlyImageCount += 1
      continue
    }
    if (isWechatHostedContentImageUrl(src)) {
      hostedImages.add(src)
    } else if (!articleImages.has(src)) {
      articleImages.set(src, createResolvedImageFromTag(image))
    }
  }

  return {
    articleImages: Array.from(articleImages, ([src, image]) => ({ src, image })),
    uniqueWechatHostedImageCount: hostedImages.size,
    invalidSrcsetOnlyImageCount,
  }
}

async function getWechatUploadSourceFingerprint(input: WechatUploadSource): Promise<string> {
  return sha256Hex(JSON.stringify({
    dataUrl: input.dataUrl ?? null,
    filename: input.filename ?? null,
    mimeType: input.mimeType ?? null,
    remoteUrl: input.remoteUrl ?? null,
  }))
}

async function getWechatDraftPublishInputFingerprint(
  input: WechatDraftPublishInput,
  metadata: Pick<WechatDraftArticleInput, 'title' | 'author' | 'digest' | 'contentSourceUrl'>,
): Promise<string> {
  const coverImage = input.coverImage
  return sha256Hex(JSON.stringify({
    schemaVersion: WECHAT_DRAFT_PUBLISH_PLAN_SCHEMA_VERSION,
    metadata: {
      title: metadata.title,
      author: metadata.author ?? null,
      digest: metadata.digest ?? null,
      contentSourceUrl: metadata.contentSourceUrl ?? null,
    },
    contentHtml: input.contentHtml,
    coverHandle: input.coverHandle?.trim() || null,
    coverImage: coverImage ? {
      src: coverImage.src,
      resolvedUrl: coverImage.resolvedUrl,
      mimeType: coverImage.mimeType ?? null,
      width: coverImage.width ?? null,
      height: coverImage.height ?? null,
      alt: coverImage.alt ?? null,
    } : null,
    showCoverPic: input.showCoverPic ?? null,
    needOpenComment: input.needOpenComment ?? null,
    onlyFansCanComment: input.onlyFansCanComment ?? null,
  }))
}

async function getWechatDraftPublishPlanFingerprint(
  plan: Omit<WechatDraftPublishPlan, 'planFingerprint'>,
  prepared: PreparedWechatDraftPublish,
): Promise<string> {
  const articleUploadFingerprints = await Promise.all(
    prepared.articleImages.map(image => getWechatUploadSourceFingerprint(image.input)),
  )
  const coverUploadFingerprint = prepared.coverInput
    ? await getWechatUploadSourceFingerprint(prepared.coverInput)
    : null

  return sha256Hex(JSON.stringify({
    ...plan,
    reasons: plan.reasons.map(reason => reason.code),
    articleUploadFingerprints,
    coverUploadFingerprint,
  }))
}

function addWechatDraftPlanIssue(
  issues: WechatDraftPublishPlanIssue[],
  code: WechatDraftPublishReasonCode,
  message: string,
): void {
  if (!issues.some(issue => issue.code === code)) issues.push({ code, message })
}

export function isWechatHostedContentImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) && WECHAT_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

export async function getWechatPublishStatus(): Promise<WechatPublishStatus> {
  if (!isTauriEnv()) {
    return buildWebRuntimeStatus()
  }

  const raw = await tauriInvoke<unknown>('wechat_publish_status')
  return parseWechatResponse(WechatPublishStatusSchema, raw, 'wechat_publish_status')
}

async function uploadPreparedWechatArticleImage(input: WechatUploadSource): Promise<UploadResult> {
  ensureTauriRuntime()
  const raw = await tauriInvoke<unknown>('wechat_upload_article_image', { input })
  const result = parseWechatResponse(WechatArticleImageUploadSchema, raw, 'wechat_upload_article_image')
  return {
    remoteUrl: result.remoteUrl,
    uploadedAt: new Date().toISOString(),
  }
}

async function uploadPreparedWechatCoverImage(input: WechatUploadSource): Promise<WechatCoverUploadResult> {
  ensureTauriRuntime()
  const raw = await tauriInvoke<unknown>('wechat_upload_cover_image', { input })
  const result = parseWechatResponse(WechatCoverUploadSchema, raw, 'wechat_upload_cover_image')
  return {
    remoteUrl: result.remoteUrl,
    uploadedAt: new Date().toISOString(),
    coverHandle: result.coverHandle,
  }
}

export async function uploadWechatArticleImage(image: ResolvedImage): Promise<UploadResult> {
  if (isWechatHostedContentImageUrl(image.resolvedUrl)) {
    return {
      remoteUrl: image.resolvedUrl,
      uploadedAt: new Date().toISOString(),
    }
  }

  const input = await normalizeWechatUploadSource(image, 'article')
  return uploadPreparedWechatArticleImage(input)
}

export async function uploadWechatCoverImage(image: ResolvedImage): Promise<WechatCoverUploadResult> {
  const input = await normalizeWechatUploadSource(image, 'cover')
  return uploadPreparedWechatCoverImage(input)
}

async function prepareWechatArticleImages(html: string): Promise<readonly PreparedWechatArticleImage[]> {
  const collected = collectWechatDraftImages(html)
  return Promise.all(collected.articleImages.map(async ({ src, image }) => ({
    src,
    input: await normalizeWechatUploadSource(image, 'article'),
  })))
}

async function rewritePreparedWechatArticleImages(
  html: string,
  preparedImages: readonly PreparedWechatArticleImage[],
): Promise<WechatHtmlRewriteResult> {
  if (!html.trim()) return { html, uploadedImages: [] }
  if (typeof DOMParser === 'undefined') {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Current runtime does not provide DOMParser for WeChat HTML rewriting')
  }

  const uploads = new Map<string, UploadResult>()
  for (const preparedImage of preparedImages) {
    uploads.set(preparedImage.src, await uploadPreparedWechatArticleImage(preparedImage.input))
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const element of Array.from(doc.querySelectorAll('[srcset]'))) {
    element.removeAttribute('srcset')
  }
  for (const image of Array.from(doc.querySelectorAll('img'))) {
    const src = image.getAttribute('src')?.trim()
    if (!src) continue
    const upload = uploads.get(src)
    if (upload) image.setAttribute('src', upload.remoteUrl)
  }

  return {
    html: doc.body.innerHTML,
    uploadedImages: Array.from(uploads.values()),
  }
}

export async function rewriteWechatArticleImages(html: string): Promise<WechatHtmlRewriteResult> {
  return rewritePreparedWechatArticleImages(html, await prepareWechatArticleImages(html))
}

function collectNonWechatHostedImages(html: string): string[] {
  if (!html.trim() || typeof DOMParser === 'undefined') return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.querySelectorAll('img[src], [srcset]'))
    .flatMap(element => {
      const src = element.matches('img') ? element.getAttribute('src')?.trim() || '' : ''
      const srcset = element.getAttribute('srcset')?.trim()
      return srcset ? [src, ...parseSrcsetUrls(srcset)] : [src]
    })
    .filter(src => Boolean(src) && !isWechatHostedContentImageUrl(src))
}

export async function createWechatDraft(article: WechatDraftArticleInput): Promise<WechatDraftCreateResult> {
  ensureTauriRuntime()

  const normalizedArticle: WechatDraftArticleInput = {
    ...normalizeWechatDraftMetadata(article),
    content: article.content,
    coverHandle: article.coverHandle.trim(),
    showCoverPic: article.showCoverPic,
    needOpenComment: article.needOpenComment,
    onlyFansCanComment: article.onlyFansCanComment,
  }
  assertWechatDraftArticleInput(normalizedArticle)

  const raw = await tauriInvoke<unknown>('wechat_create_draft', { article: normalizedArticle })
  const result = parseWechatResponse(WechatDraftCreateSchema, raw, 'wechat_create_draft')
  return {
    articleCount: result.articleCount,
    createdAt: new Date().toISOString(),
  }
}

export async function planWechatDraftPublish(input: WechatDraftPublishInput): Promise<WechatDraftPublishPlan> {
  const metadata = normalizeWechatDraftMetadata(input)
  const issues: WechatDraftPublishPlanIssue[] = []
  try {
    assertWechatDraftMetadata(metadata)
    assertWechatDraftOptions(input)
  } catch {
    addWechatDraftPlanIssue(issues, 'metadata-invalid', '微信草稿标题、作者、摘要、原文链接或 0/1 选项不符合限制。')
  }
  try {
    assertWechatDraftContent(input.contentHtml)
  } catch {
    addWechatDraftPlanIssue(issues, 'content-invalid', '微信草稿正文为空或超过字符/字节限制。')
  }

  const inputFingerprint = await getWechatDraftPublishInputFingerprint(input, metadata)
  let collected: ReturnType<typeof collectWechatDraftImages> = {
    articleImages: [],
    uniqueWechatHostedImageCount: 0,
    invalidSrcsetOnlyImageCount: 0,
  }
  try {
    collected = collectWechatDraftImages(input.contentHtml)
  } catch {
    addWechatDraftPlanIssue(issues, 'dom-unavailable', '当前运行时无法解析微信草稿 HTML。')
  }
  if (collected.invalidSrcsetOnlyImageCount > 0) {
    addWechatDraftPlanIssue(issues, 'article-image-invalid', '至少一张正文图片只有 srcset 而没有可上传的 src。')
  }

  const articleImages: PreparedWechatArticleImage[] = []
  for (const candidate of collected.articleImages) {
    try {
      articleImages.push({
        src: candidate.src,
        input: await normalizeWechatUploadSource(candidate.image, 'article'),
      })
    } catch {
      addWechatDraftPlanIssue(issues, 'article-image-invalid', '至少一张正文图片的来源或格式不受微信公众号支持。')
    }
  }

  const coverHandle = input.coverHandle?.trim() || undefined
  const coverImage = input.coverImage ?? firstWechatDraftCoverImage(input.contentHtml)
  let coverState: WechatDraftPublishPlan['cover']['state']
  let coverInput: WechatUploadSource | undefined
  if (coverHandle && !WECHAT_COVER_HANDLE_PATTERN.test(coverHandle)) {
    coverState = 'invalid-handle'
    addWechatDraftPlanIssue(issues, 'cover-handle-invalid', '微信草稿封面句柄格式无效。')
  } else if (coverHandle) {
    coverState = 'existing-handle-unverified'
  } else if (!coverImage) {
    coverState = 'missing'
    addWechatDraftPlanIssue(issues, 'cover-image-missing', '正文至少需要一张真实图片作为微信公众号永久封面。')
  } else {
    try {
      coverInput = await normalizeWechatUploadSource(coverImage, 'cover')
      coverState = 'upload-required'
    } catch {
      coverState = 'invalid-image'
      addWechatDraftPlanIssue(issues, 'cover-image-invalid', '候选永久封面图片的来源或格式不受微信公众号支持。')
    }
  }

  const prepared: PreparedWechatDraftPublish = {
    metadata,
    contentHtml: input.contentHtml,
    coverHandle,
    showCoverPic: input.showCoverPic,
    needOpenComment: input.needOpenComment,
    onlyFansCanComment: input.onlyFansCanComment,
    articleImages,
    coverInput,
  }
  const sideEffectUpperBounds: WechatDraftPublishSideEffectUpperBounds = {
    draftCreates: 1,
    articleImageUploads: articleImages.length,
    permanentCoverUploads: coverState === 'upload-required' ? 1 : 0,
  }
  const planWithoutFingerprint: Omit<WechatDraftPublishPlan, 'planFingerprint'> = {
    schemaVersion: WECHAT_DRAFT_PUBLISH_PLAN_SCHEMA_VERSION,
    eligible: issues.length === 0,
    inputFingerprint,
    reasons: Object.freeze([...issues]),
    limits: Object.freeze({
      titleChars: Array.from(metadata.title).length,
      titleMaxChars: WECHAT_DRAFT_TITLE_MAX_CHARS,
      contentChars: Array.from(input.contentHtml).length,
      contentMaxCharsExclusive: WECHAT_ARTICLE_CONTENT_MAX_CHARS,
      contentBytes: byteLength(input.contentHtml),
      contentMaxBytesExclusive: WECHAT_ARTICLE_CONTENT_MAX_BYTES,
    }),
    images: Object.freeze({
      uniqueNonWechatImageCount: collected.articleImages.length,
      uniqueWechatHostedImageCount: collected.uniqueWechatHostedImageCount,
      preparedArticleUploadCount: articleImages.length,
      preparedLocalArticleSourceCount: articleImages.filter(image => Boolean(image.input.dataUrl)).length,
    }),
    cover: Object.freeze({
      state: coverState,
      remoteValidityUnverified: coverState === 'existing-handle-unverified' || Boolean(coverInput?.remoteUrl),
    }),
    unverifiedRemote: Object.freeze({
      httpSourceReachability: articleImages.some(image => Boolean(image.input.remoteUrl)) || Boolean(coverInput?.remoteUrl),
      httpSourceMimeTruth: articleImages.some(image => Boolean(image.input.remoteUrl)) || Boolean(coverInput?.remoteUrl),
      coverHandleOwnership: coverState === 'existing-handle-unverified',
    }),
    sideEffectUpperBounds: Object.freeze(sideEffectUpperBounds),
  }
  const plan = Object.freeze({
    ...planWithoutFingerprint,
    planFingerprint: await getWechatDraftPublishPlanFingerprint(planWithoutFingerprint, prepared),
  })
  if (plan.eligible) preparedWechatDraftPlans.set(plan, prepared)
  return plan
}

export function approveWechatDraftPublishPlan(
  plan: WechatDraftPublishPlan,
  approval: Omit<WechatDraftPublishApproval, 'planFingerprint'>,
): WechatDraftPublishApproval {
  if (!plan.eligible || !preparedWechatDraftPlans.has(plan)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿预检上下文已失效，请重新预检')
  }
  if (
    approval.targetMatched !== true
    || approval.verificationMethod !== 'visible-editor-confirmation'
    || !hasMatchingWechatDraftPublishBounds(approval.approvedSideEffectUpperBounds, plan.sideEffectUpperBounds)
  ) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿目标确认或副作用授权与预检计划不匹配')
  }

  const boundApproval = Object.freeze({
    ...approval,
    planFingerprint: plan.planFingerprint,
    approvedSideEffectUpperBounds: Object.freeze({ ...approval.approvedSideEffectUpperBounds }),
  })
  approvedWechatDraftPlans.set(boundApproval, plan)
  return boundApproval
}

function hasMatchingWechatDraftPublishBounds(
  approved: WechatDraftPublishSideEffectUpperBounds | undefined,
  planned: WechatDraftPublishSideEffectUpperBounds,
): boolean {
  if (!approved) return false
  return approved.draftCreates === planned.draftCreates
    && approved.articleImageUploads === planned.articleImageUploads
    && approved.permanentCoverUploads === planned.permanentCoverUploads
}

async function requireApprovedWechatDraftPublishPlan(
  input: WechatDraftPublishInput,
  plan: WechatDraftPublishPlan | undefined,
  approval: WechatDraftPublishApproval | undefined,
): Promise<PreparedWechatDraftPublish> {
  if (!plan || !approval) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿创建需要先完成本地预检并确认目标与副作用上限')
  }
  if (!plan.eligible) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, `微信草稿预检未通过: ${plan.reasons.map(reason => reason.message).join('；')}`)
  }
  if (approvedWechatDraftPlans.get(approval) !== plan) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿批准已复制、过期或不属于当前预检计划')
  }

  const prepared = preparedWechatDraftPlans.get(plan)
  if (!prepared) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿预检上下文已失效，请重新预检')
  }
  const currentInputFingerprint = await getWechatDraftPublishInputFingerprint(
    input,
    normalizeWechatDraftMetadata(input),
  )
  const planWithoutFingerprint = Object.fromEntries(
    Object.entries(plan).filter(([key]) => key !== 'planFingerprint'),
  ) as Omit<WechatDraftPublishPlan, 'planFingerprint'>
  const currentPlanFingerprint = await getWechatDraftPublishPlanFingerprint(planWithoutFingerprint, prepared)
  if (
    currentInputFingerprint !== plan.inputFingerprint
    || currentPlanFingerprint !== plan.planFingerprint
    || approval.planFingerprint !== plan.planFingerprint
  ) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿输入或预检计划已变化，请重新预检并确认')
  }
  if (
    approval.targetMatched !== true
    || approval.verificationMethod !== 'visible-editor-confirmation'
    || !hasMatchingWechatDraftPublishBounds(approval.approvedSideEffectUpperBounds, plan.sideEffectUpperBounds)
  ) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿目标确认或副作用授权与预检计划不匹配')
  }

  if (
    approvedWechatDraftPlans.get(approval) !== plan
    || preparedWechatDraftPlans.get(plan) !== prepared
  ) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿批准或预检计划已被消费，请重新预检并确认')
  }
  approvedWechatDraftPlans.delete(approval)
  preparedWechatDraftPlans.delete(plan)

  return prepared
}

export async function publishWechatDraft(
  input: WechatDraftPublishInput,
  plan: WechatDraftPublishPlan,
  approval: WechatDraftPublishApproval,
): Promise<WechatDraftPublishResult> {
  const prepared = await requireApprovedWechatDraftPublishPlan(input, plan, approval)
  ensureTauriRuntime()

  const rewritten = await rewritePreparedWechatArticleImages(prepared.contentHtml, prepared.articleImages)
  assertWechatDraftContent(rewritten.html)
  assertWechatDraftImagesUploaded(rewritten.html)
  let coverHandle = prepared.coverHandle
  if (!coverHandle) {
    if (!prepared.coverInput) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿永久封面预检上下文无效，请重新预检')
    }
    const cover = await uploadPreparedWechatCoverImage(prepared.coverInput)
    coverHandle = cover.coverHandle
  }

  const draft = await createWechatDraft({
    ...prepared.metadata,
    content: rewritten.html,
    coverHandle,
    showCoverPic: prepared.showCoverPic,
    needOpenComment: prepared.needOpenComment,
    onlyFansCanComment: prepared.onlyFansCanComment,
  })

  return {
    ...draft,
    coverHandle,
    uploadedContentHtml: rewritten.html,
    uploadedImageCount: rewritten.uploadedImages.length,
  }
}

export function describeWechatPublishStatus(status: WechatPublishStatus): string {
  if (status.configured) {
    const sourceLabel = {
      'process-env': '系统环境变量',
      'env.local': 'inkforge/.env.local',
      mixed: '系统环境变量 + inkforge/.env.local',
      'web-runtime': 'Web 运行时',
      none: '未配置',
    }[status.source]
    const appIdHint = status.appIdHint ? `（${status.appIdHint}）` : ''
    return `已检测到微信测试号凭据，来源：${sourceLabel}${appIdHint}`
  }

  if (status.source === 'web-runtime') {
    return '当前为 Web 运行时；微信直连发布仅在 Tauri 桌面环境可用。'
  }

  const missing = status.missingKeys.length > 0 ? status.missingKeys.join('、') : WECHAT_CREDENTIAL_KEYS.join('、')
  return `缺少 ${missing}；请在 inkforge/.env.local 配置测试号凭据，且不要使用 VITE_ 前缀。`
}

export { WECHAT_CREDENTIAL_KEYS }
