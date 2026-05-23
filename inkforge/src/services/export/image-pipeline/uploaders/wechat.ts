import { uploadWechatArticleImage } from '@/services/export/wechat-publish'

import type { IUploader, ResolvedImage, UploadResult } from '../types'

export class WechatUploader implements IUploader {
    readonly platform = 'wechat' as const

    async upload(image: ResolvedImage): Promise<UploadResult> {
        return uploadWechatArticleImage(image)
    }
}
