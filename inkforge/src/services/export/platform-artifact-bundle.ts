import type { LocalDeliveryFileInput } from '@/services/desktop'

import {
  createXhsImageArtifactManifestFromRasterArtifacts,
  createZhihuImageArtifactManifest,
  getDataUrlByteLength,
} from './image-pipeline'
import type {
  XhsImageArtifactManifest,
  ZhihuImageArtifactManifest,
} from './image-pipeline'
import { convertToNativeFormat, type NativeExportOptions } from './index'
import { buildLocalDeliveryBundle, createLocalDeliverySlug } from './local-delivery'
import {
  collectMarkdownImages,
  validateXhsImageArtifactManifest,
  validateZhihuImageArtifactManifest,
} from './quality-detector'
import { getXiaohongshuPresets } from './xiaohongshu'
import { renderXhsPosterCard } from './svg-modules/raster'
import {
  renderXhsMarkdownCardSliceSvg,
  sliceMarkdownToXhsCards,
} from './svg-modules/xhs-card-slicer'
import type { NativeExportResult, QualityIssue } from './types'

export type StaticPlatformArtifactTarget = 'xiaohongshu' | 'zhihu'

export interface PlatformArtifactBundleOptions {
  platform: StaticPlatformArtifactTarget
  markdown: string
  title: string
  nativeOptions?: NativeExportOptions
}

export interface PlatformArtifactBundle {
  platform: StaticPlatformArtifactTarget
  entryPath: string
  manifestPath: string
  files: LocalDeliveryFileInput[]
  nativeResult: NativeExportResult
  manifest: XhsImageArtifactManifest | ZhihuImageArtifactManifest
  manifestIssues: QualityIssue[]
  localArtifactReady: true
  externalReadbackRequired: true
}

const ZHIHU_EXTERNAL_ONLY_ISSUES = new Set([
  'zhihu-image-manifest-host-blocked',
  'zhihu-image-manifest-reference-mismatch',
  'zhihu-image-manifest-upload-missing',
])

function base64Payload(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  if (comma < 0 || !/;base64$/iu.test(dataUrl.slice(0, comma))) {
    throw new Error('图片渲染结果不是可写入的 Base64 数据。')
  }
  return dataUrl.slice(comma + 1)
}

function withoutArtifactManifests(options: NativeExportOptions | undefined): NativeExportOptions {
  const rest = { ...(options ?? {}) }
  delete rest.xiaohongshuImageManifest
  delete rest.zhihuImageArtifactManifest
  return rest
}

function formatBlockingIssues(issues: QualityIssue[]): string {
  return issues.map(issue => issue.message).join('；')
}

async function buildXhsArtifactBundle(
  options: PlatformArtifactBundleOptions,
  nativeOptions: NativeExportOptions,
  slug: string,
): Promise<PlatformArtifactBundle> {
  const preset = getXiaohongshuPresets().find(item => item.id === nativeOptions.presetId)
    ?? getXiaohongshuPresets()[0]
  const sliced = sliceMarkdownToXhsCards(options.markdown, { title: options.title })
  if (sliced.overflow) {
    throw new Error('小红书卡片页数超出当前切片上限，请先拆分文稿。')
  }

  const root = `${slug}.xiaohongshu`
  const imageFiles: LocalDeliveryFileInput[] = []
  const rasterArtifacts = []

  for (const slice of sliced.slices) {
    const page = String(slice.page).padStart(2, '0')
    const fileName = `page-${page}.png`
    const relativePath = `${root}/${fileName}`
    const svg = renderXhsMarkdownCardSliceSvg(slice, {
      primaryColor: nativeOptions.overrides?.primaryColor ?? preset?.primaryColor,
      persona: preset?.persona,
    })
    const dataUrl = await renderXhsPosterCard(svg, '3:4', preset?.secondaryBg)
    rasterArtifacts.push({
      page: slice.page,
      fileName,
      src: relativePath,
      dataUrl,
      cover: slice.page === 1,
      referencedByBody: sliced.bodyReferences.includes(slice.bodyReference),
      cropStatus: slice.overflow ? 'overflow' as const : 'ok' as const,
    })
    imageFiles.push({ relativePath, base64: base64Payload(dataUrl) })
  }

  const manifest = createXhsImageArtifactManifestFromRasterArtifacts({
    artifacts: rasterArtifacts,
    bodyReferences: sliced.bodyReferences,
    coverPage: 1,
  })
  const manifestIssues = validateXhsImageArtifactManifest(manifest)
  const blockers = manifestIssues.filter(issue => issue.severity === 'error')
  if (blockers.length > 0) {
    throw new Error(`小红书图片包校验失败：${formatBlockingIssues(blockers)}`)
  }

  const nativeResult = await convertToNativeFormat(options.markdown, 'xiaohongshu', {
    ...nativeOptions,
    xiaohongshuImageManifest: manifest,
  })
  const entryPath = `${root}/post.txt`
  const manifestPath = `${root}/manifest.json`

  return {
    platform: 'xiaohongshu',
    entryPath,
    manifestPath,
    files: [
      { relativePath: entryPath, content: nativeResult.content },
      ...imageFiles,
      { relativePath: manifestPath, content: `${JSON.stringify(manifest, null, 2)}\n` },
    ],
    nativeResult,
    manifest,
    manifestIssues,
    localArtifactReady: true,
    externalReadbackRequired: true,
  }
}

