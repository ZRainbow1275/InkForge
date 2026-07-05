/**
 * Article status constants shared by schemas and runtime constants.
 *
 * Keep this file free of Zod, browser globals, and Vite-only `import.meta.env`
 * access so lightweight runtime constants can import ARTICLE_STATUS without
 * loading the full article schema graph.
 */

export const ARTICLE_STATUS = {
  DRAFT: 'draft',
  WRITING: 'writing',
  UNDER_REVIEW: 'under_review',
  READY_TO_PUBLISH: 'ready_to_publish',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  TRASHED: 'trashed',
  NEW: 'new',
  READ: 'read',
  PROCESSED: 'processed',
} as const

export type ArticleStatusValue = typeof ARTICLE_STATUS[keyof typeof ARTICLE_STATUS]
