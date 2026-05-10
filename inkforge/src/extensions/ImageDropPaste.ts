import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'

export type ImageIngressState = 'idle' | 'dragging' | 'uploading'

export interface InsertedImageAsset {
  assetId: string
  src: string
  alt: string
  title?: string
  width?: number
  height?: number
  naturalWidth?: number
  naturalHeight?: number
  link?: string | null
}

export interface ImageDropPasteOptions {
  uploadImage: (file: File) => Promise<InsertedImageAsset>
  onStateChange?: (state: ImageIngressState) => void
  onError?: (message: string) => void
}

const imageDropPasteKey = new PluginKey('imageDropPaste')

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

function getImageFilesFromFileList(files: FileList | null | undefined): File[] {
  if (!files) {
    return []
  }

  return Array.from(files).filter(isImageFile)
}

function getImageFilesFromItems(items: DataTransferItemList | null | undefined): File[] {
  if (!items) {
    return []
  }

  const files: File[] = []
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    if (item.kind !== 'file' || !item.type.startsWith('image/')) {
      continue
    }

    const file = item.getAsFile()
    if (file) {
      files.push(file)
    }
  }

  return files
}

function getImageFiles(dataTransfer: DataTransfer | null): File[] {
  const fromItems = getImageFilesFromItems(dataTransfer?.items)
  if (fromItems.length > 0) {
    return fromItems
  }

  return getImageFilesFromFileList(dataTransfer?.files)
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Image insertion failed'
}

function createImageNode(view: EditorView, image: InsertedImageAsset): ProseMirrorNode | null {
  const imageType = view.state.schema.nodes.image
  if (!imageType) {
    return null
  }

  return imageType.create({
    src: image.src,
    alt: image.alt,
    title: image.title ?? null,
    assetId: image.assetId,
    width: image.width ?? null,
    height: image.height ?? null,
    naturalWidth: image.naturalWidth ?? image.width ?? null,
    naturalHeight: image.naturalHeight ?? image.height ?? null,
    align: 'center',
    caption: '',
    link: image.link ?? null,
  })
}

async function uploadAndInsertImages(
  view: EditorView,
  files: File[],
  position: number | null,
  options: ImageDropPasteOptions,
): Promise<void> {
  options.onStateChange?.('uploading')

  try {
    const uploaded = await Promise.all(files.map((file) => options.uploadImage(file)))
    const imageNodes = uploaded
      .map((image) => createImageNode(view, image))
      .filter((node): node is ProseMirrorNode => node !== null)

    if (imageNodes.length === 0) {
      options.onError?.('The editor schema does not support image nodes')
      return
    }

    const insertionBase = position ?? view.state.selection.from
    let insertionPos = Math.max(0, Math.min(insertionBase, view.state.doc.content.size))
    let transaction = view.state.tr

    for (const node of imageNodes) {
      transaction = transaction.insert(insertionPos, node)
      insertionPos += node.nodeSize
    }

    view.dispatch(transaction.scrollIntoView())
  } catch (error) {
    options.onError?.(toErrorMessage(error))
  } finally {
    options.onStateChange?.('idle')
  }
}

export const ImageDropPaste = Extension.create<ImageDropPasteOptions>({
  name: 'imageDropPaste',

  addOptions() {
    return {
      uploadImage: async () => {
        throw new Error('Image upload handler is not configured')
      },
      onStateChange: undefined,
      onError: undefined,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: imageDropPasteKey,
        props: {
          handlePaste(view: EditorView, event: ClipboardEvent): boolean {
            const files = getImageFiles(event.clipboardData)
            if (files.length === 0) {
              return false
            }

            event.preventDefault()
            void uploadAndInsertImages(view, files, view.state.selection.from, options)
            return true
          },

          handleDrop(view: EditorView, event: DragEvent): boolean {
            const files = getImageFiles(event.dataTransfer)
            if (files.length === 0) {
              return false
            }

            event.preventDefault()
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
            void uploadAndInsertImages(view, files, coords?.pos ?? view.state.selection.from, options)
            return true
          },

          handleDOMEvents: {
            dragover(_view: EditorView, event: DragEvent): boolean {
              const files = getImageFiles(event.dataTransfer)
              if (files.length === 0) {
                return false
              }

              event.preventDefault()
              options.onStateChange?.('dragging')
              return true
            },

            dragleave(_view: EditorView, event: DragEvent): boolean {
              const nextTarget = event.relatedTarget
              if (nextTarget instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
                return false
              }

              options.onStateChange?.('idle')
              return false
            },

            dragend(): boolean {
              options.onStateChange?.('idle')
              return false
            },
          },
        },
      }),
    ]
  },
})
