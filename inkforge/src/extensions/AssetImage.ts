import ImageExtension from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AssetImageNodeView from '@/components/editor/AssetImageNodeView.vue'
import { extractInkforgeAssetId } from '@/utils/asset-url'
import {
  normalizeImageAlign,
  normalizeImageLink,
  parseNumberAttribute,
  parseStringAttribute,
  renderDataAttribute,
  type ImageAttributeValue,
} from './ImageV2/imageAttrs'

export const AssetImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          return parseStringAttribute(element.getAttribute('data-asset-id'))
            ?? extractInkforgeAssetId(element.getAttribute('src'))
        },
        renderHTML: (attributes: Record<string, ImageAttributeValue>) => {
          return renderDataAttribute('data-asset-id', attributes.assetId)
        },
      },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          return parseNumberAttribute(element.getAttribute('width'))
            ?? parseNumberAttribute(element.style.width)
        },
        renderHTML: (attributes: Record<string, ImageAttributeValue>) => {
          return renderDataAttribute('width', attributes.width)
        },
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          return parseNumberAttribute(element.getAttribute('height'))
            ?? parseNumberAttribute(element.style.height)
        },
        renderHTML: (attributes: Record<string, ImageAttributeValue>) => {
          return renderDataAttribute('height', attributes.height)
        },
      },
      naturalWidth: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          return parseNumberAttribute(element.getAttribute('data-natural-width'))
        },
        renderHTML: (attributes: Record<string, ImageAttributeValue>) => {
          return renderDataAttribute('data-natural-width', attributes.naturalWidth)
        },
      },
      naturalHeight: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          return parseNumberAttribute(element.getAttribute('data-natural-height'))
        },
        renderHTML: (attributes: Record<string, ImageAttributeValue>) => {
          return renderDataAttribute('data-natural-height', attributes.naturalHeight)
        },
      },
      align: {
        default: 'center',
        parseHTML: (element: HTMLElement) => {
          return normalizeImageAlign(element.getAttribute('data-align'))
        },
        renderHTML: (attributes: Record<string, ImageAttributeValue>) => {
          return renderDataAttribute('data-align', normalizeImageAlign(attributes.align))
        },
      },
      caption: {
        default: '',
        parseHTML: (element: HTMLElement) => {
          return element.getAttribute('data-caption') ?? element.getAttribute('title') ?? ''
        },
        renderHTML: (attributes: Record<string, ImageAttributeValue>) => {
          return renderDataAttribute('data-caption', attributes.caption)
        },
      },
      link: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          return normalizeImageLink(element.getAttribute('data-link') ?? element.closest('a')?.getAttribute('href'))
        },
        renderHTML: (attributes: Record<string, ImageAttributeValue>) => {
          return renderDataAttribute('data-link', normalizeImageLink(attributes.link))
        },
      },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(AssetImageNodeView)
  },
})
