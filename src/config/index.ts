import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Provider configuration schema
const ProviderConfigSchema = z.object({
  name: z.string(),
  baseURL: z.string(),
  envKey: z.string(),
  headers: z.record(z.string()).optional(),
});

// Agent configuration schema
const AgentConfigSchema = z.object({
  name: z.string(),
  publicDescription: z.string().optional(),
  instructions: z.string(),
  tools: z.array(z.any()).default([]),
  downstreamAgents: z.array(z.string()).default([]),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

// Configuration schema
const ConfigSchema = z.object({
  // Server configuration
  port: z.number().default(8080),
  env: z.enum(['development', 'production', 'test']).default('development'),
  
  // AI Provider configuration
  model: z.string().default('gpt-4o-mini'),
  provider: z.string().default('openai'),
  providers: z.record(ProviderConfigSchema).default({
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
  approvalMode: z.enum(['suggest', 'auto-edit', 'full-auto']).default('suggest'),
  fullAutoErrorMode: z.enum(['ask-user', 'ignore-and-continue']).default('ask-user'),
  
  // Agent configuration
  agents: z.record(AgentConfigSchema).default({}),
  
  // Security configuration
  sandbox: z.object({
    enabled: z.boolean().default(true),
    networkDisabled: z.boolean().default(true),
    allowedCommands: z.array(z.string()).default([]),
    restrictedPaths: z.array(z.string()).default([]),
  }).default({}),
  
  // Voice and realtime configuration
  voice: z.object({
    enabled: z.boolean().default(false),
    model: z.string().default('gpt-4o-realtime-preview'),
    voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
    format: z.enum(['pcm16', 'g711_ulaw', 'g711_alaw']).default('pcm16'),
    inputAudioTranscription: z.object({
      model: z.string().default('whisper-1')
    }).default({}),
  }).default({}),
  
  // Memory and project configuration
  memory: z.object({
    enabled: z.boolean().default(true),
    maxSize: z.number().default(1000),
    saveHistory: z.boolean().default(true),
    sensitivePatterns: z.array(z.string()).default([]),
    projectDocsEnabled: z.boolean().default(true),
  }).default({}),
  
  // Database configuration
  database: z.object({
    url: z.string().default('postgresql://postgres:password@localhost:5432/openvault'),
    ssl: z.boolean().default(false),
    maxConnections: z.number().default(10),
  }),
  
  // Redis configuration  
  redis: z.object({
    url: z.string().default('redis://localhost:6379'),
    ttl: z.number().default(3600),
  }),
  
  // Rate limiting
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    max: z.number().default(100),
    skipSuccessfulRequests: z.boolean().default(false),
  }).default({}),
  
  // CORS configuration
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string()), z.boolean()]).default(true),
    credentials: z.boolean().default(true),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization']),
  }).default({}),
  
  // Logging configuration
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'simple']).default('json'),
    auditEnabled: z.boolean().default(true),
  }).default({}),
  
  // Monitoring configuration
  monitoring: z.object({
    enabled: z.boolean().default(true),
    metricsPath: z.string().default('/metrics'),
    healthPath: z.string().default('/health'),
  }).default({}),
  
  // Security configuration
  security: z.object({
    jwtSecret: z.string(),
    jwtExpiresIn: z.string().default('24h'),
    bcryptRounds: z.number().default(12),
    rateLimitEnabled: z.boolean().default(true),
    helmetEnabled: z.boolean().default(true),
  }),
  
  // Feature flags
  features: z.object({
    constitutionalAI: z.boolean().default(true),
    rustBridge: z.boolean().default(true),
    realtime: z.boolean().default(false),
    multiAgent: z.boolean().default(false),
    voiceMode: z.boolean().default(false),
    guardrails: z.boolean().default(true),
    zeroDataRetention: z.boolean().default(false),
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
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/openvault',
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
export const config = ConfigSchema.parse(rawConfig);

// Export types
export type Config = z.infer<typeof ConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Provider utilities
export const getProviderConfig = (providerName: string): ProviderConfig | null => {
  return config.providers[providerName] || null;
};

export const getProviderApiKey = (providerName: string): string | null => {
  const provider = getProviderConfig(providerName);
  if (!provider) return null;
  
  return process.env[provider.envKey] || null;
};

// Agent utilities
export const getAgentConfig = (agentName: string): AgentConfig | null => {
  return config.agents[agentName] || null;
};

export default config; 