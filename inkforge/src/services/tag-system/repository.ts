import type { Table } from 'dexie'
import { db } from '@/utils/db'
import type { Article } from '@/types'
import { generateId } from '@/utils/uuid'
import {
  CreateTagParamsSchema,
  DocTagRecordSchema,
  MergeTagsParamsSchema,
  TAGS_PER_DOCUMENT_LIMIT,
  TAG_COLOR_PRESETS,
  TAG_SYSTEM_SCHEMA_VERSION,
  TagNameConflictError,
  TagLimitExceededError,
  TagMergeInvalidError,
  TagNotFoundError,
  TagRecordSchema,
  UpdateTagParamsSchema,
  makeDocTagId,
  normalizeTagName,
  parseTagColor,
  parseTagName,
  type CreateTagParams,
  type DocTagRecord,
  type MergeTagsParams,
  type Tag,
  type TagFilterMode,
  type TagRecord,
  type UpdateTagParams,
} from './types'

export interface TagRepositoryTables {
  tags: Table<TagRecord, string>
  docTags: Table<DocTagRecord, string>
  articles: Table<Article, string>
}

export type TagRepositoryTransactionRunner = <T>(scope: () => Promise<T>) => Promise<T>

function sortTags(tags: TagRecord[]): TagRecord[] {
  return [...tags].sort((a, b) => {
    const countDelta = b.docCount - a.docCount
    if (countDelta !== 0) return countDelta
    return a.name.localeCompare(b.name)
  })
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)))
}

