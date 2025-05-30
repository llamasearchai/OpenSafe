#!/bin/bash

set -e

# Parse command line arguments
EXPERIMENTS=10
VALIDATE="reproducibility"
THRESHOLD=0.85

while [[ $# -gt 0 ]]; do
  case $1 in
    --experiments=*)
      EXPERIMENTS="${1#*=}"
      shift
      ;;
    --validate=*)
      VALIDATE="${1#*=}"
      shift
      ;;
    --threshold=*)
      THRESHOLD="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo "Research Integrity Verification"
echo "==============================="
echo "Experiments: $EXPERIMENTS"
echo "Validation Type: $VALIDATE"
echo "Threshold: $THRESHOLD"
echo ""

# Ensure the application is built
if [ ! -d "dist" ]; then
    echo "Building application..."
    npm run build
fi

# Start services if not running
echo "Starting required services..."
docker-compose up -d postgres redis

# Wait for services
sleep 5

# Run research verification
node -e "
const { ResearchService } = require('./dist/services/research.service');
const { logger } = require('./dist/utils/logger');

async function verifyResearch() {
    const service = new ResearchService();
    let passed = 0;
    let failed = 0;
    
    console.log('Running $EXPERIMENTS research experiments...');
    
    for (let i = 0; i < $EXPERIMENTS; i++) {
        try {
            const experiment = await service.createExperiment({
                hypothesis: \`Research integrity test \${i + 1}\`,
                experiment_type: 'safety_evaluation',
                parameters: { test: true, iteration: i }
            });
            
            const results = await service.runExperiment(experiment.id);
            
            // Verify reproducibility
            if ('$VALIDATE' === 'reproducibility') {
                const rerun = await service.runExperiment(experiment.id);
                const accuracy_diff = Math.abs(results.metrics.accuracy - rerun.metrics.accuracy);
                
                if (accuracy_diff < (1 - $THRESHOLD)) {
                    passed++;
                    console.log(\`✓ Experiment \${i + 1}: PASS (accuracy diff: \${accuracy_diff.toFixed(4)})\`);
                } else {
                    failed++;
                    console.log(\`✗ Experiment \${i + 1}: FAIL (accuracy diff: \${accuracy_diff.toFixed(4)})\`);
                }
            }
        } catch (error) {
            failed++;
            console.log(\`✗ Experiment \${i + 1}: ERROR - \${error.message}\`);
        }
    }
    
    const success_rate = passed / (passed + failed);
    console.log('');
    console.log('Research Integrity Results:');
    console.log(\`Passed: \${passed}\`);
    console.log(\`Failed: \${failed}\`);
    console.log(\`Success Rate: \${(success_rate * 100).toFixed(2)}%\`);
    console.log(\`Threshold: \${($THRESHOLD * 100).toFixed(2)}%\`);
    
    if (success_rate >= $THRESHOLD) {
        console.log('✓ Research integrity verification PASSED');
        process.exit(0);
    } else {
        console.log('✗ Research integrity verification FAILED');
        process.exit(1);
    }
}

verifyResearch().catch(error => {
    console.error('Research verification failed:', error);
    process.exit(1);
});
"

echo "Research integrity verification completed." 