import { AssetImage } from '../AssetImage'
import { ImageDropPaste } from '../ImageDropPaste'

export const ImageV2Extension = AssetImage
export const ImageV2Extensions = [AssetImage, ImageDropPaste]

export { AssetImage, ImageDropPaste }
export type { ImageDropPasteOptions, ImageIngressState, InsertedImageAsset } from '../ImageDropPaste'
export * from './imageAttrs'
export * from './imageMarkdown'
export type * from './types'
