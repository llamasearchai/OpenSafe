use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InterpretabilityResult {
    pub feature_importance: Vec<FeatureImportance>,
    pub attention_weights: Vec<Vec<f32>>,
    pub neuron_activations: Vec<NeuronActivation>,
    pub concepts: Vec<ConceptActivation>,
    pub metadata: InterpretabilityMetadata,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FeatureImportance {
    pub token: String,
    pub importance: f32,
    pub position: usize,
    pub category: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NeuronActivation {
    pub layer: usize,
    pub neuron: usize,
    pub activation: f32,
    pub concept: String,
    pub examples: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ConceptActivation {
    pub concept: String,
    pub strength: f32,
    pub confidence: f32,
    pub supporting_tokens: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InterpretabilityMetadata {
    pub analysis_time_ms: u64,
    pub model_version: String,
    pub timestamp: String,
    pub text_length: usize,
    pub num_tokens: usize,
}

pub struct InterpretabilityAnalyzer {
    concept_mappings: HashMap<String, Vec<String>>,
    safety_concepts: Vec<String>,
}

impl InterpretabilityAnalyzer {
    pub fn new() -> Self {
        let mut concept_mappings = HashMap::new();
        
        // Safety-related concepts
        concept_mappings.insert("violence".to_string(), vec![
            "harm".to_string(),
            "hurt".to_string(),
            "attack".to_string(),
            "kill".to_string(),
            "violence".to_string(),
        ]);
        
        concept_mappings.insert("bias".to_string(), vec![
            "stereotype".to_string(),
            "prejudice".to_string(),
            "discriminate".to_string(),
            "racist".to_string(),
            "sexist".to_string(),
        ]);
        
        concept_mappings.insert("privacy".to_string(), vec![
            "personal".to_string(),
            "private".to_string(),
            "confidential".to_string(),
            "secret".to_string(),
        ]);
        
        concept_mappings.insert("helpfulness".to_string(), vec![
            "help".to_string(),
            "assist".to_string(),
            "support".to_string(),
            "guide".to_string(),
            "beneficial".to_string(),
        ]);
        
        concept_mappings.insert("honesty".to_string(), vec![
            "truth".to_string(),
            "honest".to_string(),
            "accurate".to_string(),
            "factual".to_string(),
            "reliable".to_string(),
        ]);

        let safety_concepts = vec![
            "violence".to_string(),
            "bias".to_string(),
            "privacy".to_string(),
            "helpfulness".to_string(),
            "honesty".to_string(),
        ];

        Self {
            concept_mappings,
            safety_concepts,
        }
    }

    pub fn analyze(&self, text: &str) -> InterpretabilityResult {
        let start_time = std::time::Instant::now();
        
        // Tokenize text (simplified)
        let tokens: Vec<&str> = text.split_whitespace().collect();
        let num_tokens = tokens.len();
        
        // Simulate feature importance analysis
        let feature_importance = self.calculate_feature_importance(&tokens);
        
        // Simulate attention weights (simplified)
        let attention_weights = self.simulate_attention_weights(&tokens);
        
        // Simulate neuron activations
        let neuron_activations = self.simulate_neuron_activations(&tokens);
        
        // Analyze concept activations
        let concepts = self.analyze_concepts(text, &tokens);
        
        let analysis_time = start_time.elapsed().as_millis() as u64;
        
        InterpretabilityResult {
            feature_importance,
            attention_weights,
            neuron_activations,
            concepts,
            metadata: InterpretabilityMetadata {
                analysis_time_ms: analysis_time,
                model_version: "1.0.0".to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                text_length: text.len(),
                num_tokens,
            },
        }
    }

    fn calculate_feature_importance(&self, tokens: &[&str]) -> Vec<FeatureImportance> {
        let mut importance_scores = Vec::new();
        
        for (i, &token) in tokens.iter().enumerate() {
            let token_lower = token.to_lowercase();
            let mut importance = 0.1; // Base importance
            let mut category = "neutral".to_string();
            
            // Calculate importance based on safety relevance
            for (concept, keywords) in &self.concept_mappings {
                if keywords.iter().any(|keyword| token_lower.contains(keyword)) {
                    importance = match concept.as_str() {
                        "violence" => 0.9,
                        "bias" => 0.8,
                        "privacy" => 0.7,
                        "helpfulness" => 0.6,
                        "honesty" => 0.5,
                        _ => 0.3,
                    };
                    category = concept.clone();
                    break;
                }
            }
            
            // Add some randomness to simulate real model behavior
            importance += (i as f32 * 0.01) % 0.1;
            
            importance_scores.push(FeatureImportance {
                token: token.to_string(),
                importance,
                position: i,
                category,
            });
        }
        
        // Sort by importance
        importance_scores.sort_by(|a, b| b.importance.partial_cmp(&a.importance).unwrap());
        importance_scores.truncate(20); // Top 20 most important features
        
        importance_scores
    }

    fn simulate_attention_weights(&self, tokens: &[&str]) -> Vec<Vec<f32>> {
        let num_tokens = tokens.len().min(50); // Limit for performance
        let mut attention_matrix = Vec::new();
        
        for i in 0..num_tokens {
            let mut row = Vec::new();
            for j in 0..num_tokens {
                // Simulate attention patterns
                let distance = (i as f32 - j as f32).abs();
                let base_attention = 1.0 / (1.0 + distance * 0.1);
                
                // Higher attention to safety-relevant tokens
                let token_j = tokens[j].to_lowercase();
                let safety_boost = if self.concept_mappings.values()
                    .any(|keywords| keywords.iter().any(|k| token_j.contains(k))) {
                    0.3
                } else {
                    0.0
                };
                
                let attention = (base_attention + safety_boost).min(1.0);
                row.push(attention);
            }
            
            // Normalize attention weights
            let sum: f32 = row.iter().sum();
            if sum > 0.0 {
                for weight in row.iter_mut() {
                    *weight /= sum;
                }
            }
            
            attention_matrix.push(row);
        }
        
        attention_matrix
    }

    fn simulate_neuron_activations(&self, tokens: &[&str]) -> Vec<NeuronActivation> {
        let mut activations = Vec::new();
        
        // Simulate activations for different layers
        for layer in 0..12 { // 12 layers
            for neuron in 0..20 { // 20 neurons per layer
                let mut activation = 0.0;
                let mut detected_concept = "unknown".to_string();
                let mut examples = Vec::new();
                
                // Simulate concept detection
                for &token in tokens {
                    let token_lower = token.to_lowercase();
                    for (concept, keywords) in &self.concept_mappings {
                        if keywords.iter().any(|keyword| token_lower.contains(keyword)) {
                            activation += 0.5 + (layer as f32 * 0.05);
                            detected_concept = concept.clone();
                            examples.push(token.to_string());
                            break;
                        }
                    }
                }
                
                // Add layer-specific processing
                activation *= match layer {
                    0..=2 => 0.3,   // Early layers: low-level features
                    3..=6 => 0.7,   // Middle layers: intermediate concepts
                    7..=11 => 1.0,  // Late layers: high-level concepts
                    _ => 0.5,
                };
                
                // Only include significant activations
                if activation > 0.3 {
                    activations.push(NeuronActivation {
                        layer,
                        neuron,
                        activation: activation.min(1.0),
                        concept: detected_concept,
                        examples: examples.into_iter().take(3).collect(),
                    });
                }
            }
        }
        
        // Sort by activation strength and limit results
        activations.sort_by(|a, b| b.activation.partial_cmp(&a.activation).unwrap());
        activations.truncate(50);
        
        activations
    }

    fn analyze_concepts(&self, text: &str, tokens: &[&str]) -> Vec<ConceptActivation> {
        let mut concept_activations = Vec::new();
        let text_lower = text.to_lowercase();
        
        for concept in &self.safety_concepts {
            let mut strength = 0.0;
            let mut supporting_tokens = Vec::new();
            let mut match_count = 0;
            
            if let Some(keywords) = self.concept_mappings.get(concept) {
                for keyword in keywords {
                    if text_lower.contains(keyword) {
                        strength += 0.2;
                        match_count += 1;
                        
                        // Find supporting tokens
                        for &token in tokens {
                            if token.to_lowercase().contains(keyword) {
                                supporting_tokens.push(token.to_string());
                            }
                        }
                    }
                }
            }
            
            if strength > 0.0 {
                let confidence = (match_count as f32 / keywords.len() as f32).min(1.0);
                
                concept_activations.push(ConceptActivation {
                    concept: concept.clone(),
                    strength: strength.min(1.0),
                    confidence,
                    supporting_tokens: supporting_tokens.into_iter().take(5).collect(),
                });
            }
        }
        
        // Sort by strength
        concept_activations.sort_by(|a, b| b.strength.partial_cmp(&a.strength).unwrap());
        
        concept_activations
    }
}

// Helper for random data generation if needed outside `analyze`
mod rand {
    use std::time::{SystemTime, UNIX_EPOCH};
    static mut SEED: u64 = 0;

    fn init_seed() {
        unsafe {
            if SEED == 0 {
                SEED = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
            }
        }
    }
    // Basic LCG random number generator
    pub fn random<T>() -> T where T: From<f32> {
        init_seed();
        unsafe {
            SEED = SEED.wrapping_mul(1103515245).wrapping_add(12345);
            let val = (SEED / 65536) % 32768;
            T::from(val as f32 / 32767.0)
        }
    }
} 