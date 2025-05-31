"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentConfig = exports.getProviderApiKey = exports.getProviderConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
// Load environment variables
dotenv_1.default.config();
// Provider configuration schema
const ProviderConfigSchema = zod_1.z.object({
    name: zod_1.z.string(),
    baseURL: zod_1.z.string(),
    envKey: zod_1.z.string(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
});
// Agent configuration schema
const AgentConfigSchema = zod_1.z.object({
    name: zod_1.z.string(),
    publicDescription: zod_1.z.string().optional(),
    instructions: zod_1.z.string(),
    tools: zod_1.z.array(zod_1.z.any()).default([]),
    downstreamAgents: zod_1.z.array(zod_1.z.string()).default([]),
    model: zod_1.z.string().optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    maxTokens: zod_1.z.number().positive().optional(),
});
// Configuration schema
const ConfigSchema = zod_1.z.object({
    // Server configuration
    port: zod_1.z.number().default(8080),
    env: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // AI Provider configuration
    model: zod_1.z.string().default('gpt-4o-mini'),
    provider: zod_1.z.string().default('openai'),
    providers: zod_1.z.record(ProviderConfigSchema).default({
        openai: {
            name: 'OpenAI',
            baseURL: 'https://api.openai.com/v1',
            envKey: 'OPENAI_API_KEY'
        },
        openai_realtime: {
            name: 'OpenAI Realtime',
            baseURL: 'wss://api.openai.com/v1/realtime',
            envKey: 'OPENAI_API_KEY'
        }
    }),
    // Approval and safety modes
    approvalMode: zod_1.z.enum(['suggest', 'auto-edit', 'full-auto']).default('suggest'),
    fullAutoErrorMode: zod_1.z.enum(['ask-user', 'ignore-and-continue']).default('ask-user'),
    // Agent configuration
    agents: zod_1.z.record(AgentConfigSchema).default({}),
    // Security configuration
    sandbox: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        networkDisabled: zod_1.z.boolean().default(true),
        allowedCommands: zod_1.z.array(zod_1.z.string()).default([]),
        restrictedPaths: zod_1.z.array(zod_1.z.string()).default([]),
    }).default({}),
    // Voice and realtime configuration
    voice: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        model: zod_1.z.string().default('gpt-4o-realtime-preview'),
        voice: zod_1.z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
        format: zod_1.z.enum(['pcm16', 'g711_ulaw', 'g711_alaw']).default('pcm16'),
        inputAudioTranscription: zod_1.z.object({
            model: zod_1.z.string().default('whisper-1')
        }).default({}),
    }).default({}),
    // Memory and project configuration
    memory: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        maxSize: zod_1.z.number().default(1000),
        saveHistory: zod_1.z.boolean().default(true),
        sensitivePatterns: zod_1.z.array(zod_1.z.string()).default([]),
        projectDocsEnabled: zod_1.z.boolean().default(true),
    }).default({}),
    // Database configuration
    database: zod_1.z.object({
        url: zod_1.z.string().default('postgresql://postgres:password@localhost:5432/opensafe'),
        ssl: zod_1.z.boolean().default(false),
        maxConnections: zod_1.z.number().default(10),
    }),
    // Redis configuration  
    redis: zod_1.z.object({
        url: zod_1.z.string().default('redis://localhost:6379'),
        ttl: zod_1.z.number().default(3600),
    }),
    // Rate limiting
    rateLimit: zod_1.z.object({
        windowMs: zod_1.z.number().default(15 * 60 * 1000), // 15 minutes
        max: zod_1.z.number().default(100),
        skipSuccessfulRequests: zod_1.z.boolean().default(false),
    }).default({}),
    // CORS configuration
    cors: zod_1.z.object({
        origin: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string()), zod_1.z.boolean()]).default(true),
        credentials: zod_1.z.boolean().default(true),
        methods: zod_1.z.array(zod_1.z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
        allowedHeaders: zod_1.z.array(zod_1.z.string()).default(['Content-Type', 'Authorization']),
    }).default({}),
    // Logging configuration
    logging: zod_1.z.object({
        level: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
        format: zod_1.z.enum(['json', 'simple']).default('json'),
        auditEnabled: zod_1.z.boolean().default(true),
    }).default({}),
    // Monitoring configuration
    monitoring: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        metricsPath: zod_1.z.string().default('/metrics'),
        healthPath: zod_1.z.string().default('/health'),
    }).default({}),
    // Security configuration
    security: zod_1.z.object({
        jwtSecret: zod_1.z.string(),
        jwtExpiresIn: zod_1.z.string().default('24h'),
        bcryptRounds: zod_1.z.number().default(12),
        rateLimitEnabled: zod_1.z.boolean().default(true),
        helmetEnabled: zod_1.z.boolean().default(true),
    }),
    // Feature flags
    features: zod_1.z.object({
        constitutionalAI: zod_1.z.boolean().default(true),
        rustBridge: zod_1.z.boolean().default(true),
        realtime: zod_1.z.boolean().default(false),
        multiAgent: zod_1.z.boolean().default(false),
        voiceMode: zod_1.z.boolean().default(false),
        guardrails: zod_1.z.boolean().default(true),
        zeroDataRetention: zod_1.z.boolean().default(false),
    }).default({}),
});
// Load and validate configuration
const rawConfig = {
    port: parseInt(process.env.PORT || '8080'),
    env: process.env.NODE_ENV || 'development',
    // AI Configuration
    model: process.env.MODEL || 'gpt-4o-mini',
    provider: process.env.PROVIDER || 'openai',
    // Database
    database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/opensafe',
        ssl: process.env.DATABASE_SSL === 'true',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
    },
    // Redis
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        ttl: parseInt(process.env.REDIS_TTL || '3600'),
    },
    // Security
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        helmetEnabled: process.env.HELMET_ENABLED !== 'false',
    },
    // Voice configuration
    voice: {
        enabled: process.env.VOICE_ENABLED === 'true',
        model: process.env.VOICE_MODEL || 'gpt-4o-realtime-preview',
        voice: process.env.VOICE_TYPE || 'alloy',
        format: process.env.AUDIO_FORMAT || 'pcm16',
    },
    // Memory configuration
    memory: {
        enabled: process.env.MEMORY_ENABLED !== 'false',
        maxSize: parseInt(process.env.MEMORY_MAX_SIZE || '1000'),
        saveHistory: process.env.SAVE_HISTORY !== 'false',
        projectDocsEnabled: process.env.PROJECT_DOCS_ENABLED !== 'false',
    },
    // Approval mode
    approvalMode: process.env.APPROVAL_MODE || 'suggest',
    fullAutoErrorMode: process.env.FULL_AUTO_ERROR_MODE || 'ask-user',
    // Sandbox configuration
    sandbox: {
        enabled: process.env.SANDBOX_ENABLED !== 'false',
        networkDisabled: process.env.SANDBOX_NETWORK_DISABLED !== 'false',
    },
    // Feature flags
    features: {
        constitutionalAI: process.env.FEATURE_CONSTITUTIONAL_AI !== 'false',
        rustBridge: process.env.FEATURE_RUST_BRIDGE !== 'false',
        realtime: process.env.FEATURE_REALTIME === 'true',
        multiAgent: process.env.FEATURE_MULTI_AGENT === 'true',
        voiceMode: process.env.FEATURE_VOICE_MODE === 'true',
        guardrails: process.env.FEATURE_GUARDRAILS !== 'false',
        zeroDataRetention: process.env.FEATURE_ZDR === 'true',
    },
    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || true,
        credentials: process.env.CORS_CREDENTIALS !== 'false',
    },
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
        auditEnabled: process.env.AUDIT_ENABLED !== 'false',
    },
};
// Validate configuration
exports.config = ConfigSchema.parse(rawConfig);
// Provider utilities
const getProviderConfig = (providerName) => {
    return exports.config.providers[providerName] || null;
};
exports.getProviderConfig = getProviderConfig;
const getProviderApiKey = (providerName) => {
    const provider = (0, exports.getProviderConfig)(providerName);
    if (!provider)
        return null;
    return process.env[provider.envKey] || null;
};
exports.getProviderApiKey = getProviderApiKey;
// Agent utilities
const getAgentConfig = (agentName) => {
    return exports.config.agents[agentName] || null;
};
exports.getAgentConfig = getAgentConfig;
exports.default = exports.config;
//# sourceMappingURL=index.js.map