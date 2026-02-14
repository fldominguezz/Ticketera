# Etapa 1: Dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json ./
# Evitar descarga de binarios pesados o incompatibles durante el build
ENV CYPRESS_INSTALL_BINARY=0
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN npm install --no-audit

# Etapa 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deshabilitar telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Etapa 3: Runner (Producción)
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar solo los archivos necesarios para ejecutar en modo standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
CMD ["node", "server.js"]
