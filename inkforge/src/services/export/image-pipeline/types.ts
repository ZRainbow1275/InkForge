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

export class NotImplementedError extends Error {
    constructor(public readonly feature: string) {
        super(`Not implemented: ${feature}`)
        this.name = 'NotImplementedError'
    }
}
