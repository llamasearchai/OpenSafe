import { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    max: number;
    message?: string;
}
declare class RateLimiter {
    private store;
    private config;
    constructor(config: RateLimitConfig);
    private cleanup;
    private getKey;
    middleware: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
}
export declare const rateLimiter: RateLimiter;
export declare const strictRateLimiter: RateLimiter;
export declare const createRateLimiter: (config: RateLimitConfig) => RateLimiter;
export {};
//# sourceMappingURL=rateLimit.d.ts.map