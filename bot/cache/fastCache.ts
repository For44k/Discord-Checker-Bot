export class FastCache<T> {
    private cache: Map<string, { value: T; expires: number }>;
    private readonly ttl: number;
    private readonly maxSize: number;

    constructor(ttlMs: number = 60000, maxSize: number = 1000) {
        this.cache = new Map();
        this.ttl = ttlMs;
        this.maxSize = maxSize;
    }

    public get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }

    public set(key: string, value: T): void {
        if (this.cache.size >= this.maxSize) {
            this.cache.delete(this.cache.keys().next().value!);
        }
        this.cache.set(key, { value, expires: Date.now() + this.ttl });
    }

    public has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    public delete(key: string): void {
        this.cache.delete(key);
    }

    public clear(): void {
        this.cache.clear();
    }

    public get size(): number {
        return this.cache.size;
    }
}
