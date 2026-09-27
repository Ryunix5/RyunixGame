/**
 * Token bucket: allows bursts up to `capacity`, then `refillPerSecond` sustained.
 */
export class TokenBucket {
    private tokens: number;
    private lastRefill: number;

    constructor(private capacity: number, private refillPerSecond: number, now = Date.now()) {
        this.tokens = capacity;
        this.lastRefill = now;
    }

    take(now = Date.now()): boolean {
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillPerSecond);
        this.lastRefill = now;
        if (this.tokens < 1) return false;
        this.tokens -= 1;
        return true;
    }
}

export interface BucketConfig {
    capacity: number;
    refillPerSecond: number;
}

/** One bucket per category, created lazily. Meant to live for the lifetime of one socket. */
export class RateLimiter<Category extends string> {
    private buckets = new Map<Category, TokenBucket>();

    constructor(private config: Record<Category, BucketConfig>) {}

    allow(category: Category, now = Date.now()): boolean {
        let bucket = this.buckets.get(category);
        if (!bucket) {
            const { capacity, refillPerSecond } = this.config[category];
            bucket = new TokenBucket(capacity, refillPerSecond, now);
            this.buckets.set(category, bucket);
        }
        return bucket.take(now);
    }
}
