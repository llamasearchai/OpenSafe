# Multi-stage build for production
FROM rust:1.75 AS rust-builder

WORKDIR /app/native
COPY native/ .
RUN cargo build --release

FROM node:20-alpine AS node-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    redis \
    curl

WORKDIR /app

# Copy built artifacts
COPY --from=rust-builder /app/native/target/release/libsafety_analysis.so ./native/target/release/libsafety_analysis.so
COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/node_modules ./node_modules
COPY package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["npm", "start"] 