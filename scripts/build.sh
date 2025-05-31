#!/bin/bash

set -e

echo "Building OpenSafe AI Security Platform..."

# Install Node dependencies
echo "Installing Node.js dependencies..."
npm ci

# Build Rust library
echo "Building Rust native library..."
cd native
cargo build --release
cd ..

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Run tests
echo "Running tests..."
npm test

echo "Build completed successfully!" 