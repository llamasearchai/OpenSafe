import { SafetyAnalysisResult, SafetyViolation, ViolationType } from '../models/types';
import { logger } from '../utils/logger';

export class SafetyAnalyzer {
  private cache: Map<string, SafetyAnalysisResult>;
  private harmfulPatterns!: RegExp[];
  private biasPatterns!: RegExp[];
  private privacyPatterns!: RegExp[];
  private illegalPatterns!: RegExp[];
  private misinformationPatterns!: RegExp[];

  constructor() {
    this.cache = new Map();
    this.initializePatterns();
  }

  private initializePatterns() {
    this.harmfulPatterns = [
      /\b(kill|murder|assassinate|eliminate)\s+(someone|people|person)\b/gi,
      /\b(how\s+to\s+)?(make|create|build)\s+(bomb|weapon|explosive)\b/gi,
      /\b(suicide|self\s*harm|cut\s+myself)\b/gi,
      /\b(harm|hurt|damage|destroy)\s+(yourself|others|someone)\b/gi,
      /\b(violence|violent|attack|assault)\b/gi,
    ];

    this.biasPatterns = [
      /\b(women|men)\s+are\s+(naturally|always|never)\b/gi,
      /\b(black|white|asian|hispanic)\s+people\s+are\b/gi,
      /\b(muslims|christians|jews)\s+are\s+(all|always)\b/gi,
      /\b(old|young)\s+people\s+(can't|cannot|shouldn't)\b/gi,
      /\b(stereotype|prejudice|discriminate)\b/gi,
    ];

    this.privacyPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone
      /\b\d{1,5}\s\w+\s(street|st|avenue|ave|road|rd|drive|dr)\b/gi, // Address
    ];

    this.illegalPatterns = [
      /\b(illegal|criminal|unlawful)\s+activity\b/gi,
      /\b(drug\s+dealing|sell\s+drugs|buy\s+cocaine)\b/gi,
      /\b(money\s+laundering|tax\s+evasion)\b/gi,
      /\b(hack|steal|rob|fraud)\s+(someone|system|bank)\b/gi,
    ];

    this.misinformationPatterns = [
      /vaccines?\s+(cause|causes)\s+autism/gi,
      /covid\s+is\s+a\s+hoax/gi,
      /climate\s+change\s+is\s+(fake|hoax)/gi,
      /earth\s+is\s+flat/gi,
      /5g\s+(causes|spreads)\s+covid/gi,
    ];
  }

  async analyze(text: string, context?: string): Promise<SafetyAnalysisResult> {
    const cacheKey = `${text}:${context || ''}`;
    
    if (this.cache.has(cacheKey)) {
      logger.debug('Returning cached safety analysis');
      return this.cache.get(cacheKey)!;
    }

    const startTime = Date.now();
    
    try {
      const violations: SafetyViolation[] = [];
      
      // Check for harmful patterns
      const harmfulViolations = this.checkPatterns(text, this.harmfulPatterns, ViolationType.HARMFUL_CONTENT, 'critical');
      violations.push(...harmfulViolations);

      // Check for bias
      const biasViolations = this.checkPatterns(text, this.biasPatterns, ViolationType.BIAS, 'high');
      violations.push(...biasViolations);

      // Check for privacy violations
      const privacyViolations = this.checkPatterns(text, this.privacyPatterns, ViolationType.PRIVACY, 'high');
      violations.push(...privacyViolations);

      // Check for illegal content
      const illegalViolations = this.checkPatterns(text, this.illegalPatterns, ViolationType.ILLEGAL_CONTENT, 'critical');
      violations.push(...illegalViolations);

      // Check for misinformation
      const misinfoViolations = this.checkPatterns(text, this.misinformationPatterns, ViolationType.MISINFORMATION, 'medium');
      violations.push(...misinfoViolations);

      // Context-aware adjustments
      if (context) {
        this.adjustForContext(violations, context);
      }

      const result: SafetyAnalysisResult = {
        safe: violations.length === 0,
        score: this.calculateSafetyScore(violations),
        violations,
        metadata: {
          analysisTime: Date.now() - startTime,
          modelVersion: '1.0.0-typescript',
          timestamp: new Date().toISOString()
        }
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Safety analysis failed', error);
      throw new Error('Safety analysis failed');
    }
  }

  private checkPatterns(
    text: string,
    patterns: RegExp[],
    type: ViolationType,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): SafetyViolation[] {
    const violations: SafetyViolation[] = [];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          type,
          severity,
          description: `Text contains potentially ${type.replace('_', ' ')} content`,
          evidence: matches.slice(0, 3),
          confidence: this.calculateConfidence(type, matches.length)
        });
      }
    }

    return violations;
  }

  private calculateConfidence(type: ViolationType, matchCount: number): number {
    const baseConfidence: Record<ViolationType, number> = {
      [ViolationType.HARMFUL_CONTENT]: 0.7,
      [ViolationType.ILLEGAL_CONTENT]: 0.8,
      [ViolationType.PRIVACY]: 0.6,
      [ViolationType.BIAS]: 0.5,
      [ViolationType.MISINFORMATION]: 0.6,
      [ViolationType.MANIPULATION]: 0.7,
      [ViolationType.PII_DETECTED]: 0.8,
      [ViolationType.PROFANITY]: 0.9,
      [ViolationType.SELF_HARM]: 0.8,
      [ViolationType.HATE_SPEECH]: 0.8,
      [ViolationType.POLICY_VIOLATION]: 0.7,
    };

    const base = baseConfidence[type] || 0.5;
    const boost = Math.min(0.1, matchCount * 0.02);
    return Math.min(1.0, base + boost);
  }

  private adjustForContext(violations: SafetyViolation[], context: string): void {
    const contextLower = context.toLowerCase();
    
    // Reduce severity for educational/medical contexts
    if (contextLower.includes('medical') || 
        contextLower.includes('educational') || 
        contextLower.includes('academic') || 
        contextLower.includes('research')) {
      
      for (const violation of violations) {
        if (violation.severity === 'critical') {
          violation.severity = 'high';
          violation.confidence *= 0.7;
        } else if (violation.severity === 'high') {
          violation.severity = 'medium';
          violation.confidence *= 0.8;
        }
      }
    }
  }

  private calculateSafetyScore(violations: SafetyViolation[]): number {
    if (violations.length === 0) {
      return 1.0;
    }

    const severityWeights: Record<string, number> = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      critical: 1.0
    };

    const totalWeight = violations.reduce((sum, violation) => {
      const weight = severityWeights[violation.severity] || 0.5;
      return sum + weight * violation.confidence;
    }, 0);

    return Math.max(0, 1 - Math.min(1, totalWeight));
  }
} 