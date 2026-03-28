import { z } from 'zod'
import { getAllDocuments, type Document } from '@/utils/db'
import { logExport } from '@/utils/activity-logger'

const EXPORT_FILENAME_FALLBACK = 'untitled-document'
const JSON_EXPORT_VERSION = 1
const ZIP_FILE_VERSION = 20
const ZIP_UTF8_FLAG = 0x0800
const ZIP_STORE_METHOD = 0
const textEncoder = new TextEncoder()

const ExportTimestampSchema = z.union([z.date(), z.string(), z.number()]).transform((value) => new Date(value))

const LocalExportDocumentInputSchema = z.object({
  articleId: z.string().min(1).optional(),
  title: z.string().trim().max(200).optional(),
  body: z.string(),
  updatedAt: ExportTimestampSchema.optional(),
})

const BatchExportDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  content: z.string(),
  categoryId: z.string().nullable(),
  status: z.enum(['draft', 'published']),
  syncStatus: z.enum(['local', 'synced', 'modified', 'conflict']),
  syncedAt: ExportTimestampSchema.nullable(),
  remoteVersion: z.number().int().min(0),
  accountId: z.string().min(1),
  checksum: z.string(),
  presetId: z.string().min(1),
  createdAt: ExportTimestampSchema,
  updatedAt: ExportTimestampSchema,
})

type LocalExportDocumentInput = z.input<typeof LocalExportDocumentInputSchema>
type BatchExportDocument = z.infer<typeof BatchExportDocumentSchema>

interface ZipArchiveEntry {
  filename: string
  data: Uint8Array
  modifiedAt: Date
}

interface JsonDocumentExportPayload {
  format: 'inkforge-document-export'
  version: number
  exportedAt: string
  document: {
    articleId?: string
    title: string
    body: string
    updatedAt?: string
    wordCount: number
  }
}

interface ZipDocumentManifestRecord {
  id: string
  title: string
  filenameBase: string
  categoryId: string | null
  status: BatchExportDocument['status']
  syncStatus: BatchExportDocument['syncStatus']
  remoteVersion: number
  checksum: string
  accountId: string
  presetId: string
  createdAt: string
  updatedAt: string
  syncedAt: string | null
}

function sanitizeFilenameSegment(value?: string): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    return EXPORT_FILENAME_FALLBACK
  }

  const withoutForbiddenCharacters = trimmed
    .replace(/[<>:"/\\|?*]/g, '')
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')

  const sanitized = withoutForbiddenCharacters
    .replace(/\s+/g, '-')
    .replace(/\.+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80)

  return sanitized || EXPORT_FILENAME_FALLBACK
}

function ensureUniqueFilename(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName)
    return baseName
  }

  let suffix = 2
  while (usedNames.has(`${baseName}-${suffix}`)) {
    suffix += 1
  }

  const uniqueName = `${baseName}-${suffix}`
  usedNames.add(uniqueName)
  return uniqueName
}

function triggerDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  queueMicrotask(() => {
    URL.revokeObjectURL(objectUrl)
  })
}

function countWords(body: string): number {
  return body
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

function createJsonPayload(input: LocalExportDocumentInput): JsonDocumentExportPayload {
  const validated = LocalExportDocumentInputSchema.parse(input)

  return {
    format: 'inkforge-document-export',
    version: JSON_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    document: {
      articleId: validated.articleId,
      title: validated.title?.trim() || EXPORT_FILENAME_FALLBACK,
      body: validated.body,
      updatedAt: validated.updatedAt?.toISOString(),
      wordCount: countWords(validated.body),
    },
  }
}

function buildCurrentDocumentFilename(input: LocalExportDocumentInput, extension: 'md' | 'json'): string {
  const validated = LocalExportDocumentInputSchema.parse(input)
  const filenameBase = sanitizeFilenameSegment(validated.title || validated.articleId)
  return `${filenameBase}.${extension}`
}

function createDateStamp(date: Date = new Date()): string {
  const parts = [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '-',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ]

  return parts.join('')
}

function createBatchZipFilename(date: Date = new Date()): string {
  return `inkforge-local-export-${createDateStamp(date)}.zip`
}

function toDosDateTime(date: Date): { date: number; time: number } {
  const safeDate = new Date(date)
  const year = Math.max(1980, safeDate.getFullYear())
  const month = safeDate.getMonth() + 1
  const day = safeDate.getDate()
  const hours = safeDate.getHours()
  const minutes = safeDate.getMinutes()
  const seconds = Math.floor(safeDate.getSeconds() / 2)

  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: (hours << 11) | (minutes << 5) | seconds,
  }
}

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)

  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1)
    }
    table[index] = value >>> 0
  }

  return table
}

