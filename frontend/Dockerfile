FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias con flag de compatibilidad para React 19
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Instalar curl para descargar el worker real
RUN apk add --no-cache curl && \
    mkdir -p public/pdfjs && \
    curl -L https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs -o public/pdfjs/pdf.worker.5.4.296.js

# Construir la aplicación Next.js
ENV NEXT_PUBLIC_API_URL=http://localhost/api/v1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario de sistema para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios para standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
