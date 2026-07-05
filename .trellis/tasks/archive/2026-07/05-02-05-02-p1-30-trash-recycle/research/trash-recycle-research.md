# Trash Recycle Research

## Local Code Findings

- Existing `useArticleStore.deleteArticle(id)` permanently deletes through `articleRepository.delete(id)`.
- Existing Article status union does not include `trashed`.
- Existing profile deletion already uses recoverable soft-delete metadata, so the project accepts soft-delete semantics when backed by real persistence.
- Article content lives in `contents` keyed by `articleId`; purge must delete both article and content records.
- SearchEngine baseline excludes archived by default and will also need to exclude trashed by default through the Article status check.

## Implementation Decision

Implement trash as metadata on existing Article rows rather than a separate duplicate trash table. This preserves article/content/version relationships until purge and avoids copy-based restore drift. The repository will use real Dexie writes and ArticleRepository decryption paths for listing.

## Pending UI Decision

A dedicated TrashBin page needs route, navigation, confirm dialogs, batch toolbar, and readonly preview. That is larger than the baseline slice and remains pending rather than being represented by a placeholder route.
