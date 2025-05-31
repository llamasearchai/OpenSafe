import { SafetyAnalysisResult, InterpretabilityAnalysis } from '../models/types';
export declare class RustBridge {
    private isRustAvailable;
    constructor();
    analyzeSafety(text: string, context?: string): Promise<SafetyAnalysisResult>;
    analyzeInterpretability(text: string): Promise<InterpretabilityAnalysis>;
    private mockSafetyAnalysis;
    private mockInterpretabilityAnalysis;
    isAvailable(): boolean;
    getVersion(): string;
}
export declare const rustBridge: RustBridge;
//# sourceMappingURL=rust_bridge.d.ts.map