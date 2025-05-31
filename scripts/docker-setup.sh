#!/bin/bash

set -e

echo "OpenSafe AI Security Platform - Docker Setup"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

log_info "Building OpenSafe Docker image..."
docker build -t opensafe/core:latest .

if [ $? -eq 0 ]; then
    log_info "[SUCCESS] Docker image built successfully"
else
    log_error "[ERROR] Docker image build failed"
    exit 1
fi

log_info "Testing Docker image..."
docker run --rm opensafe/core:latest node --version

if [ $? -eq 0 ]; then
    log_info "[SUCCESS] Docker image test passed"
else
    log_error "[ERROR] Docker image test failed"
    exit 1
fi

log_info "Setting up development environment with Docker Compose..."
docker-compose -f docker-compose.yml config

if [ $? -eq 0 ]; then
    log_info "[SUCCESS] Docker Compose configuration is valid"
else
    log_error "[ERROR] Docker Compose configuration is invalid"
    exit 1
fi

log_info "Starting services in detached mode..."
docker-compose up -d

if [ $? -eq 0 ]; then
    log_info "[SUCCESS] Services started successfully"
    log_info "[INFO] OpenSafe is running at http://localhost:8080"
    log_info "[INFO] Health check: http://localhost:8080/health"
    log_info "[INFO] Metrics: http://localhost:8080/metrics"
    
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop services: docker-compose down"
    echo "To rebuild: docker-compose up --build"
else
    log_error "[ERROR] Failed to start services"
    exit 1
fi

log_info "[SUCCESS] Docker setup completed successfully!" 