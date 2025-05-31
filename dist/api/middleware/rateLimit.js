"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = exports.strictRateLimiter = exports.rateLimiter = void 0;
class RateLimiter {
    store = {};
    config;
    constructor(config) {
        this.config = config;
        // Clean up expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }
    cleanup() {
        const now = Date.now();
        for (const key in this.store) {
            if (this.store[key].resetTime < now) {
                delete this.store[key];
            }
        }
    }
    getKey(req) {
        return req.ip || req.connection.remoteAddress || 'unknown';
    }
    middleware = (req, res, next) => {
        const key = this.getKey(req);
        const now = Date.now();
        const entry = this.store[key];
        if (!entry || entry.resetTime < now) {
            // Initialize or reset
            this.store[key] = {
                count: 1,
                resetTime: now + this.config.windowMs
            };
            res.setHeader('X-RateLimit-Limit', this.config.max);
            res.setHeader('X-RateLimit-Remaining', this.config.max - 1);
            res.setHeader('X-RateLimit-Reset', this.store[key].resetTime.toString());
            return next();
        }
        if (entry.count >= this.config.max) {
            res.setHeader('X-RateLimit-Limit', this.config.max);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
            res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));
            return res.status(429).json({
                error: this.config.message || 'Too many requests',
                retryAfter: Math.ceil((entry.resetTime - now) / 1000)
            });
        }
        // Increment count
        entry.count++;
        res.setHeader('X-RateLimit-Limit', this.config.max);
        res.setHeader('X-RateLimit-Remaining', this.config.max - entry.count);
        res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
        next();
    };
}
// Pre-configured rate limiters
exports.rateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP, please try again later.'
});
exports.strictRateLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Rate limit exceeded for this endpoint.'
});
const createRateLimiter = (config) => new RateLimiter(config);
exports.createRateLimiter = createRateLimiter;
//# sourceMappingURL=rateLimit.js.map