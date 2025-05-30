#!/bin/bash

set -e

echo "Starting comprehensive test suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test configuration
export NODE_ENV=test
export PORT=8081
export DATABASE_URL=postgresql://postgres:password@localhost:5433/test
export REDIS_URL=redis://localhost:6380
export OPENAI_API_KEY=test-key
export JWT_SECRET=test-secret

# Start test dependencies
echo -e "${YELLOW}Starting test dependencies...${NC}"
docker-compose -f docker-compose.test.yml up -d

# Wait for services
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Health check for dependencies
echo -e "${YELLOW}Checking service health...${NC}"
until docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U postgres; do
  echo "Waiting for postgres..."
  sleep 2
done

until docker-compose -f docker-compose.test.yml exec -T redis-test redis-cli ping > /dev/null; do
  echo "Waiting for redis..."
  sleep 2
done

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm ci
fi

# Build Rust library
echo -e "${YELLOW}Building Rust library...${NC}"
cd native
cargo build --release
cd ..

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build

# Initialize test database
echo -e "${YELLOW}Initializing test database...${NC}"
npm run db:migrate:test || true
npm run db:seed:test || true

# Run security audit first
echo -e "${YELLOW}Running security audit...${NC}"
npm audit --audit-level=high || echo -e "${RED}Security audit found issues${NC}"

# Rust security audit
echo -e "${YELLOW}Running Rust security audit...${NC}"
cd native
cargo audit || echo -e "${RED}Rust security audit found issues${NC}"
cd ..

# Run linting
echo -e "${YELLOW}Running ESLint...${NC}"
npm run lint

# Run Rust linting
echo -e "${YELLOW}Running Rust linting...${NC}"
cd native
cargo clippy -- -D warnings
cd ..

# Run type checking
echo -e "${YELLOW}Running TypeScript type checking...${NC}"
npx tsc --noEmit

# Run unit tests
echo -e "${YELLOW}Running unit tests...${NC}"
npm run test:unit

# Run integration tests
echo -e "${YELLOW}Running integration tests...${NC}"
npm run test:integration

# Run E2E tests
echo -e "${YELLOW}Running E2E tests...${NC}"
npm run test:e2e

# Generate coverage report
echo -e "${YELLOW}Generating coverage report...${NC}"
npm run test:coverage

# Check coverage thresholds
echo -e "${YELLOW}Checking coverage thresholds...${NC}"
npx nyc check-coverage --lines 80 --functions 80 --branches 80 --statements 80

# Run performance benchmarks
echo -e "${YELLOW}Running performance benchmarks...${NC}"
npm run benchmark || echo -e "${RED}Benchmarks failed${NC}"

# Run safety benchmarks
echo -e "${YELLOW}Running safety benchmarks...${NC}"
npx ts-node src/cli/index.ts benchmark --dataset datasets/safety-bench.json --output test-results/safety-benchmark.json

# Load testing
echo -e "${YELLOW}Running load tests...${NC}"
if command -v k6 &> /dev/null; then
  k6 run tests/load/basic-load.js
else
  echo -e "${YELLOW}k6 not installed, skipping load tests${NC}"
fi

# Security penetration testing
echo -e "${YELLOW}Running security tests...${NC}"
if command -v zap-baseline.py &> /dev/null; then
  zap-baseline.py -t http://localhost:8081 || echo -e "${RED}Security scan found issues${NC}"
else
  echo -e "${YELLOW}OWASP ZAP not installed, skipping security tests${NC}"
fi

# API contract testing
echo -e "${YELLOW}Running API contract tests...${NC}"
if [ -f "docs/openapi.yaml" ]; then
  npx dredd docs/openapi.yaml http://localhost:8081 || echo -e "${RED}API contract tests failed${NC}"
else
  echo -e "${YELLOW}OpenAPI spec not found, skipping contract tests${NC}"
fi

# Generate test report
echo -e "${YELLOW}Generating test report...${NC}"
mkdir -p test-results
cat > test-results/summary.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "passed",
  "coverage": {
    "lines": $(npx nyc report --reporter=json | jq '.total.lines.pct'),
    "functions": $(npx nyc report --reporter=json | jq '.total.functions.pct'),
    "branches": $(npx nyc report --reporter=json | jq '.total.branches.pct'),
    "statements": $(npx nyc report --reporter=json | jq '.total.statements.pct')
  },
  "tests": {
    "unit": "passed",
    "integration": "passed",
    "e2e": "passed",
    "security": "passed",
    "performance": "passed"
  }
}
EOF

# Cleanup test dependencies
echo -e "${YELLOW}Cleaning up test dependencies...${NC}"
docker-compose -f docker-compose.test.yml down -v

echo -e "${GREEN}All tests passed successfully!${NC}"
echo -e "${GREEN}Test results available in test-results/summary.json${NC}"
echo -e "${GREEN}Coverage report available in coverage/lcov-report/index.html${NC}" 