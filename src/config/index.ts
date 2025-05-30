import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const ConfigSchema = z.object({
  env: z.enum(['development', 'production', 'test']).default('development'),
  port: z.number().default(8080),
  openaiApiKey: z.string().min(1, 'OpenAI API key is required'),
  jwtSecret: z.string().min(1, 'JWT secret is required'),
  databaseUrl: z.string().min(1, 'Database URL is required'),
  redisUrl: z.string().default('redis://localhost:6379'),
  rustLibPath: z.string().default('./native/target/release/libsafety_analysis.so'),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
    credentials: z.boolean().default(true)
  }),
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000),
    max: z.number().default(100)
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'pretty']).default('json')
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
        level: (process.env.LOG_LEVEL as any) || 'info',
        format: (process.env.LOG_FORMAT as any) || 'json'
      }
    });
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}

export const config = parseConfig();
export type Config = z.infer<typeof ConfigSchema>; 