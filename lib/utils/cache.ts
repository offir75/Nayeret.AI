/**
 * Lightweight in-process TTL cache for server-side module reuse between requests.
 * Not shared across processes/workers; suitable for frequently-read, rarely-changed data.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private cache: CacheEntry<T> | null = null;

  constructor(private readonly ttlMs: number) {}

  get(): T | null {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.value;
    }
    this.cache = null;
    return null;
  }

  set(value: T): void {
    this.cache = { value, expiresAt: Date.now() + this.ttlMs };
  }

  invalidate(): void {
    this.cache = null;
  }
}
