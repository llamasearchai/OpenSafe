.PHONY: help install build test clean dev docker-build docker-run lint format migrate seed deploy backup restore benchmark security docs start-monitoring stop-monitoring logs update-deps validate-env pre-commit ci release

# Default target
help:
	@echo "Available commands:"
	@echo "  install       Install dependencies"
	@echo "  build         Build the application"
	@echo "  test          Run all tests"
	@echo "  dev           Start development server"
	@echo "  docker-build  Build Docker image"
	@echo "  docker-run    Run with Docker Compose"
	@echo "  lint          Run linting"
	@echo "  format        Format code"
	@echo "  migrate       Run database migrations"
	@echo "  seed          Seed database with initial data"
	@echo "  deploy        Deploy to production"
	@echo "  clean         Clean build artifacts"
	@echo "  benchmark     Run performance benchmarks"
	@echo "  security      Run security audits"
	@echo "  docs          Generate documentation"
	@echo "  start-monitoring Start monitoring stack"
	@echo "  stop-monitoring Stop monitoring stack"
	@echo "  logs          Show application logs"
	@echo "  logs-monitoring Show monitoring logs"
	@echo "  update-deps     Update dependencies"
	@echo "  validate-env    Validate environment configuration"
	@echo "  pre-commit      Run pre-commit checks"
	@echo "  ci              Run CI pipeline"
	@echo "  release         Create a release"

PROJECT_NAME=opensafe

install:
	@echo "Installing dependencies..."
	npm ci
	cd native && cargo build --release
	@echo "Dependencies installed successfully"

build: install
	@echo "Building application..."
	npm run build
	@echo "Build completed"

dev:
	@echo "Starting development server..."
	npm run dev

test:
	@echo "Running comprehensive test suite..."
	./scripts/test.sh

test-unit:
	@echo "Running unit tests..."
	npm run test

test-integration:
	@echo "Running integration tests..."
	npm run test:integration

test-e2e:
	@echo "Running E2E tests..."
	npm run test:e2e

coverage:
	@echo "Generating coverage report..."
	npm run test:coverage

lint:
	@echo "Running ESLint..."
	npm run lint
	@echo "Running Rust linting..."
	cd native && cargo clippy -- -D warnings

format:
	@echo "Formatting TypeScript..."
	npm run format
	@echo "Formatting Rust..."
	cd native && cargo fmt

migrate:
	@echo "Running database migrations..."
	./scripts/migrate.sh

seed:
	@echo "Seeding database..."
	./scripts/seed.sh

docker-build:
	@echo "Building Docker image..."
	docker build -t opensafe/core:latest .

docker-run:
	@echo "Starting Docker Compose..."
	docker-compose up -d

docker-dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up

docker-test:
	@echo "Running tests in Docker..."
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit

deploy:
	@echo "Deploying to production..."
	./scripts/deploy.sh

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf coverage/
	rm -rf node_modules/.cache/
	cd native && cargo clean

db-reset:
	@echo "Resetting database..."
	docker-compose exec postgres dropdb -U postgres opensafe || true
	docker-compose exec postgres createdb -U postgres opensafe
	make migrate
	make seed

db-backup:
	@echo "Creating database backup..."
	mkdir -p backups
	docker-compose exec postgres pg_dump -U postgres opensafe > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql

db-restore:
	@echo "Restoring database from $(BACKUP_FILE)..."
	docker-compose exec -T postgres psql -U postgres opensafe < $(BACKUP_FILE)

benchmark:
	@echo "Running performance benchmarks..."
	./scripts/benchmark.sh

security:
	@echo "Running security audits..."
	npm audit --audit-level=high
	cd native && cargo audit
	./scripts/security-scan.sh

docs:
	@echo "Generating documentation..."
	npx typedoc src --out docs/api
	@echo "Documentation generated in docs/"

start-monitoring:
	@echo "Starting monitoring stack..."
	docker-compose -f docker-compose.monitoring.yml up -d

stop-monitoring:
	@echo "Stopping monitoring stack..."
	docker-compose -f docker-compose.monitoring.yml down

logs:
	@echo "Showing application logs..."
	docker-compose logs -f opensafe-api

logs-monitoring:
	@echo "Showing monitoring logs..."
	docker-compose -f docker-compose.monitoring.yml logs -f

update-deps:
	@echo "Updating dependencies..."
	npm update
	cd native && cargo update

validate-env:
	@echo "Validating environment configuration..."
	node -e "require('./dist/config').config; console.log('Environment validation passed')"

pre-commit: lint format test-unit security
	@echo "Pre-commit checks completed"

ci: install lint test coverage security
	@echo "CI pipeline completed"

release:
	@echo "Creating release..."
	./scripts/release.sh 