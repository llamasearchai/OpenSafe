import { z } from 'zod';
declare const ConfigSchema: z.ZodObject<{
    env: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    port: z.ZodDefault<z.ZodNumber>;
    openaiApiKey: z.ZodString;
    jwtSecret: z.ZodString;
    databaseUrl: z.ZodString;
    redisUrl: z.ZodDefault<z.ZodString>;
    rustLibPath: z.ZodDefault<z.ZodString>;
    cors: z.ZodObject<{
        origin: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        credentials: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        origin: string | string[];
        credentials: boolean;
    }, {
        origin?: string | string[] | undefined;
        credentials?: boolean | undefined;
    }>;
    rateLimit: z.ZodObject<{
        windowMs: z.ZodDefault<z.ZodNumber>;
        max: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        windowMs: number;
        max: number;
    }, {
        windowMs?: number | undefined;
        max?: number | undefined;
    }>;
    logging: z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
        format: z.ZodDefault<z.ZodEnum<["json", "pretty"]>>;
    }, "strip", z.ZodTypeAny, {
        level: "error" | "warn" | "info" | "debug";
        format: "json" | "pretty";
    }, {
        level?: "error" | "warn" | "info" | "debug" | undefined;
        format?: "json" | "pretty" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    env: "development" | "production" | "test";
    port: number;
    openaiApiKey: string;
    jwtSecret: string;
    databaseUrl: string;
    redisUrl: string;
    rustLibPath: string;
    cors: {
        origin: string | string[];
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    logging: {
        level: "error" | "warn" | "info" | "debug";
        format: "json" | "pretty";
    };
}, {
    openaiApiKey: string;
    jwtSecret: string;
    databaseUrl: string;
    cors: {
        origin?: string | string[] | undefined;
        credentials?: boolean | undefined;
    };
    rateLimit: {
        windowMs?: number | undefined;
        max?: number | undefined;
    };
    logging: {
        level?: "error" | "warn" | "info" | "debug" | undefined;
        format?: "json" | "pretty" | undefined;
    };
    env?: "development" | "production" | "test" | undefined;
    port?: number | undefined;
    redisUrl?: string | undefined;
    rustLibPath?: string | undefined;
}>;
export declare const config: {
    env: "development" | "production" | "test";
    port: number;
    openaiApiKey: string;
    jwtSecret: string;
    databaseUrl: string;
    redisUrl: string;
    rustLibPath: string;
    cors: {
        origin: string | string[];
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    logging: {
        level: "error" | "warn" | "info" | "debug";
        format: "json" | "pretty";
    };
};
export type Config = z.infer<typeof ConfigSchema>;
export {};
//# sourceMappingURL=index.d.ts.map