use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use regex::Regex;
use rayon::prelude::*;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SafetyResult {
    pub safe: bool,
    pub score: f64,
    pub violations: Vec<Violation>,
    pub metadata: AnalysisMetadata,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Violation {
    pub r#type: String,
    pub severity: String,
    pub description: String,
    pub confidence: f64,
    pub evidence: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AnalysisMetadata {
    pub analysis_time_ms: u64,
    pub model_version: String,
    pub timestamp: String,
    pub text_length: usize,
    pub pattern_matches: usize,
}

pub struct SafetyAnalyzer {
    harmful_patterns: Vec<Regex>,
    bias_patterns: Vec<Regex>,
    privacy_patterns: Vec<Regex>,
    illegal_patterns: Vec<Regex>,
    misinformation_patterns: Vec<Regex>,
    severity_weights: HashMap<String, f64>,
}

impl SafetyAnalyzer {
    pub fn new() -> Self {
        let harmful_patterns = vec![
            Regex::new(r"(?i)\b(kill|murder|assassinate|eliminate)\s+(someone|people|person)\b").unwrap(),
            Regex::new(r"(?i)\b(how\s+to\s+)?(make|create|build)\s+(bomb|weapon|explosive)\b").unwrap(),
            Regex::new(r"(?i)\b(suicide|self\s*harm|cut\s+myself)\b").unwrap(),
            Regex::new(r"(?i)\b(harm|hurt|damage|destroy)\s+(yourself|others|someone)\b").unwrap(),
            Regex::new(r"(?i)\b(violence|violent|attack|assault)\b").unwrap(),
        ];

        let bias_patterns = vec![
            Regex::new(r"(?i)\b(women|men)\s+are\s+(naturally|always|never)\b").unwrap(),
            Regex::new(r"(?i)\b(black|white|asian|hispanic)\s+people\s+are\b").unwrap(),
            Regex::new(r"(?i)\b(muslims|christians|jews)\s+are\s+(all|always)\b").unwrap(),
            Regex::new(r"(?i)\b(old|young)\s+people\s+(can't|cannot|shouldn't)\b").unwrap(),
            Regex::new(r"(?i)\b(stereotype|prejudice|discriminate)\b").unwrap(),
        ];

        let privacy_patterns = vec![
            Regex::new(r"\b\d{3}-\d{2}-\d{4}\b").unwrap(), // SSN
            Regex::new(r"\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b").unwrap(), // Credit card
            Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b").unwrap(), // Email
            Regex::new(r"\b\d{3}-\d{3}-\d{4}\b").unwrap(), // Phone
            Regex::new(r"\b\d{1,5}\s\w+\s(street|st|avenue|ave|road|rd|drive|dr)\b").unwrap(), // Address
        ];

        let illegal_patterns = vec![
            Regex::new(r"(?i)\b(illegal|criminal|unlawful)\s+activity\b").unwrap(),
            Regex::new(r"(?i)\b(drug\s+dealing|sell\s+drugs|buy\s+cocaine)\b").unwrap(),
            Regex::new(r"(?i)\b(money\s+laundering|tax\s+evasion)\b").unwrap(),
            Regex::new(r"(?i)\b(hack|steal|rob|fraud)\s+(someone|system|bank)\b").unwrap(),
        ];

        let misinformation_patterns = vec![
            Regex::new(r"(?i)vaccines?\s+(cause|causes)\s+autism").unwrap(),
            Regex::new(r"(?i)covid\s+is\s+a\s+hoax").unwrap(),
            Regex::new(r"(?i)climate\s+change\s+is\s+(fake|hoax)").unwrap(),
            Regex::new(r"(?i)earth\s+is\s+flat").unwrap(),
            Regex::new(r"(?i)5g\s+(causes|spreads)\s+covid").unwrap(),
        ];

        let mut severity_weights = HashMap::new();
        severity_weights.insert("low".to_string(), 0.1);
        severity_weights.insert("medium".to_string(), 0.3);
        severity_weights.insert("high".to_string(), 0.6);
        severity_weights.insert("critical".to_string(), 1.0);

        Self {
            harmful_patterns,
            bias_patterns,
            privacy_patterns,
            illegal_patterns,
            misinformation_patterns,
            severity_weights,
        }
    }

    pub fn analyze(&self, text: &str, context: Option<&str>) -> SafetyResult {
        let start_time = std::time::Instant::now();
        let text_lower = text.to_lowercase();
        let mut violations = Vec::new();
        let mut pattern_matches = 0;

        // Parallel analysis of different violation types
        let violation_checks: Vec<Box<dyn Fn() -> Vec<Violation> + Send + Sync>> = vec![
            Box::new(|| self.check_harmful_content(&text_lower)),
            Box::new(|| self.check_bias(&text_lower)),
            Box::new(|| self.check_privacy(text)),
            Box::new(|| self.check_illegal_content(&text_lower)),
            Box::new(|| self.check_misinformation(&text_lower)),
        ];

        let results: Vec<Vec<Violation>> = violation_checks
            .into_par_iter()
            .map(|check| check())
            .collect();

        for result in results {
            pattern_matches += result.len();
            violations.extend(result);
        }

        // Context-aware adjustments
        if let Some(ctx) = context {
            self.adjust_for_context(&mut violations, ctx);
        }

        let safe = violations.is_empty();
        let score = self.calculate_safety_score(&violations);
        let analysis_time = start_time.elapsed().as_millis() as u64;

        SafetyResult {
            safe,
            score,
            violations,
            metadata: AnalysisMetadata {
                analysis_time_ms: analysis_time,
                model_version: "1.0.0".to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                text_length: text.len(),
                pattern_matches,
            },
        }
    }

    fn check_harmful_content(&self, text: &str) -> Vec<Violation> {
        let mut violations = Vec::new();
        
        for pattern in &self.harmful_patterns {
            if let Some(mat) = pattern.find(text) {
                violations.push(Violation {
                    r#type: "harmful_content".to_string(),
                    severity: "critical".to_string(),
                    description: "Text contains potentially harmful content".to_string(),
                    confidence: 0.95,
                    evidence: vec![mat.as_str().to_string()],
                });
            }
        }
        
        violations
    }

    fn check_bias(&self, text: &str) -> Vec<Violation> {
        let mut violations = Vec::new();
        
        for pattern in &self.bias_patterns {
            if let Some(mat) = pattern.find(text) {
                violations.push(Violation {
                    r#type: "bias".to_string(),
                    severity: "high".to_string(),
                    description: "Text contains potentially biased content".to_string(),
                    confidence: 0.8,
                    evidence: vec![mat.as_str().to_string()],
                });
            }
        }
        
        violations
    }

    fn check_privacy(&self, text: &str) -> Vec<Violation> {
        let mut violations = Vec::new();
        
        for pattern in &self.privacy_patterns {
            for _mat in pattern.find_iter(text) {
                violations.push(Violation {
                    r#type: "privacy".to_string(),
                    severity: "high".to_string(),
                    description: "Text contains personally identifiable information".to_string(),
                    confidence: 0.9,
                    evidence: vec!["[REDACTED]".to_string()], // Don't include actual PII
                });
            }
        }
        
        violations
    }

    fn check_illegal_content(&self, text: &str) -> Vec<Violation> {
        let mut violations = Vec::new();
        
        for pattern in &self.illegal_patterns {
            if let Some(mat) = pattern.find(text) {
                violations.push(Violation {
                    r#type: "illegal_content".to_string(),
                    severity: "critical".to_string(),
                    description: "Text contains references to illegal activities".to_string(),
                    confidence: 0.85,
                    evidence: vec![mat.as_str().to_string()],
                });
            }
        }
        
        violations
    }

    fn check_misinformation(&self, text: &str) -> Vec<Violation> {
        let mut violations = Vec::new();
        
        for pattern in &self.misinformation_patterns {
            if let Some(mat) = pattern.find(text) {
                violations.push(Violation {
                    r#type: "misinformation".to_string(),
                    severity: "medium".to_string(),
                    description: "Text contains potential misinformation".to_string(),
                    confidence: 0.75,
                    evidence: vec![mat.as_str().to_string()],
                });
            }
        }
        
        violations
    }

    fn adjust_for_context(&self, violations: &mut Vec<Violation>, context: &str) {
        let context_lower = context.to_lowercase();
        
        // Reduce severity for educational/medical contexts
        if context_lower.contains("medical") || context_lower.contains("educational") || 
           context_lower.contains("academic") || context_lower.contains("research") {
            for violation in violations.iter_mut() {
                if violation.severity == "critical" {
                    violation.severity = "high".to_string();
                    violation.confidence *= 0.7;
                } else if violation.severity == "high" {
                    violation.severity = "medium".to_string();
                    violation.confidence *= 0.8;
                }
            }
        }
    }

    fn calculate_safety_score(&self, violations: &[Violation]) -> f64 {
        if violations.is_empty() {
            return 1.0;
        }

        let total_weight: f64 = violations
            .iter()
            .map(|v| {
                let severity_weight = self.severity_weights.get(&v.severity).unwrap_or(&0.5);
                severity_weight * v.confidence
            })
            .sum();

        (1.0 - total_weight.min(1.0)).max(0.0)
    }
} 