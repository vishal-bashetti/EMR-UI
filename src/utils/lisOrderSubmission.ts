// Preserve request identity across uncertain responses and page reloads.
// The entry is cleared only after the server confirms acceptance.
export function pendingLISOrder(key: string, storage: Storage = localStorage): string {
  const stored = storage.getItem(key)
  if (stored) return stored
  const sourceId = `labdash-${crypto.randomUUID()}`
  storage.setItem(key, sourceId)
  return sourceId
}

export function completeLISOrder(key: string, storage: Storage = localStorage): void {
  storage.removeItem(key)
}
