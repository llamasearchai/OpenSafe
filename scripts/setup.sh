#!/bin/bash

set -e

echo "Setting up OpenSafe AI Security Platform..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Make scripts executable
echo -e "${YELLOW}Setting script permissions...${NC}"
chmod +x scripts/*.sh
chmod +x scripts/*.js 2>/dev/null || true

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p dist
mkdir -p coverage
mkdir -p logs
mkdir -p test-results
mkdir -p benchmark-results
mkdir -p security-results
mkdir -p backups
mkdir -p docs/api

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}Creating .env file...${NC}"
  cat > .env << 'EOF'
# Application Configuration
NODE_ENV=development
PORT=8080

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/openaisafe

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Rust Library Configuration
RUST_LIB_PATH=./native/target/release/libsafety_analysis.so

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:8080

# Rate Limiting Configuration
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
EOF
fi

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
  echo -e "${RED}Rust is not installed. Please install Rust from https://rustup.rs/${NC}"
  exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/${NC}"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Node.js version 18+ is required. Current version: $(node --version)${NC}"
  exit 1
fi

# Install Node.js dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
npm ci

# Build Rust library
echo -e "${YELLOW}Building Rust library...${NC}"
cd native
cargo build --release
cd ..

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build

# Create test databases if they don't exist
echo -e "${YELLOW}Setting up test environment...${NC}"
if command -v psql &> /dev/null; then
  createdb openaisafe_test 2>/dev/null || echo "Test database already exists"
fi

echo -e "${GREEN}Setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Start PostgreSQL and Redis services"
echo "3. Run: make migrate && make seed"
echo "4. Run: make dev to start development server"
echo "5. Run: make test to run the test suite" 