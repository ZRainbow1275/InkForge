import { describe, expect, it } from 'vitest'
import { detectImportFormat, getSupportedImportFormatOrThrow } from './index'

describe('detectImportFormat', () => {
    it('detects supported Markdown, HTML, and TXT inputs', () => {
        expect(detectImportFormat('application/octet-stream', 'notes.md')).toMatchObject({
            format: 'markdown',
            supported: true,
            reason: 'markdown-extension',
        })
        expect(detectImportFormat('text/markdown', 'export.bin')).toMatchObject({
            format: 'markdown',
            supported: true,
            reason: 'markdown-mime',
        })
        expect(detectImportFormat('application/octet-stream', 'page.html')).toMatchObject({
            format: 'html',
            supported: true,
        })
        expect(detectImportFormat('text/plain', 'plain.txt')).toMatchObject({
            format: 'text',
            supported: true,
        })
    })

    it('marks known migration formats as explicit unsupported work instead of plain text', () => {
        expect(detectImportFormat('application/octet-stream', 'draft.docx')).toMatchObject({
            format: 'docx',
            supported: false,
            reason: 'docx-converter-not-installed',
        })
        expect(detectImportFormat('application/zip', 'notion-export.zip')).toMatchObject({
            format: 'zip',
            supported: false,
            reason: 'zip-workspace-import-not-implemented',
        })
        expect(detectImportFormat('application/json', 'roam.json')).toMatchObject({
            format: 'json',
            supported: false,
            reason: 'json-import-not-implemented',
        })
        expect(detectImportFormat('application/octet-stream', 'archive.bear')).toMatchObject({
            format: 'bear',
            supported: false,
            reason: 'bear-import-not-implemented',
        })
    })

    it('rejects unknown binary extensions without silently importing them as text', () => {
        expect(detectImportFormat('application/octet-stream', 'payload.bin')).toMatchObject({
            format: 'unknown',
            supported: false,
            reason: 'unsupported-extension-or-mime',
        })
    })

    it('throws a user-facing error for unsupported formats before parsing content', () => {
        expect(() => getSupportedImportFormatOrThrow('application/octet-stream', 'draft.docx'))
            .toThrow(/docx-converter-not-installed/)
        expect(() => getSupportedImportFormatOrThrow('application/octet-stream', 'payload.bin'))
            .toThrow(/unsupported-extension-or-mime/)
    })
})