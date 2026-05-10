export type MarkdownExtensionPortability = 'inkforge-ext' | 'inkforge-proprietary'

export type MarkdownExportPlatform = 'wechat' | 'zhihu' | 'redbook' | 'html' | 'markdown'

export interface MarkdownExtensionFallback {
  toStandardMd: string
  toPlatform: Partial<Record<MarkdownExportPlatform, string>>
}

export interface MarkdownExtension {
  id: string
  name: string
  syntax: string
  portability: MarkdownExtensionPortability
  fallback: MarkdownExtensionFallback
  roundTripTest: string
  baselineStatus: 'render-only' | 'existing'
}

export interface MarkdownHeading {
  level: number
  text: string
  slug: string
}

export interface MarkdownExtensionRenderOptions {
  maxTocDepth?: number
}
