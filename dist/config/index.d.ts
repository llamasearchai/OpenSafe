import { z } from 'zod';
declare const ProviderConfigSchema: z.ZodObject<{
    name: z.ZodString;
    baseURL: z.ZodString;
    envKey: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    baseURL: string;
    envKey: string;
    headers?: Record<string, string> | undefined;
}, {
    name: string;
    baseURL: string;
    envKey: string;
    headers?: Record<string, string> | undefined;
}>;
declare const AgentConfigSchema: z.ZodObject<{
    name: z.ZodString;
    publicDescription: z.ZodOptional<z.ZodString>;
    instructions: z.ZodString;
    tools: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    downstreamAgents: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    instructions: string;
    tools: any[];
    downstreamAgents: string[];
    model?: string | undefined;
    publicDescription?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
}, {
    name: string;
    instructions: string;
    model?: string | undefined;
    publicDescription?: string | undefined;
    tools?: any[] | undefined;
    downstreamAgents?: string[] | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
}>;
declare const ConfigSchema: z.ZodObject<{
    port: z.ZodDefault<z.ZodNumber>;
    env: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    model: z.ZodDefault<z.ZodString>;
    provider: z.ZodDefault<z.ZodString>;
    providers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        name: z.ZodString;
        baseURL: z.ZodString;
        envKey: z.ZodString;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        baseURL: string;
        envKey: string;
        headers?: Record<string, string> | undefined;
    }, {
        name: string;
        baseURL: string;
        envKey: string;
        headers?: Record<string, string> | undefined;
    }>>>;
    approvalMode: z.ZodDefault<z.ZodEnum<["suggest", "auto-edit", "full-auto"]>>;
    fullAutoErrorMode: z.ZodDefault<z.ZodEnum<["ask-user", "ignore-and-continue"]>>;
    agents: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        name: z.ZodString;
        publicDescription: z.ZodOptional<z.ZodString>;
        instructions: z.ZodString;
        tools: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
        downstreamAgents: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        instructions: string;
        tools: any[];
        downstreamAgents: string[];
        model?: string | undefined;
        publicDescription?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    }, {
        name: string;
        instructions: string;
        model?: string | undefined;
        publicDescription?: string | undefined;
        tools?: any[] | undefined;
        downstreamAgents?: string[] | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    }>>>;
    sandbox: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        networkDisabled: z.ZodDefault<z.ZodBoolean>;
        allowedCommands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        restrictedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        networkDisabled: boolean;
        allowedCommands: string[];
        restrictedPaths: string[];
    }, {
        enabled?: boolean | undefined;
        networkDisabled?: boolean | undefined;
        allowedCommands?: string[] | undefined;
        restrictedPaths?: string[] | undefined;
    }>>;
    voice: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        model: z.ZodDefault<z.ZodString>;
        voice: z.ZodDefault<z.ZodEnum<["alloy", "echo", "fable", "onyx", "nova", "shimmer"]>>;
        format: z.ZodDefault<z.ZodEnum<["pcm16", "g711_ulaw", "g711_alaw"]>>;
        inputAudioTranscription: z.ZodDefault<z.ZodObject<{
            model: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            model: string;
        }, {
            model?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        model: string;
        enabled: boolean;
        voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
        format: "pcm16" | "g711_ulaw" | "g711_alaw";
        inputAudioTranscription: {
            model: string;
        };
    }, {
        model?: string | undefined;
        enabled?: boolean | undefined;
        voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | undefined;
        format?: "pcm16" | "g711_ulaw" | "g711_alaw" | undefined;
        inputAudioTranscription?: {
            model?: string | undefined;
        } | undefined;
    }>>;
    memory: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        maxSize: z.ZodDefault<z.ZodNumber>;
        saveHistory: z.ZodDefault<z.ZodBoolean>;
        sensitivePatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        projectDocsEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        maxSize: number;
        saveHistory: boolean;
        sensitivePatterns: string[];
        projectDocsEnabled: boolean;
    }, {
        enabled?: boolean | undefined;
        maxSize?: number | undefined;
        saveHistory?: boolean | undefined;
        sensitivePatterns?: string[] | undefined;
        projectDocsEnabled?: boolean | undefined;
    }>>;
    database: z.ZodObject<{
        url: z.ZodDefault<z.ZodString>;
        ssl: z.ZodDefault<z.ZodBoolean>;
        maxConnections: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        ssl: boolean;
        maxConnections: number;
    }, {
        url?: string | undefined;
        ssl?: boolean | undefined;
        maxConnections?: number | undefined;
    }>;
    redis: z.ZodObject<{
        url: z.ZodDefault<z.ZodString>;
        ttl: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        ttl: number;
    }, {
        url?: string | undefined;
        ttl?: number | undefined;
    }>;
    rateLimit: z.ZodDefault<z.ZodObject<{
        windowMs: z.ZodDefault<z.ZodNumber>;
        max: z.ZodDefault<z.ZodNumber>;
        skipSuccessfulRequests: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        windowMs: number;
        max: number;
        skipSuccessfulRequests: boolean;
    }, {
        windowMs?: number | undefined;
        max?: number | undefined;
        skipSuccessfulRequests?: boolean | undefined;
    }>>;
    cors: z.ZodDefault<z.ZodObject<{
        origin: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">, z.ZodBoolean]>>;
        credentials: z.ZodDefault<z.ZodBoolean>;
        methods: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        allowedHeaders: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        origin: string | boolean | string[];
        credentials: boolean;
        methods: string[];
        allowedHeaders: string[];
    }, {
        origin?: string | boolean | string[] | undefined;
        credentials?: boolean | undefined;
        methods?: string[] | undefined;
        allowedHeaders?: string[] | undefined;
    }>>;
    logging: z.ZodDefault<z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
        format: z.ZodDefault<z.ZodEnum<["json", "simple"]>>;
        auditEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        format: "json" | "simple";
        level: "error" | "warn" | "info" | "debug";
        auditEnabled: boolean;
    }, {
        format?: "json" | "simple" | undefined;
        level?: "error" | "warn" | "info" | "debug" | undefined;
        auditEnabled?: boolean | undefined;
    }>>;
    monitoring: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        metricsPath: z.ZodDefault<z.ZodString>;
        healthPath: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        metricsPath: string;
        healthPath: string;
    }, {
        enabled?: boolean | undefined;
        metricsPath?: string | undefined;
        healthPath?: string | undefined;
    }>>;
    security: z.ZodObject<{
        jwtSecret: z.ZodString;
        jwtExpiresIn: z.ZodDefault<z.ZodString>;
        bcryptRounds: z.ZodDefault<z.ZodNumber>;
        rateLimitEnabled: z.ZodDefault<z.ZodBoolean>;
        helmetEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        jwtSecret: string;
        jwtExpiresIn: string;
        bcryptRounds: number;
        rateLimitEnabled: boolean;
        helmetEnabled: boolean;
    }, {
        jwtSecret: string;
        jwtExpiresIn?: string | undefined;
        bcryptRounds?: number | undefined;
        rateLimitEnabled?: boolean | undefined;
        helmetEnabled?: boolean | undefined;
    }>;
    features: z.ZodDefault<z.ZodObject<{
        constitutionalAI: z.ZodDefault<z.ZodBoolean>;
        rustBridge: z.ZodDefault<z.ZodBoolean>;
        realtime: z.ZodDefault<z.ZodBoolean>;
        multiAgent: z.ZodDefault<z.ZodBoolean>;
        voiceMode: z.ZodDefault<z.ZodBoolean>;
        guardrails: z.ZodDefault<z.ZodBoolean>;
        zeroDataRetention: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        constitutionalAI: boolean;
        rustBridge: boolean;
        realtime: boolean;
        multiAgent: boolean;
        voiceMode: boolean;
        guardrails: boolean;
        zeroDataRetention: boolean;
    }, {
        constitutionalAI?: boolean | undefined;
        rustBridge?: boolean | undefined;
        realtime?: boolean | undefined;
        multiAgent?: boolean | undefined;
        voiceMode?: boolean | undefined;
        guardrails?: boolean | undefined;
        zeroDataRetention?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    port: number;
    env: "development" | "production" | "test";
    model: string;
    provider: string;
    providers: Record<string, {
        name: string;
        baseURL: string;
        envKey: string;
        headers?: Record<string, string> | undefined;
    }>;
    approvalMode: "suggest" | "auto-edit" | "full-auto";
    fullAutoErrorMode: "ask-user" | "ignore-and-continue";
    agents: Record<string, {
        name: string;
        instructions: string;
        tools: any[];
        downstreamAgents: string[];
        model?: string | undefined;
        publicDescription?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    }>;
    sandbox: {
        enabled: boolean;
        networkDisabled: boolean;
        allowedCommands: string[];
        restrictedPaths: string[];
    };
    voice: {
        model: string;
        enabled: boolean;
        voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
        format: "pcm16" | "g711_ulaw" | "g711_alaw";
        inputAudioTranscription: {
            model: string;
        };
    };
    memory: {
        enabled: boolean;
        maxSize: number;
        saveHistory: boolean;
        sensitivePatterns: string[];
        projectDocsEnabled: boolean;
    };
    database: {
        url: string;
        ssl: boolean;
        maxConnections: number;
    };
    redis: {
        url: string;
        ttl: number;
    };
    rateLimit: {
        windowMs: number;
        max: number;
        skipSuccessfulRequests: boolean;
    };
    cors: {
        origin: string | boolean | string[];
        credentials: boolean;
        methods: string[];
        allowedHeaders: string[];
    };
    logging: {
        format: "json" | "simple";
        level: "error" | "warn" | "info" | "debug";
        auditEnabled: boolean;
    };
    monitoring: {
        enabled: boolean;
        metricsPath: string;
        healthPath: string;
    };
    security: {
        jwtSecret: string;
        jwtExpiresIn: string;
        bcryptRounds: number;
        rateLimitEnabled: boolean;
        helmetEnabled: boolean;
    };
    features: {
        constitutionalAI: boolean;
        rustBridge: boolean;
        realtime: boolean;
        multiAgent: boolean;
        voiceMode: boolean;
        guardrails: boolean;
        zeroDataRetention: boolean;
    };
}, {
    database: {
        url?: string | undefined;
        ssl?: boolean | undefined;
        maxConnections?: number | undefined;
    };
    redis: {
        url?: string | undefined;
        ttl?: number | undefined;
    };
    security: {
        jwtSecret: string;
        jwtExpiresIn?: string | undefined;
        bcryptRounds?: number | undefined;
        rateLimitEnabled?: boolean | undefined;
        helmetEnabled?: boolean | undefined;
    };
    port?: number | undefined;
    env?: "development" | "production" | "test" | undefined;
    model?: string | undefined;
    provider?: string | undefined;
    providers?: Record<string, {
        name: string;
        baseURL: string;
        envKey: string;
        headers?: Record<string, string> | undefined;
    }> | undefined;
    approvalMode?: "suggest" | "auto-edit" | "full-auto" | undefined;
    fullAutoErrorMode?: "ask-user" | "ignore-and-continue" | undefined;
    agents?: Record<string, {
        name: string;
        instructions: string;
        model?: string | undefined;
        publicDescription?: string | undefined;
        tools?: any[] | undefined;
        downstreamAgents?: string[] | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    }> | undefined;
    sandbox?: {
        enabled?: boolean | undefined;
        networkDisabled?: boolean | undefined;
        allowedCommands?: string[] | undefined;
        restrictedPaths?: string[] | undefined;
    } | undefined;
    voice?: {
        model?: string | undefined;
        enabled?: boolean | undefined;
        voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | undefined;
        format?: "pcm16" | "g711_ulaw" | "g711_alaw" | undefined;
        inputAudioTranscription?: {
            model?: string | undefined;
        } | undefined;
    } | undefined;
    memory?: {
        enabled?: boolean | undefined;
        maxSize?: number | undefined;
        saveHistory?: boolean | undefined;
        sensitivePatterns?: string[] | undefined;
        projectDocsEnabled?: boolean | undefined;
    } | undefined;
    rateLimit?: {
        windowMs?: number | undefined;
        max?: number | undefined;
        skipSuccessfulRequests?: boolean | undefined;
    } | undefined;
    cors?: {
        origin?: string | boolean | string[] | undefined;
        credentials?: boolean | undefined;
        methods?: string[] | undefined;
        allowedHeaders?: string[] | undefined;
    } | undefined;
    logging?: {
        format?: "json" | "simple" | undefined;
        level?: "error" | "warn" | "info" | "debug" | undefined;
        auditEnabled?: boolean | undefined;
    } | undefined;
    monitoring?: {
        enabled?: boolean | undefined;
        metricsPath?: string | undefined;
        healthPath?: string | undefined;
    } | undefined;
    features?: {
        constitutionalAI?: boolean | undefined;
        rustBridge?: boolean | undefined;
        realtime?: boolean | undefined;
        multiAgent?: boolean | undefined;
        voiceMode?: boolean | undefined;
        guardrails?: boolean | undefined;
        zeroDataRetention?: boolean | undefined;
    } | undefined;
}>;
export declare const config: {
    port: number;
    env: "development" | "production" | "test";
    model: string;
    provider: string;
    providers: Record<string, {
        name: string;
        baseURL: string;
        envKey: string;
        headers?: Record<string, string> | undefined;
    }>;
    approvalMode: "suggest" | "auto-edit" | "full-auto";
    fullAutoErrorMode: "ask-user" | "ignore-and-continue";
    agents: Record<string, {
        name: string;
        instructions: string;
        tools: any[];
        downstreamAgents: string[];
        model?: string | undefined;
        publicDescription?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    }>;
    sandbox: {
        enabled: boolean;
        networkDisabled: boolean;
        allowedCommands: string[];
        restrictedPaths: string[];
    };
    voice: {
        model: string;
        enabled: boolean;
        voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
        format: "pcm16" | "g711_ulaw" | "g711_alaw";
        inputAudioTranscription: {
            model: string;
        };
    };
    memory: {
        enabled: boolean;
        maxSize: number;
        saveHistory: boolean;
        sensitivePatterns: string[];
        projectDocsEnabled: boolean;
    };
    database: {
        url: string;
        ssl: boolean;
        maxConnections: number;
    };
    redis: {
        url: string;
        ttl: number;
    };
    rateLimit: {
        windowMs: number;
        max: number;
        skipSuccessfulRequests: boolean;
    };
    cors: {
        origin: string | boolean | string[];
        credentials: boolean;
        methods: string[];
        allowedHeaders: string[];
    };
    logging: {
        format: "json" | "simple";
        level: "error" | "warn" | "info" | "debug";
        auditEnabled: boolean;
    };
    monitoring: {
        enabled: boolean;
        metricsPath: string;
        healthPath: string;
    };
    security: {
        jwtSecret: string;
        jwtExpiresIn: string;
        bcryptRounds: number;
        rateLimitEnabled: boolean;
        helmetEnabled: boolean;
    };
    features: {
        constitutionalAI: boolean;
        rustBridge: boolean;
        realtime: boolean;
        multiAgent: boolean;
        voiceMode: boolean;
        guardrails: boolean;
        zeroDataRetention: boolean;
    };
};
export type Config = z.infer<typeof ConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export declare const getProviderConfig: (providerName: string) => ProviderConfig | null;
export declare const getProviderApiKey: (providerName: string) => string | null;
export declare const getAgentConfig: (agentName: string) => AgentConfig | null;
export default config;
//# sourceMappingURL=index.d.ts.map