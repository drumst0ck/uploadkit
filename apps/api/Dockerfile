# Stage 1: Base image with pnpm enabled
FROM node:22-alpine AS base
RUN corepack enable pnpm

# Stage 2: Install all dependencies
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY packages/config/package.json ./packages/config/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/react/package.json ./packages/react/package.json
COPY packages/next/package.json ./packages/next/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/emails/package.json ./packages/emails/package.json

COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

COPY . .

RUN pnpm turbo build --filter=@uploadkitdev/api

# Stage 4: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/static ./apps/api/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/public ./apps/api/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/api/server.js"]
