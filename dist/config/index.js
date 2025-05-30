"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
// Load environment variables
dotenv_1.default.config();
const ConfigSchema = zod_1.z.object({
    env: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    port: zod_1.z.number().default(8080),
    openaiApiKey: zod_1.z.string().min(1, 'OpenAI API key is required'),
    jwtSecret: zod_1.z.string().min(1, 'JWT secret is required'),
    databaseUrl: zod_1.z.string().min(1, 'Database URL is required'),
    redisUrl: zod_1.z.string().default('redis://localhost:6379'),
    rustLibPath: zod_1.z.string().default('./native/target/release/libsafety_analysis.so'),
    cors: zod_1.z.object({
        origin: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).default('*'),
        credentials: zod_1.z.boolean().default(true)
    }),
    rateLimit: zod_1.z.object({
        windowMs: zod_1.z.number().default(15 * 60 * 1000),
        max: zod_1.z.number().default(100)
    }),
    logging: zod_1.z.object({
        level: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
        format: zod_1.z.enum(['json', 'pretty']).default('json')
    })
});
function parseConfig() {
    try {
        return ConfigSchema.parse({
            env: process.env.NODE_ENV || 'development',
            port: parseInt(process.env.PORT || '8080'),
            openaiApiKey: process.env.OPENAI_API_KEY || 'test-key',
            jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
            databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/openaisafe',
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            rustLibPath: process.env.RUST_LIB_PATH || './native/target/release/libsafety_analysis.so',
            cors: {
                origin: process.env.CORS_ORIGIN?.split(',') || '*',
                credentials: true
            },
            rateLimit: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
                max: parseInt(process.env.RATE_LIMIT_MAX || '100')
            },
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                format: process.env.LOG_FORMAT || 'json'
            }
        });
    }
    catch (error) {
        console.error('Configuration validation failed:', error);
        process.exit(1);
    }
}
exports.config = parseConfig();
//# sourceMappingURL=index.js.map