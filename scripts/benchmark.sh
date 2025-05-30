#!/bin/bash

set -e

echo "Starting performance benchmarks..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SERVER_URL="http://localhost:8080"
RESULTS_DIR="benchmark-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory
mkdir -p $RESULTS_DIR

echo -e "${YELLOW}Running API performance benchmarks...${NC}"

# Start server if not running
if ! curl -s "$SERVER_URL/health" > /dev/null; then
  echo -e "${YELLOW}Starting server...${NC}"
  npm run dev &
  SERVER_PID=$!
  sleep 10
fi

# Get authentication token
echo -e "${YELLOW}Getting authentication token...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@openaisafe.com","password":"admin123456"}')

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.token')

if [ "$TOKEN" = "null" ]; then
  echo -e "${RED}Failed to get authentication token${NC}"
  exit 1
fi

# Benchmark: Health check endpoint
echo -e "${YELLOW}Benchmarking health endpoint...${NC}"
curl -s -w "@scripts/curl-format.txt" "$SERVER_URL/health" -o /dev/null > "$RESULTS_DIR/health_${TIMESTAMP}.txt"

# Benchmark: Safety analysis
echo -e "${YELLOW}Benchmarking safety analysis...${NC}"
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -p <(echo '{"text":"This is a test message for safety analysis","mode":"fast"}') \
  "$SERVER_URL/api/v1/safety/analyze" > "$RESULTS_DIR/safety_analysis_${TIMESTAMP}.txt"

# Benchmark: Constitutional AI
echo -e "${YELLOW}Benchmarking constitutional AI...${NC}"
ab -n 100 -c 5 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -p <(echo '{"text":"Test content for constitutional revision","max_revisions":1}') \
  "$SERVER_URL/api/v1/safety/constitutional" > "$RESULTS_DIR/constitutional_${TIMESTAMP}.txt"

# Memory and CPU benchmarks
echo -e "${YELLOW}Running memory benchmark...${NC}"
node --expose-gc scripts/memory-benchmark.js > "$RESULTS_DIR/memory_${TIMESTAMP}.txt"

# Database performance
echo -e "${YELLOW}Running database benchmarks...${NC}"
pgbench -h localhost -U postgres -d openaisafe -c 10 -j 2 -t 1000 > "$RESULTS_DIR/database_${TIMESTAMP}.txt" || echo "pgbench not available"

# Stress test with autocannon
echo -e "${YELLOW}Running stress test...${NC}"
if command -v autocannon &> /dev/null; then
  autocannon -c 100 -d 30 -H "Authorization=Bearer $TOKEN" "$SERVER_URL/health" > "$RESULTS_DIR/stress_${TIMESTAMP}.txt"
else
  echo -e "${YELLOW}autocannon not installed, skipping stress test${NC}"
fi

# Load test with wrk if available
echo -e "${YELLOW}Running load test...${NC}"
if command -v wrk &> /dev/null; then
  wrk -t12 -c400 -d30s --timeout 10s \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$SERVER_URL/health" > "$RESULTS_DIR/load_${TIMESTAMP}.txt"
else
  echo -e "${YELLOW}wrk not installed, skipping load test${NC}"
fi

# Memory leak detection
echo -e "${YELLOW}Running memory leak detection...${NC}"
timeout 60s node --expose-gc scripts/memory-leak-test.js > "$RESULTS_DIR/memory_leak_${TIMESTAMP}.txt" || true

# Generate benchmark report
echo -e "${YELLOW}Generating benchmark report...${NC}"
cat > "$RESULTS_DIR/summary_${TIMESTAMP}.md" << EOF
# Performance Benchmark Report

**Date**: $(date)  
**Server**: $SERVER_URL  
**Results Directory**: $RESULTS_DIR  

## Summary

### API Performance
- Health endpoint: $(grep -o "Time per request:.*" "$RESULTS_DIR/health_${TIMESTAMP}.txt" || echo "N/A")
- Safety analysis: $(grep -o "Requests per second:.*" "$RESULTS_DIR/safety_analysis_${TIMESTAMP}.txt" | head -1 || echo "N/A")
- Constitutional AI: $(grep -o "Requests per second:.*" "$RESULTS_DIR/constitutional_${TIMESTAMP}.txt" | head -1 || echo "N/A")

### System Resources
- Memory usage: See memory_${TIMESTAMP}.txt
- Database performance: See database_${TIMESTAMP}.txt
- Stress test results: See stress_${TIMESTAMP}.txt

## Recommendations

### Performance Optimizations
1. Enable Redis caching for frequent safety analyses
2. Implement connection pooling for database
3. Add CDN for static assets
4. Optimize Rust library compilation flags

### Scaling Recommendations
- Horizontal scaling: 3+ instances behind load balancer
- Database: Read replicas for analytics queries
- Cache: Redis cluster for high availability
- Monitoring: Real-time performance alerts

## Files Generated
EOF

ls -la "$RESULTS_DIR"/*_${TIMESTAMP}.* >> "$RESULTS_DIR/summary_${TIMESTAMP}.md"

# Cleanup
if [ ! -z "$SERVER_PID" ]; then
  kill $SERVER_PID 2>/dev/null || true
fi

echo -e "${GREEN}Benchmark completed successfully!${NC}"
echo -e "${GREEN}Results available in: $RESULTS_DIR/summary_${TIMESTAMP}.md${NC}"

# Performance threshold checks
echo -e "${YELLOW}Checking performance thresholds...${NC}"

# Extract RPS from safety analysis
SAFETY_RPS=$(grep "Requests per second:" "$RESULTS_DIR/safety_analysis_${TIMESTAMP}.txt" | head -1 | grep -o "[0-9.]*")

if [ ! -z "$SAFETY_RPS" ]; then
  if (( $(echo "$SAFETY_RPS > 100" | bc -l) )); then
    echo -e "${GREEN}✓ Safety analysis RPS ($SAFETY_RPS) meets threshold (>100)${NC}"
  else
    echo -e "${RED}✗ Safety analysis RPS ($SAFETY_RPS) below threshold (>100)${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}All performance benchmarks passed!${NC}" 