import { z } from 'zod'

import { resolveAssetSnapshot } from '@/services/asset-pipeline/snapshot'
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
  if (!WECHAT_COVER_HANDLE_PATTERN.test(article.coverHandle.trim())) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿封面句柄无效，请重新上传正文首图')
  }

  assertWechatDraftImagesUploaded(article.content)
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
  if (mimeType === 'image/svg+xml' || lowerSource.endsWith('.svg') || lowerSource.startsWith('data:image/svg+xml')) {
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
  const source = image.resolvedUrl || image.src

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
    return {
      remoteUrl: source,
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

export async function uploadWechatArticleImage(image: ResolvedImage): Promise<UploadResult> {
  if (isWechatHostedContentImageUrl(image.resolvedUrl)) {
    return {
      remoteUrl: image.resolvedUrl,
      uploadedAt: new Date().toISOString(),
    }
  }

  ensureTauriRuntime()
  const input = await normalizeWechatUploadSource(image, 'article')
  const raw = await tauriInvoke<unknown>('wechat_upload_article_image', { input })
  const result = parseWechatResponse(WechatArticleImageUploadSchema, raw, 'wechat_upload_article_image')
  return {
    remoteUrl: result.remoteUrl,
    uploadedAt: new Date().toISOString(),
  }
}

export async function uploadWechatCoverImage(image: ResolvedImage): Promise<WechatCoverUploadResult> {
  ensureTauriRuntime()
  const input = await normalizeWechatUploadSource(image, 'cover')
  const raw = await tauriInvoke<unknown>('wechat_upload_cover_image', { input })
  const result = parseWechatResponse(WechatCoverUploadSchema, raw, 'wechat_upload_cover_image')
  return {
    remoteUrl: result.remoteUrl,
    uploadedAt: new Date().toISOString(),
    coverHandle: result.coverHandle,
  }
}

export async function rewriteWechatArticleImages(html: string): Promise<WechatHtmlRewriteResult> {
  if (!html.trim()) {
    return { html, uploadedImages: [] }
  }

  if (typeof DOMParser === 'undefined') {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Current runtime does not provide DOMParser for WeChat HTML rewriting')
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const images = Array.from(doc.querySelectorAll('img'))
  const cache = new Map<string, UploadResult>()
  const uploadedImages: UploadResult[] = []

  for (const image of images) {
    const src = image.getAttribute('src')?.trim()
    if (!src) continue
    if (isWechatHostedContentImageUrl(src)) {
      image.removeAttribute('srcset')
      continue
    }

    let upload = cache.get(src)
    if (!upload) {
      upload = await uploadWechatArticleImage(createResolvedImageFromTag(image))
      cache.set(src, upload)
      uploadedImages.push(upload)
    }
    image.setAttribute('src', upload.remoteUrl)
    image.removeAttribute('srcset')
  }

  return {
    html: doc.body.innerHTML,
    uploadedImages,
  }
}

function collectNonWechatHostedImages(html: string): string[] {
  if (!html.trim() || typeof DOMParser === 'undefined') return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.querySelectorAll('img'))
    .flatMap(image => {
      const src = image.getAttribute('src')?.trim() || ''
      const srcset = image.getAttribute('srcset')?.trim()
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

export async function publishWechatDraft(input: WechatDraftPublishInput): Promise<WechatDraftPublishResult> {
  ensureTauriRuntime()

  const metadata = normalizeWechatDraftMetadata(input)
  assertWechatDraftMetadata(metadata)
  assertWechatDraftContent(input.contentHtml)

  let coverHandle = input.coverHandle?.trim() || undefined
  const coverImage = input.coverImage ?? firstWechatDraftCoverImage(input.contentHtml)
  if (coverHandle && !WECHAT_COVER_HANDLE_PATTERN.test(coverHandle)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '微信草稿封面句柄无效，请重新上传正文首图')
  }
  if (!coverHandle && !coverImage) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, '正文至少需要一张真实图片作为微信公众号永久封面')
  }
  if (coverImage) assertWechatUploadImage(coverImage, 'cover')

  const rewritten = await rewriteWechatArticleImages(input.contentHtml)
  assertWechatDraftContent(rewritten.html)
  assertWechatDraftImagesUploaded(rewritten.html)
  if (!coverHandle) {
    if (!coverImage) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, '正文至少需要一张真实图片作为微信公众号永久封面')
    }
    const cover = await uploadWechatCoverImage(coverImage)
    coverHandle = cover.coverHandle
  }

  const draft = await createWechatDraft({
    ...metadata,
    content: rewritten.html,
    coverHandle,
    showCoverPic: input.showCoverPic,
    needOpenComment: input.needOpenComment,
    onlyFansCanComment: input.onlyFansCanComment,
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
