# Multi-stage build for OpenSafe
FROM node:18-alpine AS builder

# Install system dependencies for native compilation
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    rust \
    cargo

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY native/ ./native/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S opensafe -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=opensafe:nodejs /app/dist ./dist
COPY --from=builder --chown=opensafe:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=opensafe:nodejs /app/native/target/release ./native/target/release
COPY --chown=opensafe:nodejs package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Switch to non-root user
USER opensafe

# Expose port
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

LABEL org.opencontainers.image.title="OpenSafe" 