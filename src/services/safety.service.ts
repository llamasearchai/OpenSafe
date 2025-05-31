import { SafetyAnalysisResult, ConstitutionalAIResult } from '../models/types';

// Simple logger fallback
const logger = {
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
  info: (...args: unknown[]) => console.info('[INFO]', ...args),
};

// Simple AppError class
class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Mock audit service
const auditService = {
  logAction: async (data: Record<string, unknown>) => {
    console.log('[AUDIT]', data);
  }
};

interface SafetyAnalyzer {
  analyze: (text: string, context?: string) => Promise<SafetyAnalysisResult>;
}

interface ConstitutionalAI {
  applyPrinciples: (text: string, options: { principles?: string[]; max_revisions?: number }) => Promise<ConstitutionalAIResult>;
}

export class SafetyService {
  private safetyAnalyzer: SafetyAnalyzer;
  private constitutionalAI: ConstitutionalAI;

  constructor() {
    // Mock implementations
    this.safetyAnalyzer = {
      analyze: async (text: string, _context?: string) => ({
        safe: !text.toLowerCase().includes('harmful'),
        score: 0.95,
        violations: [],
        metadata: {
          analysisTime: 50,
          modelVersion: 'mock-v1.0',
          timestamp: new Date().toISOString()
        }
      })
    };

    this.constitutionalAI = {
      applyPrinciples: async (text: string, _options: { principles?: string[]; max_revisions?: number }) => ({
        original: text,
        revised: text,
        critiques: [],
        revisionCount: 0,
        principles: ['harmlessness', 'helpfulness'],
        appliedSuccessfully: true
      })
    };
  }

  async analyzeText(
    params: {
      text: string;
      mode?: string;
      include_interpretability?: boolean;
      context?: string;
      policy_id?: string;
      userId?: string;
    },
    actorId?: string
  ): Promise<SafetyAnalysisResult> {
    try {
      const { text, context, policy_id } = params;
      const analysisResult = await this.safetyAnalyzer.analyze(text, context);
      
      await auditService.logAction({
        userId: actorId,
        action: 'safety_analysis',
        details: { 
          textLength: text.length,
          mode: params.mode || 'default',
          policyId: policy_id,
          score: analysisResult.score
        }
      });

      return analysisResult;
    } catch (error) {
      logger.error('Safety analysis failed', error);
      throw new AppError(500, 'Safety analysis failed');
    }
  }

  async applyConstitutionalPrinciples(
    params: {
      text: string;
      principles?: string[];
      max_revisions?: number;
    },
    actorId?: string
  ): Promise<ConstitutionalAIResult> {
    const { text, principles, max_revisions = 3 } = params;
    
    try {
      const result = await this.constitutionalAI.applyPrinciples(text, {
        principles,
        max_revisions
      });
      
      await auditService.logAction({
        userId: actorId,
        action: 'constitutional_ai_application',
        details: { 
          originalLength: text.length,
          revisedLength: result.revised.length,
          revisionCount: result.revisionCount
        }
      });

      return result;
    } catch (error) {
      logger.error('Constitutional AI application failed', error);
      throw new AppError(500, 'Constitutional AI application failed');
    }
  }
}

export const safetyService = new SafetyService(); 