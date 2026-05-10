type CategoryDeletedListener = (categoryId: string) => void

const categoryDeletedListeners = new Set<CategoryDeletedListener>()

export function onCategoryDeleted(listener: CategoryDeletedListener): () => void {
  categoryDeletedListeners.add(listener)
  return () => {
    categoryDeletedListeners.delete(listener)
  }
}

export function notifyCategoryDeleted(categoryId: string): void {
  for (const listener of [...categoryDeletedListeners]) {
    listener(categoryId)
  }
}