const crc32Table = buildCrc32Table()

function computeCrc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF

  for (const byte of data) {
    crc = crc32Table[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  }

  return (crc ^ 0xFFFFFFFF) >>> 0
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const output = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }

  return output
}

function createLocalFileHeader(
  entry: ZipArchiveEntry,
  crc32: number,
): Uint8Array {
  const filenameBytes = textEncoder.encode(entry.filename)
  const { date, time } = toDosDateTime(entry.modifiedAt)
  const header = new Uint8Array(30 + filenameBytes.byteLength)
  const view = new DataView(header.buffer)

  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, ZIP_FILE_VERSION, true)
  view.setUint16(6, ZIP_UTF8_FLAG, true)
  view.setUint16(8, ZIP_STORE_METHOD, true)
  view.setUint16(10, time, true)
  view.setUint16(12, date, true)
  view.setUint32(14, crc32, true)
  view.setUint32(18, entry.data.byteLength, true)
  view.setUint32(22, entry.data.byteLength, true)
  view.setUint16(26, filenameBytes.byteLength, true)
  view.setUint16(28, 0, true)
  header.set(filenameBytes, 30)

  return header
}

function createCentralDirectoryHeader(
  entry: ZipArchiveEntry,
  crc32: number,
  localHeaderOffset: number,
): Uint8Array {
  const filenameBytes = textEncoder.encode(entry.filename)
  const { date, time } = toDosDateTime(entry.modifiedAt)
  const header = new Uint8Array(46 + filenameBytes.byteLength)
  const view = new DataView(header.buffer)

  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, ZIP_FILE_VERSION, true)
  view.setUint16(6, ZIP_FILE_VERSION, true)
  view.setUint16(8, ZIP_UTF8_FLAG, true)
  view.setUint16(10, ZIP_STORE_METHOD, true)
  view.setUint16(12, time, true)
  view.setUint16(14, date, true)
  view.setUint32(16, crc32, true)
  view.setUint32(20, entry.data.byteLength, true)
  view.setUint32(24, entry.data.byteLength, true)
  view.setUint16(28, filenameBytes.byteLength, true)
  view.setUint16(30, 0, true)
  view.setUint16(32, 0, true)
  view.setUint16(34, 0, true)
  view.setUint16(36, 0, true)
  view.setUint32(38, 0, true)
  view.setUint32(42, localHeaderOffset, true)
  header.set(filenameBytes, 46)

  return header
}

function createEndOfCentralDirectory(
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
): Uint8Array {
  const record = new Uint8Array(22)
  const view = new DataView(record.buffer)

  view.setUint32(0, 0x06054b50, true)
  view.setUint16(4, 0, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, entryCount, true)
  view.setUint16(10, entryCount, true)
  view.setUint32(12, centralDirectorySize, true)
  view.setUint32(16, centralDirectoryOffset, true)
  view.setUint16(20, 0, true)

  return record
}

function buildZipArchive(entries: ZipArchiveEntry[]): Uint8Array {
  const fileParts: Uint8Array[] = []
  const centralDirectoryParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const crc32 = computeCrc32(entry.data)
    const localHeader = createLocalFileHeader(entry, crc32)
    const centralHeader = createCentralDirectoryHeader(entry, crc32, offset)

    fileParts.push(localHeader, entry.data)
    centralDirectoryParts.push(centralHeader)

    offset += localHeader.byteLength + entry.data.byteLength
  }

  const centralDirectory = concatUint8Arrays(centralDirectoryParts)
  const endRecord = createEndOfCentralDirectory(entries.length, centralDirectory.byteLength, offset)

  return concatUint8Arrays([...fileParts, centralDirectory, endRecord])
}

