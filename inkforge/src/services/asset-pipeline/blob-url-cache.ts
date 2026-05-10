export class AssetBlobUrlCache {
  private readonly urls = new Map<string, string>()

  get size(): number {
    return this.urls.size
  }

  get(key: string): string | null {
    return this.urls.get(key) ?? null
  }

  getOrCreate(key: string, blob: Blob): string {
    const existing = this.urls.get(key)
    if (existing) return existing

    const url = URL.createObjectURL(blob)
    this.urls.set(key, url)
    return url
  }

  revoke(key: string): void {
    const existing = this.urls.get(key)
    if (!existing) return

    URL.revokeObjectURL(existing)
    this.urls.delete(key)
  }

  revokePrefix(prefix: string): void {
    for (const key of Array.from(this.urls.keys())) {
      if (key.startsWith(prefix)) {
        this.revoke(key)
      }
    }
  }

  clear(): void {
    for (const url of this.urls.values()) {
      URL.revokeObjectURL(url)
    }
    this.urls.clear()
  }
}
