# ─── Build stage (install deps including devDependencies if any) ───
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ─── Runtime stage ───
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -S psc && adduser -S psc -G psc

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=psc:psc . .

USER psc

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "index.js"]
