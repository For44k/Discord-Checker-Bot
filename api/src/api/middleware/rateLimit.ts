import { Request, Response, NextFunction } from 'express';
import { config } from '../../utils/env.config.js';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_MIN = 600;
const ipRequestBuckets = new Map<string, { count: number; resetTime: number }>();

setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of ipRequestBuckets.entries()) {
        if (now > bucket.resetTime) {
            ipRequestBuckets.delete(ip);
        }
    }
}, 30000);

export function apiRateLimiter(req: Request, res: Response, next: NextFunction): void {
    const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').replace(/^.*:/, '');

    if (clientIp === '127.0.0.1' || clientIp === 'localhost' || clientIp === '::1') {
        return next();
    }

    const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
    const apiKey = typeof authHeader === 'string'
        ? authHeader.replace(/^Bearer\s+/i, '')
        : undefined;

    if (apiKey && process.env.API_SECRET && apiKey === process.env.API_SECRET) {
        return next();
    }

    const now = Date.now();
    let bucket = ipRequestBuckets.get(clientIp);

    if (!bucket || now > bucket.resetTime) {
        bucket = { count: 1, resetTime: now + WINDOW_MS };
        ipRequestBuckets.set(clientIp, bucket);
        return next();
    }

    bucket.count++;
    if (bucket.count > MAX_REQUESTS_PER_MIN) {
        const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.status(429).json({
            success: false,
            error: 'Too many requests. Ultra-fast internal rate limit reached.',
            retryAfterSeconds: retryAfter,
        });
        return;
    }

    next();
}
