import { TokenBucket, RateLimiter } from '../rateLimit';

describe('TokenBucket', () => {
    it('allows a burst up to capacity, then blocks', () => {
        const bucket = new TokenBucket(3, 1, 0);
        expect([bucket.take(0), bucket.take(0), bucket.take(0), bucket.take(0)]).toEqual([true, true, true, false]);
    });

    it('refills over time without exceeding capacity', () => {
        const bucket = new TokenBucket(2, 1, 0);
        bucket.take(0);
        bucket.take(0);
        expect(bucket.take(500)).toBe(false); // only half a token back
        expect(bucket.take(1000)).toBe(true);
        expect(bucket.take(60_000)).toBe(true);
        expect(bucket.take(60_000)).toBe(true);
        expect(bucket.take(60_000)).toBe(false); // capped at 2 despite the long wait
    });
});

describe('RateLimiter', () => {
    it('tracks categories independently', () => {
        const limiter = new RateLimiter({ chat: { capacity: 1, refillPerSecond: 1 }, game: { capacity: 1, refillPerSecond: 1 } });
        expect(limiter.allow('chat', 0)).toBe(true);
        expect(limiter.allow('chat', 0)).toBe(false);
        expect(limiter.allow('game', 0)).toBe(true);
    });
});
