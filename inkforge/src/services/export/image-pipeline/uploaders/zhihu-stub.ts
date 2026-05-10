import { NotImplementedError, type IUploader, type ResolvedImage, type UploadResult } from '../types'

export class ZhihuUploader implements IUploader {
    readonly platform = 'zhihu' as const

    async upload(_image: ResolvedImage): Promise<UploadResult> {
        throw new NotImplementedError('ZhihuUploader.upload — needs 知乎图片上传 API integration')
    }
}
