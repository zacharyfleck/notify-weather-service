import fs from "fs"

const DEFAULT_MAX_ENTRIES = 100
const DEFAULT_STORE_PATH = "config/.sent-alerts.json"

/**
 * Persists the keys of alerts that have already been dispatched so that
 * restarting the app does not re-fire notifications. Only the most recent
 * `maxEntries` keys are retained (FIFO eviction).
 */
export class SentAlertStore {
  private readonly path: string
  private readonly maxEntries: number
  private keys: string[]
  private lookup: Set<string>

  constructor(options: { path?: string; maxEntries?: number } = {}) {
    this.path = options.path ?? DEFAULT_STORE_PATH
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
    this.keys = this.load()
    this.lookup = new Set(this.keys)
  }

  /** Returns true if the given key has already been recorded. */
  has(key: string): boolean {
    return this.lookup.has(key)
  }

  /** Re-reads the store from disk, picking up any manual edits made while running. */
  reload(): void {
    this.keys = this.load()
    this.lookup = new Set(this.keys)
  }

  /** Records a key, evicting the oldest entries beyond the limit, then persists. */
  add(key: string): void {
    if (this.lookup.has(key)) {
      return
    }

    this.keys.push(key)
    this.lookup.add(key)

    while (this.keys.length > this.maxEntries) {
      const evicted = this.keys.shift()
      if (evicted !== undefined) {
        this.lookup.delete(evicted)
      }
    }

    console.log(`Alert sent: ${key}`)

    this.save()
  }

  private load(): string[] {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(this.path, "utf-8"))
      if (Array.isArray(parsed)) {
        return parsed
          .filter((key): key is string => typeof key === "string")
          .slice(-this.maxEntries)
      }
    } catch {
      // Missing or unreadable store — start with an empty history.
    }
    return []
  }

  private save(): void {
    fs.writeFileSync(this.path, JSON.stringify(this.keys, null, 2))
  }
}

/** Shared store instance used across the app. */
export const sentAlerts = new SentAlertStore()