async function buildZhihuArtifactBundle(
  options: PlatformArtifactBundleOptions,
  nativeOptions: NativeExportOptions,
): Promise<PlatformArtifactBundle> {
  const materialized = await buildLocalDeliveryBundle({
    target: 'folder',
    format: 'markdown',
    title: options.title,
    markdown: options.markdown,
  })
  const entry = materialized.files.find(file => file.relativePath === materialized.entryPath)
  if (!entry?.content) throw new Error('知乎 Markdown 入口文件生成失败。')

  const assetFiles = materialized.files.filter(
    (file): file is LocalDeliveryFileInput & { base64: string } => typeof file.base64 === 'string',
  )
  if (assetFiles.length === 0) {
    throw new Error('当前文稿没有可写出的本地图片 fallback，不能生成知乎图片资产包。')
  }

  const firstPass = await convertToNativeFormat(entry.content, 'zhihu', nativeOptions)
  const imageReferences = collectMarkdownImages(firstPass.content)
  const assetsByPath = new Map(assetFiles.map(file => [file.relativePath, file]))
  const localReferences = imageReferences.filter(image => assetsByPath.has(image.src))
  if (localReferences.length === 0) {
    throw new Error('知乎清洁 Markdown 未保留本地图片 fallback 引用，已停止写入。')
  }

  const localManifest = createZhihuImageArtifactManifest({
    artifacts: localReferences.map((image, index) => {
      const file = assetsByPath.get(image.src)
      if (!file) throw new Error(`知乎图片 fallback 文件缺失：${image.src}`)
      if (!image.alt.trim()) throw new Error(`知乎图片 fallback 缺少真实 alt：${image.src}`)
      const bytes = getDataUrlByteLength(`data:application/octet-stream;base64,${file.base64}`)
      if (!bytes) throw new Error(`知乎图片 fallback 字节数无效：${image.src}`)

      return {
        id: `zhihu-image-${index + 1}`,
        kind: 'inline-image' as const,
        sourceSrc: image.src,
        finalSrc: image.src,
        fileName: image.src.split('/').pop(),
        exists: true,
        bytes,
        alt: image.alt,
        referencedByMarkdown: true,
      }
    }),
    markdownReferences: imageReferences.map(image => image.src),
    requirePlatformUpload: false,
  })
  const manifest = { ...localManifest, requirePlatformUpload: true }
  const nativeResult = await convertToNativeFormat(entry.content, 'zhihu', {
    ...nativeOptions,
    zhihuImageArtifactManifest: manifest,
  })
  const manifestIssues = validateZhihuImageArtifactManifest(manifest, nativeResult.content)
  const localBlockers = manifestIssues.filter(issue =>
    issue.severity === 'error' && !ZHIHU_EXTERNAL_ONLY_ISSUES.has(issue.id),
  )
  if (localBlockers.length > 0) {
    throw new Error(`知乎图片资产包校验失败：${formatBlockingIssues(localBlockers)}`)
  }

  const manifestPath = `${materialized.slug}.zhihu-manifest.json`
  return {
    platform: 'zhihu',
    entryPath: materialized.entryPath,
    manifestPath,
    files: [
      { relativePath: materialized.entryPath, content: nativeResult.content },
      ...assetFiles,
      { relativePath: manifestPath, content: `${JSON.stringify(manifest, null, 2)}\n` },
    ],
    nativeResult,
    manifest,
    manifestIssues,
    localArtifactReady: true,
    externalReadbackRequired: true,
  }
}

export async function buildPlatformArtifactBundle(
  options: PlatformArtifactBundleOptions,
): Promise<PlatformArtifactBundle> {
  if (!options.markdown.trim()) throw new Error('当前文稿为空，无法生成平台资产包。')
  if (!options.title.trim()) throw new Error('当前文稿缺少真实标题，无法生成平台资产包。')

  const nativeOptions = withoutArtifactManifests(options.nativeOptions)
  const slug = createLocalDeliverySlug(options.title)
  return options.platform === 'xiaohongshu'
    ? buildXhsArtifactBundle(options, nativeOptions, slug)
    : buildZhihuArtifactBundle(options, nativeOptions)
}
