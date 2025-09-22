# syntax=docker/dockerfile:1

FROM node:18-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev || npm install --omit=dev

FROM base AS build
COPY package.json ./
RUN --mount=type=cache,target=/root/.npm npm ci || npm install
COPY . .

FROM base AS runner
RUN addgroup -S app && adduser -S app -G app
USER app
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=app:app . .

EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>{if(r.ok)process.exit(0);else process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]


