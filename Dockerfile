# syntax=docker/dockerfile:1.7

############################
# deps — install production deps only
############################
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

############################
# builder — generate prisma client + build Next.js standalone
############################
FROM oven/bun:1-alpine AS builder
WORKDIR /app
# Needs openssl for Prisma, plus the deps from the previous stage
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bunx prisma generate
RUN bun run build

############################
# runner — minimal alpine image with non-root user
############################
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# openssl needed by Prisma at runtime; wget for HEALTHCHECK
RUN apk add --no-cache openssl wget nmap

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

# Copy Next.js standalone output + static + public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma needs its CLI + full transitive deps to run `migrate deploy` at startup,
# but the Next.js standalone bundle strips anything it didn't import. Easiest
# pragmatic fix: drop the full node_modules next to the standalone output so
# `node node_modules/prisma/build/index.js` resolves cleanly. Costs ~400MB but
# image is still under 1GB and avoids fragile selective-copy rules.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "server.js"]
