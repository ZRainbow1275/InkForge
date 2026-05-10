import { NotImplementedError, type IUploader, type ResolvedImage, type UploadResult } from '../types'

export class WechatUploader implements IUploader {
    readonly platform = 'wechat' as const

    async upload(_image: ResolvedImage): Promise<UploadResult> {
        throw new NotImplementedError('WechatUploader.upload — needs 微信素材库 API integration')
    }
}
