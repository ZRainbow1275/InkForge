import { NotImplementedError, type IUploader, type ResolvedImage, type UploadResult } from '../types'

export class XiaohongshuUploader implements IUploader {
    readonly platform = 'xiaohongshu' as const

    async upload(_image: ResolvedImage): Promise<UploadResult> {
        throw new NotImplementedError('XiaohongshuUploader.upload — needs 小红书图片上传 API integration')
    }
}
