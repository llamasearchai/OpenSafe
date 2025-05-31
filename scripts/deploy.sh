#!/bin/bash

set -e

echo "Deploying OpenSafe AI Security Platform..."

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Build and start services
echo "Starting Docker services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Run health checks
echo "Running health checks..."
curl -f http://localhost:8080/health || exit 1

echo "Deployment completed successfully!"
echo "API available at: http://localhost:8080"
echo "Grafana available at: http://localhost:3000"
echo "Prometheus available at: http://localhost:9090" 