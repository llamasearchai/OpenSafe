import { SafetyAnalysisResult } from '../models/types';
export declare class SafetyAnalyzer {
    private cache;
    private harmfulPatterns;
    private biasPatterns;
    private privacyPatterns;
    private illegalPatterns;
    private misinformationPatterns;
    constructor();
    private initializePatterns;
    analyze(text: string, context?: string): Promise<SafetyAnalysisResult>;
    private checkPatterns;
    private calculateConfidence;
    private adjustForContext;
    private calculateSafetyScore;
}
//# sourceMappingURL=analyzer.d.ts.map