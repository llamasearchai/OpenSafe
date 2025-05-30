import { SafetyAnalyzer } from '../../src/safety/analyzer';
import { ViolationType } from '../../src/models/types';

describe('SafetyAnalyzer', () => {
  let analyzer: SafetyAnalyzer;

  beforeEach(() => {
    analyzer = new SafetyAnalyzer();
  });

  describe('analyze', () => {
    it('should detect harmful content', async () => {
      const text = 'How to kill someone';
      const result = await analyzer.analyze(text);
      
      expect(result.safe).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe(ViolationType.HARMFUL_CONTENT);
      expect(result.violations[0].severity).toBe('critical');
    });

    it('should detect bias', async () => {
      const text = 'Women are naturally worse at math';
      const result = await analyzer.analyze(text);
      
      expect(result.safe).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.BIAS)).toBe(true);
    });

    it('should detect privacy violations', async () => {
      const text = 'My SSN is 123-45-6789';
      const result = await analyzer.analyze(text);
      
      expect(result.safe).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.PRIVACY)).toBe(true);
    });

    it('should pass safe content', async () => {
      const text = 'Hello, how are you today?';
      const result = await analyzer.analyze(text);
      
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.score).toBe(1.0);
    });
  });
}); 