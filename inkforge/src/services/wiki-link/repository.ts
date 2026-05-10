import type { Table } from 'dexie'
import { db } from '@/utils/db'
import type { BacklinkRecord } from './types'

function sortByUpdatedAtDesc(records: BacklinkRecord[]): BacklinkRecord[] {
  return [...records].sort((a, b) => b.updatedAt - a.updatedAt || a.sourceTitle.localeCompare(b.sourceTitle))
}

export class WikiLinkRepository {
  constructor(private readonly table: Table<BacklinkRecord, string> = db.backlinks) {}

  async replaceSourceBacklinks(sourceArticleId: string, records: BacklinkRecord[]): Promise<void> {
    await this.table.where('sourceArticleId').equals(sourceArticleId).delete()
    if (records.length > 0) {
      await this.table.bulkPut(records)
    }
  }

  async replaceAll(records: BacklinkRecord[]): Promise<void> {
    await this.table.clear()
    if (records.length > 0) {
      await this.table.bulkPut(records)
    }
  }

  async deleteByArticle(articleId: string): Promise<number> {
    const records = await this.table.toArray()
    const ids = records
      .filter(record => record.sourceArticleId === articleId || record.targetArticleId === articleId)
      .map(record => record.id)

    if (ids.length > 0) {
      await this.table.bulkDelete(ids)
    }

    return ids.length
  }

  async findBacklinks(targetArticleId: string): Promise<BacklinkRecord[]> {
    const records = await this.table.where('targetArticleId').equals(targetArticleId).toArray()
    return sortByUpdatedAtDesc(records)
  }

  async findBacklinksByTitle(targetTitle: string): Promise<BacklinkRecord[]> {
    const records = await this.table.where('targetTitle').equals(targetTitle).toArray()
    return sortByUpdatedAtDesc(records)
  }

  async findOutgoingLinks(sourceArticleId: string): Promise<BacklinkRecord[]> {
    const records = await this.table.where('sourceArticleId').equals(sourceArticleId).toArray()
    return sortByUpdatedAtDesc(records)
  }

  async findBrokenLinks(): Promise<BacklinkRecord[]> {
    const records = await this.table.toArray()
    return sortByUpdatedAtDesc(records.filter(record => !record.resolved))
  }

  async count(): Promise<number> {
    return await this.table.count()
  }
}

export const wikiLinkRepository = new WikiLinkRepository()
