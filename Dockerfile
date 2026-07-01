# syntax=docker/dockerfile:1

# M13: pin base image. Para máxima reprodutibilidade, troque `:22-alpine` por
# `:22-alpine@sha256:<digest>`. Pegue o digest com:
#   docker pull node:22-alpine && docker inspect --format='{{index .RepoDigests 0}}' node:22-alpine
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* são embutidas no bundle do cliente em build time.
# No EasyPanel: aba "Build" → "Build Args" (NÃO em Environment).
# NEXT_PUBLIC_APP_URL também é exigida pelo guard em next.config.ts.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# L-9: healthcheck em /api/health (rota dedicada, não bate na landing RSC).
# $PORT é dinâmico — EasyPanel/K8s/Cloud Run frequentemente sobrescrevem (ex: PORT=80).
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

CMD ["node", "server.js"]
