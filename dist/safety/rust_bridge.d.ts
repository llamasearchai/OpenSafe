import { InterpretabilityAnalysis, SafetyAnalysisResult } from '../models/types';
export declare class RustBridge {
    private lib;
    constructor();
    private getMockLib;
    analyzeSafety(text: string, context?: string): Promise<SafetyAnalysisResult>;
    analyzeInterpretability(text: string): Promise<InterpretabilityAnalysis>;
}
//# sourceMappingURL=rust_bridge.d.ts.map