function uniqueSortedNames(names: string[]): string[] {
  return Array.from(new Set(names.map(name => name.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function tagFallbackColor(index: number): string {
  return TAG_COLOR_PRESETS[index % TAG_COLOR_PRESETS.length].hex
}

export class TagRepository {
  constructor(
    private readonly tables: TagRepositoryTables = { tags: db.tags, docTags: db.docTags, articles: db.articles },
    private readonly runTransaction?: TagRepositoryTransactionRunner,
  ) {}

  private async transaction<T>(scope: () => Promise<T>): Promise<T> {
    if (this.runTransaction) return await this.runTransaction(scope)
    return await db.transaction('rw', this.tables.tags, this.tables.docTags, this.tables.articles, scope)
  }

  private async allTags(): Promise<TagRecord[]> {
    return await this.tables.tags.toArray()
  }

  private async allRelations(): Promise<DocTagRecord[]> {
    return await this.tables.docTags.toArray()
  }

  async listTags(accountId: string): Promise<Tag[]> {
    return sortTags((await this.allTags()).filter(tag => tag.accountId === accountId))
  }

  async getTag(id: string): Promise<Tag | undefined> {
    return await this.tables.tags.get(id)
  }

  async findByName(name: string, accountId: string): Promise<Tag | undefined> {
    const normalizedName = normalizeTagName(name)
    return (await this.allTags()).find(tag => tag.accountId === accountId && tag.normalizedName === normalizedName)
  }

  async createTag(params: CreateTagParams): Promise<Tag> {
    const parsed = CreateTagParamsSchema.parse(params)
    const name = parseTagName(parsed.name)
    const normalizedName = normalizeTagName(name)
    const color = parseTagColor(parsed.color)
    const existing = await this.findByName(name, parsed.accountId)
    if (existing) throw new TagNameConflictError(name, parsed.accountId)

    const now = new Date().toISOString()
    const record = TagRecordSchema.parse({
      id: generateId(),
      schemaVersion: TAG_SYSTEM_SCHEMA_VERSION,
      name,
      normalizedName,
      color,
      docCount: 0,
      accountId: parsed.accountId,
      createdAt: now,
      updatedAt: now,
    })
    await this.tables.tags.put(record)
    return record
  }

  async updateTag(id: string, params: UpdateTagParams): Promise<Tag> {
    const parsed = UpdateTagParamsSchema.parse(params)
    const current = await this.tables.tags.get(id)
    if (!current) throw new TagNotFoundError(id)

    const nextName = parsed.name === undefined ? current.name : parseTagName(parsed.name)
    const nextNormalizedName = normalizeTagName(nextName)
    if (nextNormalizedName !== current.normalizedName) {
      const duplicate = await this.findByName(nextName, current.accountId)
      if (duplicate && duplicate.id !== id) throw new TagNameConflictError(nextName, current.accountId)
    }

    const next = TagRecordSchema.parse({
      ...current,
      name: nextName,
      normalizedName: nextNormalizedName,
      color: parsed.color === undefined ? current.color : parseTagColor(parsed.color),
      updatedAt: new Date().toISOString(),
    })

    await this.transaction(async () => {
      await this.tables.tags.put(next)
      if (next.name !== current.name) {
        const docIds = await this.getDocsWithTag(id)
        await Promise.all(docIds.map(docId => this.repairArticleTagMirror(docId)))
      }
    })

    return next
  }

  async deleteTag(id: string): Promise<void> {
    await this.transaction(async () => {
      const current = await this.tables.tags.get(id)
      if (!current) return
      const relations = (await this.allRelations()).filter(relation => relation.tagId === id)
      await Promise.all(relations.map(relation => this.tables.docTags.delete(relation.id)))
      await this.tables.tags.delete(id)
      await Promise.all(uniqueIds(relations.map(relation => relation.docId)).map(docId => this.repairArticleTagMirror(docId)))
    })
  }

  async getDocTags(docId: string): Promise<Tag[]> {
    const relations = (await this.allRelations()).filter(relation => relation.docId === docId)
    const tags = await this.allTags()
    const byId = new Map(tags.map(tag => [tag.id, tag]))
    return relations
      .map(relation => byId.get(relation.tagId))
      .filter((tag): tag is TagRecord => tag !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async addTagToDoc(docId: string, tagId: string): Promise<void> {
    await this.transaction(async () => {
      const tag = await this.tables.tags.get(tagId)
      if (!tag) throw new TagNotFoundError(tagId)
      const relationId = makeDocTagId(docId, tagId)
      const existing = await this.tables.docTags.get(relationId)
      if (existing) return

      const currentDocRelationCount = (await this.allRelations()).filter(relation => relation.docId === docId).length
      if (currentDocRelationCount >= TAGS_PER_DOCUMENT_LIMIT) throw new TagLimitExceededError(docId)

      const relation = DocTagRecordSchema.parse({
        id: relationId,
        docId,
        tagId,
        addedAt: new Date().toISOString(),
      })
      await this.tables.docTags.put(relation)
      await this.setTagDocCount(tagId, tag.docCount + 1)
      await this.repairArticleTagMirror(docId)
    })
  }

  async removeTagFromDoc(docId: string, tagId: string): Promise<void> {
    await this.transaction(async () => {
      const relationId = makeDocTagId(docId, tagId)
      const relation = await this.tables.docTags.get(relationId)
      if (!relation) return
      await this.tables.docTags.delete(relation.id)
      const tag = await this.tables.tags.get(tagId)
      if (tag) await this.setTagDocCount(tagId, Math.max(0, tag.docCount - 1))
      await this.repairArticleTagMirror(docId)
    })
  }

  async removeAllTagsFromDoc(docId: string): Promise<void> {
    await this.transaction(async () => {
      const relations = (await this.allRelations()).filter(relation => relation.docId === docId)
      for (const relation of relations) {
        await this.tables.docTags.delete(relation.id)
        const tag = await this.tables.tags.get(relation.tagId)
        if (tag) await this.setTagDocCount(tag.id, Math.max(0, tag.docCount - 1))
      }
      await this.repairArticleTagMirror(docId)
    })
  }

  async bulkAddTagToDoc(docIds: string[], tagId: string): Promise<void> {
    for (const docId of uniqueIds(docIds)) {
      await this.addTagToDoc(docId, tagId)
    }
  }

  async bulkRemoveTagFromDoc(docIds: string[], tagId: string): Promise<void> {
    for (const docId of uniqueIds(docIds)) {
      await this.removeTagFromDoc(docId, tagId)
    }
  }

  async getDocsWithTag(tagId: string): Promise<string[]> {
    return uniqueIds((await this.allRelations()).filter(relation => relation.tagId === tagId).map(relation => relation.docId))
  }

  async filterDocsByTags(tagIds: string[], mode: TagFilterMode): Promise<string[]> {
    const ids = uniqueIds(tagIds)
    if (ids.length === 0) return []
    const relations = (await this.allRelations()).filter(relation => ids.includes(relation.tagId))
    const docToTagIds = new Map<string, Set<string>>()
    for (const relation of relations) {
      const existing = docToTagIds.get(relation.docId) ?? new Set<string>()
      existing.add(relation.tagId)
      docToTagIds.set(relation.docId, existing)
    }
    return [...docToTagIds.entries()]
      .filter(([, docTagIds]) => mode === 'AND' ? ids.every(id => docTagIds.has(id)) : ids.some(id => docTagIds.has(id)))
      .map(([docId]) => docId)
  }

  async mergeTags(params: MergeTagsParams): Promise<void> {
    const parsed = MergeTagsParamsSchema.safeParse(params)
    if (!parsed.success) throw new TagMergeInvalidError(parsed.error.message, { params })

    await this.transaction(async () => {
      const target = await this.tables.tags.get(parsed.data.targetId)
      if (!target) throw new TagNotFoundError(parsed.data.targetId)
      const sourceTags = await Promise.all(parsed.data.sourceIds.map(sourceId => this.tables.tags.get(sourceId)))
      const missingSourceId = parsed.data.sourceIds.find((_sourceId, index) => !sourceTags[index])
      if (missingSourceId) throw new TagNotFoundError(missingSourceId)

      const affectedDocIds = new Set<string>()
      const relations = await this.allRelations()
      const targetDocIds = new Set(relations.filter(relation => relation.tagId === target.id).map(relation => relation.docId))
      const sourceIdSet = new Set(parsed.data.sourceIds)

      for (const relation of relations.filter(item => sourceIdSet.has(item.tagId))) {
        affectedDocIds.add(relation.docId)
        await this.tables.docTags.delete(relation.id)
        if (!targetDocIds.has(relation.docId)) {
          targetDocIds.add(relation.docId)
          await this.tables.docTags.put(DocTagRecordSchema.parse({
            id: makeDocTagId(relation.docId, target.id),
            docId: relation.docId,
            tagId: target.id,
            addedAt: relation.addedAt,
          }))
        }
      }

      await Promise.all(parsed.data.sourceIds.map(id => this.tables.tags.delete(id)))
      await this.recalculateDocCount(target.id)
      await Promise.all([...affectedDocIds].map(docId => this.repairArticleTagMirror(docId)))
    })
  }

  async cleanupOrphans(accountId: string): Promise<number> {
    return await this.transaction(async () => {
      const tags = (await this.allTags()).filter(tag => tag.accountId === accountId && tag.docCount === 0)
      const relations = await this.allRelations()
      const relatedTagIds = new Set(relations.map(relation => relation.tagId))
      const orphanTags = tags.filter(tag => !relatedTagIds.has(tag.id))
      await Promise.all(orphanTags.map(tag => this.tables.tags.delete(tag.id)))
      return orphanTags.length
    })
  }

  async recalculateDocCount(tagId: string): Promise<number> {
    const tag = await this.tables.tags.get(tagId)
    if (!tag) throw new TagNotFoundError(tagId)
    const count = (await this.allRelations()).filter(relation => relation.tagId === tagId).length
    await this.setTagDocCount(tagId, count)
    return count
  }

  async recalculateAllDocCounts(accountId: string): Promise<void> {
    const tags = (await this.allTags()).filter(tag => tag.accountId === accountId)
    await Promise.all(tags.map(tag => this.recalculateDocCount(tag.id)))
  }

  async repairArticleTagMirror(docId: string): Promise<string[]> {
    const article = await this.tables.articles.get(docId)
    if (!article) return []
    const tagNames = uniqueSortedNames((await this.getDocTags(docId)).map(tag => tag.name))
    await this.tables.articles.put({ ...article, tags: tagNames, updatedAt: new Date() })
    return tagNames
  }

  async backfillFromArticleTags(accountId: string): Promise<{ created: number; relations: number }> {
    let created = 0
    let relations = 0
    await this.transaction(async () => {
      const articles = await this.tables.articles.toArray()
      const tags = await this.allTags()
      const tagByNormalizedName = new Map(tags.filter(tag => tag.accountId === accountId).map(tag => [tag.normalizedName, tag]))
      let colorIndex = tagByNormalizedName.size

      for (const article of articles) {
        const names = uniqueSortedNames(article.tags ?? [])
        for (const rawName of names) {
          const name = parseTagName(rawName)
          const normalizedName = normalizeTagName(name)
          let tag = tagByNormalizedName.get(normalizedName)
          if (!tag) {
            const now = new Date().toISOString()
            tag = TagRecordSchema.parse({
              id: generateId(),
              schemaVersion: TAG_SYSTEM_SCHEMA_VERSION,
              name,
              normalizedName,
              color: tagFallbackColor(colorIndex),
              docCount: 0,
              accountId,
              createdAt: now,
              updatedAt: now,
            })
            colorIndex += 1
            await this.tables.tags.put(tag)
            tagByNormalizedName.set(normalizedName, tag)
            created += 1
          }
          const relationId = makeDocTagId(article.id, tag.id)
          if (!await this.tables.docTags.get(relationId)) {
            await this.tables.docTags.put(DocTagRecordSchema.parse({
              id: relationId,
              docId: article.id,
              tagId: tag.id,
              addedAt: new Date().toISOString(),
            }))
            relations += 1
          }
        }
      }

      await Promise.all([...tagByNormalizedName.values()].map(tag => this.recalculateDocCount(tag.id)))
    })
    return { created, relations }
  }

  private async setTagDocCount(tagId: string, docCount: number): Promise<void> {
    const tag = await this.tables.tags.get(tagId)
    if (!tag) throw new TagNotFoundError(tagId)
    await this.tables.tags.put(TagRecordSchema.parse({ ...tag, docCount: Math.max(0, docCount), updatedAt: new Date().toISOString() }))
  }
}

export const tagRepository = new TagRepository()
