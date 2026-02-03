# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Install TypeScript globally for build scripts
RUN npm install -g typescript

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/
RUN npm ci --include=dev

COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/

RUN npm run db:generate
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production
RUN apk add --no-cache curl openssl
WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/
RUN npm ci --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY server/prisma ./server/prisma

RUN npx prisma generate --schema=./server/prisma/schema.prisma

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data
USER nodejs

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "server/dist/index.js"]
