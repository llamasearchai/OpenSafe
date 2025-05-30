// Mock Rust bridge implementation - avoiding problematic FFI dependencies
import { SafetyAnalysisResult, InterpretabilityAnalysis } from '../models/types';

export class RustBridge {
  private isRustAvailable: boolean = false;

  constructor() {
    // In a real implementation, this would check if Rust library is available
    this.isRustAvailable = false;
    console.info('[RustBridge] Using JavaScript fallback implementation');
  }

  async analyzeSafety(text: string, context?: string): Promise<SafetyAnalysisResult> {
    // Mock implementation for safety analysis
    return this.mockSafetyAnalysis(text, context);
  }

  async analyzeInterpretability(text: string): Promise<InterpretabilityAnalysis> {
    // Mock implementation for interpretability analysis
    return this.mockInterpretabilityAnalysis(text);
  }

  private mockSafetyAnalysis(text: string, _context?: string): SafetyAnalysisResult {
    // Simple heuristic-based analysis for demonstration
    const harmful_keywords = ['kill', 'harm', 'hurt', 'violence', 'hate'];
    const pii_patterns = ['@', 'ssn', 'social security', 'credit card'];
    
    const violations = [];
    const lowercaseText = text.toLowerCase();
    
    // Check for harmful content
    for (const keyword of harmful_keywords) {
      if (lowercaseText.includes(keyword)) {
        violations.push({
          type: 'harmful_content' as any,
          severity: 'high' as const,
          description: `Detected potentially harmful keyword: ${keyword}`,
          evidence: [keyword],
          confidence: 0.8,
          remediation: `Consider removing or rephrasing content containing "${keyword}"`
        });
      }
    }
    
    // Check for PII
    for (const pattern of pii_patterns) {
      if (lowercaseText.includes(pattern)) {
        violations.push({
          type: 'pii_detected' as any,
          severity: 'medium' as const,
          description: `Detected potential PII pattern: ${pattern}`,
          evidence: [pattern],
          confidence: 0.7,
          remediation: `Consider redacting or removing PII content`
        });
      }
    }
    
    const score = violations.length > 0 ? Math.max(0.1, 1.0 - (violations.length * 0.3)) : 0.95;
    
    return {
      safe: violations.length === 0,
      score,
      violations,
      metadata: {
        analysisTime: Date.now(),
        modelVersion: 'mock-js-v1.0',
        timestamp: new Date().toISOString(),
        policyVersion: 'default'
      }
    };
  }

  private mockInterpretabilityAnalysis(text: string): InterpretabilityAnalysis {
    return {
      modelName: 'mock-js-analyzer',
      text: text,
      tokens: text.split(' '),
      attentionWeights: [],
      featureImportance: {
        'keyword_matching': 0.7,
        'pattern_detection': 0.6
      }
    };
  }

  isAvailable(): boolean {
    return this.isRustAvailable;
  }

  getVersion(): string {
    return 'mock-js-v1.0';
  }
}

export const rustBridge = new RustBridge(); 