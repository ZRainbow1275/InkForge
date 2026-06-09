export interface ImageRef {
    src: string
    alt?: string
    width?: number
    height?: number
}

export interface ResolvedImage extends ImageRef {
    resolvedUrl: string
    mimeType?: string
}

export interface UploadResult {
    remoteUrl: string
    uploadedAt: string
    platformId?: string
}

export interface IUploader {
    readonly platform: 'wechat' | 'xiaohongshu' | 'zhihu'
    upload(image: ResolvedImage): Promise<UploadResult>
}

export type XhsImageArtifactKind = 'image-page' | 'cover' | 'long-image'
export type XhsImageArtifactFormat = 'jpg' | 'jpeg' | 'png'
export type XhsImageArtifactRatio = '3:4' | '1:1'
export type XhsImageCropStatus = 'ok' | 'warning' | 'overflow' | 'unknown'

export interface XhsImageArtifactPage {
    page: number
    fileName: string
    src: string
    exists?: boolean
    width: number
    height: number
    ratio: XhsImageArtifactRatio
    format: XhsImageArtifactFormat
    bytes?: number
    cover?: boolean
    referencedByBody?: boolean
    cropStatus: XhsImageCropStatus
}

export interface XhsImageArtifactLimits {
    maxPages?: number
    maxBytes?: number
    allowedRatios?: readonly XhsImageArtifactRatio[]
    allowedFormats?: readonly XhsImageArtifactFormat[]
}

export interface XhsImageArtifactManifest {
    kind: XhsImageArtifactKind
    pages: XhsImageArtifactPage[]
    bodyReferences: number[]
    limits?: XhsImageArtifactLimits
}

export type ZhihuImageArtifactKind = 'inline-image' | 'formula-image' | 'diagram-image' | 'table-image' | 'cover'
export type ZhihuImageArtifactFormat = 'jpg' | 'jpeg' | 'png' | 'gif'
export type ZhihuImageHostStatus = 'platform-hosted' | 'public-https' | 'local-only' | 'missing' | 'blocked'

export interface ZhihuImageArtifact {
    id: string
    kind: ZhihuImageArtifactKind
    sourceSrc: string
    finalSrc: string
    fileName?: string
    exists?: boolean
    uploaded?: boolean
    hostStatus: ZhihuImageHostStatus
    width?: number
    height?: number
    format?: ZhihuImageArtifactFormat
    bytes?: number
    alt: string
    caption?: string
    textFallback?: boolean
    referencedByMarkdown?: boolean
}

export interface ZhihuImageArtifactManifest {
    artifacts: ZhihuImageArtifact[]
    markdownReferences?: string[]
    requirePlatformUpload?: boolean
    allowedFormats?: readonly ZhihuImageArtifactFormat[]
}

export class NotImplementedError extends Error {
    constructor(public readonly feature: string) {
        super(`Not implemented: ${feature}`)
        this.name = 'NotImplementedError'
    }
}