function toBatchExportDocument(document: Document): BatchExportDocument {
  return BatchExportDocumentSchema.parse({
    ...document,
    syncedAt: document.syncedAt ?? null,
  })
}

function buildBatchEntries(documents: BatchExportDocument[]): ZipArchiveEntry[] {
  const exportedAt = new Date()
  const usedNames = new Set<string>()
  const manifestDocuments: ZipDocumentManifestRecord[] = []
  const entries: ZipArchiveEntry[] = []

  for (const document of documents) {
    const baseName = ensureUniqueFilename(
      sanitizeFilenameSegment(document.title || document.id),
      usedNames,
    )

    manifestDocuments.push({
      id: document.id,
      title: document.title,
      filenameBase: baseName,
      categoryId: document.categoryId,
      status: document.status,
      syncStatus: document.syncStatus,
      remoteVersion: document.remoteVersion,
      checksum: document.checksum,
      accountId: document.accountId,
      presetId: document.presetId,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      syncedAt: document.syncedAt?.toISOString() ?? null,
    })

    entries.push({
      filename: `documents/${baseName}.md`,
      data: textEncoder.encode(document.content),
      modifiedAt: document.updatedAt,
    })

    entries.push({
      filename: `documents/${baseName}.json`,
      data: textEncoder.encode(JSON.stringify({
        format: 'inkforge-batch-document',
        version: JSON_EXPORT_VERSION,
        exportedAt: exportedAt.toISOString(),
        document: {
          id: document.id,
          title: document.title,
          body: document.content,
          categoryId: document.categoryId,
          status: document.status,
          syncStatus: document.syncStatus,
          remoteVersion: document.remoteVersion,
          checksum: document.checksum,
          accountId: document.accountId,
          presetId: document.presetId,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
          syncedAt: document.syncedAt?.toISOString() ?? null,
          wordCount: countWords(document.content),
        },
      }, null, 2)),
      modifiedAt: document.updatedAt,
    })
  }

  entries.unshift({
    filename: 'manifest.json',
    data: textEncoder.encode(JSON.stringify({
      format: 'inkforge-document-bundle',
      version: JSON_EXPORT_VERSION,
      exportedAt: exportedAt.toISOString(),
      documentCount: documents.length,
      documents: manifestDocuments,
    }, null, 2)),
    modifiedAt: exportedAt,
  })

  return entries
}

export async function downloadDocumentAsMarkdown(input: LocalExportDocumentInput): Promise<string> {
  const validated = LocalExportDocumentInputSchema.parse(input)
  const filename = buildCurrentDocumentFilename(validated, 'md')
  triggerDownload(new Blob([validated.body], { type: 'text/markdown;charset=utf-8' }), filename)

  if (validated.articleId) {
    await logExport(validated.articleId, 'markdown')
  }

  return filename
}

export async function downloadDocumentAsJson(input: LocalExportDocumentInput): Promise<string> {
  const validated = LocalExportDocumentInputSchema.parse(input)
  const payload = createJsonPayload(validated)
  const filename = buildCurrentDocumentFilename(validated, 'json')
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
    filename,
  )

  if (validated.articleId) {
    await logExport(validated.articleId, 'json')
  }

  return filename
}

export async function downloadAllDocumentsAsZip(): Promise<{ filename: string; documentCount: number }> {
  const documents = (await getAllDocuments()).map(toBatchExportDocument)

  if (documents.length === 0) {
    throw new Error('没有可导出的文档')
  }

  const zipBytes = buildZipArchive(buildBatchEntries(documents))
  const filename = createBatchZipFilename()

  triggerDownload(new Blob([zipBytes], { type: 'application/zip' }), filename)
  await Promise.allSettled(documents.map((document) => logExport(document.id, 'zip')))

  return {
    filename,
    documentCount: documents.length,
  }
}
