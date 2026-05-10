export type ImageAlign = 'left' | 'center' | 'right' | 'float-left' | 'float-right'

export interface ImageV2Attrs {
  src: string
  alt: string
  title: string | null
  assetId: string | null
  width: number | null
  height: number | null
  naturalWidth: number | null
  naturalHeight: number | null
  align: ImageAlign
  caption: string
  link: string | null
}

export interface MarkdownImage {
  src: string
  alt: string
  title: string | null
  width: number | null
  height: number | null
  caption: string
  link: string | null
  align: ImageAlign
}

export interface SerializeMarkdownImageOptions {
  includeAlignmentComment?: boolean
}
