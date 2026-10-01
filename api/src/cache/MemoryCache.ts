export class MemoryCache<T> {
  private cache: Map<string, { value: T; expiresAt: number }> = new Map();
  private defaultTTL: number;
  private maxEntries: number;
  private cleanupTimer: NodeJS.Timeout;

  constructor(options: number | { ttlMs?: number; maxEntries?: number } = 60000) {
    this.defaultTTL = typeof options === 'number' ? options : (options.ttlMs ?? 60000);
    this.maxEntries = typeof options === 'number' ? Number.POSITIVE_INFINITY : (options.maxEntries ?? Number.POSITIVE_INFINITY);
    this.cleanupTimer = setInterval(() => this.cleanup(), 30000);
    this.cleanupTimer.unref?.();
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + (ttl ?? this.defaultTTL) });
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }
}
