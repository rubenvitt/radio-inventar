# apps/backend/Dockerfile
# Multi-stage build for NestJS with pnpm Monorepo

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace configuration (for pnpm)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./

# Copy package.json and tsconfig of all workspaces
COPY apps/backend/package.json apps/backend/tsconfig.json ./apps/backend/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/

# Install dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# 1. Build shared package (backend depends on it)
RUN pnpm --filter @radio-inventar/shared build

# 2. Generate Prisma Client
RUN pnpm --filter @radio-inventar/backend exec prisma generate

# 3. Build backend
RUN pnpm --filter @radio-inventar/backend build

# Keep only production dependencies (tree-shaking)
RUN pnpm --filter @radio-inventar/backend --prod deploy /app/production

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# Security: Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Copy only required artifacts
COPY --from=builder --chown=nestjs:nodejs /app/production/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./prisma

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run as non-root user
USER nestjs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start command
CMD ["node", "dist/main"]
