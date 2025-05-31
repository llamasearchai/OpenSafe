import { ConstitutionalAIResult } from '../models/types';
export interface ConstitutionalPrinciple {
    id: string;
    name: string;
    description: string;
    critique_request: string;
    revision_request: string;
    priority: 'high' | 'medium' | 'low';
}
export declare const DEFAULT_PRINCIPLES: ConstitutionalPrinciple[];
export declare class ConstitutionalAI {
    private principles;
    constructor(principles?: ConstitutionalPrinciple[]);
    critique(text: string, principle: ConstitutionalPrinciple): Promise<{
        hasViolation: boolean;
        explanation: string;
        severity: 'low' | 'medium' | 'high';
        suggestions: string[];
    }>;
    revise(text: string, principle: ConstitutionalPrinciple, _critique: string): Promise<string>;
    applyPrinciples(text: string, options?: {
        max_revisions?: number;
        principles?: string[];
        target_audience?: string;
        custom_instructions?: string;
    }): Promise<ConstitutionalAIResult>;
    addPrinciple(principle: ConstitutionalPrinciple): void;
    removePrinciple(id: string): boolean;
    getPrinciples(): ConstitutionalPrinciple[];
}
//# sourceMappingURL=constitutional.d.ts.map