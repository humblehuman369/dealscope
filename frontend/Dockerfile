# ─────────────────────────────────────────────────────────
#  InvestIQ Frontend — Multi-stage Production Dockerfile
#
#  Three stages:
#    1. deps      — install production dependencies
#    2. builder   — build the Next.js app
#    3. runner    — minimal production image
#
#  Build:
#    docker build -t investiq-frontend .
#
#  Run:
#    docker run -p 3000:3000 investiq-frontend
# ─────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ──────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only package manifests — maximizes Docker layer cache.
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build the Next.js application ─────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments for env vars needed at build time
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ── Stage 3: Production runner ─────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy build artifacts and runtime deps
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

# Set ownership for Next.js cache directory
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

# Use `next start` for production serving
CMD ["npm", "start"]
