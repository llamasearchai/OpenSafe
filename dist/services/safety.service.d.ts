import { SafetyAnalysisResult, ConstitutionalAIResult } from '../models/types';
export declare class SafetyService {
    private safetyAnalyzer;
    private constitutionalAI;
    constructor();
    analyzeText(params: {
        text: string;
        mode?: string;
        include_interpretability?: boolean;
        context?: string;
        policy_id?: string;
        userId?: string;
    }, actorId?: string): Promise<SafetyAnalysisResult>;
    applyConstitutionalPrinciples(params: {
        text: string;
        principles?: string[];
        max_revisions?: number;
    }, actorId?: string): Promise<ConstitutionalAIResult>;
}
export declare const safetyService: SafetyService;
//# sourceMappingURL=safety.service.d.ts.map