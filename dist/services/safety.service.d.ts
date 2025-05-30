import { SafetyAnalysisResult, ConstitutionalAIResult } from '../models/types';
import { SafetyAnalysisRequestSchema, ConstitutionalAIRequestSchema } from '../models/schemas';
import { z } from 'zod';
export declare class SafetyService {
    private safetyAnalyzer;
    private constitutionalAI;
    constructor();
    analyzeText(params: z.infer<typeof SafetyAnalysisRequestSchema>, actorId?: string): Promise<SafetyAnalysisResult>;
    private applySafetyPolicy;
    applyConstitutionalPrinciples(params: z.infer<typeof ConstitutionalAIRequestSchema>, actorId?: string): Promise<ConstitutionalAIResult>;
}
export declare const safetyService: SafetyService;
//# sourceMappingURL=safety.service.d.ts.map