import { ConstitutionalAIResult } from '../models/types';

export interface ConstitutionalPrinciple {
  id: string;
  name: string;
  description: string;
  critique_request: string;
  revision_request: string;
  priority: 'high' | 'medium' | 'low';
}

export const DEFAULT_PRINCIPLES: ConstitutionalPrinciple[] = [
  {
    id: 'harmlessness',
    name: 'Harmlessness',
    description: 'Avoid content that could cause harm to individuals or groups',
    critique_request: 'Identify any harmful content in the following text that could cause physical, emotional, or psychological harm.',
    revision_request: 'Revise the following text to remove any harmful content while preserving the core message.',
    priority: 'high'
  },
  {
    id: 'truthfulness',
    name: 'Truthfulness',
    description: 'Ensure content is accurate and not misleading',
    critique_request: 'Identify any false, misleading, or unverified claims in the following text.',
    revision_request: 'Revise the following text to ensure all claims are accurate and properly qualified.',
    priority: 'high'
  },
  {
    id: 'privacy',
    name: 'Privacy Protection',
    description: 'Protect personal and sensitive information',
    critique_request: 'Identify any personal, private, or sensitive information that should be protected in the following text.',
    revision_request: 'Revise the following text to remove or redact any personal or sensitive information.',
    priority: 'medium'
  },
  {
    id: 'respectfulness',
    name: 'Respectfulness',
    description: 'Maintain respectful and professional tone',
    critique_request: 'Identify any disrespectful, offensive, or unprofessional language in the following text.',
    revision_request: 'Revise the following text to use more respectful and professional language.',
    priority: 'medium'
  }
];

export class ConstitutionalAI {
  private principles: ConstitutionalPrinciple[];

  constructor(principles: ConstitutionalPrinciple[] = DEFAULT_PRINCIPLES) {
    this.principles = principles;
  }

  async critique(text: string, principle: ConstitutionalPrinciple): Promise<{
    hasViolation: boolean;
    explanation: string;
    severity: 'low' | 'medium' | 'high';
    suggestions: string[];
  }> {
    // This is a simplified implementation
    // In a real system, this would use an AI model to evaluate the text
    
    const lowercaseText = text.toLowerCase();
    
    // Simple rule-based checks for demonstration
    const checks = {
      harmlessness: {
        keywords: ['kill', 'harm', 'hurt', 'violence', 'suicide', 'self-harm'],
        severity: 'high' as const
      },
      truthfulness: {
        keywords: ['definitely', 'absolutely certain', 'guaranteed', 'proven fact'],
        severity: 'medium' as const
      },
      privacy: {
        keywords: ['ssn', 'social security', 'credit card', 'password', 'email', '@'],
        severity: 'medium' as const
      },
      respectfulness: {
        keywords: ['stupid', 'idiot', 'dumb', 'moron', 'hate'],
        severity: 'low' as const
      }
    };

    const check = checks[principle.id as keyof typeof checks];
    if (!check) {
      return {
        hasViolation: false,
        explanation: 'No specific checks available for this principle',
        severity: 'low',
        suggestions: []
      };
    }

    const foundKeywords = check.keywords.filter(keyword => lowercaseText.includes(keyword));
    
    if (foundKeywords.length > 0) {
      return {
        hasViolation: true,
        explanation: `Text contains potentially problematic content related to ${principle.name.toLowerCase()}: ${foundKeywords.join(', ')}`,
        severity: check.severity,
        suggestions: [
          `Consider removing or rephrasing content related to: ${foundKeywords.join(', ')}`,
          `Review the text for alignment with ${principle.name} principles`,
          'Consider alternative phrasing that maintains the core message'
        ]
      };
    }

    return {
      hasViolation: false,
      explanation: `Text appears to align with ${principle.name} principles`,
      severity: 'low',
      suggestions: []
    };
  }

  async revise(text: string, principle: ConstitutionalPrinciple, _critique: string): Promise<string> {
    // This is a simplified implementation
    // In a real system, this would use an AI model to revise the text
    
    let revisedText = text;
    
    // Simple rule-based revisions for demonstration
    const revisions = {
      harmlessness: [
        { from: /\bkill\b/gi, to: 'stop' },
        { from: /\bharm\b/gi, to: 'help' },
        { from: /\bhurt\b/gi, to: 'assist' },
        { from: /\bviolence\b/gi, to: 'peaceful resolution' }
      ],
      respectfulness: [
        { from: /\bstupid\b/gi, to: 'incorrect' },
        { from: /\bidiot\b/gi, to: 'person' },
        { from: /\bdumb\b/gi, to: 'incorrect' },
        { from: /\bmoron\b/gi, to: 'individual' }
      ]
    };

    const principleRevisions = revisions[principle.id as keyof typeof revisions];
    if (principleRevisions) {
      for (const revision of principleRevisions) {
        revisedText = revisedText.replace(revision.from, revision.to);
      }
    }

    return revisedText;
  }

  async applyPrinciples(
    text: string,
    options: {
      max_revisions?: number;
      principles?: string[];
      target_audience?: string;
      custom_instructions?: string;
    } = {}
  ): Promise<ConstitutionalAIResult> {
    const {
      max_revisions = 3,
      principles: selectedPrinciples
    } = options;

    let currentText = text;
    let revisionsCount = 0;
    const critiques: Array<{
      principle: string;
      critique: string;
      hasViolation: boolean;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Filter principles if specific ones are requested
    const principlesToApply = selectedPrinciples
      ? this.principles.filter(p => selectedPrinciples.includes(p.id))
      : this.principles;

    // Sort by priority (high first)
    const sortedPrinciples = principlesToApply.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (let revision = 0; revision < max_revisions; revision++) {
      let hasViolations = false;

      for (const principle of sortedPrinciples) {
        const critique = await this.critique(currentText, principle);
        
        critiques.push({
          principle: principle.name,
          critique: critique.explanation,
          hasViolation: critique.hasViolation,
          severity: critique.severity
        });

        if (critique.hasViolation) {
          hasViolations = true;
          const revisedText = await this.revise(currentText, principle, critique.explanation);
          
          if (revisedText !== currentText) {
            currentText = revisedText;
            revisionsCount++;
          }
        }
      }

      // If no violations found, we're done
      if (!hasViolations) {
        break;
      }
    }

    return {
      original: text,
      revised: currentText,
      revisionCount: revisionsCount,
      principles: principlesToApply.map(p => p.name),
      critiques: critiques.map(c => ({
        principle: c.principle,
        violation: c.critique,
        suggestion: c.hasViolation ? 'Consider revising based on the identified issues' : 'No issues identified',
        severity: c.severity === 'high' ? 8 : c.severity === 'medium' ? 5 : 2
      })),
      appliedSuccessfully: revisionsCount >= 0
    };
  }

  addPrinciple(principle: ConstitutionalPrinciple): void {
    this.principles.push(principle);
  }

  removePrinciple(id: string): boolean {
    const index = this.principles.findIndex(p => p.id === id);
    if (index !== -1) {
      this.principles.splice(index, 1);
      return true;
    }
    return false;
  }

  getPrinciples(): ConstitutionalPrinciple[] {
    return [...this.principles];
  }
} 